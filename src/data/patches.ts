export interface CodePatch {
  filename: string;
  description: string;
  category: string;
  code: string;
}

export const CODE_PATCHES: CodePatch[] = [
  {
    filename: 'bot/scheduler/jobs.py',
    description: 'Исправление критического бага с падением radar_job, атрибутом last_radar_sent и таймзонами',
    category: 'Scheduler & Fixes',
    code: `import logging
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

async def send_daily_messages(bot: Bot, kind: str) -> None:
    async with SessionFactory() as session:
        users = (
            await session.scalars(select(User).where(User.onboarding_complete.is_(True)))
        ).all()
        utc_now = datetime.now(timezone.utc)
        templates = MORNING_TEMPLATES if kind == "morning" else EVENING_TEMPLATES
        for user in users:
            try:
                user_tz = ZoneInfo(user.timezone or get_settings().timezone)
                local_today = utc_now.astimezone(user_tz).date()
                msg = random.choice(templates).format(
                    name=user.first_name or "друг",
                    days=days_free(user, local_today)
                )
                await bot.send_message(user.id, msg, reply_markup=tracker_keyboard(user.id))
            except Exception:
                logger.exception("Daily message failed for user %s", user.id)

async def radar_job(bot: Bot) -> None:
    """Ежеминутная проверка триггеров с учетом таймзоны конкретного пользователя"""
    utc_now = datetime.now(timezone.utc)
    async with SessionFactory() as session:
        targets = await radar_targets(session)
        for trigger, user in targets:
            try:
                user_tz = ZoneInfo(user.timezone or get_settings().timezone)
                local_now = utc_now.astimezone(user_tz)
                current_minutes = local_now.hour * 60 + local_now.minute
                target_minutes = (current_minutes + 15) % (24 * 60)

                # Проверяем совпадение времени срабатывания (за 15 минут)
                if trigger.time_minutes != target_minutes:
                    continue

                # Проверяем, отправлялось ли уведомление сегодня (в таймзоне юзера)
                today = local_now.date()
                if trigger.last_radar_sent:
                    last_sent_day = trigger.last_radar_sent.astimezone(user_tz).date()
                    if last_sent_day == today:
                        continue

                # Фиксируем отправку в БД
                await mark_radar_sent(session, trigger.id)

                await bot.send_message(
                    user.id,
                    f"⚡️ <b>Триггер-радар (за 15 минут)</b>\\n\\n"
                    f"Приближается твой триггер: «<b>{trigger.label}</b>».\\n"
                    f"Пик желания длится ровно 3 минуты. Сделай глоток холодной воды, "
                    f"смени позу или запусти 3-минутный SOS в приложении.\\n\\n"
                    f"Ты чист уже {days_free(user, today)} дн. Ты сильнее этой привычки!",
                    reply_markup=tracker_keyboard(user.id),
                    parse_mode="HTML"
                )
            except Exception:
                logger.exception("Radar message failed for trigger %s user %s", trigger.id, user.id)

def build_scheduler(bot: Bot) -> AsyncIOScheduler:
    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone=ZoneInfo(settings.timezone))
    scheduler.add_job(radar_job, "interval", minutes=1, args=[bot], id="trigger-radar", max_instances=1)
    scheduler.add_job(send_daily_messages, "cron", hour=9, minute=0, args=[bot, "morning"], id="morning-checkin", max_instances=1)
    scheduler.add_job(send_daily_messages, "cron", hour=21, minute=0, args=[bot, "evening"], id="evening-checkin", max_instances=1)
    return scheduler
`
  },
  {
    filename: 'database/connection.py',
    description: 'Отказоустойчивое подключение к Railway PostgreSQL (pool_pre_ping, recycle, лимиты)',
    category: 'Database & Stability',
    code: `from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from bot.config import get_settings
from database.models import Base

settings = get_settings()

engine_kwargs = {
    "echo": settings.debug,
    "future": True,
}

# Для PostgreSQL на Railway критически важны pre-ping и pool_recycle
if not settings.database_dsn.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,       # Проверяет соединение перед выдачей из пула
        "pool_recycle": 1800,        # Сбрасывает старые соединения каждые 30 минут
        "pool_size": 10,             # Стабильный размер пула под бесплатный тариф Railway
        "max_overflow": 5,           # Допустимый оверфлоу при пиковых нагрузках
        "pool_timeout": 30,          # Таймаут ожидания коннекта
    })

engine = create_async_engine(settings.database_dsn, **engine_kwargs)

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

async def close_db() -> None:
    await engine.dispose()
`
  },
  {
    filename: 'database/models.py',
    description: 'Добавление B-Tree индексов для ускорения ежеминутных выборок радара и аналитики',
    category: 'Database & Schema',
    code: `from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str] = mapped_column(String(128), default="")
    city: Mapped[str] = mapped_column(String(64), default="Астана")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Almaty")
    currency: Mapped[str] = mapped_column(String(10), default="KZT") # Валюта
    quit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    nicotine_type: Mapped[str] = mapped_column(String(40), default="Сигареты")
    pack_price_kzt: Mapped[float] = mapped_column(Float, default=1050.0)
    pack_size: Mapped[int] = mapped_column(Integer, default=20)
    units_per_day: Mapped[float] = mapped_column(Float, default=15.0)
    financial_goal_kzt: Mapped[float] = mapped_column(Float, default=0.0)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cravings: Mapped[list["CravingLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    relapses: Mapped[list["RelapseIncident"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    triggers: Mapped[list["UserTrigger"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    achievements: Mapped[list["Achievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class CravingLog(Base):
    __tablename__ = "craving_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    intensity: Mapped[int] = mapped_column(Integer, default=5)
    trigger: Mapped[str] = mapped_column(String(120), default="неизвестно")
    outcome: Mapped[str] = mapped_column(String(40), default="resisted")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="cravings")

class UserTrigger(Base):
    __tablename__ = "user_triggers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String(160))
    time_minutes: Mapped[int] = mapped_column(Integer, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_radar_sent: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="triggers")
`
  },
  {
    filename: 'railway.json (в корень репозитория)',
    description: 'Конфигурация Railway для корректного обнаружения Python проекта и сборки',
    category: 'DevOps & Deployment',
    code: `{
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
}`
  },
  {
    filename: 'smokefree_bot/main.py (Webhook-режим)',
    description: 'Перевод Telegram бота на Webhook внутри FastAPI для предотвращения конфликтов перезапуска на Railway',
    category: 'Architecture & Scaling',
    code: `from __future__ import annotations
import asyncio
import logging
import sys
import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import Update
from fastapi import Request, HTTPException
from bot.config import get_settings
from bot.handlers import chat, quotes, radar, relapse, sos, start, stats
from bot.scheduler.jobs import build_scheduler
from database.connection import close_db, init_db
from webapp.api import create_app

def configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
    )

async def run() -> None:
    settings = get_settings()
    settings.validate_runtime()
    await init_db()

    bot = Bot(
        token=settings.bot_token.get_secret_value(),
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()
    for router in (start.router, stats.router, sos.router, radar.router, relapse.router, quotes.router, chat.router):
        dispatcher.include_router(router)

    scheduler = build_scheduler(bot)
    scheduler.start()

    app = create_app()

    # Webhook endpoint для безопасного запуска на Railway
    @app.post("/webhook/telegram")
    async def telegram_webhook(request: Request) -> dict:
        secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        # Если задан секретный токен, валидируем
        expected = settings.bot_token.get_secret_value()[:16]
        if secret and secret != expected:
            raise HTTPException(status_code=403, detail="Forbidden")
        data = await request.json()
        update = Update.model_validate(data, context={"bot": bot})
        await dispatcher.feed_update(bot, update)
        return {"ok": True}

    # Настройка Webhook при наличии публичного домена
    if settings.webapp_url and not settings.debug:
        webhook_url = f"{settings.webapp_url.rstrip('/')}/webhook/telegram"
        await bot.set_webhook(
            url=webhook_url,
            secret_token=settings.bot_token.get_secret_value()[:16],
            drop_pending_updates=True
        )
        logging.info("Webhook set to: %s", webhook_url)
    else:
        # Локальный fallback на polling
        await bot.delete_webhook(drop_pending_updates=True)
        asyncio.create_task(
            dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types()),
            name="telegram-polling"
        )

    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host="0.0.0.0",
            port=settings.port,
            log_level=settings.log_level.lower(),
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
    )

    try:
        await server.serve()
    finally:
        scheduler.shutdown(wait=False)
        await bot.session.close()
        await close_db()

if __name__ == "__main__":
    configure_logging()
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        logging.getLogger(__name__).info("SmokeFree stopped")
`
  }
];
