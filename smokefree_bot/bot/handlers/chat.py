import logging
from aiogram import Router, F
from aiogram.types import Message
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard
from bot.ai_coach import ask_ai_coach

logger = logging.getLogger(__name__)
router = Router(name="chat")

@router.message(F.text)
async def chat_handler(message: Message) -> None:
    if not message.text or message.text.startswith("/"):
        return
    user, stats = await user_and_stats(message)
    user_text = message.text.strip()
    
    try:
        reply = await ask_ai_coach(user, stats, user_text)
    except Exception as e:
        logger.warning(f"AI coach fallback: {e}")
        reply = f"Я с тобой, {user.first_name}! Каждый день без никотина — это твоя победа. Если почувствуешь сильную тягу, отправь команду /sos или открой трекер!"

    await message.answer(reply, reply_markup=tracker_keyboard(user.id))
