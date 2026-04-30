from __future__ import annotations

import json
import sqlite3
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class UserRecord:
    user_id: int
    username: str | None
    first_name: str
    energy_level: str | None
    available_time: str | None
    main_goal: str | None
    onboarding_step: str | None
    current_task_title: str | None
    task_levels_json: str | None
    current_level: int | None
    status: str
    follow_up_stage: int
    next_follow_up_at: str | None
    timer_ends_at: str | None
    last_interaction_at: str | None
    last_bot_message_id: int | None

    @property
    def task_levels(self) -> list[str]:
        if not self.task_levels_json:
            return []
        return json.loads(self.task_levels_json)


class Database:
    _ALLOWED_FIELDS = {
        "username",
        "first_name",
        "energy_level",
        "available_time",
        "main_goal",
        "onboarding_step",
        "current_task_title",
        "task_levels_json",
        "current_level",
        "status",
        "follow_up_stage",
        "next_follow_up_at",
        "timer_ends_at",
        "last_interaction_at",
        "last_bot_message_id",
    }

    def __init__(self, path: str | Path) -> None:
        self.path = str(path)
        self._lock = threading.Lock()

    def init_schema(self) -> None:
        schema = """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT NOT NULL DEFAULT '',
            energy_level TEXT,
            available_time TEXT,
            main_goal TEXT,
            onboarding_step TEXT,
            current_task_title TEXT,
            task_levels_json TEXT,
            current_level INTEGER,
            status TEXT NOT NULL DEFAULT 'new',
            follow_up_stage INTEGER NOT NULL DEFAULT 0,
            next_follow_up_at TEXT,
            timer_ends_at TEXT,
            last_interaction_at TEXT,
            last_bot_message_id INTEGER
        );
        """

        with self._lock, sqlite3.connect(self.path) as connection:
            connection.executescript(schema)
            connection.commit()

    def ensure_user(self, user_id: int, username: str | None, first_name: str, now_iso: str) -> None:
        query = """
        INSERT INTO users (user_id, username, first_name, last_interaction_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            username = excluded.username,
            first_name = excluded.first_name
        """
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute(query, (user_id, username, first_name, now_iso))
            connection.commit()

    def reset_onboarding(self, user_id: int, now_iso: str) -> None:
        self.update_user(
            user_id,
            energy_level=None,
            available_time=None,
            main_goal=None,
            onboarding_step="energy",
            current_task_title=None,
            task_levels_json=None,
            current_level=None,
            status="onboarding",
            follow_up_stage=0,
            next_follow_up_at=None,
            timer_ends_at=None,
            last_interaction_at=now_iso,
            last_bot_message_id=None,
        )

    def set_active_task(
        self,
        user_id: int,
        *,
        task_title: str,
        task_levels: list[str],
        current_level: int,
        status: str,
        last_interaction_at: str,
    ) -> None:
        self.update_user(
            user_id,
            current_task_title=task_title,
            task_levels_json=json.dumps(task_levels),
            current_level=current_level,
            status=status,
            onboarding_step=None,
            follow_up_stage=0,
            next_follow_up_at=None,
            timer_ends_at=None,
            last_interaction_at=last_interaction_at,
        )

    def get_user(self, user_id: int) -> UserRecord | None:
        query = "SELECT * FROM users WHERE user_id = ?"
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.row_factory = sqlite3.Row
            row = connection.execute(query, (user_id,)).fetchone()

        if row is None:
            return None

        return UserRecord(
            user_id=row["user_id"],
            username=row["username"],
            first_name=row["first_name"],
            energy_level=row["energy_level"],
            available_time=row["available_time"],
            main_goal=row["main_goal"],
            onboarding_step=row["onboarding_step"],
            current_task_title=row["current_task_title"],
            task_levels_json=row["task_levels_json"],
            current_level=row["current_level"],
            status=row["status"],
            follow_up_stage=row["follow_up_stage"],
            next_follow_up_at=row["next_follow_up_at"],
            timer_ends_at=row["timer_ends_at"],
            last_interaction_at=row["last_interaction_at"],
            last_bot_message_id=row["last_bot_message_id"],
        )

    def update_user(self, user_id: int, **fields: Any) -> None:
        if not fields:
            return

        unknown_fields = set(fields) - self._ALLOWED_FIELDS
        if unknown_fields:
            raise ValueError(f"Unsupported user fields: {sorted(unknown_fields)}")

        assignments = ", ".join(f"{field} = ?" for field in fields)
        params = list(fields.values())
        params.append(user_id)

        query = f"UPDATE users SET {assignments} WHERE user_id = ?"
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute(query, params)
            connection.commit()

    def list_users_with_pending_jobs(self) -> list[UserRecord]:
        query = """
        SELECT * FROM users
        WHERE status IN ('awaiting_response', 'timer_running')
          AND (next_follow_up_at IS NOT NULL OR timer_ends_at IS NOT NULL)
        """
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.row_factory = sqlite3.Row
            rows = connection.execute(query).fetchall()

        return [
            UserRecord(
                user_id=row["user_id"],
                username=row["username"],
                first_name=row["first_name"],
                energy_level=row["energy_level"],
                available_time=row["available_time"],
                main_goal=row["main_goal"],
                onboarding_step=row["onboarding_step"],
                current_task_title=row["current_task_title"],
                task_levels_json=row["task_levels_json"],
                current_level=row["current_level"],
                status=row["status"],
                follow_up_stage=row["follow_up_stage"],
                next_follow_up_at=row["next_follow_up_at"],
                timer_ends_at=row["timer_ends_at"],
                last_interaction_at=row["last_interaction_at"],
                last_bot_message_id=row["last_bot_message_id"],
            )
            for row in rows
        ]
