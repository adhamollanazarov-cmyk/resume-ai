import app.main as main_module
from fastapi.testclient import TestClient

from app.db import get_optional_db
from app.main import app

client = TestClient(app)


def test_analyze_rejects_non_pdf_upload() -> None:
    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.txt", b"plain text", "text/plain")},
        data={"job_description": "Backend Python role"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file must be a PDF."


def test_analyze_requires_job_description() -> None:
    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"%PDF-1.4 mock pdf", "application/pdf")},
    )

    assert response.status_code == 422
    assert any(
        error["loc"] == ["body", "job_description"]
        for error in response.json()["detail"]
    )


def test_empty_job_description_rejected() -> None:
    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"%PDF-1.4 mock pdf", "application/pdf")},
        data={"job_description": "   "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Job description is required"


def test_analyze_returns_none_when_openai_fails(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        return "Experienced FastAPI developer with REST API background."

    async def fake_analyze_resume(
        resume_text: str, job_description: str
    ) -> dict[str, object]:
        raise RuntimeError("OpenAI is unavailable")

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module, "analyze_resume", fake_analyze_resume)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"mock pdf bytes", "application/pdf")},
        data={"job_description": "FastAPI backend engineer"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "OK"
    assert response.json()["analysis"] is None


def test_analyze_returns_analysis_with_new_fields(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        return "Python backend engineer with FastAPI and REST API experience."

    async def fake_analyze_resume(
        resume_text: str, job_description: str
    ) -> dict[str, object]:
        return {
            "match_score": 81,
            "score_reasoning": "Strong API background, but some cloud keywords are missing.",
            "missing_skills": ["AWS", "Docker"],
            "keyword_gaps": ["microservices", "CI/CD"],
            "resume_improvements": [
                "Add measurable backend performance improvements.",
                "Highlight deployment and testing workflow experience.",
            ],
            "rewritten_bullets": [
                "Built FastAPI endpoints that improved internal workflow efficiency for support teams.",
                "Maintained REST APIs for business applications and reduced recurring support issues.",
                "Collaborated with product stakeholders to deliver backend features on schedule.",
                "Improved API reliability through clearer validation and error handling patterns.",
            ],
            "optimized_resume": (
                "PROFESSIONAL SUMMARY\n"
                "- Python backend engineer with FastAPI and REST API experience.\n\n"
                "CORE SKILLS\n"
                "- FastAPI\n"
                "- REST APIs\n"
                "- Backend development"
            ),
            "cover_letter": (
                "Dear Hiring Manager,\n\n"
                "I am excited to apply for the Backend Engineer role.\n\n"
                "My experience building FastAPI services and business APIs aligns well with the role.\n\n"
                "I would welcome the opportunity to contribute to your team."
            ),
            "risk_flags": ["Cloud platform experience is not clearly shown."],
        }

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module, "analyze_resume", fake_analyze_resume)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"mock pdf bytes", "application/pdf")},
        data={"job_description": "Backend engineer with FastAPI, Docker, and AWS"},
    )

    assert response.status_code == 200
    analysis = response.json()["analysis"]
    assert analysis is not None
    assert analysis["match_score"] == 81
    assert analysis["score_reasoning"]
    assert analysis["keyword_gaps"] == ["microservices", "CI/CD"]
    assert len(analysis["rewritten_bullets"]) == 4
    assert analysis["optimized_resume"]
    assert analysis["risk_flags"] == ["Cloud platform experience is not clearly shown."]


def test_analyze_returns_200_without_database_url(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        return "Python backend engineer with FastAPI and REST API experience."

    async def fake_analyze_resume(
        resume_text: str, job_description: str
    ) -> dict[str, object]:
        return {
            "match_score": 78,
            "score_reasoning": "Relevant backend experience is visible.",
            "missing_skills": ["Docker"],
            "keyword_gaps": ["CI/CD"],
            "resume_improvements": ["Add deployment details."],
            "rewritten_bullets": [
                "Built FastAPI endpoints for internal business workflows.",
                "Maintained backend APIs used by internal teams.",
                "Improved service reliability through stronger validation.",
                "Worked with stakeholders to deliver backend updates.",
            ],
            "optimized_resume": "SUMMARY\n- Backend engineer with FastAPI experience.",
            "cover_letter": "Dear Hiring Manager,\n\nI am interested in the role.\n\nThank you.",
            "risk_flags": ["Cloud tooling is not clearly shown."],
        }

    async def fake_create_analysis(**kwargs: object) -> object:
        raise AssertionError("DB persistence should be skipped when DATABASE_URL is missing.")

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module, "analyze_resume", fake_analyze_resume)
    monkeypatch.setattr(main_module, "create_analysis", fake_create_analysis)
    monkeypatch.setattr(main_module.settings, "database_url", None)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"mock pdf bytes", "application/pdf")},
        data={"job_description": "Backend engineer with FastAPI and Docker"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "OK"
    assert response.json()["analysis"]["optimized_resume"]


def test_analyze_returns_mock_analysis_when_enabled(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        return "Senior backend engineer with FastAPI, Python, and API delivery experience."

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module.settings, "use_mock_ai", True)
    monkeypatch.setattr(main_module.settings, "database_url", None)
    monkeypatch.setattr(main_module.settings, "openai_api_key", None)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"mock pdf bytes", "application/pdf")},
        data={"job_description": "Backend engineer with Python, FastAPI, Docker, and AWS"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "OK"
    assert response.json()["analysis"] is not None
    assert response.json()["analysis"]["optimized_resume"]


def test_analyze_rejects_large_pdf(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        raise AssertionError("Large PDF should be rejected before parsing.")

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module.settings, "max_pdf_size_mb", 1)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"x" * (1024 * 1024 + 1), "application/pdf")},
        data={"job_description": "Backend engineer with Python"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "PDF file too large"


def test_long_job_description_rejected(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        raise AssertionError("Long job description should be rejected before parsing.")

    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module.settings, "max_job_description_chars", 10)

    response = client.post(
        "/api/cv/analyze",
        files={"pdf": ("resume.pdf", b"%PDF-1.4 mock pdf", "application/pdf")},
        data={"job_description": "x" * 11},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Job description is too long"


def test_analyze_returns_200_when_db_save_fails(monkeypatch) -> None:
    async def fake_extract_text_from_pdf(file: object) -> str:
        return "Python backend engineer with FastAPI and REST API experience."

    async def fake_analyze_resume(
        resume_text: str, job_description: str
    ) -> dict[str, object]:
        return {
            "match_score": 84,
            "score_reasoning": "Strong backend alignment.",
            "missing_skills": [],
            "keyword_gaps": ["observability"],
            "resume_improvements": ["Add production support scope."],
            "rewritten_bullets": [
                "Built FastAPI endpoints for internal business workflows.",
                "Maintained backend APIs used by internal teams.",
                "Improved service reliability through stronger validation.",
                "Worked with stakeholders to deliver backend updates.",
            ],
            "optimized_resume": "SUMMARY\n- Backend engineer with FastAPI experience.",
            "cover_letter": "Dear Hiring Manager,\n\nI am interested in the role.\n\nThank you.",
            "risk_flags": ["Production scale is not fully clear."],
        }

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_create_analysis(**kwargs: object) -> object:
        raise RuntimeError("database unavailable")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module, "extract_text_from_pdf", fake_extract_text_from_pdf)
    monkeypatch.setattr(main_module, "analyze_resume", fake_analyze_resume)
    monkeypatch.setattr(main_module, "create_analysis", fake_create_analysis)
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )

    try:
        response = client.post(
            "/api/cv/analyze",
            files={"pdf": ("resume.pdf", b"mock pdf bytes", "application/pdf")},
            data={"job_description": "Backend engineer with FastAPI"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["status"] == "OK"
    assert response.json()["analysis"]["match_score"] == 84


def test_history_list_without_database_returns_empty(monkeypatch) -> None:
    monkeypatch.setattr(main_module.settings, "database_url", None)

    response = client.get("/api/analyses")

    assert response.status_code == 200
    assert response.json() == []


def test_history_list_accepts_pagination_params(monkeypatch) -> None:
    captured: dict[str, int] = {}

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_list_analyses(db: object, limit: int = 20, offset: int = 0) -> list[object]:
        captured["limit"] = limit
        captured["offset"] = offset
        return []

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module, "list_analyses", fake_list_analyses)

    try:
        response = client.get("/api/analyses?limit=20&offset=0")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []
    assert captured == {"limit": 20, "offset": 0}


def test_history_list_rejects_limit_above_max() -> None:
    response = client.get("/api/analyses?limit=51&offset=0")

    assert response.status_code == 422


def test_history_list_rejects_negative_offset() -> None:
    response = client.get("/api/analyses?limit=20&offset=-1")

    assert response.status_code == 422


def test_history_detail_without_database_returns_404(monkeypatch) -> None:
    monkeypatch.setattr(main_module.settings, "database_url", None)

    response = client.get("/api/analyses/1")

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"
