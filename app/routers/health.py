import asyncio
import logging
from datetime import datetime, timezone
from time import monotonic

import httpx
from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.db import get_session_factory
from app.schemas import APIHealthChecks, APIHealthResponse, ServiceHealthCheck

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

_CHECK_TIMEOUT_SECONDS = 3.0
_GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"


def _elapsed_ms(started_at: float) -> int:
    return max(0, round((monotonic() - started_at) * 1000))


async def run_database_health_check() -> ServiceHealthCheck:
    started_at = monotonic()

    if not settings.database_url:
        return ServiceHealthCheck(status="error", latency_ms=None)

    try:
        session_factory = get_session_factory()
        if session_factory is None:
            return ServiceHealthCheck(status="error", latency_ms=None)

        async def _query_database() -> None:
            async with session_factory() as session:
                await session.execute(text("SELECT 1"))

        await asyncio.wait_for(_query_database(), timeout=_CHECK_TIMEOUT_SECONDS)
        return ServiceHealthCheck(status="ok", latency_ms=_elapsed_ms(started_at))
    except asyncio.TimeoutError:
        logger.warning("Database health check timed out.")
    except Exception:
        logger.exception("Database health check failed.")

    return ServiceHealthCheck(status="error", latency_ms=_elapsed_ms(started_at))


async def run_groq_api_health_check() -> ServiceHealthCheck:
    started_at = monotonic()
    api_key = (settings.groq_api_key or "").strip()

    if not api_key:
        return ServiceHealthCheck(status="not_configured", latency_ms=None)

    try:
        timeout = httpx.Timeout(_CHECK_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await asyncio.wait_for(
                client.get(
                    _GROQ_MODELS_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                ),
                timeout=_CHECK_TIMEOUT_SECONDS,
            )
            response.raise_for_status()

        return ServiceHealthCheck(status="ok", latency_ms=_elapsed_ms(started_at))
    except asyncio.TimeoutError:
        logger.warning("Groq API health check timed out.")
    except Exception:
        logger.exception("Groq API health check failed.")

    return ServiceHealthCheck(status="error", latency_ms=_elapsed_ms(started_at))


def determine_overall_health_status(*, database_status: str, groq_status: str) -> str:
    if database_status == "error":
        return "down"

    if groq_status != "ok":
        return "degraded"

    return "ok"


@router.get("/api/health", response_model=APIHealthResponse)
async def api_health() -> APIHealthResponse:
    database_check, groq_check = await asyncio.gather(
        run_database_health_check(),
        run_groq_api_health_check(),
    )

    overall_status = determine_overall_health_status(
        database_status=database_check.status,
        groq_status=groq_check.status,
    )

    return APIHealthResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        version=settings.app_version,
        checks=APIHealthChecks(database=database_check, groq_api=groq_check),
    )
