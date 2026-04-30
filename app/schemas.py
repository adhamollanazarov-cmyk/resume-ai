from datetime import datetime
from typing import Any

from pydantic import BaseModel
from pydantic import Field


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
