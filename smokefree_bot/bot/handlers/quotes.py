import random
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard

router = Router(name="quotes")

QUOTES = [
    "«Каждая невыкуренная сигарета — это ваша прямая победа над никотиновой зависимостью.»",
    "«Тяга к никотину длится всего 3 минуты. Вспомни, ради чего ты начал этот путь.»",
    "«Вы бросаете не привычку, вы возвращаете себе свободу и здоровое дыхание.»",
    "«Удовольствие от сигареты длится 5 минут. Гордость за чистый день останется с тобой навсегда.»",
]

@router.message(Command("quote"))
async def quote_handler(message: Message) -> None:
    user, _ = await user_and_stats(message)
    quote = random.choice(QUOTES)
    await message.answer(f"💭 {quote}", reply_markup=tracker_keyboard(user.id))
