from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Resume & Cover Letter Generator"
    app_version: str = "0.1.0"

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"),
    )

    use_mock_ai: bool = False
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    max_resume_chars: int = 12000
    max_job_description_chars: int = Field(
        default=6000,
        validation_alias=AliasChoices("MAX_JOB_DESCRIPTION_CHARS", "MAX_JOB_CHARS"),
    )
    max_pdf_size_mb: int = 5

    database_url: str | None = None

    frontend_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("FRONTEND_URL"),
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()