from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from bot.handlers.common import user_and_stats

router = Router(name="stats")


@router.message(Command("status"))
@router.callback_query(F.data == "status_refresh")
async def status(event: Message | CallbackQuery) -> None:
    user, stats = await user_and_stats(event)
    if stats is None:
        if isinstance(event, CallbackQuery):
            await event.answer("Сначала пройди короткий онбординг: /start", show_alert=True)
        else:
            await event.answer("Сначала пройди короткий онбординг: /start")
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
    text = (
        f"Твой трек, {user.first_name}:\n\n"
        f"🟢 Чистота: {time_str}\n"
        f"💰 Сэкономлено: {stats.get('saved_kzt', 0):,.0f} ₸\n"
        f"⏱ Возвращено жизни: {stats.get('minutes_returned', 0):,.0f} минут\n"
        f"🧭 Чистота трека: {stats.get('clean_track_percent', 100.0):.1f}%\n"
        f"🧠 Тяг преодолено: {stats.get('cravings_resisted', 0)}{quit_label}\n\n"
        "Сменить точное время отказа: /time"
    )
    if isinstance(event, CallbackQuery):
        await event.answer("Прогресс обновлен! 🔄")
        try:
            await event.message.edit_text(text, reply_markup=tracker_keyboard(user.id))
        except Exception:
            # If message content didn't change, Telegram raises exception
            pass
    else:
        await message_or_event_answer(event, text, tracker_keyboard(user.id))

async def message_or_event_answer(event: Message | CallbackQuery, text: str, reply_markup) -> None:
    if isinstance(event, CallbackQuery):
        await event.message.answer(text, reply_markup=reply_markup)
    else:
        await event.answer(text, reply_markup=reply_markup)


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
    hours = stats.get("hours_free", 0)
    total_sec = stats.get("total_seconds_free", days * 86400)

    # Detailed WHO Medical timeline analysis
    if total_sec < 20 * 60:
        current_status = "Первые 20 минут: пульс замедляется, артериальное давление начинает снижаться к норме."
        next_goal = "Через 8 часов: угарный газ (CO) в крови снизится вдвое, клетки насытятся кислородом."
    elif total_sec < 8 * 3600:
        current_status = "Первые часы: сосуды конечностей расширяются, температура ладоней и стоп нормализуется."
        next_goal = "К 8 часам: уровень кислорода в крови вернется к идеальному оптимуму."
    elif total_sec < 24 * 3600:
        current_status = "8–24 часа: угарный газ полностью вытеснен кислородом. Риск внезапного инфаркта уже пошел на спад."
        next_goal = "К 24 часам: легкие начнут активный дренаж слизи и продуктов горения."
    elif total_sec < 48 * 3600:
        current_status = "1–2 дня: никотин и его метаболиты выводятся из организма. Обоняние и вкус становятся ярче."
        next_goal = "К 48 часам: нервные окончания начнут ускоренную регенерацию."
    elif total_sec < 72 * 3600:
        current_status = "2–3 дня: пик никотиновой абстиненции позади! Бронхиальные трубки расслабляются, дыхание глубже."
        next_goal = "К 72 часам: спад физической тяги, прилив физической энергии."
    elif days < 7:
        current_status = "4–7 дней: кровь полностью очищена от котинина. Улучшается микроциркуляция и сон."
        next_goal = "К 7 дням: утренний пульс станет стабильным, первая победная неделя."
    elif days < 14:
        current_status = "1–2 недели: детокс печени завершен. Проходят головные боли, стабилизируется давление."
        next_goal = "К 14 дням: прирост функции легких до +30%."
    elif days < 30:
        current_status = "2–4 недели: кровообращение во всем теле возросло. Шаги и подъемы по лестнице не вызывают одышки."
        next_goal = "К 30 дням: регенерация ресничек мерцательного эпителия бронхов."
    elif days < 90:
        current_status = "1–3 месяца: утренний кашель исчез. Реснички легких полностью самоочищают дыхательные пути."
        next_goal = "К 90 дням: прирост объема форсированного выдоха (ФЖЕЛ) до +15%."
    elif days < 180:
        current_status = "3–6 месяцев: пазухи носа свободны, застойные явления в бронхах полностью угасли."
        next_goal = "К 6 месяцам: полное восстановление дофаминовых нейромедиаторов."
    elif days < 365:
        current_status = "6–12 месяцев: маркеры сосудистого воспаления (СРБ) в крови упали до нормы некурящего человека."
        next_goal = "К 1 году: снижение риска ишемической болезни сердца (ИБС) на 50%!"
    else:
        current_status = "1+ год: риск сердечно-сосудистых катастроф снизился вдвое! Твое тело спасено."
        next_goal = "К 5 годам: риск инсульта сравняется с показателями никогда не куривших людей."

    await message.answer(
        f"🫁 <b>Медицинский статус тела (ВОЗ & Stanford):</b>\n\n"
        f"⏱ <b>Чистый трек:</b> {days} дн. {hours} ч.\n"
        f"⏱ <b>Возвращено жизни:</b> ~{stats.get('minutes_returned', 0):,.0f} минут\n\n"
        f"🔬 <b>Что происходит сейчас:</b>\n{current_status}\n\n"
        f"🎯 <b>Следующий рубеж:</b>\n{next_goal}\n\n"
        f"Все фазы восстановления смотри в трекере по кнопке ниже:",
        reply_markup=tracker_keyboard(user.id),
        parse_mode="HTML"
    )


@router.message(Command("achievements"))
async def achievements(message: Message) -> None:
    user, stats = await user_and_stats(message)
    if stats is None:
        await message.answer("Сначала пройди онбординг: /start")
        return

    from database.crud import ACHIEVEMENT_METADATA
    earned_codes = {item["code"] for item in stats.get("achievements", [])}
    total_count = len(ACHIEVEMENT_METADATA)
    earned_count = len(earned_codes)
    pct = round((earned_count / total_count) * 100) if total_count else 0

    lines = []
    lines.append(f"🏆 <b>Твои достижения ({earned_count}/{total_count} · {pct}%):</b>\n")

    # Group by category
    categories = [
        ("health", "🫁 Здоровье и восстановление"),
        ("mindset", "🧠 Осознанность и победа над тягой"),
        ("money", "💰 Финансовая свобода"),
        ("mastery", "🎯 Мастерство чистоты"),
    ]

    for cat_id, cat_title in categories:
        items = [
            (code, meta) for code, meta in ACHIEVEMENT_METADATA.items()
            if meta.get("category", "health") == cat_id
        ]
        if not items:
            continue
        lines.append(f"<b>{cat_title}:</b>")
        for code, meta in items:
            is_unlocked = code in earned_codes
            mark = "✅" if is_unlocked else "🔒"
            lines.append(f"{mark} {meta['icon']} {meta['title']} — <i>{meta['description']}</i>")
        lines.append("")

    await message.answer("\n".join(lines).strip(), reply_markup=tracker_keyboard(user.id), parse_mode="HTML")
