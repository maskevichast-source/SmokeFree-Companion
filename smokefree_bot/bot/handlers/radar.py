from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard

router = Router(name="radar")

@router.message(Command("radar"))
async def radar_handler(message: Message) -> None:
    user, _ = await user_and_stats(message)
    await message.answer(
        "⚡️ <b>Умный триггер-радар</b>\n\n"
        "Радар заранее (за 15 минут) предупреждает вас в Telegram перед вашими частыми триггерами (утренний кофе, обед, пробки, вечерний отдых).\n\n"
        "Управлять списком триггеров и временем прихода сообщений можно во вкладке «Радар» внутри приложения.",
        reply_markup=tracker_keyboard(user.id),
        parse_mode="HTML"
    )
