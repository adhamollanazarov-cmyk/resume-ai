from typing import Any

from app.config import settings


class StripeConfigurationError(RuntimeError):
    pass


class StripeWebhookVerificationError(RuntimeError):
    pass


def _get_stripe_module() -> Any:
    secret_key = (settings.stripe_secret_key or "").strip()
    if not secret_key:
        raise StripeConfigurationError("STRIPE_SECRET_KEY is not configured")

    try:
        import stripe  # type: ignore[import-not-found]
    except ImportError as exc:
        raise StripeConfigurationError("Stripe SDK is not installed.") from exc

    stripe.api_key = secret_key
    return stripe


def _get_frontend_url() -> str:
    frontend_url = (settings.app_frontend_url or settings.frontend_url or "").strip().rstrip("/")
    if not frontend_url:
        raise StripeConfigurationError("APP_FRONTEND_URL is not configured")

    return frontend_url


def _get_price_id() -> str:
    price_id = (settings.stripe_price_id or "").strip()
    if not price_id:
        raise StripeConfigurationError("STRIPE_PRO_PRICE_ID is not configured")

    return price_id


def create_checkout_session_url(
    *,
    user_id: int,
    user_email: str,
    stripe_customer_id: str | None,
) -> str:
    stripe = _get_stripe_module()
    frontend_url = _get_frontend_url()
    price_id = _get_price_id()

    session_params: dict[str, Any] = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{frontend_url}/dashboard?upgraded=1",
        "cancel_url": f"{frontend_url}/dashboard?upgrade=cancelled",
        "client_reference_id": str(user_id),
        "metadata": {
            "user_id": str(user_id),
            "user_email": user_email,
        },
        "subscription_data": {
            "metadata": {
                "user_id": str(user_id),
                "user_email": user_email,
            }
        },
    }

    if stripe_customer_id:
        session_params["customer"] = stripe_customer_id
    else:
        session_params["customer_email"] = user_email

    session = stripe.checkout.Session.create(**session_params)
    url = getattr(session, "url", None) or session.get("url")
    if not isinstance(url, str) or not url:
        raise RuntimeError("Stripe checkout session did not return a checkout URL.")

    return url


def create_billing_portal_session_url(*, stripe_customer_id: str) -> str:
    stripe = _get_stripe_module()
    frontend_url = _get_frontend_url()

    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=f"{frontend_url}/dashboard",
    )
    url = getattr(session, "url", None) or session.get("url")
    if not isinstance(url, str) or not url:
        raise RuntimeError("Stripe billing portal session did not return a portal URL.")

    return url


def construct_stripe_event(payload: bytes, signature_header: str | None) -> Any:
    webhook_secret = (settings.stripe_webhook_secret or "").strip()
    if not webhook_secret:
        raise StripeConfigurationError("STRIPE_WEBHOOK_SECRET is not configured")

    if not signature_header:
        raise StripeWebhookVerificationError("Missing Stripe-Signature header.")

    stripe = _get_stripe_module()

    try:
        return stripe.Webhook.construct_event(payload, signature_header, webhook_secret)
    except ValueError as exc:
        raise StripeWebhookVerificationError("Invalid Stripe webhook payload.") from exc
    except stripe.error.SignatureVerificationError as exc:  # type: ignore[attr-defined]
        raise StripeWebhookVerificationError("Invalid Stripe webhook signature.") from exc
