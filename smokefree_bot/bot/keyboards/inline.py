from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.types.web_app_info import WebAppInfo
from bot.config import get_settings
try:
    from webapp.api import make_user_token
except ImportError:
    from smokefree_bot.webapp.api import make_user_token

def tracker_keyboard(user_id: int) -> InlineKeyboardMarkup:
    settings = get_settings()
    bot_token = settings.bot_token.get_secret_value() if settings.bot_token else ""
    token = make_user_token(user_id, bot_token) if bot_token else ""
    base_url = settings.webapp_url.rstrip('/') if settings.webapp_url else ""
    if not base_url:
        url = f"https://smokefree.app/?user_id={user_id}&token={token}"
    else:
        url = f"{base_url}/?user_id={user_id}&token={token}"
    
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Открыть трекер", web_app=WebAppInfo(url=url))],
            [
                InlineKeyboardButton(text="🆘 SOS Тяга", callback_data="sos_help"),
                InlineKeyboardButton(text="📊 Прогресс", callback_data="status_refresh"),
            ]
        ]
    )
