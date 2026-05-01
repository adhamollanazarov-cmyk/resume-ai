import logging
from time import monotonic
from typing import Any

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_optional_db
from app.metrics import (
    METRICS_CONTENT_TYPE,
    increment_ai_errors,
    increment_invalid_pdf_uploads,
    increment_pdf_too_large,
    increment_resume_analysis_total,
    observe_processing_seconds,
    observe_resume_chars,
    render_metrics,
)
from app.repositories.analysis_repository import (
    create_analysis,
    get_analysis_by_id,
    get_analysis_by_id_for_user,
    list_analyses,
    list_analyses_for_user,
)
from app.repositories.user_repository import (
    downgrade_user_to_free,
    get_user_by_email,
    get_user_by_id,
    get_user_by_stripe_customer_id,
    get_user_by_stripe_subscription_id,
    promote_user_to_pro,
    upsert_user_from_auth,
)
from app.routers.health import router as health_router
from app.schemas import (
    AnalysisDetail,
    AnalysisListItem,
    AnalyzeResponse,
    CheckoutSessionResponse,
    DownloadOptimizedRequest,
    HealthResponse,
    UserSessionInfo,
    UserSyncRequest,
)
from app.security import InMemoryRateLimiter, get_client_ip, is_valid_pdf_header
from app.services.ai_service import analyze_resume
from app.services.pdf_parser import PDFParseError, extract_text_from_pdf
from app.services.stripe_service import (
    StripeConfigurationError,
    StripeWebhookVerificationError,
    create_billing_portal_session_url,
    construct_stripe_event,
    create_checkout_session_url,
)

logger = logging.getLogger(__name__)
analyze_rate_limiter = InMemoryRateLimiter(settings.rate_limit_analyze)

app = FastAPI(
    title=settings.app_name,
    description="Backend API for resume PDF analysis and job description matching.",
    version=settings.app_version,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(health_router)


def _is_pdf_file(file: UploadFile) -> bool:
    content_type_is_pdf = file.content_type == "application/pdf"
    filename_is_pdf = bool(file.filename and file.filename.lower().endswith(".pdf"))
    return content_type_is_pdf or filename_is_pdf


def _to_analysis_dict(analysis: BaseModel | dict[str, Any]) -> dict[str, Any]:
    if isinstance(analysis, BaseModel):
        return analysis.model_dump()
    return analysis


def _get_file_size_bytes(file: UploadFile) -> int:
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    return size


def _has_valid_pdf_header(file: UploadFile) -> bool:
    header = file.file.read(4)
    file.file.seek(0)
    return is_valid_pdf_header(header)


def _to_analysis_list_item(analysis_record: Any) -> AnalysisListItem:
    match_score = analysis_record.analysis_json.get("match_score")
    return AnalysisListItem(
        id=analysis_record.id,
        job_description=analysis_record.job_description,
        match_score=match_score if isinstance(match_score, int) else None,
        created_at=analysis_record.created_at,
    )


def _to_analysis_detail(analysis_record: Any) -> AnalysisDetail:
    return AnalysisDetail(
        id=analysis_record.id,
        resume_text_preview=analysis_record.resume_text[:1200],
        job_description=analysis_record.job_description,
        analysis_json=analysis_record.analysis_json,
        created_at=analysis_record.created_at,
    )


def _build_optimized_resume_download_response(optimized_resume: str) -> Response:
    content = optimized_resume.strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Optimized resume is required",
        )

    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="optimized-resume.txt"'},
    )


def _require_internal_secret(internal_api_secret: str | None) -> None:
    expected_secret = (settings.internal_api_secret or "").strip()
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal API authentication is not configured.",
        )

    if internal_api_secret != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


async def _get_internal_user(
    *,
    db: AsyncSession | None,
    internal_api_secret: str | None,
    user_id: int | None,
) -> Any | None:
    if db is None or user_id is None:
        return None

    expected_secret = (settings.internal_api_secret or "").strip()
    if not expected_secret:
        return None

    if internal_api_secret is None:
        return None

    _require_internal_secret(internal_api_secret)
    return await get_user_by_id(db, user_id)


async def _require_authenticated_internal_user(
    *,
    db: AsyncSession | None,
    internal_api_secret: str | None,
    user_id: int | None,
) -> Any:
    user = await _get_internal_user(
        db=db,
        internal_api_secret=internal_api_secret,
        user_id=user_id,
    )
    if user is None:
        if internal_api_secret is None or user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


async def _find_user_for_checkout_session(
    db: AsyncSession,
    session_object: dict[str, Any],
) -> Any | None:
    customer_id = session_object.get("customer")
    if isinstance(customer_id, str) and customer_id:
        user = await get_user_by_stripe_customer_id(db, customer_id)
        if user is not None:
            return user

    client_reference_id = session_object.get("client_reference_id")
    if isinstance(client_reference_id, str) and client_reference_id.isdigit():
        user = await get_user_by_id(db, int(client_reference_id))
        if user is not None:
            return user

    metadata = session_object.get("metadata")
    if isinstance(metadata, dict):
        metadata_user_id = metadata.get("user_id")
        if isinstance(metadata_user_id, str) and metadata_user_id.isdigit():
            user = await get_user_by_id(db, int(metadata_user_id))
            if user is not None:
                return user

    customer_email = session_object.get("customer_email")
    if isinstance(customer_email, str) and customer_email:
        return await get_user_by_email(db, customer_email)

    customer_details = session_object.get("customer_details")
    if isinstance(customer_details, dict):
        details_email = customer_details.get("email")
        if isinstance(details_email, str) and details_email:
            return await get_user_by_email(db, details_email)

    return None


async def _find_user_for_subscription_event(
    db: AsyncSession,
    subscription_object: dict[str, Any],
) -> Any | None:
    subscription_id = subscription_object.get("id")
    if isinstance(subscription_id, str) and subscription_id:
        user = await get_user_by_stripe_subscription_id(db, subscription_id)
        if user is not None:
            return user

    customer_id = subscription_object.get("customer")
    if isinstance(customer_id, str) and customer_id:
        user = await get_user_by_stripe_customer_id(db, customer_id)
        if user is not None:
            return user

    metadata = subscription_object.get("metadata")
    if isinstance(metadata, dict):
        metadata_user_id = metadata.get("user_id")
        if isinstance(metadata_user_id, str) and metadata_user_id.isdigit():
            user = await get_user_by_id(db, int(metadata_user_id))
            if user is not None:
                return user

        metadata_user_email = metadata.get("user_email")
        if isinstance(metadata_user_email, str) and metadata_user_email:
            user = await get_user_by_email(db, metadata_user_email)
            if user is not None:
                return user

    return None


@app.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )


@app.get("/metrics", status_code=status.HTTP_200_OK)
async def get_metrics(request: Request) -> Response:
    metrics_token = (settings.metrics_token or "").strip()
    if metrics_token:
        authorization = request.headers.get("Authorization", "")
        expected_authorization = f"Bearer {metrics_token}"
        if authorization != expected_authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return Response(content=render_metrics(), media_type=METRICS_CONTENT_TYPE)


@app.post("/api/auth/sync-user", response_model=UserSessionInfo, status_code=status.HTTP_200_OK)
async def sync_user(
    payload: UserSyncRequest,
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
) -> UserSessionInfo:
    if db is None or not settings.database_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    _require_internal_secret(internal_api_secret)
    user = await upsert_user_from_auth(
        db,
        email=payload.email,
        name=payload.name,
        image=payload.image,
    )
    return UserSessionInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        image=user.image,
        plan=user.plan,  # type: ignore[arg-type]
        analysis_count=user.analysis_count,
    )


@app.post("/api/stripe/create-checkout", response_model=CheckoutSessionResponse, status_code=status.HTTP_200_OK)
@app.post("/api/billing/create-checkout-session", response_model=CheckoutSessionResponse, status_code=status.HTTP_200_OK)
async def create_billing_checkout_session(
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
    user_id: int | None = Header(default=None, alias="X-User-Id"),
) -> CheckoutSessionResponse:
    if db is None or not settings.database_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    user = await _require_authenticated_internal_user(
        db=db,
        internal_api_secret=internal_api_secret,
        user_id=user_id,
    )

    try:
        checkout_url = create_checkout_session_url(
            user_id=user.id,
            user_email=user.email,
            stripe_customer_id=getattr(user, "stripe_customer_id", None),
        )
    except StripeConfigurationError:
        logger.exception("Stripe checkout is not configured.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured.") from None
    except Exception:
        logger.exception("Failed to create Stripe checkout session.")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not start the upgrade checkout.") from None

    return CheckoutSessionResponse(url=checkout_url)


@app.get("/api/stripe/portal", response_model=CheckoutSessionResponse, status_code=status.HTTP_200_OK)
@app.post("/api/billing/create-portal-session", response_model=CheckoutSessionResponse, status_code=status.HTTP_200_OK)
async def create_billing_portal_session(
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
    user_id: int | None = Header(default=None, alias="X-User-Id"),
) -> CheckoutSessionResponse:
    if db is None or not settings.database_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    user = await _require_authenticated_internal_user(
        db=db,
        internal_api_secret=internal_api_secret,
        user_id=user_id,
    )

    stripe_customer_id = getattr(user, "stripe_customer_id", None)
    if not isinstance(stripe_customer_id, str) or not stripe_customer_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing portal is unavailable for this account.",
        )

    try:
        portal_url = create_billing_portal_session_url(stripe_customer_id=stripe_customer_id)
    except StripeConfigurationError:
        logger.exception("Stripe billing portal is not configured.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured.") from None
    except Exception:
        logger.exception("Failed to create Stripe billing portal session.")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not open the billing portal.") from None

    return CheckoutSessionResponse(url=portal_url)


@app.post("/api/stripe/webhook", status_code=status.HTTP_200_OK)
@app.post("/api/billing/webhook", status_code=status.HTTP_200_OK)
async def stripe_billing_webhook(
    request: Request,
    db: AsyncSession | None = Depends(get_optional_db),
) -> dict[str, bool]:
    if db is None or not settings.database_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    payload = await request.body()
    signature_header = request.headers.get("Stripe-Signature")

    try:
        event = construct_stripe_event(payload, signature_header)
    except StripeWebhookVerificationError:
        logger.warning("Stripe webhook signature verification failed.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe webhook signature.") from None
    except StripeConfigurationError:
        logger.exception("Stripe webhook is not configured.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured.") from None

    event_type = event.get("type")
    if event_type not in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "customer.subscription.deleted",
    }:
        return {"received": True}

    event_object = event.get("data", {}).get("object", {})
    if not isinstance(event_object, dict):
        logger.warning("Stripe webhook did not include an object payload.")
        return {"received": True}

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        user = await _find_user_for_checkout_session(db, event_object)
        if user is None:
            logger.warning("Stripe checkout webhook could not match a user.")
            return {"received": True}

        try:
            await promote_user_to_pro(
                db,
                user=user,
                stripe_customer_id=event_object.get("customer") if isinstance(event_object.get("customer"), str) else None,
                stripe_subscription_id=event_object.get("subscription") if isinstance(event_object.get("subscription"), str) else None,
            )
        except Exception:
            logger.exception("Failed to promote user after successful Stripe checkout.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed.") from None

        return {"received": True}

    user = await _find_user_for_subscription_event(db, event_object)
    if user is None:
        logger.warning("Stripe subscription webhook could not match a user.")
        return {"received": True}

    try:
        await downgrade_user_to_free(db, user=user)
    except Exception:
        logger.exception("Failed to downgrade user after Stripe subscription deletion.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed.") from None

    return {"received": True}


@app.get("/api/cv/download-optimized", status_code=status.HTTP_200_OK)
async def download_optimized_resume(
    optimized_resume: str | None = Header(default=None, alias="X-Optimized-Resume"),
) -> Response:
    return _build_optimized_resume_download_response(optimized_resume or "")


@app.post("/api/cv/download-optimized", status_code=status.HTTP_200_OK)
async def download_optimized_resume_post(payload: DownloadOptimizedRequest) -> Response:
    return _build_optimized_resume_download_response(payload.optimized_resume)


@app.get("/api/analyses", response_model=list[AnalysisListItem], status_code=status.HTTP_200_OK)
async def get_analyses(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession | None = Depends(get_optional_db),
) -> list[AnalysisListItem]:
    if not settings.database_url or db is None:
        return []

    try:
        analyses = await list_analyses(db, limit=limit, offset=offset)
    except Exception:
        logger.exception("Failed to list saved analyses.")
        return []

    return [_to_analysis_list_item(analysis) for analysis in analyses]


@app.get("/api/analyses/{analysis_id}", response_model=AnalysisDetail, status_code=status.HTTP_200_OK)
async def get_analysis_detail(
    analysis_id: int,
    db: AsyncSession | None = Depends(get_optional_db),
) -> AnalysisDetail:
    if not settings.database_url or db is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    try:
        analysis_record = await get_analysis_by_id(db, analysis_id)
    except Exception:
        logger.exception("Failed to load analysis detail.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found") from None

    if analysis_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return _to_analysis_detail(analysis_record)


@app.get("/api/account/analyses", response_model=list[AnalysisListItem], status_code=status.HTTP_200_OK)
async def get_current_user_analyses(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
    user_id: int | None = Header(default=None, alias="X-User-Id"),
) -> list[AnalysisListItem]:
    if not settings.database_url or db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    user = await _require_authenticated_internal_user(
        db=db,
        internal_api_secret=internal_api_secret,
        user_id=user_id,
    )

    try:
        analyses = await list_analyses_for_user(db, user.id, limit=limit, offset=offset)
    except Exception:
        logger.exception("Failed to list current user analyses.")
        return []

    return [_to_analysis_list_item(analysis) for analysis in analyses]


@app.get("/api/account/analyses/{analysis_id}", response_model=AnalysisDetail, status_code=status.HTTP_200_OK)
async def get_current_user_analysis_detail(
    analysis_id: int,
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
    user_id: int | None = Header(default=None, alias="X-User-Id"),
) -> AnalysisDetail:
    if not settings.database_url or db is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured.")

    user = await _require_authenticated_internal_user(
        db=db,
        internal_api_secret=internal_api_secret,
        user_id=user_id,
    )

    try:
        analysis_record = await get_analysis_by_id_for_user(db, analysis_id, user.id)
    except Exception:
        logger.exception("Failed to load current user analysis detail.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found") from None

    if analysis_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return _to_analysis_detail(analysis_record)


@app.post(
    "/api/cv/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_cv(
    request: Request,
    pdf: UploadFile = File(..., description="PDF resume file"),
    job_description: str = Form(..., description="Target job description"),
    db: AsyncSession | None = Depends(get_optional_db),
    internal_api_secret: str | None = Header(default=None, alias="X-Internal-API-Secret"),
    user_id: int | None = Header(default=None, alias="X-User-Id"),
) -> AnalyzeResponse:
    started_at = monotonic()

    try:
        analyze_rate_limiter.check(get_client_ip(request))

        if not _is_pdf_file(pdf):
            increment_invalid_pdf_uploads()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a PDF.",
            )

        if not _has_valid_pdf_header(pdf):
            increment_invalid_pdf_uploads()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid PDF.",
            )

        if not job_description.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description is required",
            )

        max_pdf_size_bytes = settings.max_pdf_size_mb * 1024 * 1024
        if _get_file_size_bytes(pdf) > max_pdf_size_bytes:
            increment_pdf_too_large()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="PDF file too large",
            )

        if len(job_description) > settings.max_job_description_chars:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Job description is too long",
            )

        user = await _get_internal_user(
            db=db,
            internal_api_secret=internal_api_secret,
            user_id=user_id,
        )
        if user is not None and user.plan != "pro" and user.analysis_count >= settings.free_analysis_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free analysis limit reached. Upgrade to Pro to continue.",
            )

        try:
            resume_text = await extract_text_from_pdf(pdf)
        except PDFParseError as exc:
            increment_invalid_pdf_uploads()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        observe_resume_chars(len(resume_text))

        try:
            analysis = await analyze_resume(resume_text, job_description)
        except Exception:
            increment_ai_errors()
            logger.exception("AI analysis failed.")
            analysis = None

        analysis_payload = _to_analysis_dict(analysis) if analysis is not None else None

        if analysis_payload is not None and settings.database_url and db is not None:
            try:
                await create_analysis(
                    db=db,
                    resume_text=resume_text,
                    job_description=job_description,
                    analysis=analysis_payload,
                    user=user,
                )
            except Exception:
                logger.exception("Failed to save analysis to PostgreSQL.")

        increment_resume_analysis_total()
        return AnalyzeResponse(
            resume_text_preview=resume_text[:1500],
            job_description=job_description,
            analysis=analysis_payload,
            status="OK",
        )
    finally:
        observe_processing_seconds(monotonic() - started_at)
