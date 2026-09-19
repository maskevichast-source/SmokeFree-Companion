from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from bot.handlers.common import user_and_stats

router = Router(name="stats")


@router.message(Command("status"))
async def status(message: Message) -> None:
    user, stats = await user_and_stats(message)
    if stats is None:
        await message.answer("Сначала пройди короткий онбординг: /start")
        return
    from bot.keyboards.inline import tracker_keyboard
    time_str = f"{stats['days_free']} дн. {stats.get('hours_free', 0)} ч. {stats.get('minutes_free', 0)} мин."
    quit_label = ""
    user_info = stats.get("user") or {}
    if user_info.get("quit_at"):
        try:
            quit_label = f"\n🕒 Отказ: {str(user_info['quit_at'])[:16].replace('T', ' ')}"
        except Exception:
            quit_label = ""
    await message.answer(
        f"Твой трек, {user.first_name}:\n\n"
        f"🟢 Чистота: {time_str}\n"
        f"💰 Сэкономлено: {stats.get('saved_kzt', 0):,.0f} ₸\n"
        f"⏱ Возвращено жизни: {stats.get('minutes_returned', 0):,.0f} минут\n"
        f"🧭 Чистота трека: {stats.get('clean_track_percent', 100.0):.1f}%\n"
        f"🧠 Тяг преодолено: {stats.get('cravings_resisted', 0)}{quit_label}\n\n"
        "Сменить точное время отказа: /time",
        reply_markup=tracker_keyboard(user.id),
    )


@router.message(Command("money"))
async def money(message: Message) -> None:
    _, stats = await user_and_stats(message)
    if stats is None:
        await message.answer("Сначала пройди онбординг: /start")
        return
    saved = stats.get("saved_kzt", 0)
    user_info = stats.get("user") or {}
    goal = user_info.get("financial_goal_kzt") or 0
    goal_line = ""
    if goal > 0:
        percent = min(100.0, saved / goal * 100)
        goal_line = f"\n🎯 Цель: {saved:,.0f} / {goal:,.0f} ₸ ({percent:.1f}%)"
    daily_cost = stats.get("daily_cost_kzt", 0)
    await message.answer(
        f"💰 Твоя финансовая свобода:\n\n"
        f"Сэкономлено: {saved:,.0f} ₸\n"
        f"В день остаётся: {daily_cost:,.0f} ₸{goal_line}\n\n"
        "Деньги больше не сгорают в дым."
    )


@router.message(Command("health"))
async def health(message: Message) -> None:
    _, stats = await user_and_stats(message)
    if stats is None:
        await message.answer("Сначала пройди онбординг: /start")
        return
    days = stats["days_free"]
    if days < 1:
        phase = "Первые часы: пульс и давление возвращаются к норме, CO покидает кровь."
    elif days < 3:
        phase = "1–3 дня: никотин выходит из организма, вкусы и запахи становятся ярче."
    elif days < 7:
        phase = "4–7 дней: пик физической тяги пройден, дыхание становится глубже."
    elif days < 30:
        phase = "2–4 недели: кровообращение улучшается, функция легких растет."
    else:
        phase = "1+ месяц: кашель уходит, дофаминовая система перестроилась."
    await message.answer(
        f"🫁 Восстановление тела (ВОЗ):\n\n"
        f"Чистых дней: {days}\n"
        f"Возвращено жизни: ~{stats['minutes_returned']:,.0f} минут\n\n"
        f"Фаза: {phase}"
    )


@router.message(Command("achievements"))
async def achievements(message: Message) -> None:
    _, stats = await user_and_stats(message)
    if stats is None:
        await message.answer("Сначала пройди онбординг: /start")
        return
    names = {
        "first_day": "🌱 Первый чистый день",
        "week_free": "✦ Неделя свободы",
        "month_free": "◆ Месяц нового ритма",
        "craving_master": "◉ Мастер тяги (10 побед)",
    }
    earned = {item["code"] for item in stats["achievements"]}
    lines = []
    for code, title in names.items():
        mark = "✅" if code in earned else "🔒"
        lines.append(f"{mark} {title}")
    await message.answer("🏆 Твои достижения:\n\n" + "\n".join(lines))
