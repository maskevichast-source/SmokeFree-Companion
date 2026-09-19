from aiogram import Router
from aiogram.filters import CommandStart, Command
from aiogram.types import Message
from bot.handlers.common import user_and_stats
from bot.keyboards.inline import tracker_keyboard

router = Router(name="start")

@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    user, stats = await user_and_stats(message)
    name = user.first_name or "Друг"
    await message.answer(
        f"Привет, {name}! 👋\n\n"
        f"Я твой спутник в жизни без никотина 🚭\n\n"
        f"Запусти трекер с точностью до секунды, отслеживай сэкономленные деньги и очистку организма:\n\n"
        f"Команды в чате:\n"
        f"• /status — текущий статус трекера\n"
        f"• /time — установить время отказа\n"
        f"• /sos — экстренная помощь при тяге\n"
        f"• /ios — как установить иконку на iPhone\n"
        f"• /money, /health, /radar, /relapse",
        reply_markup=tracker_keyboard(user.id)
    )

@router.message(Command("ios"))
async def cmd_ios(message: Message) -> None:
    user, _ = await user_and_stats(message)
    await message.answer(
        "📱 <b>Как добавить SmokeFree на экран iPhone:</b>\n\n"
        "1. Нажмите «🚀 Открыть трекер» ниже\n"
        "2. В правом верхнем углу нажмите кнопку «···» или откройте ссылку в Safari\n"
        "3. В Safari нажмите иконку «Поделиться» (квадрат со стрелкой вверх ⬆️)\n"
        "4. Выберите «На экран Домой» («Add to Home Screen»)\n\n"
        "Готово! Теперь трекер открывается как приложение на рабочем столе.",
        reply_markup=tracker_keyboard(user.id),
        parse_mode="HTML"
    )

@router.message(Command("time"))
async def cmd_time(message: Message) -> None:
    user, _ = await user_and_stats(message)
    await message.answer(
        "🕒 <b>Изменение времени отказа:</b>\n\n"
        "Откройте трекер по кнопке ниже и нажмите на шестеренку ⚙️ или блок времени, чтобы изменить точную дату и минуты.",
        reply_markup=tracker_keyboard(user.id),
        parse_mode="HTML"
    )
