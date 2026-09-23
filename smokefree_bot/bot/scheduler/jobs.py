import logging
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
    "🌅 Доброе утро, {name}!\n\nДень начинается с чистых легких и свежего дыхания. Ты свободен уже {days} дн. Сегодня не нужно договариваться с никотином — достаточно просто прожить этот день чистым.",
    "☀️ Утро без сигарет, {name}!\n\nОрганизм продолжает очищаться. Уровень кислорода в норме, сердце бьется ровно. Твой трек: {days} дн. без табака. Держи воду под рукой и помни: тяга длится всего 3 минуты.",
    "☕️ Бодрого утра, {name}!\n\nКофе без перекура — это настоящий вкус кофе, а не дыма. Твой стаж свободы: {days} дн. Если почувствуешь триггер — сразу жми кнопку SOS в трекере.",
]

EVENING_TEMPLATES = [
    "🌙 Вечерняя победа, {name}!\n\nЕще один чистый день позади: всего {days} дн. свободы! Сэкономленные деньги и возвращенные минуты работают на тебя. Как самочувствие сегодня?",
    "⭐️ Спокойного вечера, {name}!\n\nСон некурящего человека глубже и дает больше энергии. Зафиксируй свой день в трекере и похвали себя — ты делаешь большое дело.",
    "🧘 Рефлексия дня, {name}:\n\nЧто сегодня помогло не поддаться тяге? Запомни этот навык. Чистый трек: {days} дн. С каждым днем никотиновые рецепторы засыпают всё крепче.",
]

def days_free(user: User, today: date) -> int:
    if user.quit_date:
        return max(0, (today - user.quit_date).days)
    if user.quit_at:
        try:
            user_tz = ZoneInfo(user.timezone or get_settings().timezone)
            quit_dt = user.quit_at if user.quit_at.tzinfo else user.quit_at.replace(tzinfo=timezone.utc)
            return max(0, (today - quit_dt.astimezone(user_tz).date()).days)
        except Exception:
            pass
    return 0

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
    """
    Проверяет триггеры с шагом в 10 минут.
    Срабатывает, если триггер наступает в интервале от 5 до 20 минут от текущего момента.
    Это экономит часы Neon PostgreSQL и предотвращает пропуски.
    """
    utc_now = datetime.now(timezone.utc)
    async with SessionFactory() as session:
        targets = await radar_targets(session)
        for trigger, user in targets:
            try:
                user_tz = ZoneInfo(user.timezone or get_settings().timezone)
                local_now = utc_now.astimezone(user_tz)
                current_minutes = local_now.hour * 60 + local_now.minute

                # Вычисляем дельту минут до триггера с учетом перехода через полночь
                diff = (trigger.time_minutes - current_minutes) % (24 * 60)

                # Срабатываем, если триггер наступит через 5-20 минут (в среднем за ~15 минут)
                if not (5 <= diff <= 20):
                    continue

                today = local_now.date()
                if trigger.last_radar_sent:
                    sent_dt = trigger.last_radar_sent if trigger.last_radar_sent.tzinfo else trigger.last_radar_sent.replace(tzinfo=timezone.utc)
                    last_sent_day = sent_dt.astimezone(user_tz).date()
                    if last_sent_day == today:
                        continue

                await mark_radar_sent(session, trigger.id)

                await bot.send_message(
                    user.id,
                    f"⚡️ <b>Триггер-радар (через ~{diff} мин)</b>\n\n"
                    f"Приближается твой триггер: «<b>{trigger.label}</b>».\n"
                    f"Пик желания длится ровно 3 минуты. Сделай глоток холодной воды, "
                    f"смени обстановку или запусти 3-минутный SOS в приложении.\n\n"
                    f"Ты чист уже {days_free(user, today)} дн. Ты сильнее этой привычки!",
                    reply_markup=tracker_keyboard(user.id),
                    parse_mode="HTML"
                )
            except Exception:
                logger.exception("Radar message failed for trigger %s user %s", trigger.id, user.id)

def build_scheduler(bot: Bot) -> AsyncIOScheduler:
    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone=ZoneInfo(settings.timezone))
    
    # Запуск радара раз в 10 минут вместо 1 минуты — экономит Neon compute hours
    scheduler.add_job(radar_job, "interval", minutes=10, args=[bot], id="trigger-radar", max_instances=1)
    scheduler.add_job(send_daily_messages, "cron", hour=9, minute=0, args=[bot, "morning"], id="morning-checkin", max_instances=1)
    scheduler.add_job(send_daily_messages, "cron", hour=21, minute=0, args=[bot, "evening"], id="evening-checkin", max_instances=1)
    return scheduler
