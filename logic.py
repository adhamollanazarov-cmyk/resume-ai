from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import escape

from database import UserRecord

ENERGY_LABELS = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
}

TIME_LABELS = {
    "30m": "30 min",
    "1h": "1h",
    "2h+": "2h+",
}

GOAL_LABELS = {
    "study": "Study",
    "work": "Work",
    "other": "Other",
}

START_LEVEL_MATRIX = {
    ("low", "30m"): 1,
    ("low", "1h"): 1,
    ("low", "2h+"): 2,
    ("medium", "30m"): 1,
    ("medium", "1h"): 2,
    ("medium", "2h+"): 2,
    ("high", "30m"): 2,
    ("high", "1h"): 3,
    ("high", "2h+"): 3,
}

RESISTANCE_MARKERS = (
    "can't",
    "cant",
    "later",
    "not now",
    "too hard",
    "hard",
    "stuck",
    "tired",
    "overwhelmed",
    "nope",
    "don't want",
    "dont want",
    "no ",
    "after",
)


@dataclass(frozen=True, slots=True)
class PromptPayload:
    text: str
    step: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat()


def from_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def build_task_levels(task_title: str, goal_type: str, focus_minutes: int) -> list[str]:
    cleaned_title = task_title.strip().rstrip(".!?")
    safe_title = cleaned_title or "the task"

    if goal_type == "study":
        return [
            f"Sit at your desk and put the study material for {safe_title} in front of you.",
            f"Open the exact book, tab, file, or lesson for {safe_title}.",
            f"Read the first heading or example for {safe_title}.",
            f"Study {safe_title} for {focus_minutes} focused minutes.",
        ]

    if goal_type == "work":
        return [
            f"Sit down where you can work on {safe_title}.",
            f"Open the app, document, or board for {safe_title}.",
            f"Write the first tiny action you can do for {safe_title}.",
            f"Work on {safe_title} for {focus_minutes} focused minutes.",
        ]

    return [
        f"Stand or sit where you can start {safe_title}.",
        f"Get the first tool or item ready for {safe_title}.",
        f"Do the smallest visible part of {safe_title}.",
        f"Work on {safe_title} for {focus_minutes} focused minutes.",
    ]


def choose_start_level(energy_level: str, available_time: str, max_level: int) -> int:
    suggested_level = START_LEVEL_MATRIX.get((energy_level, available_time), 1)
    return min(max(suggested_level, 0), max_level)


def simplify_level(current_level: int) -> int:
    return max(current_level - 1, 0)


def advance_level(current_level: int, max_level: int) -> int:
    return min(current_level + 1, max_level)


def follow_up_due_in(seconds: int) -> datetime:
    return utc_now() + timedelta(seconds=seconds)


def timer_due_in(minutes: int) -> datetime:
    return utc_now() + timedelta(minutes=minutes)


def looks_like_resistance(text: str) -> bool:
    lowered = f" {text.strip().lower()} "
    return any(marker in lowered for marker in RESISTANCE_MARKERS)


def build_initial_prompt(step: str) -> PromptPayload:
    text = (
        "We are not opening a fresh tab to procrastinate more.\n\n"
        f"Your one step right now:\n<b>{escape(step)}</b>"
    )
    return PromptPayload(text=text, step=step)


def build_simplified_prompt(step: str, *, from_timeout: bool, reached_floor: bool) -> PromptPayload:
    if reached_floor:
        opener = "We have officially reduced the bar to almost insulting levels."
    elif from_timeout:
        opener = "Let's be honest, you still have not started."
    else:
        opener = "Okay, resistance noted."

    text = f"{opener}\n\nFine. Do only this:\n<b>{escape(step)}</b>"
    return PromptPayload(text=text, step=step)


def build_timer_started_message(task_title: str, focus_minutes: int) -> str:
    return (
        f"Good. Timer started for {focus_minutes} minutes.\n\n"
        f"Stay with <b>{escape(task_title)}</b>. No dramatic escape sequence."
    )


def build_completion_prompt(next_step: str, *, leveled_up: bool) -> PromptPayload:
    opener = "Good. That is a start." if leveled_up else "Momentum exists now. Try not to waste it."
    text = f"{opener}\n\nNext step:\n<b>{escape(next_step)}</b>"
    return PromptPayload(text=text, step=next_step)


def build_continuation_step(task_title: str, focus_minutes: int) -> str:
    return f"Keep going on {task_title.strip()} for another {focus_minutes} focused minutes."


def build_onboarding_summary(user: UserRecord) -> str:
    return (
        "Profile locked in.\n"
        f"Energy: <b>{escape(ENERGY_LABELS.get(user.energy_level or '', 'Unknown'))}</b>\n"
        f"Time: <b>{escape(TIME_LABELS.get(user.available_time or '', 'Unknown'))}</b>\n"
        f"Goal: <b>{escape(GOAL_LABELS.get(user.main_goal or '', 'Unknown'))}</b>"
    )


def describe_current_step(user: UserRecord, focus_minutes: int) -> str:
    levels = user.task_levels
    if not levels or user.current_level is None:
        return "No active step."

    if user.current_level < len(levels):
        return levels[user.current_level]

    if user.current_task_title:
        return build_continuation_step(user.current_task_title, focus_minutes)

    return "No active step."


def build_status_text(user: UserRecord, focus_minutes: int) -> str:
    step_text = describe_current_step(user, focus_minutes)
    lines = [
        f"Status: <b>{escape(user.status)}</b>",
        f"Energy: <b>{escape(ENERGY_LABELS.get(user.energy_level or '', 'Not set'))}</b>",
        f"Time: <b>{escape(TIME_LABELS.get(user.available_time or '', 'Not set'))}</b>",
        f"Goal: <b>{escape(GOAL_LABELS.get(user.main_goal or '', 'Not set'))}</b>",
        f"Task: <b>{escape(user.current_task_title or 'No active task')}</b>",
        f"Current step: <b>{escape(step_text)}</b>",
    ]

    if user.next_follow_up_at:
        lines.append(f"Next reminder: <b>{escape(user.next_follow_up_at)}</b>")
    if user.timer_ends_at:
        lines.append(f"Timer ends: <b>{escape(user.timer_ends_at)}</b>")

    return "\n".join(lines)
