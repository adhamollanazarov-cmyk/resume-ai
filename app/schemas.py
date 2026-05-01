from datetime import datetime
from typing import Any
from typing import Literal

from pydantic import BaseModel
from pydantic import Field
from pydantic import field_validator

PlanType = Literal["free", "pro"]
HealthCheckStatus = Literal["ok", "error", "not_configured"]
HealthOverallStatus = Literal["ok", "degraded", "down"]


class AIAnalysisResult(BaseModel):
    match_score: int = Field(ge=0, le=100)
    score_reasoning: str
    missing_skills: list[str]
    keyword_gaps: list[str]
    resume_improvements: list[str]
    rewritten_bullets: list[str] = Field(min_length=4, max_length=6)
    optimized_resume: str
    cover_letter: str
    risk_flags: list[str]


class AnalyzeResponse(BaseModel):
    resume_text_preview: str
    job_description: str
    analysis: AIAnalysisResult | None
    status: str


class AnalysisListItem(BaseModel):
    id: int
    job_description: str
    match_score: int | None
    created_at: datetime


class AnalysisDetail(BaseModel):
    id: int
    resume_text_preview: str
    job_description: str
    analysis_json: dict[str, Any]
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str


class ServiceHealthCheck(BaseModel):
    status: HealthCheckStatus
    latency_ms: int | None = None


class APIHealthChecks(BaseModel):
    database: ServiceHealthCheck
    groq_api: ServiceHealthCheck


class APIHealthResponse(BaseModel):
    status: HealthOverallStatus
    timestamp: str
    version: str
    checks: APIHealthChecks


class UserSyncRequest(BaseModel):
    email: str
    name: str | None = None
    image: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized or "@" not in normalized:
            raise ValueError("A valid email address is required.")
        return normalized


class UserSessionInfo(BaseModel):
    id: int
    email: str
    name: str | None
    image: str | None
    plan: PlanType
    analysis_count: int


class CheckoutSessionResponse(BaseModel):
    url: str


class DownloadOptimizedRequest(BaseModel):
    optimized_resume: str
