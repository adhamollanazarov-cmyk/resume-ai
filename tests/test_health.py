from datetime import datetime

from fastapi.testclient import TestClient

import app.routers.health as health_router_module
from app.config import settings
from app.main import app
from app.schemas import ServiceHealthCheck

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


def test_cors_middleware_uses_settings_cors_origins() -> None:
    cors_middleware = next(
        middleware for middleware in app.user_middleware if middleware.cls.__name__ == "CORSMiddleware"
    )

    assert cors_middleware.kwargs["allow_origins"] == settings.cors_origins
    assert cors_middleware.kwargs["allow_origin_regex"] == settings.cors_origin_regex
    assert cors_middleware.kwargs["allow_methods"] == ["GET", "POST", "OPTIONS"]
    assert cors_middleware.kwargs["allow_headers"] == ["*"]


def test_metrics_endpoint_returns_prometheus_payload(monkeypatch) -> None:
    monkeypatch.setattr(settings, "metrics_token", None)

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "resume_analysis_total" in response.text
    assert "resume_analysis_processing_seconds" in response.text


def test_metrics_endpoint_requires_token_when_configured(monkeypatch) -> None:
    monkeypatch.setattr(settings, "metrics_token", "secret-token")

    unauthorized_response = client.get("/metrics")
    authorized_response = client.get(
        "/metrics",
        headers={"Authorization": "Bearer secret-token"},
    )

    assert unauthorized_response.status_code == 401
    assert authorized_response.status_code == 200


def test_api_health_returns_ok_when_all_checks_pass(monkeypatch) -> None:
    async def fake_database_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="ok", latency_ms=12)

    async def fake_groq_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="ok", latency_ms=45)

    monkeypatch.setattr(health_router_module, "run_database_health_check", fake_database_check)
    monkeypatch.setattr(health_router_module, "run_groq_api_health_check", fake_groq_check)
    monkeypatch.setattr(settings, "app_version", "1.0.0")

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["version"] == "1.0.0"
    assert payload["checks"] == {
        "database": {"status": "ok", "latency_ms": 12},
        "groq_api": {"status": "ok", "latency_ms": 45},
    }
    assert datetime.fromisoformat(payload["timestamp"])


def test_api_health_returns_down_when_database_check_fails(monkeypatch) -> None:
    async def fake_database_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="error", latency_ms=3000)

    async def fake_groq_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="ok", latency_ms=45)

    monkeypatch.setattr(health_router_module, "run_database_health_check", fake_database_check)
    monkeypatch.setattr(health_router_module, "run_groq_api_health_check", fake_groq_check)

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "down"
    assert payload["checks"]["database"] == {"status": "error", "latency_ms": 3000}
    assert payload["checks"]["groq_api"] == {"status": "ok", "latency_ms": 45}


def test_api_health_returns_degraded_when_groq_check_fails(monkeypatch) -> None:
    async def fake_database_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="ok", latency_ms=11)

    async def fake_groq_check() -> ServiceHealthCheck:
        return ServiceHealthCheck(status="error", latency_ms=301)

    monkeypatch.setattr(health_router_module, "run_database_health_check", fake_database_check)
    monkeypatch.setattr(health_router_module, "run_groq_api_health_check", fake_groq_check)

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["checks"]["database"] == {"status": "ok", "latency_ms": 11}
    assert payload["checks"]["groq_api"] == {"status": "error", "latency_ms": 301}
