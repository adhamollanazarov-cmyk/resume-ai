import asyncio
from types import SimpleNamespace

from app.repositories.analysis_repository import create_analysis


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.commit_called = 0
        self.refresh_called = 0
        self.rollback_called = 0

    def add(self, item: object) -> None:
        self.added.append(item)

    async def commit(self) -> None:
        self.commit_called += 1

    async def refresh(self, item: object) -> None:
        self.refresh_called += 1

    async def rollback(self) -> None:
        self.rollback_called += 1


def test_create_analysis_increments_user_analysis_count_for_successful_save() -> None:
    session = FakeSession()
    user = SimpleNamespace(id=11, analysis_count=2)

    analysis_record = asyncio.run(
        create_analysis(
            db=session,  # type: ignore[arg-type]
            resume_text="resume text",
            job_description="job description",
            analysis={"match_score": 91},
            user=user,  # type: ignore[arg-type]
        )
    )

    assert session.commit_called == 1
    assert session.refresh_called == 1
    assert session.rollback_called == 0
    assert user.analysis_count == 3
    assert analysis_record.user_id == 11


def test_create_analysis_keeps_user_optional() -> None:
    session = FakeSession()

    analysis_record = asyncio.run(
        create_analysis(
            db=session,  # type: ignore[arg-type]
            resume_text="resume text",
            job_description="job description",
            analysis={"match_score": 75},
        )
    )

    assert session.commit_called == 1
    assert analysis_record.user_id is None
