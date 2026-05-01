from datetime import datetime, timezone

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

resume_analysis_total = Counter(
    "resume_analysis_total",
    "Total resume analyses completed, labeled by UTC day.",
    ["date"],
)
resume_analysis_ai_errors_total = Counter(
    "resume_analysis_ai_errors_total",
    "Total AI analysis errors.",
)
resume_analysis_invalid_pdf_total = Counter(
    "resume_analysis_invalid_pdf_total",
    "Total invalid PDF uploads.",
)
resume_analysis_pdf_too_large_total = Counter(
    "resume_analysis_pdf_too_large_total",
    "Total PDF uploads rejected for size.",
)
resume_analysis_processing_seconds = Histogram(
    "resume_analysis_processing_seconds",
    "Processing time for POST /api/cv/analyze in seconds.",
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 60.0),
)
resume_analysis_resume_chars = Histogram(
    "resume_analysis_resume_chars",
    "Extracted resume text length in characters.",
    buckets=(250, 500, 1000, 2000, 4000, 8000, 12000, 20000, 50000),
)


def increment_resume_analysis_total() -> None:
    current_date = datetime.now(timezone.utc).date().isoformat()
    resume_analysis_total.labels(date=current_date).inc()


def increment_ai_errors() -> None:
    resume_analysis_ai_errors_total.inc()


def increment_invalid_pdf_uploads() -> None:
    resume_analysis_invalid_pdf_total.inc()


def increment_pdf_too_large() -> None:
    resume_analysis_pdf_too_large_total.inc()


def observe_processing_seconds(duration_seconds: float) -> None:
    resume_analysis_processing_seconds.observe(duration_seconds)


def observe_resume_chars(character_count: int) -> None:
    resume_analysis_resume_chars.observe(character_count)


def render_metrics() -> bytes:
    return generate_latest()


METRICS_CONTENT_TYPE = CONTENT_TYPE_LATEST
