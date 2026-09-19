import random
from dataclasses import dataclass

@dataclass
class WisdomItem:
    badge: str
    source: str
    quote: str
    takeaway: str

WISDOM_COLLECTION = [
    WisdomItem(
        badge="🌱 Аллен Карр",
        source="«Легкий способ бросить курить»",
        quote="Сигарета не заполняет пустоту — она её создает.",
        takeaway="Пойми: никотин выводится из организма, а 'маленькое чудовище' требует подкормки. Не корми его."
    ),
    WisdomItem(
        badge="🧘 Д-р Джадсон Брюер",
        source="«Зависимый мозг»",
        quote="Заметь физическое ощущение тяги, встреть его с любопытством как волну в океане.",
        takeaway="Тяга достигает пика и утихает сама за 3 минуты. Не борись с волной — оседлай её."
    ),
    WisdomItem(
        badge="⚡️ Стоицизм",
        source="Марк Аврелий — «Размышления»",
        quote="У тебя есть власть над своим разумом, а не над внешними событиями. Осознай это, и ты найдешь силу.",
        takeaway="Импульс выкурить сигарету — это просто биохимический шум. Твой разум выше физиологических позывов."
    ),
    WisdomItem(
        badge="🚀 Сдвиг идентичности",
        source="Джеймс Клир — «Атомные привычки»",
        quote="Каждое действие — это голос за того человека, которым вы хотите стать.",
        takeaway="Ты не бросающий курильщик, лишающий себя чего-то. Ты свободный человек, который выбирает здоровье."
    )
]

def get_random_wisdom() -> WisdomItem:
    return random.choice(WISDOM_COLLECTION)

def build_wisdom_context() -> str:
    item = get_random_wisdom()
    return f"{item.badge} ({item.source}): {item.quote} — {item.takeaway}"
