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
def get_async_database_url() -> str | None:
    if not settings.database_url:
        return None

    if settings.database_url.startswith("postgresql://"):
        return settings.database_url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    return settings.database_url


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
