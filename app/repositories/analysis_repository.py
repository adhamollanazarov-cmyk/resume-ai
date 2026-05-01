from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Analysis, User


async def create_analysis(
    db: AsyncSession,
    resume_text: str,
    job_description: str,
    analysis: dict[str, Any],
    user: User | None = None,
) -> Analysis:
    analysis_record = Analysis(
        user_id=user.id if user is not None else None,
        resume_text=resume_text,
        job_description=job_description,
        analysis_json=analysis,
    )
    db.add(analysis_record)
    if user is not None:
        user.analysis_count += 1

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    await db.refresh(analysis_record)
    return analysis_record


async def list_analyses(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
) -> list[Analysis]:
    query = (
        select(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_analysis_by_id(db: AsyncSession, analysis_id: int) -> Analysis | None:
    query = select(Analysis).where(Analysis.id == analysis_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def list_analyses_for_user(
    db: AsyncSession,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> list[Analysis]:
    query = (
        select(Analysis)
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_analysis_by_id_for_user(db: AsyncSession, analysis_id: int, user_id: int) -> Analysis | None:
    query = select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()
