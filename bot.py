from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import load_settings
from database import Database
from handlers import CoachingBotHandlers


async def main() -> None:
    settings = load_settings()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    database = Database(settings.database_path)
    database.init_schema()

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    scheduler = AsyncIOScheduler(timezone="UTC")
    handler_bundle = CoachingBotHandlers(
        database=database,
        bot=bot,
        scheduler=scheduler,
        settings=settings,
    )

    dispatcher = Dispatcher()
    dispatcher.include_router(handler_bundle.router)

    scheduler.start()
    await handler_bundle.restore_jobs()

    try:
        await dispatcher.start_polling(bot)
    finally:
        scheduler.shutdown(wait=False)
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
