from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume & Cover Letter Generator"
    app_version: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("VERSION", "APP_VERSION"),
    )

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"),
    )

    use_mock_ai: bool = False
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    internal_api_secret: str | None = None
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("STRIPE_PRO_PRICE_ID", "STRIPE_PRICE_ID"),
    )
    app_frontend_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("APP_FRONTEND_URL", "FRONTEND_URL"),
    )

    max_resume_chars: int = 12000
    max_job_description_chars: int = Field(
        default=6000,
        validation_alias=AliasChoices("MAX_JOB_DESCRIPTION_CHARS", "MAX_JOB_CHARS"),
    )
    max_pdf_size_mb: int = 5
    rate_limit_analyze: str = Field(
        default="5/minute",
        validation_alias=AliasChoices("RATE_LIMIT_ANALYZE"),
    )
    ai_timeout_seconds: int = Field(
        default=25,
        validation_alias=AliasChoices("AI_TIMEOUT_SECONDS"),
    )
    metrics_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("METRICS_TOKEN"),
    )
    free_analysis_limit: int = 3

    database_url: str | None = None

    frontend_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FRONTEND_URL"),
    )
    allow_vercel_preview_origins: bool = Field(
        default=False,
        validation_alias=AliasChoices("ALLOW_VERCEL_PREVIEW_ORIGINS"),
    )

    frontend_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias=AliasChoices("FRONTEND_ORIGINS"),
    )

    @property
    def cors_origins(self) -> list[str]:
        origins: list[str] = []
        seen: set[str] = set()

        raw_origins = self.frontend_origins.split(",")

        if self.frontend_url:
            raw_origins.append(self.frontend_url)

        for origin in raw_origins:
            origin = origin.strip().rstrip("/")
            if origin and origin not in seen:
                origins.append(origin)
                seen.add(origin)

        return origins

    @property
    def cors_origin_regex(self) -> str | None:
        if not self.allow_vercel_preview_origins:
            return None

        return r"^https://[a-z0-9-]+\.vercel\.app$"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
