import os
import sys
import asyncio
import logging
from pathlib import Path

root_dir = Path(__file__).resolve().parent
smokefree_dir = root_dir / "smokefree_bot"

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if smokefree_dir.exists() and str(smokefree_dir) not in sys.path:
    sys.path.insert(0, str(smokefree_dir))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smokefree_app")

import uvicorn

try:
    from smokefree_bot.webapp.api import create_app
    from smokefree_bot.database.connection import init_db, close_db
    from smokefree_bot.bot.config import get_settings
    from smokefree_bot.bot.handlers import start, stats, sos, radar, relapse, quotes, chat
    from smokefree_bot.bot.scheduler.jobs import build_scheduler
except ImportError:
    from webapp.api import create_app
    from database.connection import init_db, close_db
    from bot.config import get_settings
    from bot.handlers import start, stats, sos, radar, relapse, quotes, chat
    from bot.scheduler.jobs import build_scheduler

app = create_app()

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database schema...")
    try:
        await init_db()
        logger.info("Database schema initialized.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

    settings = get_settings()
    bot_token = settings.bot_token.get_secret_value() if settings.bot_token else ""
    if bot_token:
        try:
            from aiogram import Bot, Dispatcher
            from aiogram.enums import ParseMode
            from aiogram.client.default import DefaultBotProperties

            bot = Bot(token=bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
            dp = Dispatcher()

            for r in (start.router, stats.router, sos.router, radar.router, relapse.router, quotes.router, chat.router):
                dp.include_router(r)

            try:
                scheduler = build_scheduler(bot)
                scheduler.start()
                logger.info("Background scheduler started.")
            except Exception as sched_err:
                logger.warning(f"Scheduler start skipped: {sched_err}")

            logger.info("Starting Telegram Bot polling in background...")
            asyncio.create_task(dp.start_polling(bot))
        except Exception as bot_err:
            logger.error(f"Telegram Bot start error: {bot_err}")

@app.on_event("shutdown")
async def on_shutdown():
    try:
        await close_db()
    except Exception as e:
        logger.error(f"Error closing database: {e}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting SmokeFree Companion server on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
