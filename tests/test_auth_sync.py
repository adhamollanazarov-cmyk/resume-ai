from types import SimpleNamespace

import app.main as main_module
from fastapi.testclient import TestClient

from app.db import get_optional_db
from app.main import app

client = TestClient(app)

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai"


def test_sync_user_rejects_missing_secret(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_upsert_user_from_auth(**kwargs: object) -> object:
        raise AssertionError("User sync should not run without the internal API secret.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module.settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "upsert_user_from_auth", fake_upsert_user_from_auth)

    try:
        response = client.post(
            "/api/auth/sync-user",
            json={
                "email": "user@example.com",
                "name": "Example User",
                "image": "https://example.com/avatar.png",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_sync_user_rejects_invalid_secret(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_upsert_user_from_auth(**kwargs: object) -> object:
        raise AssertionError("User sync should not run with an invalid internal API secret.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module.settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "upsert_user_from_auth", fake_upsert_user_from_auth)

    try:
        response = client.post(
            "/api/auth/sync-user",
            json={
                "email": "user@example.com",
                "name": "Example User",
                "image": "https://example.com/avatar.png",
            },
            headers={"X-Internal-API-Secret": "wrong-secret"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_sync_user_rejects_invalid_email(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_upsert_user_from_auth(**kwargs: object) -> object:
        raise AssertionError("User sync should not run for an invalid email payload.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module.settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "upsert_user_from_auth", fake_upsert_user_from_auth)

    try:
        response = client.post(
            "/api/auth/sync-user",
            json={
                "email": "not-an-email",
                "name": "Example User",
                "image": "https://example.com/avatar.png",
            },
            headers={"X-Internal-API-Secret": "test-secret"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "email"]


def test_sync_user_creates_new_user(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_upsert_user_from_auth(
        db: object,
        *,
        email: str,
        name: str | None,
        image: str | None,
    ) -> object:
        captured.update(
            {
                "db": db,
                "email": email,
                "name": name,
                "image": image,
            }
        )
        return SimpleNamespace(
            id=11,
            email=email,
            name=name,
            image=image,
            plan="free",
            analysis_count=0,
        )

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module.settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "upsert_user_from_auth", fake_upsert_user_from_auth)

    try:
        response = client.post(
            "/api/auth/sync-user",
            json={
                "email": "new-user@example.com",
                "name": "New User",
                "image": "https://example.com/new-user.png",
            },
            headers={"X-Internal-API-Secret": "test-secret"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": 11,
        "email": "new-user@example.com",
        "name": "New User",
        "image": "https://example.com/new-user.png",
        "plan": "free",
        "analysis_count": 0,
    }
    assert captured["email"] == "new-user@example.com"
    assert captured["name"] == "New User"
    assert captured["image"] == "https://example.com/new-user.png"


def test_sync_user_updates_existing_user(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_upsert_user_from_auth(
        db: object,
        *,
        email: str,
        name: str | None,
        image: str | None,
    ) -> object:
        captured.update(
            {
                "email": email,
                "name": name,
                "image": image,
            }
        )
        return SimpleNamespace(
            id=7,
            email=email,
            name=name,
            image=image,
            plan="pro",
            analysis_count=5,
        )

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(main_module.settings, "database_url", TEST_DATABASE_URL)
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "upsert_user_from_auth", fake_upsert_user_from_auth)

    try:
        response = client.post(
            "/api/auth/sync-user",
            json={
                "email": "existing@example.com",
                "name": "Updated Name",
                "image": "https://example.com/updated.png",
            },
            headers={"X-Internal-API-Secret": "test-secret"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "id": 7,
        "email": "existing@example.com",
        "name": "Updated Name",
        "image": "https://example.com/updated.png",
        "plan": "pro",
        "analysis_count": 5,
    }
    assert captured == {
        "email": "existing@example.com",
        "name": "Updated Name",
        "image": "https://example.com/updated.png",
    }
