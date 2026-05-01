from types import SimpleNamespace

import app.main as main_module
from fastapi.testclient import TestClient

from app.db import get_optional_db
from app.main import app

client = TestClient(app)


def test_user_can_view_own_analysis(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_get_user_by_id(db: object, user_id: int) -> object:
        return SimpleNamespace(id=user_id, email="user@example.com", plan="free", analysis_count=1)

    async def fake_get_analysis_by_id_for_user(db: object, analysis_id: int, user_id: int) -> object | None:
        assert analysis_id == 12
        assert user_id == 7
        return SimpleNamespace(
            id=12,
            resume_text="Resume preview text " * 80,
            job_description="Backend engineer with FastAPI and PostgreSQL experience.",
            analysis_json={
                "match_score": 85,
                "score_reasoning": "Strong backend alignment.",
                "missing_skills": [],
                "keyword_gaps": [],
                "resume_improvements": ["Add observability examples."],
                "rewritten_bullets": [
                    "Built FastAPI endpoints for internal workflows.",
                    "Maintained business APIs for internal teams.",
                    "Improved backend validation and reliability.",
                    "Partnered with stakeholders on backend delivery.",
                ],
                "optimized_resume": "SUMMARY\n- Backend engineer with FastAPI experience.",
                "cover_letter": "Dear Hiring Manager,\n\nI am interested.\n\nThank you.",
                "risk_flags": [],
            },
            created_at="2026-05-01T12:00:00+00:00",
        )

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(main_module, "get_analysis_by_id_for_user", fake_get_analysis_by_id_for_user)

    try:
        response = client.get(
            "/api/account/analyses/12",
            headers={
                "X-Internal-API-Secret": "test-secret",
                "X-User-Id": "7",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["id"] == 12
    assert response.json()["analysis_json"]["match_score"] == 85


def test_user_cannot_view_another_users_analysis(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_get_user_by_id(db: object, user_id: int) -> object:
        return SimpleNamespace(id=user_id, email="user@example.com", plan="free", analysis_count=1)

    async def fake_get_analysis_by_id_for_user(db: object, analysis_id: int, user_id: int) -> object | None:
        assert analysis_id == 22
        assert user_id == 7
        return None

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(main_module, "get_analysis_by_id_for_user", fake_get_analysis_by_id_for_user)

    try:
        response = client.get(
            "/api/account/analyses/22",
            headers={
                "X-Internal-API-Secret": "test-secret",
                "X-User-Id": "7",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"
