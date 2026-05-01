from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_stripe_customer_id(db: AsyncSession, stripe_customer_id: str) -> User | None:
    result = await db.execute(select(User).where(User.stripe_customer_id == stripe_customer_id))
    return result.scalar_one_or_none()


async def get_user_by_stripe_subscription_id(db: AsyncSession, stripe_subscription_id: str) -> User | None:
    result = await db.execute(select(User).where(User.stripe_subscription_id == stripe_subscription_id))
    return result.scalar_one_or_none()


async def upsert_user_by_email(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
    image: str | None,
) -> User:
    user = await get_user_by_email(db, email)

    if user is None:
        user = User(email=email, name=name, image=image)
        db.add(user)
    else:
        user.name = name
        user.image = image

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    await db.refresh(user)
    return user


async def upsert_user_from_auth(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
    image: str | None,
) -> User:
    return await upsert_user_by_email(
        db,
        email=email,
        name=name,
        image=image,
    )


async def promote_user_to_pro(
    db: AsyncSession,
    *,
    user: User,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> User:
    user.plan = "pro"
    if stripe_customer_id:
        user.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        user.stripe_subscription_id = stripe_subscription_id

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    await db.refresh(user)
    return user


async def downgrade_user_to_free(db: AsyncSession, *, user: User) -> User:
    user.plan = "free"
    user.stripe_subscription_id = None

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    await db.refresh(user)
    return user
