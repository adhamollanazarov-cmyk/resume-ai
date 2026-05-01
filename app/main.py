import logging
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_optional_db
from app.repositories.analysis_repository import create_analysis, get_analysis_by_id, list_analyses
from app.schemas import AnalysisDetail, AnalysisListItem, AnalyzeResponse, HealthResponse
from app.services.ai_service import analyze_resume
from app.services.pdf_parser import PDFParseError, extract_text_from_pdf

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Backend API for resume PDF analysis and job description matching.",
    version=settings.app_version,
)
print("CORS ORIGINS:", settings.cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://resume-ai-hazel-two.vercel.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )


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


@app.post(
    "/api/cv/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_cv(
    pdf: UploadFile = File(..., description="PDF resume file"),
    job_description: str = Form(..., description="Target job description"),
    db: AsyncSession | None = Depends(get_optional_db),
) -> AnalyzeResponse:
    if not _is_pdf_file(pdf):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a PDF.",
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description is required",
        )

    max_pdf_size_bytes = settings.max_pdf_size_mb * 1024 * 1024
    if _get_file_size_bytes(pdf) > max_pdf_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file too large",
        )

    if len(job_description) > settings.max_job_description_chars:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Job description is too long",
        )

    try:
        resume_text = await extract_text_from_pdf(pdf)
    except PDFParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    try:
        analysis = await analyze_resume(resume_text, job_description)
    except Exception:
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
            )
        except Exception:
            logger.exception("Failed to save analysis to PostgreSQL.")

    return AnalyzeResponse(
        resume_text_preview=resume_text[:1500],
        job_description=job_description,
        analysis=analysis_payload,
        status="OK",
    )
