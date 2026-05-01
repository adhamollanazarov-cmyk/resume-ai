from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine: AsyncEngine | None = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] | None = None


def normalize_database_url(database_url: str, *, async_mode: bool = True) -> str:
    if database_url.startswith("postgres://"):
        driver_prefix = "postgresql+asyncpg://" if async_mode else "postgresql://"
        return database_url.replace("postgres://", driver_prefix, 1)

    if database_url.startswith("postgresql://"):
        if async_mode:
            return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return database_url

    return database_url


def get_async_database_url() -> str | None:
    if not settings.database_url:
        return None

    return normalize_database_url(settings.database_url, async_mode=True)


def _initialize_database() -> async_sessionmaker[AsyncSession]:
    global engine
    global AsyncSessionLocal

    if AsyncSessionLocal is not None:
        return AsyncSessionLocal

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    database_url = get_async_database_url()

    if database_url is None:
        raise RuntimeError("DATABASE_URL is not configured")

    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    return AsyncSessionLocal


def get_session_factory() -> async_sessionmaker[AsyncSession] | None:
    if not settings.database_url:
        return None

    return _initialize_database()


async def get_db() -> AsyncIterator[AsyncSession]:
    session_factory = _initialize_database()
    async with session_factory() as session:
        yield session


async def get_optional_db() -> AsyncIterator[AsyncSession | None]:
    if not settings.database_url:
        yield None
        return

    async for session in get_db():
        yield session
