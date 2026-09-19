from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard

router = Router(name="relapse")

@router.message(Command("relapse"))
async def relapse_handler(message: Message) -> None:
    user, _ = await user_and_stats(message)
    await message.answer(
        "🤝 <b>Срыв — это не провал, а ценный опыт</b>\n\n"
        "Не кори себя. Срывы случаются у 90% бросающих. Главное — сразу вернуться на чистый трек, зафиксировать триггер и двигаться дальше.\n\n"
        "Сбросить таймер или записать срыв можно в приложении.",
        reply_markup=tracker_keyboard(user.id),
        parse_mode="HTML"
    )
