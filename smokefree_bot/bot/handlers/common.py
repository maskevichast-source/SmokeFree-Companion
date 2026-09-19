from aiogram.types import Message, CallbackQuery
from database.connection import SessionFactory
from database.crud import get_or_create_user, build_stats
from database.models import User

async def user_and_stats(event: Message | CallbackQuery) -> tuple[User, dict | None]:
    telegram_user = event.from_user
    if not telegram_user:
        raise ValueError("No telegram user found in event")
    async with SessionFactory() as session:
        user = await get_or_create_user(
            session,
            user_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name or "Друг",
        )
        try:
            stats = await build_stats(session, user.id)
        except LookupError:
            stats = None
        return user, stats
