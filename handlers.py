from __future__ import annotations

from datetime import timedelta
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import Settings
from database import Database, UserRecord
from logic import (
    advance_level,
    build_completion_prompt,
    build_continuation_step,
    build_initial_prompt,
    build_onboarding_summary,
    build_simplified_prompt,
    build_status_text,
    build_task_levels,
    build_timer_started_message,
    choose_start_level,
    describe_current_step,
    follow_up_due_in,
    from_iso,
    looks_like_resistance,
    simplify_level,
    timer_due_in,
    to_iso,
    utc_now,
)


class CoachingBotHandlers:
    def __init__(
        self,
        *,
        database: Database,
        bot: Bot,
        scheduler: AsyncIOScheduler,
        settings: Settings,
    ) -> None:
        self.database = database
        self.bot = bot
        self.scheduler = scheduler
        self.settings = settings
        self.router = Router(name=__name__)
        self._register_routes()

    def _register_routes(self) -> None:
        self.router.message.register(self.start_command, CommandStart())
        self.router.message.register(self.status_command, Command("status"))
        self.router.callback_query.register(self.onboarding_callback, F.data.startswith("onboarding:"))
        self.router.callback_query.register(self.task_action_callback, F.data.startswith("task:"))
        self.router.message.register(self.text_message, F.text)

    async def start_command(self, message: Message) -> None:
        if message.from_user is None:
            return

        user_id = message.from_user.id
        now = utc_now()
        now_iso = to_iso(now) or ""

        self.database.ensure_user(
            user_id=user_id,
            username=message.from_user.username,
            first_name=message.from_user.first_name or "there",
            now_iso=now_iso,
        )
        self._cancel_jobs(user_id)
        self.database.reset_onboarding(user_id, now_iso)

        await message.answer(
            "We are building a tiny plan, not a fantasy version of your day.\n\n"
            "First question: what is your energy level right now?"
        )
        await message.answer("Pick one:", reply_markup=self._energy_keyboard())

    async def status_command(self, message: Message) -> None:
        if message.from_user is None:
            return

        user = self.database.get_user(message.from_user.id)
        if user is None:
            await message.answer("No profile yet. Use /start and let the bot interrogate you properly.")
            return

        await message.answer(build_status_text(user, self.settings.focus_duration_minutes))

    async def onboarding_callback(self, callback: CallbackQuery) -> None:
        await callback.answer()
        if callback.from_user is None:
            return

        user_id = callback.from_user.id
        user = self.database.get_user(user_id)
        if user is None:
            await self.bot.send_message(user_id, "Use /start first. I cannot onboard a ghost.")
            return

        parts = callback.data.split(":", maxsplit=2)
        if len(parts) != 3:
            await self.bot.send_message(user_id, "That callback was malformed. Very inspiring. Use /start.")
            return

        _, step_name, value = parts
        self.database.update_user(user_id, last_interaction_at=to_iso(utc_now()))

        if step_name == "energy" and user.onboarding_step == "energy":
            self.database.update_user(
                user_id,
                energy_level=value,
                available_time=None,
                main_goal=None,
                onboarding_step="time",
            )
            await self.bot.send_message(
                user_id,
                "Useful. How much time do you actually have?",
                reply_markup=self._time_keyboard(),
            )
            return

        if step_name == "time" and user.onboarding_step == "time":
            self.database.update_user(user_id, available_time=value, onboarding_step="goal")
            await self.bot.send_message(
                user_id,
                "What kind of thing are we trying to start?",
                reply_markup=self._goal_keyboard(),
            )
            return

        if step_name == "goal" and user.onboarding_step == "goal":
            self.database.update_user(user_id, main_goal=value, onboarding_step="task_title", status="awaiting_task_title")
            refreshed_user = self.database.get_user(user_id)
            if refreshed_user is not None:
                await self.bot.send_message(user_id, build_onboarding_summary(refreshed_user))

            await self.bot.send_message(
                user_id,
                "Now tell me the one concrete task for today.\n\n"
                "Examples:\n"
                "- Learn Python loops\n"
                "- Finish sales report\n"
                "- Clean the kitchen counter"
            )
            return

        await self.bot.send_message(user_id, "That button is from an older step. Use /start if you want a reset.")

    async def task_action_callback(self, callback: CallbackQuery) -> None:
        await callback.answer()
        if callback.from_user is None:
            return

        user_id = callback.from_user.id
        user = self.database.get_user(user_id)
        if user is None or not user.current_task_title:
            await self.bot.send_message(user_id, "No active task. Use /start and we will fix that.")
            return

        if user.status != "awaiting_response":
            if user.status == "timer_running":
                await self.bot.send_message(user_id, "Timer is already running. One crisis at a time.")
            else:
                await self.bot.send_message(user_id, "This action is not live right now. /status will tell you where you stand.")
            return

        self.database.update_user(user_id, last_interaction_at=to_iso(utc_now()))
        parts = callback.data.split(":", maxsplit=1)
        if len(parts) != 2:
            await self.bot.send_message(user_id, "That button payload was broken. Use /status and try again.")
            return

        action = parts[1]

        if action == "started":
            await self._handle_started(user)
            return

        if action == "not_started":
            await self._handle_not_started(user, from_timeout=False)

    async def text_message(self, message: Message) -> None:
        if message.from_user is None or not message.text:
            return

        user = self.database.get_user(message.from_user.id)
        if user is None:
            await message.answer("Use /start first. I need at least a little structure to work with.")
            return

        self.database.update_user(user.user_id, last_interaction_at=to_iso(utc_now()))

        if user.status == "awaiting_task_title" and user.onboarding_step == "task_title":
            await self._activate_task_from_text(user, message.text)
            return

        if user.status == "awaiting_response":
            if looks_like_resistance(message.text):
                await self._handle_not_started(user, from_timeout=False)
                return

            await message.answer(
                "Use the buttons. That was me being considerate.\n\n"
                f"Current step:\n<b>{escape(describe_current_step(user, self.settings.focus_duration_minutes))}</b>",
                reply_markup=self._task_keyboard(),
            )
            return

        if user.status == "timer_running":
            await message.answer("Timer is running. Stay on the task and let the clock do its tiny job.")
            return

        if user.status == "onboarding":
            await message.answer("Use the onboarding buttons first. Free-text chaos can wait.")
            return

        await message.answer("Use /start to begin or /status to see your current state.")

    async def restore_jobs(self) -> None:
        now = utc_now()

        for user in self.database.list_users_with_pending_jobs():
            if user.status == "awaiting_response" and user.next_follow_up_at and user.follow_up_stage > 0:
                run_at = from_iso(user.next_follow_up_at)
                if run_at is None:
                    continue
                self._schedule_follow_up_job(user.user_id, user.follow_up_stage, max(run_at, now + timedelta(seconds=1)))

            if user.status == "timer_running" and user.timer_ends_at:
                run_at = from_iso(user.timer_ends_at)
                if run_at is None:
                    continue
                self._schedule_timer_job(user.user_id, max(run_at, now + timedelta(seconds=1)))

    async def run_follow_up(self, user_id: int, stage: int) -> None:
        user = self.database.get_user(user_id)
        if user is None:
            return

        if user.status != "awaiting_response" or user.follow_up_stage != stage or not user.current_task_title:
            return

        levels = user.task_levels
        if not levels:
            return

        current_level = user.current_level or 0
        next_level = simplify_level(current_level)
        reached_floor = next_level == 0

        self.database.update_user(
            user_id,
            current_level=next_level,
            next_follow_up_at=None,
            follow_up_stage=0,
        )

        refreshed_user = self.database.get_user(user_id)
        if refreshed_user is None:
            return

        prompt = build_simplified_prompt(levels[next_level], from_timeout=True, reached_floor=reached_floor)
        sent_message = await self.bot.send_message(user_id, prompt.text, reply_markup=self._task_keyboard())
        self.database.update_user(user_id, last_bot_message_id=sent_message.message_id)

        if stage < self.settings.max_follow_up_stages:
            self._schedule_follow_up(user_id, stage + 1)

    async def run_timer_finished(self, user_id: int) -> None:
        user = self.database.get_user(user_id)
        if user is None or user.status != "timer_running" or not user.current_task_title:
            return

        levels = user.task_levels
        if not levels:
            return

        current_level = user.current_level or 0
        next_level = advance_level(current_level, len(levels) - 1)
        leveled_up = next_level > current_level
        next_step = levels[next_level] if leveled_up else build_continuation_step(
            user.current_task_title,
            self.settings.focus_duration_minutes,
        )

        self.database.update_user(
            user_id,
            current_level=next_level,
            status="awaiting_response",
            timer_ends_at=None,
        )

        prompt = build_completion_prompt(next_step, leveled_up=leveled_up)
        sent_message = await self.bot.send_message(user_id, prompt.text, reply_markup=self._task_keyboard())
        self.database.update_user(user_id, last_bot_message_id=sent_message.message_id)
        self._schedule_follow_up(user_id, 1)

    async def _activate_task_from_text(self, user: UserRecord, task_title: str) -> None:
        clean_title = task_title.strip()
        if not clean_title:
            await self.bot.send_message(user.user_id, "Give me an actual task, not interpretive whitespace.")
            return

        levels = build_task_levels(clean_title, user.main_goal or "other", self.settings.focus_duration_minutes)
        current_level = choose_start_level(user.energy_level or "low", user.available_time or "30m", len(levels) - 1)
        self.database.set_active_task(
            user.user_id,
            task_title=clean_title,
            task_levels=levels,
            current_level=current_level,
            status="awaiting_response",
            last_interaction_at=to_iso(utc_now()) or "",
        )

        prompt = build_initial_prompt(levels[current_level])
        sent_message = await self.bot.send_message(user.user_id, prompt.text, reply_markup=self._task_keyboard())
        self.database.update_user(user.user_id, last_bot_message_id=sent_message.message_id)
        self._schedule_follow_up(user.user_id, 1)

    async def _handle_started(self, user: UserRecord) -> None:
        self._cancel_follow_up_job(user.user_id)

        timer_end = timer_due_in(self.settings.focus_duration_minutes)
        self.database.update_user(
            user.user_id,
            status="timer_running",
            timer_ends_at=to_iso(timer_end),
            next_follow_up_at=None,
            follow_up_stage=0,
        )
        self._schedule_timer_job(user.user_id, timer_end)

        sent_message = await self.bot.send_message(
            user.user_id,
            build_timer_started_message(user.current_task_title or "your task", self.settings.focus_duration_minutes),
        )
        self.database.update_user(user.user_id, last_bot_message_id=sent_message.message_id)

    async def _handle_not_started(self, user: UserRecord, *, from_timeout: bool) -> None:
        self._cancel_follow_up_job(user.user_id)

        current_level = user.current_level or 0
        next_level = simplify_level(current_level)
        levels = user.task_levels
        if not levels:
            await self.bot.send_message(user.user_id, "Task steps are missing. Use /start and I will rebuild them.")
            return

        self.database.update_user(
            user.user_id,
            current_level=next_level,
            status="awaiting_response",
            timer_ends_at=None,
            next_follow_up_at=None,
            follow_up_stage=0,
        )

        reached_floor = next_level == 0
        prompt = build_simplified_prompt(levels[next_level], from_timeout=from_timeout, reached_floor=reached_floor)
        sent_message = await self.bot.send_message(user.user_id, prompt.text, reply_markup=self._task_keyboard())
        self.database.update_user(user.user_id, last_bot_message_id=sent_message.message_id)
        self._schedule_follow_up(user.user_id, 1)

    def _schedule_follow_up(self, user_id: int, stage: int) -> None:
        run_at = follow_up_due_in(self.settings.follow_up_delay_seconds)
        self.database.update_user(
            user_id,
            follow_up_stage=stage,
            next_follow_up_at=to_iso(run_at),
            timer_ends_at=None,
            status="awaiting_response",
        )
        self._schedule_follow_up_job(user_id, stage, run_at)

    def _schedule_follow_up_job(self, user_id: int, stage: int, run_at) -> None:
        self.scheduler.add_job(
            self.run_follow_up,
            trigger="date",
            run_date=run_at,
            args=[user_id, stage],
            id=self._follow_up_job_id(user_id),
            replace_existing=True,
            misfire_grace_time=300,
        )

    def _schedule_timer_job(self, user_id: int, run_at) -> None:
        self.scheduler.add_job(
            self.run_timer_finished,
            trigger="date",
            run_date=run_at,
            args=[user_id],
            id=self._timer_job_id(user_id),
            replace_existing=True,
            misfire_grace_time=300,
        )

    def _cancel_jobs(self, user_id: int) -> None:
        self._cancel_follow_up_job(user_id)
        self._cancel_timer_job(user_id)

    def _cancel_follow_up_job(self, user_id: int) -> None:
        job = self.scheduler.get_job(self._follow_up_job_id(user_id))
        if job:
            job.remove()

    def _cancel_timer_job(self, user_id: int) -> None:
        job = self.scheduler.get_job(self._timer_job_id(user_id))
        if job:
            job.remove()

    @staticmethod
    def _follow_up_job_id(user_id: int) -> str:
        return f"follow-up:{user_id}"

    @staticmethod
    def _timer_job_id(user_id: int) -> str:
        return f"timer:{user_id}"

    @staticmethod
    def _energy_keyboard() -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        builder.button(text="Low", callback_data="onboarding:energy:low")
        builder.button(text="Medium", callback_data="onboarding:energy:medium")
        builder.button(text="High", callback_data="onboarding:energy:high")
        builder.adjust(1)
        return builder.as_markup()

    @staticmethod
    def _time_keyboard() -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        builder.button(text="30 min", callback_data="onboarding:time:30m")
        builder.button(text="1h", callback_data="onboarding:time:1h")
        builder.button(text="2h+", callback_data="onboarding:time:2h+")
        builder.adjust(1)
        return builder.as_markup()

    @staticmethod
    def _goal_keyboard() -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        builder.button(text="Study", callback_data="onboarding:goal:study")
        builder.button(text="Work", callback_data="onboarding:goal:work")
        builder.button(text="Other", callback_data="onboarding:goal:other")
        builder.adjust(1)
        return builder.as_markup()

    @staticmethod
    def _task_keyboard() -> InlineKeyboardMarkup:
        builder = InlineKeyboardBuilder()
        builder.button(text="\u2705 Started", callback_data="task:started")
        builder.button(text="\u274c Not started", callback_data="task:not_started")
        builder.adjust(1)
        return builder.as_markup()
