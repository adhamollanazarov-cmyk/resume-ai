from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    bot_token: str
    database_path: Path
    follow_up_delay_seconds: int
    focus_duration_minutes: int
    max_follow_up_stages: int


def _read_positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    value = int(raw_value)
    return max(1, value)


def load_settings() -> Settings:
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN", "").strip()
    if not bot_token:
        raise RuntimeError("BOT_TOKEN is not set. Add it to .env or your environment.")

    return Settings(
        bot_token=bot_token,
        database_path=Path(os.getenv("DATABASE_PATH", "bot.sqlite3")).resolve(),
        follow_up_delay_seconds=_read_positive_int("FOLLOW_UP_DELAY_SECONDS", 120),
        focus_duration_minutes=_read_positive_int("FOCUS_DURATION_MINUTES", 10),
        max_follow_up_stages=_read_positive_int("MAX_FOLLOW_UP_STAGES", 2),
    )
