import os
import sys
import asyncio
import logging
from pathlib import Path

bot_dir = Path(__file__).resolve().parent
root_dir = bot_dir.parent

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(bot_dir) not in sys.path:
    sys.path.insert(0, str(bot_dir))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smokefree_app")

import uvicorn

try:
    from webapp.api import create_app
    from database.connection import init_db, close_db
    from bot.config import get_settings
except ImportError:
    from smokefree_bot.webapp.api import create_app
    from smokefree_bot.database.connection import init_db, close_db
    from smokefree_bot.bot.config import get_settings

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

            try:
                from bot.handlers.stats import router as stats_router
                dp.include_router(stats_router)
            except Exception as router_err:
                logger.warning(f"Stats router skip: {router_err}")

            logger.info("Starting Telegram Bot polling in background...")
            asyncio.create_task(dp.start_polling(bot))
        except Exception as bot_err:
            logger.warning(f"Telegram Bot start deferred: {bot_err}")

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
