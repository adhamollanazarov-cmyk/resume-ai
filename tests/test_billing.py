from types import SimpleNamespace

import app.main as main_module
from fastapi.testclient import TestClient

from app.db import get_optional_db
from app.main import app

client = TestClient(app)


def test_create_checkout_session_requires_authenticated_user(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    def fake_create_checkout_session_url(**kwargs: object) -> str:
        raise AssertionError("Stripe checkout should not run for unauthenticated requests.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "create_checkout_session_url", fake_create_checkout_session_url)

    try:
        response = client.post("/api/stripe/create-checkout")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


def test_create_portal_session_requires_authenticated_user(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    def fake_create_billing_portal_session_url(**kwargs: object) -> str:
        raise AssertionError("Stripe portal should not run for unauthenticated requests.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "create_billing_portal_session_url", fake_create_billing_portal_session_url)

    try:
        response = client.get("/api/stripe/portal")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


def test_create_checkout_session_returns_stripe_url(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_get_user_by_id(db: object, user_id: int) -> object:
        return SimpleNamespace(
            id=user_id,
            email="user@example.com",
            stripe_customer_id=None,
            plan="free",
        )

    def fake_create_checkout_session_url(**kwargs: object) -> str:
        captured.update(kwargs)
        return "https://checkout.stripe.com/pay/cs_test_123"

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(main_module, "create_checkout_session_url", fake_create_checkout_session_url)

    try:
        response = client.post(
            "/api/stripe/create-checkout",
            headers={
                "X-Internal-API-Secret": "test-secret",
                "X-User-Id": "7",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"url": "https://checkout.stripe.com/pay/cs_test_123"}
    assert captured == {
        "user_id": 7,
        "user_email": "user@example.com",
        "stripe_customer_id": None,
    }


def test_create_portal_session_requires_stripe_customer_id(monkeypatch) -> None:
    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_get_user_by_id(db: object, user_id: int) -> object:
        return SimpleNamespace(
            id=user_id,
            email="user@example.com",
            stripe_customer_id=None,
            plan="pro",
        )

    def fake_create_billing_portal_session_url(**kwargs: object) -> str:
        raise AssertionError("Portal should not be created without a Stripe customer id.")

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(main_module, "create_billing_portal_session_url", fake_create_billing_portal_session_url)

    try:
        response = client.get(
            "/api/stripe/portal",
            headers={
                "X-Internal-API-Secret": "test-secret",
                "X-User-Id": "7",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Billing portal is unavailable for this account."


def test_create_portal_session_returns_portal_url(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_get_optional_db() -> object:
        yield object()

    async def fake_get_user_by_id(db: object, user_id: int) -> object:
        return SimpleNamespace(
            id=user_id,
            email="user@example.com",
            stripe_customer_id="cus_123",
            plan="pro",
        )

    def fake_create_billing_portal_session_url(*, stripe_customer_id: str) -> str:
        captured["stripe_customer_id"] = stripe_customer_id
        return "https://billing.stripe.com/p/session/test_123"

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module.settings, "internal_api_secret", "test-secret")
    monkeypatch.setattr(main_module, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(main_module, "create_billing_portal_session_url", fake_create_billing_portal_session_url)

    try:
        response = client.get(
            "/api/stripe/portal",
            headers={
                "X-Internal-API-Secret": "test-secret",
                "X-User-Id": "7",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"url": "https://billing.stripe.com/p/session/test_123"}
    assert captured["stripe_customer_id"] == "cus_123"


def test_stripe_webhook_updates_user_plan_to_pro(monkeypatch) -> None:
    promoted: dict[str, object] = {}
    user = SimpleNamespace(
        id=7,
        email="user@example.com",
        stripe_customer_id=None,
        stripe_subscription_id=None,
        plan="free",
    )

    async def fake_get_optional_db() -> object:
        yield object()

    def fake_construct_stripe_event(payload: bytes, signature_header: str | None) -> dict[str, object]:
        assert signature_header == "test-signature"
        return {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer": "cus_123",
                    "customer_email": "user@example.com",
                    "subscription": "sub_123",
                }
            },
        }

    async def fake_get_user_by_stripe_customer_id(db: object, stripe_customer_id: str) -> object | None:
        assert stripe_customer_id == "cus_123"
        return None

    async def fake_get_user_by_email(db: object, email: str) -> object | None:
        assert email == "user@example.com"
        return user

    async def fake_promote_user_to_pro(
        db: object,
        *,
        user: object,
        stripe_customer_id: str | None = None,
        stripe_subscription_id: str | None = None,
    ) -> object:
        promoted["user"] = user
        promoted["stripe_customer_id"] = stripe_customer_id
        promoted["stripe_subscription_id"] = stripe_subscription_id
        user.plan = "pro"
        user.stripe_customer_id = stripe_customer_id
        user.stripe_subscription_id = stripe_subscription_id
        return user

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module, "construct_stripe_event", fake_construct_stripe_event)
    monkeypatch.setattr(main_module, "get_user_by_stripe_customer_id", fake_get_user_by_stripe_customer_id)
    monkeypatch.setattr(main_module, "get_user_by_email", fake_get_user_by_email)
    monkeypatch.setattr(main_module, "promote_user_to_pro", fake_promote_user_to_pro)

    try:
        response = client.post(
            "/api/stripe/webhook",
            data=b'{"id":"evt_test"}',
            headers={"Stripe-Signature": "test-signature"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"received": True}
    assert promoted["user"] is user
    assert promoted["stripe_customer_id"] == "cus_123"
    assert promoted["stripe_subscription_id"] == "sub_123"
    assert user.plan == "pro"


def test_stripe_webhook_downgrades_user_when_subscription_is_deleted(monkeypatch) -> None:
    downgraded: dict[str, object] = {}
    user = SimpleNamespace(
        id=7,
        email="user@example.com",
        stripe_customer_id="cus_123",
        stripe_subscription_id="sub_123",
        plan="pro",
    )

    async def fake_get_optional_db() -> object:
        yield object()

    def fake_construct_stripe_event(payload: bytes, signature_header: str | None) -> dict[str, object]:
        assert signature_header == "test-signature"
        return {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_123",
                    "customer": "cus_123",
                }
            },
        }

    async def fake_get_user_by_stripe_subscription_id(db: object, stripe_subscription_id: str) -> object | None:
        assert stripe_subscription_id == "sub_123"
        return user

    async def fake_downgrade_user_to_free(db: object, *, user: object) -> object:
        downgraded["user"] = user
        user.plan = "free"
        user.stripe_subscription_id = None
        return user

    app.dependency_overrides[get_optional_db] = fake_get_optional_db
    monkeypatch.setattr(
        main_module.settings,
        "database_url",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai",
    )
    monkeypatch.setattr(main_module, "construct_stripe_event", fake_construct_stripe_event)
    monkeypatch.setattr(main_module, "get_user_by_stripe_subscription_id", fake_get_user_by_stripe_subscription_id)
    monkeypatch.setattr(main_module, "downgrade_user_to_free", fake_downgrade_user_to_free)

    try:
        response = client.post(
            "/api/stripe/webhook",
            data=b'{"id":"evt_test"}',
            headers={"Stripe-Signature": "test-signature"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"received": True}
    assert downgraded["user"] is user
    assert user.plan == "free"
    assert user.stripe_subscription_id is None
