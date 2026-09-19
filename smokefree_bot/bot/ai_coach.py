from __future__ import annotations

import logging
import random
from typing import Any
from bot.config import get_settings
from bot.wisdom import WISDOM_COLLECTION, get_random_wisdom, build_wisdom_context

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Ты — персональный наставник и мудрый КПТ-коуч по освобождению от никотина в проекте SmokeFree.
Ты объединяешь глубину когнитивно-поведенческой терапии, нейробиологию зависимости (Huberman Lab), опыт лучших мировых книг, кинематографа и живую мудрость людей с форумов (r/stopsmoking, ne-kurim.ru).

ТВОЯ ФУНДАМЕНТАЛЬНАЯ БАЗА ЗНАНИЙ:
1. КНИГИ:
   - Аллен Карр («Легкий способ»): Концепция «Маленького чудовища» (никотиновый паразит, который умирает без дозы) и «Большого чудовища» (промывка мозгов). Сигарета НЕ снимает стресс — она лишь временно убирает абстиненцию от предыдущей затяжки. Бросая, человек ничего не теряет, а выходит из платной тюрьмы.
   - Д-р Джадсон Брюер («Зависимый мозг»): Метод RAIN. Тягу не нужно давить — исследуй её с любопытством как физическое ощущение (сжатие, тепло, пульсация), пока волна не схлынет за 3 минуты.
   - Джеймс Клир («Атомные привычки»): Сдвиг идентичности. «Я не бросающий курильщик, терпящий лишения — я свободный некурящий человек».
   - Виктор Франкл: «Между стимулом и реакцией есть зазор — в нем наша свобода выбора».
   - Стоики (Марк Аврелий, Сенека): Твое тело и импульсы — не есть ты. Разум выше физиологического шума.

2. КИНЕМАТОГРАФ И ОБЛИЧЕНИЕ ИНДУСТРИИ:
   - «Свой человек» (The Insider): Табачные корпорации цинично добавляли аммиак, чтобы никотин бил в мозг за 7 секунд. Вся зависимость — это рукотворный наркотический капкан, созданный ради миллиардных прибылей.
   - «Здесь курят» (Thank You for Smoking): Романтизация сигарет в кино — это проплаченный обман. В реальности за кадром остаются кашель, серый цвет лица и одышка.

3. РЕАЛЬНЫЙ ОПЫТ ФОРУМОВ (r/stopsmoking, ne-kurim.ru):
   - Закон NOPE (Not One Puff Ever): Не существует «одной безобидной сигаретки за компанию». 98% срывов начинаются с одной затяжки спустя месяцы.
   - Стадии очищения: 
     * Дни 1-3: Химический пик, туман в голове (brain fog), вывод никотина.
     * Дни 4-14: Перестройка привычных ритуалов (кофе, перекур после еды, дорога домой).
     * Недели 3-4: Дофаминовая яма («мир кажется пресным») — временная калибровка рецепторов.
     * Месяцы 2-3: Ловушка ложной самоуверенности («я доказал себе, теперь могу покурить одну»).
   - Бытовые якоря: Ледяная вода мелкими глотками, зубочистки, мятные леденцы, глубокие медленные вдохи свежего воздуха.

СТИЛЬ И ПРАВИЛА ОБЩЕНИЯ:
- Будь живым, проницательным, теплым и психологически точным. Никаких шаблонных ответов бота («Вы молодец, держитесь!»).
- Умей подсветить самообман («Я только одну», «У меня стресс, нужно покурить»).
- Периодически используй меткие аналогии, цитаты авторов (Карр, Франкл, Марк Аврелий) или кино-образы.
- Длина ответа: 2-4 емких абзаца. Всегда формулируй мысль до конца и завершай предложения без обрыва.
- Всегда завершай реплику возвращающим контроль вопросом или конкретным микро-действием.
"""

class AICoach:
    def __init__(self) -> None:
        self._client: Any | None = None
        self._types: Any | None = None
        # In-memory dialog history for users: user_id -> list of {"role": "user"|"model", "text": "..."}
        self._dialogs: dict[int, list[dict[str, str]]] = {}

    def _load(self) -> None:
        if self._client is not None:
            return
        from google import genai
        from google.genai import types
        key = get_settings().gemini_api_key.get_secret_value()
        self._client = genai.Client(api_key=key)
        self._types = types

    def _save_turn(self, user_id: int | None, user_msg: str, model_reply: str) -> None:
        if not user_id:
            return
        history = self._dialogs.setdefault(user_id, [])
        history.append({"role": "user", "text": user_msg})
        history.append({"role": "model", "text": model_reply})
        # Keep only the last 8 messages (4 turns)
        if len(history) > 8:
            self._dialogs[user_id] = history[-8:]

    def _format_history_contents(self, user_id: int | None, current_prompt: str) -> list[Any]:
        history = self._dialogs.get(user_id, []) if user_id else []
        contents: list[Any] = []
        for item in history:
            role = item["role"]
            contents.append(self._types.Content(
                role=role,
                parts=[self._types.Part.from_text(text=item["text"])]
            ))
        contents.append(self._types.Content(
            role="user",
            parts=[self._types.Part.from_text(text=current_prompt)]
        ))
        return contents

    async def _generate(self, user_id: int | None, prompt: str, system_override: str | None = None) -> str:
        try:
            self._load()
            models_to_try = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
            contents = self._format_history_contents(user_id, prompt)
            instruction = system_override or SYSTEM_PROMPT

            last_err = None
            for model_name in models_to_try:
                try:
                    response = await self._client.aio.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=self._types.GenerateContentConfig(
                            system_instruction=instruction,
                            temperature=0.7,
                            max_output_tokens=1500,
                        ),
                    )
                    text = (response.text or "").strip()
                    if text:
                        self._save_turn(user_id, prompt, text)
                        return text
                except Exception as e:
                    last_err = e
                    logger.warning("Model %s failed: %s, trying next", model_name, e)
                    continue

            if last_err:
                raise last_err
            raise RuntimeError("Empty response from all Gemini models")
        except Exception:
            logger.exception("Gemini request failed, returning dynamic wisdom fallback")
            w = get_random_wisdom()
            fallback = (
                f"{w.badge} — {w.source}:\n"
                f"{w.quote}\n\n"
                f"💡 {w.takeaway}\n\n"
                "Сделай сейчас 4 глубоких вдоха и выпей стакан прохладной воды. Что именно сейчас пытается спровоцировать тягу?"
            )
            self._save_turn(user_id, prompt, fallback)
            return fallback

    async def reply(self, message: str, days_free: int = 0, user_id: int | None = None) -> str:
        if days_free <= 3:
            stage_hint = "Острый физический детокс (дни 1-3). Вывод никотина, химический шторм, ватная голова."
        elif days_free <= 14:
            stage_hint = "Перестройка ритуалов (дни 4-14). Возврат вкуса, психологический разрыв привычных пауз."
        elif days_free <= 30:
            stage_hint = "Дофаминовая стабилизация (дни 15-30). Рецепторы восстанавливаются, важно не заскучать."
        else:
            stage_hint = f"Уверенная свобода ({days_free} дн.). Главная опасность — иллюзия 'от одной сигаретки ничего не будет'."

        context = (
            f"[Контекст: пользователь свободен от никотина уже {days_free} дней. Стадия: {stage_hint}]\n"
            f"Сообщение пользователя: {message}\n\n"
            "Ответь как мудрый, понимающий наставник. Если уместно, приведи глубокую мысль Карра, стоиков, Брюера или аналогию из фильмов/форумов."
        )
        return await self._generate(user_id, context)

    async def analyze_relapse(
        self, trigger: str, reflection: str, plan: str, days_free: int, user_id: int | None = None
    ) -> str:
        prompt = (
            f"[Пользователь был свободен {days_free} дней и сообщил о срыве/осечке]\n"
            f"Триггер: {trigger}\n"
            f"Рефлексия: {reflection}\n"
            f"План действий: {plan}\n\n"
            "Дай глубокий терапевтический ответ:\n"
            "1. Категорически сними вину и стыд: это не обнуление опыта, а ценный урок биохимии и психологии.\n"
            "2. Объясни механику ловушки (по Карру / Брюеру / опыту форумов: почему мозг обманул).\n"
            "3. Дай одно конкретное действие на ближайшие 24 часа для восстановления импульса победы."
        )
        return await self._generate(user_id, prompt)

    async def voice_reply(self, audio_data: bytes, days_free: int = 0, user_id: int | None = None) -> str:
        try:
            self._load()
            audio_part = self._types.Part.from_bytes(data=audio_data, mime_type="audio/ogg")
            models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash"]
            prompt = (
                f"Это аудиосообщение пользователя (стаж свободы: {days_free} дней). "
                "Пойми его эмоции, интонацию и суть. Ответь как мудрый КПТ-коуч и наставник с цитатой или глубоким инсайтом."
            )
            for m in models_to_try:
                try:
                    response = await self._client.aio.models.generate_content(
                        model=m,
                        contents=[audio_part, prompt],
                        config=self._types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            temperature=0.7,
                            max_output_tokens=400,
                        ),
                    )
                    text = (response.text or "").strip()
                    if text:
                        self._save_turn(user_id, "[Голосовое сообщение]", text)
                        return text
                except Exception:
                    continue
            raise RuntimeError("Voice generation failed")
        except Exception:
            logger.exception("Voice coaching failed")
            return await self.reply("Мне сложно сейчас проговорить, но я чувствую сильную тягу к никотину.", days_free, user_id)

coach = AICoach()

async def ask_ai_coach(user: Any, stats: dict | None, message: str) -> str:
    days = stats.get("days_free", 0) if stats else 0
    user_id = getattr(user, "id", None)
    return await coach.reply(message, days_free=days, user_id=user_id)
