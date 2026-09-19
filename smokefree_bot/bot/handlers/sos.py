from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard

router = Router(name="sos")

@router.message(Command("sos"))
@router.callback_query(F.data == "sos_help")
async def sos_handler(event: Message | CallbackQuery) -> None:
    user, _ = await user_and_stats(event)
    text = (
        "🆘 <b>ЭКСТРЕННАЯ ПОМОЩЬ ПРИ ТЯГЕ</b>\n\n"
        "⚡️ <b>Пик волны длится ВСЕГО 3 МИНУТЫ!</b>\n\n"
        "Сделай прямо сейчас:\n"
        "1️⃣ <b>Пей воду</b>: Медленно выпей стакан холодной воды.\n"
        "2️⃣ <b>Дыхание 4-7-8</b>: Вдох 4 сек, задержка 7 сек, выдох 8 сек.\n"
        "3️⃣ <b>Смени действие</b>: Умойся холодной водой или встань и пройдись.\n\n"
        "💡 <i>Желание закурить — это биохимическая волна. Она угаснет через 180 секунд. Ты сильный!</i>"
    )
    if isinstance(event, CallbackQuery):
        await event.answer()
        await event.message.answer(text, reply_markup=tracker_keyboard(user.id), parse_mode="HTML")
    else:
        await event.answer(text, reply_markup=tracker_keyboard(user.id), parse_mode="HTML")
