#!/usr/bin/env python3
"""
Скрипт автоматического устранения критических багов в репозитории SmokeFree-Companion.
Запуск:
    python3 apply_fixes.py
"""

import os
import sys

def main():
    print("🚀 Применение патчей к репозиторию SmokeFree-Companion...")

    # Определяем директорию репозитория
    cwd = os.getcwd()
    if os.path.exists(os.path.join(cwd, "smokefree_bot")):
        repo_dir = cwd
    elif os.path.exists(os.path.join(cwd, "bot")) and os.path.exists(os.path.join(cwd, "database")):
        repo_dir = os.path.dirname(cwd) if os.path.basename(cwd) == "smokefree_bot" else cwd
    else:
        print("❌ Ошибка: Запустите скрипт из корня репозитория SmokeFree-Companion!")
        sys.exit(1)

    bot_dir = os.path.join(repo_dir, "smokefree_bot")

    # 1. Исправление jobs.py (Баг с radar_job, mark_radar_sent и таймзонами)
    jobs_file = os.path.join(bot_dir, "bot", "scheduler", "jobs.py")
    if os.path.exists(jobs_file):
        with open(jobs_file, "w", encoding="utf-8") as f:
            f.write('''import logging
import random
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from bot.config import get_settings
from bot.keyboards.inline import tracker_keyboard
from database.connection import SessionFactory
from database.crud import mark_radar_sent, radar_targets
from database.models import User

logger = logging.getLogger(__name__)

MORNING_TEMPLATES = [
    "🌅 Доброе утро, {name}!\\n\\nДень начинается с чистых легких и свежего дыхания. Ты свободен уже {days} дн. Сегодня не нужно договариваться с никотином — достаточно просто прожить этот день чистым.",
    "☀️ Утро без сигарет, {name}!\\n\\nОрганизм продолжает очищаться. Уровень кислорода в норме, сердце бьется ровно. Твой трек: {days} дн. без табака. Держи воду под рукой и помни: тяга длится всего 3 минуты.",
    "☕️ Бодрого утра, {name}!\\n\\nКофе без перекура — это настоящий вкус кофе, а не дыма. Твой стаж свободы: {days} дн. Если почувствуешь триггер — сразу жми кнопку SOS в трекере.",
]

EVENING_TEMPLATES = [
    "🌙 Вечерняя победа, {name}!\\n\\nЕще один чистый день позади: всего {days} дн. свободы! Сэкономленные деньги и возвращенные минуты работают на тебя. Как самочувствие сегодня?",
    "⭐️ Спокойного вечера, {name}!\\n\\nСон некурящего человека глубже и дает больше энергии. Зафиксируй свой день в трекере и похвали себя — ты делаешь большое дело.",
    "🧘 Рефлексия дня, {name}:\\n\\nЧто сегодня помогло не поддаться тяге? Запомни этот навык. Чистый трек: {days} дн. С каждым днем никотиновые рецепторы засыпают всё крепче.",
]

def days_free(user: User, today: date) -> int:
    return max(0, (today - user.quit_date).days) if user.quit_date else 0

async def send_daily_message(bot: Bot, kind: str) -> None:
    async with SessionFactory() as session:
        users = (
            await session.scalars(select(User).where(User.onboarding_complete.is_(True)))
        ).all()
        templates = MORNING_TEMPLATES if kind == "morning" else EVENING_TEMPLATES
        default_tz = ZoneInfo(get_settings().timezone)
        for user in users:
            try:
                try:
                    user_tz = ZoneInfo(user.timezone or get_settings().timezone)
                except Exception:
                    user_tz = default_tz
                today = datetime.now(user_tz).date()
                msg = random.choice(templates).format(
                    name=user.first_name or "друг",
                    days=days_free(user, today)
                )
                await bot.send_message(
                    user.id,
                    msg,
                    reply_markup=tracker_keyboard(user.id)
                )
            except Exception:
                logger.exception("Daily message failed for user %s", user.id)

async def radar_job(bot: Bot) -> None:
    default_tz = ZoneInfo(get_settings().timezone)
    async with SessionFactory() as session:
        for trigger, user in await radar_targets(session):
            try:
                user_tz = ZoneInfo(user.timezone or get_settings().timezone)
            except Exception:
                user_tz = default_tz
            now = datetime.now(user_tz)
            today = now.date()
            current_minutes = now.hour * 60 + now.minute
            target_minutes = (current_minutes + 15) % 1440

            if trigger.time_minutes != target_minutes:
                continue

            # Проверяем last_radar_sent
            if trigger.last_radar_sent:
                sent_dt = trigger.last_radar_sent
                sent_date = sent_dt.astimezone(user_tz).date() if sent_dt.tzinfo else sent_dt.date()
                if sent_date == today:
                    continue

            # Отмечаем отправку в базе (принимает session и trigger.id)
            await mark_radar_sent(session, trigger.id)

            try:
                await bot.send_message(
                    user.id,
                    "⚡️ Триггер-радар (за 15 минут)\\n\\n"
                    f"Приближается твой триггер: «{trigger.label}».\\n"
                    "Пик желания длится ровно 3 минуты. Сделай глоток воды, смени позу "
                    "или включи дыхание SOS в приложении.\\n\\n"
                    f"Ты чист уже {days_free(user, today)} дн. Ты сильнее этой привычки!",
                    reply_markup=tracker_keyboard(user.id),
                )
            except Exception:
                logger.exception("Radar message failed for user %s", user.id)

def build_scheduler(bot: Bot) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=ZoneInfo(get_settings().timezone))
    scheduler.add_job(radar_job, "interval", minutes=1, args=[bot], id="trigger-radar", max_instances=1)
    scheduler.add_job(
        send_daily_message,
        "cron",
        hour=9,
        minute=0,
        args=[bot, "morning"],
        id="morning-checkin",
        max_instances=1,
    )
    scheduler.add_job(
        send_daily_message,
        "cron",
        hour=21,
        minute=0,
        args=[bot, "evening"],
        id="evening-checkin",
        max_instances=1,
    )
    return scheduler
''')
        print("✅ [1/3] Исправлен smokefree_bot/bot/scheduler/jobs.py")
    else:
        print(f"⚠️ Файл не найден: {jobs_file}")

    # 2. Исправление connection.py (Защита от обрыва соединений PostgreSQL на Railway)
    conn_file = os.path.join(bot_dir, "database", "connection.py")
    if os.path.exists(conn_file):
        with open(conn_file, "w", encoding="utf-8") as f:
            f.write('''from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from bot.config import get_settings
from database.models import Base

settings = get_settings()

engine = create_async_engine(
    settings.database_dsn,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,      # Защита от обрыва TCP-сессий на Railway
    pool_recycle=1800,       # Пересоздание соединений каждые 30 мин
    pool_size=10,
    max_overflow=20,
)

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await connection.execute(text("ALTER TABLE users ADD COLUMN quit_at TIMESTAMP;"))
        except Exception:
            pass

async def close_db() -> None:
    await engine.dispose()
''')
        print("✅ [2/3] Исправлен smokefree_bot/database/connection.py")
    else:
        print(f"⚠️ Файл не найден: {conn_file}")

    # 3. Создание railway.json в корне репозитория для безошибочного деплоя
    railway_file = os.path.join(repo_dir, "railway.json")
    with open(railway_file, "w", encoding="utf-8") as f:
        f.write('''{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "watchPatterns": ["smokefree_bot/**"],
    "buildCommand": "cd smokefree_bot && pip install --no-cache-dir -r requirements.txt"
  },
  "deploy": {
    "startCommand": "cd smokefree_bot && python main.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
''')
    print("✅ [3/3] Создан корневой railway.json")

    print("\n🎉 Все исправления успешно применены! Сделайте коммит:")
    print("   git add -A && git commit -m 'Fix scheduler radar_job crash and Railway connection pool' && git push")

if __name__ == "__main__":
    main()
