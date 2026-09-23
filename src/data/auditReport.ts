import { AuditBug, ArchitectureFlaw, HealthMilestone } from '../types';

export const AUDIT_BUGS: AuditBug[] = [
  {
    id: 'bug-1',
    severity: 'CRITICAL',
    title: 'Падение фонового планировщика (Crash в APScheduler radar_job)',
    location: 'smokefree_bot/bot/scheduler/jobs.py (строки 62–67)',
    description: 'Обращение к несуществующему атрибуту модели и неверная сигнатура вызова функции mark_radar_sent.',
    cause: 'В коде вызывается: `if trigger.time_minutes != target_minutes or trigger.last_sent_date == today:` — однако в SQLAlchemy-модели UserTrigger поле называется last_radar_sent (DateTime), а поля last_sent_date вообще нет! Далее вызывается: `claimed = await mark_radar_sent(session, trigger.id, today)`, тогда как mark_radar_sent(session, trigger_id) принимает только 2 аргумента и возвращает None.',
    impact: 'Каждую минуту при срабатывании scheduler выбрасывается AttributeError/TypeError. Радар триггеров полностью сломан и не отправляет оповещения за 15 минут.',
    buggyCode: `# bot/scheduler/jobs.py
for trigger, user in await radar_targets(session):
    # ОШИБКА 1: AttributeError: 'UserTrigger' has no 'last_sent_date'
    if trigger.time_minutes != target_minutes or trigger.last_sent_date == today:
        continue
    # ОШИБКА 2: TypeError: mark_radar_sent takes 2 arguments, 3 given
    # ОШИБКА 3: mark_radar_sent возвращает None, поэтому claimed is None всегда True!
    claimed = await mark_radar_sent(session, trigger.id, today)
    if claimed is None:
        continue`,
    fixedCode: `# bot/scheduler/jobs.py — ИСПРАВЛЕНИЕ:
for trigger, user in await radar_targets(session):
    if trigger.time_minutes != target_minutes:
        continue
    # Проверяем, отправлялось ли уведомление сегодня в таймзоне пользователя
    if trigger.last_radar_sent:
        last_sent_day = trigger.last_radar_sent.astimezone(tz).date()
        if last_sent_day == today:
            continue
    # Отправляем сообщение
    await bot.send_message(user.id, msg, reply_markup=tracker_keyboard())
    await mark_radar_sent(session, trigger.id)`
  },
  {
    id: 'bug-2',
    severity: 'CRITICAL',
    title: 'Конфликт Long Polling при деплое на Railway (TelegramConflictError)',
    location: 'smokefree_bot/main.py (строки 42–49)',
    description: 'Параллельный запуск Telegram Polling внутри контейнера веб-сервера без обработки zero-downtime перезапусков Railway.',
    cause: 'Railway при деплое или healthcheck запускает новый контейнер параллельно со старым (rolling update). Оба контейнера вызывают `dispatcher.start_polling(bot)`. Telegram API немедленно отклоняет второй процесс с TelegramConflictError: "terminated by other getUpdates request", приводя к бесконечному циклу рестартов контейнера (CrashLoop).',
    impact: 'Бот «падает» во время любого обновления на Railway и блокирует получение апдейтов на 1-3 минуты.',
    buggyCode: `# smokefree_bot/main.py
bot_task = asyncio.create_task(
    dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types()),
    name="telegram-polling",
)
done, pending = await asyncio.wait(
    {api_task, bot_task}, return_when=asyncio.FIRST_EXCEPTION
)`,
    fixedCode: `# ВАРИАНТ А (Рекомендуемый для Railway): Переход на Telegram Webhook
@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret != settings.webhook_secret:
        raise HTTPException(status_code=403)
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dispatcher.feed_update(bot, update)
    return {"ok": True}

# ВАРИАНТ Б: Drop pending updates + graceful retry при polling
await bot.delete_webhook(drop_pending_updates=True)
await dispatcher.start_polling(bot, handle_as_tasks=True)`
  },
  {
    id: 'bug-3',
    severity: 'HIGH',
    title: 'Использование window.prompt() в Telegram WebApp (Блокировка ввода)',
    location: 'smokefree_bot/webapp/static/app.js (строки 241–245)',
    description: 'Диалоги prompt() заблокированы или вызывают зависание на iOS и Android внутри Telegram WebApp.',
    cause: 'В коде кнопки "Я оступился" логика рефлексии сделана через 3 последовательных вызова prompt(): `const cigarettes = Number(prompt("..."))`. В современных мобильных WebViews (Safari WKWebView / Chrome WebView) вызовы prompt/alert часто подавляются либо вызывают сброс фокуса и краш контекста Mini App.',
    impact: 'Пользователь не может записать факт срыва из WebApp, протокол No-Shame Relapse становится недоступен.',
    buggyCode: `// webapp/static/app.js
$("relapseButton")?.addEventListener("click", async () => {
  const cigarettes = Number(prompt("Сколько единиц было выкурено?", "1"));
  if (!cigarettes) return;
  const trigger = prompt("Какой триггер спровоцировал срыв?", "Стресс") || "Стресс";
  const plan = prompt("Какой шаг поможет в следующий раз?", "Сменить обстановку") || "Дыхание";
  ...
});`,
    fixedCode: `// Замена на кастомную модалку (Modal / Bottom Sheet) без prompt():
function openRelapseModal() {
  document.getElementById("modalRelapse").classList.add("active");
}
// Форма внутри DOM с полями ввода, кнопками-чипами и тактильным откликом (tg.HapticFeedback)`
  },
  {
    id: 'bug-4',
    severity: 'HIGH',
    title: 'Игнорирование локального часового пояса пользователя в рассылках',
    location: 'smokefree_bot/bot/scheduler/jobs.py & config.py',
    description: 'Утренние и вечерние уведомления (09:00 и 21:00) захардкожены на единую серверную таймзону Asia/Almaty.',
    cause: 'Хотя в таблице `users` есть колонка `timezone`, в планировщике `send_daily_message` просто берутся все пользователи и им отправляется сообщение в момент, когда в Астане 09:00. Для пользователей из других городов (например, Москва, Ташкент, Баку, Бишкек, Стамбул) уведомления приходят посреди ночи или с опозданием на несколько часов.',
    impact: 'Разрушение доверия к напоминаниям, раздражающие ночные пуши.',
    buggyCode: `# bot/scheduler/jobs.py
async def send_daily_message(bot: Bot, kind: str) -> None:
    async with SessionFactory() as session:
        users = (await session.scalars(select(User).where(User.onboarding_complete.is_(True)))).all()
        today = datetime.now(ZoneInfo(get_settings().timezone)).date() # Только Астана!`,
    fixedCode: `# Проверка локального часа для каждого пользователя
async def send_hourly_tick(bot: Bot) -> None:
    utc_now = datetime.now(timezone.utc)
    async with SessionFactory() as session:
        users = await session.scalars(select(User).where(User.onboarding_complete.is_(True)))
        for user in users:
            user_tz = ZoneInfo(user.timezone or "Asia/Almaty")
            local_time = utc_now.astimezone(user_tz)
            if local_time.hour == 9 and local_time.minute == 0:
                await send_morning_msg(bot, user)
            elif local_time.hour == 21 and local_time.minute == 0:
                await send_evening_msg(bot, user)`
  },
  {
    id: 'bug-5',
    severity: 'HIGH',
    title: 'Разрыв соединений с PostgreSQL на Railway (Отсутствие pool_pre_ping)',
    location: 'smokefree_bot/database/connection.py (строки 8–18)',
    description: 'Отсутствие проверки живости соединения и лимитов пула в create_async_engine.',
    cause: 'В документации README заявлено, что включен pool_pre_ping, но в коде `create_async_engine(settings.database_dsn, echo=settings.debug, future=True)` этот флаг забыт. Railway PostgreSQL закрывает неактивные TCP-соединения через 5–10 минут. Первый же запрос после простоя выбрасывает asyncpg.ConnectionDoesNotExistError / InterfaceError.',
    impact: 'Пользователи получают ошибку 500 "Internal Server Error" в WebApp после ночной паузы.',
    buggyCode: `# database/connection.py
engine = create_async_engine(
    settings.database_dsn,
    echo=settings.debug,
    future=True,
    # НЕТ pool_pre_ping! НЕТ pool_recycle!
)`,
    fixedCode: `# database/connection.py — ИСПРАВЛЕНИЕ:
engine = create_async_engine(
    settings.database_dsn,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,      # Пинг соединения перед выдачей из пула
    pool_recycle=1800,       # Пересоздание соединений каждые 30 минут
    pool_size=10,            # Безопасный размер пула для Railway
    max_overflow=5,
)`
  },
  {
    id: 'bug-6',
    severity: 'MEDIUM',
    title: 'Мутация базы данных внутри GET-запроса (Side-effects в build_stats)',
    location: 'smokefree_bot/database/crud.py (строки 185–195)',
    description: 'Функция расчета статистики build_stats() выполняет INSERT и COMMIT в базу данных при обычном чтении.',
    cause: 'При каждом вызове GET `/api/stats/{user_id}` функция `build_stats()` проверяет условия ачивок и принудительно вызывает `await add_achievement(session, user_id, ...)`, который делает `session.commit()`. Это нарушает идемпотентность GET-запросов и может приводить к транзакционным конфликтам при параллельных кликах.',
    impact: 'Замедление времени ответа GET-запросов, лишняя нагрузка на запись в БД.',
    buggyCode: `# database/crud.py
async def build_stats(session: AsyncSession, user_id: int) -> dict:
    ...
    if clean_days >= 1:
        await add_achievement(session, user_id, "first_day") # COMMIT внутри GET!
    if clean_days >= 7:
        await add_achievement(session, user_id, "week_free")`,
    fixedCode: `# Разделение чтения и обновления:
# Выдавать ачивки событийно (event-driven) — при завершении дня в scheduler
# или вынести в отдельный асинхронный таск без блокировки сессии выборки.`
  },
  {
    id: 'bug-7',
    severity: 'MEDIUM',
    title: 'Уязвимость безопасности: Бессрочный HMAC-токен и DEBUG-обход авторизации',
    location: 'smokefree_bot/webapp/api.py (строки 62–75)',
    description: 'Статический токен передается в открытом виде через URL и действует вечно; при DEBUG=true возможен захват любого аккаунта.',
    cause: 'Функция `make_user_token` хэширует строку `smokefree:{user_id}` без соли времени или nonce. Ссылка из Telegram сохраняется в истории браузера навсегда. Кроме того, строка `if settings.debug: return user_id` позволяет любому пользователю подменить user_id, если флаг DEBUG не выключен в Railway.',
    impact: 'Риск утечки личных данных дневника тяг и рефлексий срывов.',
    buggyCode: `def make_user_token(user_id: int, bot_token: str) -> str:
    return hmac.new(bot_token.encode(), f"smokefree:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]

if settings.debug:
    return user_id  # Опасно при случайном DEBUG=True на продакшене!`,
    fixedCode: `def make_secure_token(user_id: int, bot_token: str, expires_in: int = 86400 * 30) -> str:
    ts = int(datetime.now(timezone.utc).timestamp())
    payload = f"{user_id}:{ts}"
    sig = hmac.new(bot_token.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}:{sig}"`
  },
  {
    id: 'bug-8',
    severity: 'MEDIUM',
    title: 'Отсутствие системы миграций (Alembic) и костыль с ALTER TABLE',
    location: 'smokefree_bot/database/connection.py (строки 21–25)',
    description: 'В init_db зашит «костыль» с сырым SQL в блоке try-except вместо системы версионирования схемы.',
    cause: 'При каждом запуске сервер пытается выполнить `ALTER TABLE users ADD COLUMN quit_at TIMESTAMP;` и глушит исключение. При этом в базе отсутствуют жизненно важные индексы: `idx_cravings_user_id`, `idx_triggers_user_id`, `idx_triggers_enabled`.',
    impact: 'Полнотекстовые сканирования (Full Table Scans) в PostgreSQL при ежеминутных проверках радара.',
    buggyCode: `async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await connection.execute(text("ALTER TABLE users ADD COLUMN quit_at TIMESTAMP;"))
        except Exception:
            pass`,
    fixedCode: `# Добавить индексы в models.py:
class UserTrigger(Base):
    __tablename__ = "user_triggers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    time_minutes: Mapped[int] = mapped_column(Integer, index=True)`
  },
  {
    id: 'bug-9',
    severity: 'MEDIUM',
    title: 'Ограниченный парсер даты в Telegram-онбординге',
    location: 'smokefree_bot/bot/handlers/start.py (строки 40–80)',
    description: 'Регулярные выражения в parse_quit_datetime не понимают человеческие фразы вида "3 дня назад", "позавчера в 15:00", названия месяцев.',
    cause: 'Парсер ищет только минуты и часы в `ago_match` (`(\d+)\s*(час[а-я]*|мин[а-я]*|ч|м)\s*назад`). Если человек напишет "не курю 4 дня" или "с понедельника", бот отвергает ввод и требует строгого формата.',
    impact: 'Высокий drop-off (отвал) пользователей на шаге онбординга прямо в Telegram.',
    buggyCode: `ago_match = re.match(r"^(\d+)\s*(час[а-я]*|мин[а-я]*|ч|м)\s*назад$", text)
# Нет поддержки дней: 'дня', 'дней', 'день'`,
    fixedCode: `ago_match = re.match(r"^(\d+)\s*(час[а-я]*|мин[а-я]*|ч|м|дн[а-я]*|ден[а-я]*|д)\s*назад$", text)
if "дн" in unit or "ден" in unit or unit == "д":
    return now - timedelta(days=val)`
  },
  {
    id: 'bug-10',
    severity: 'CRITICAL',
    title: 'Ловушка структуры корня репозитория для деплоя на Railway',
    location: 'Корень репозитория GitHub',
    description: 'В корне репозитория лежат остатки Replit-воркспейса Node.js (package.json, pnpm-lock.yaml), а настоящий бот спрятан в папке /smokefree_bot.',
    cause: 'Когда пользователь подключает репозиторий к Railway, Nixpacks автоматически определяет проект как Node.js из-за package.json в корне и пытается запустить pnpm. В то же время railway.json и Procfile лежат внутри smokefree_bot/, поэтому Railway их игнорирует!',
    impact: 'Деплой на Railway падает с ошибкой сборки, пока пользователь вручную не пропишет Root Directory = smokefree_bot в настройках сервиса.',
    buggyCode: `// Корень репозитория содержит:
/package.json
/pnpm-workspace.yaml
/artifacts/...
/smokefree_bot/  <-- Здесь живет настоящий Python-бот!`,
    fixedCode: `// Решение: Либо переместить файлы из smokefree_bot в корень,
// либо добавить в корень репозитория railway.json с указанием rootDirectory:`
  }
];

export const ARCHITECTURE_FLAWS: ArchitectureFlaw[] = [
  {
    id: 'arch-1',
    category: 'Архитектура процесса (Process Architecture)',
    title: 'Монолитный процесс: FastAPI + Aiogram Polling + APScheduler в одном потоке',
    issue: 'Все три компонента (веб-сервер uvicorn, polling телеграма и фоновый планировщик) запущены в одном asyncio event loop. Если AI-запрос к Gemini или транзакция БД блокируют loop, лагает всё приложение.',
    railwayImpact: 'При перезапуске контейнера на Railway прерываются таймеры, а rolling deployment приводит к TelegramConflictError.',
    solution: 'Разделить веб-сервис и телеграм-воркер через Railway Procfile (web: uvicorn, worker: celery/apscheduler) ИЛИ перевести Telegram с Polling на Webhook внутри FastAPI.'
  },
  {
    id: 'arch-2',
    category: 'Сетевое взаимодействие (Networking & Webhooks)',
    title: 'Long Polling вместо Webhook на HTTPS-хостинге',
    issue: 'Бот постоянно удерживает HTTP-соединение с api.telegram.org через polling, хотя Railway уже предоставляет полноценный публичный HTTPS-домен.',
    railwayImpact: 'Лишний трафик, задержка сообщений, невозможность горизонтального масштабирования (scale > 1 контейнера).',
    solution: 'Зарегистрировать Webhook на `https://<railway-domain>/webhook/telegram` и обрабатывать апдейты асинхронно через aiogram.feed_update.'
  },
  {
    id: 'arch-3',
    category: 'База данных и транзакции (Database & Concurrency)',
    title: 'Отсутствие пула с pre-ping и индексов в PostgreSQL',
    issue: 'SQLAlchemy engine настроен без параметров отказоустойчивости для облачных баз данных. При простое соединения дропаются провайдером.',
    railwayImpact: 'Периодические 500 ошибки при первом заходе пользователя утром.',
    solution: 'Настроить `pool_pre_ping=True`, `pool_recycle=1800` и наложить B-Tree индексы на `user_id`, `time_minutes` и `logged_at`.'
  },
  {
    id: 'arch-4',
    category: 'Пользовательский опыт (Human-Centric UX)',
    title: 'Отсутствие интерактивного SOS-протокола в Mini App',
    issue: 'Кнопка SOS в веб-приложении всего лишь показывала всплывающий тост с текстом «дыши на 4 счета», не предоставляя реального инструмента снятия тяги.',
    railwayImpact: 'Пользователь во время острой никотиновой тяги (3-минутный пик) остается один на один с желанием закурить.',
    solution: 'Встроить интерактивный секундомер 3 минут, анимацию дыхания по квадрату (4 сек вдох - 4 сек задержка - 4 сек выдох - 4 сек пауза), заземление 5-4-3-2-1 и сенсорное переключение внимания.'
  },
  {
    id: 'arch-5',
    category: 'Локализация и финансы (Localization & Currency)',
    title: 'Жесткая привязка к Казахстану (KZT, Астана) без гибкости',
    issue: 'Валюта захардкожена в ₸ (тенге), таймзона в Asia/Almaty, пробки на пр. Туран. Для пользователей из других стран или городов это выглядит чужеродно.',
    railwayImpact: 'Ограничение аудитории продукта одним городом.',
    solution: 'Сделать настраиваемую валюту (₸ KZT, ₽ RUB, $ USD), город и таймзону прямо в настройках профиля.'
  }
];

export const WHO_HEALTH_MILESTONES: HealthMilestone[] = [
  {
    id: 'who-1',
    title: 'Нормализация пульса и артериального давления',
    category: 'Сердечно-сосудистая',
    timeframe: '20 минут',
    secondsRequired: 20 * 60,
    description: 'Частота сердечных сокращений снижается на 10–20 уд/мин, спазм сосудов ослабевает.',
    benefit: 'Восстановление капиллярного кровообращения в ладонях и стопах, конечности теплеют.',
    cellularEffect: 'Снижение циркулирующего адреналина и норадреналина, расслабление гладкой мускулатуры артериол.',
    whatYouFeel: 'Приятное тепло в пальцах рук и ног, замедление бешеного ритма в груди.',
    practicalTip: 'Выпейте стакан чистой воды маленькими глотками, чтобы помочь почкам выводить первые токсины.',
    scientificReference: 'WHO Factsheet on Tobacco Cessation & American Heart Association (AHA)',
  },
  {
    id: 'who-2',
    title: 'Первичный клиренс свободного никотина',
    category: 'Нейробиология',
    timeframe: '1 час',
    secondsRequired: 3600,
    description: 'Концентрация никотина в крови снижается на 50%, начинается очищение рецепторов.',
    benefit: 'Первый шаг к освобождению ацетилхолиновых рецепторов от токсической стимуляции.',
    cellularEffect: 'Период полувыведения никотина из кровотока составляет около 60–90 минут.',
    whatYouFeel: 'Может возникнуть первый импульс желания покурить. Помните: это просто биохимический сигнал дефицита.',
    practicalTip: 'Используйте практику глубокого дыхания 4-4-4: 4 сек вдох, 4 сек задержка, 4 сек выдох.',
    scientificReference: 'Pharmacology of Nicotine / Benowitz NL, NEJM',
  },
  {
    id: 'who-3',
    title: 'Ослабление периферического вазоспазма',
    category: 'Сердечно-сосудистая',
    timeframe: '2 часа',
    secondsRequired: 2 * 3600,
    description: 'Кровеносные сосуды в мышцах и внутренних органах расширяются, снижается общее сосудистое сопротивление.',
    benefit: 'Разгрузка левого желудочка сердца, нормализация микроциркуляции.',
    cellularEffect: 'Эндотелий сосудов начинает вырабатывать базовый оксид азота (NO), способствующий естественной вазодилатации.',
    whatYouFeel: 'Может появиться легкое беспокойство — это сигнал первой волны тяги. Она длится до 3 минут.',
    practicalTip: 'Смените позу, встаньте, разомните плечи и сделайте 10 медленных кругов шеей.',
    scientificReference: 'American Heart Association Guidelines on Cardiovascular Recovery',
  },
  {
    id: 'who-4',
    title: 'Восстановление капиллярной перфузии дермы',
    category: 'Внешность и метаболизм',
    timeframe: '4 часа',
    secondsRequired: 4 * 3600,
    description: 'Капиллярная сеть кожи лица получает на 40% больше артериальной крови.',
    benefit: 'Начало детоксикации клеток дермы от токсинов табачного дыма.',
    cellularEffect: 'Улучшение микроциркуляторного русла в сосочковом слое дермы.',
    whatYouFeel: 'Уменьшается сероватый оттенок лица, спадает ощущение сухости губ.',
    practicalTip: 'Умойтесь прохладной водой, чтобы стимулировать здоровый тонус кожи.',
    scientificReference: 'British Journal of Dermatology / Cutaneous Microcirculation',
  },
  {
    id: 'who-5',
    title: 'Падение уровня монооксида углерода (CO) вдвое',
    category: 'Сердечно-сосудистая',
    timeframe: '8 часов',
    secondsRequired: 8 * 3600,
    description: 'Угарный газ (CO), связывавший гемоглобин, активно замещается чистым кислородом.',
    benefit: 'Кислородная сатурация крови возвращается к 98–100%. Прекращается гипоксия тканей.',
    cellularEffect: 'Распад карбоксигемоглобина (HbCO) и восстановление оксигемоглобина в эритроцитах.',
    whatYouFeel: 'Уменьшается утренняя тяжесть в голове, уходит вялость и туман перед глазами.',
    practicalTip: 'Проветрите комнату или прогуляйтесь 10 минут на свежем воздухе.',
    scientificReference: 'British Medical Journal (BMJ) & World Health Organization',
  },
  {
    id: 'who-6',
    title: 'Полная детоксикация от угарного газа',
    category: 'Сердечно-сосудистая',
    timeframe: '12 часов',
    secondsRequired: 12 * 3600,
    description: 'Уровень CO в плазме крови сравнивается со здоровым некурящим человеком.',
    benefit: 'Сердце больше не перекачивает кровь в условиях дефицита кислорода при нагрузках.',
    cellularEffect: 'Концентрация HbCO падает ниже 1.5% от общего гемоглобина крови.',
    whatYouFeel: 'Дышать при ходьбе становится заметно легче, уходит ощущение «сдавленного обруча» на груди.',
    practicalTip: 'Зафиксируйте это ощущение: ваши клетки прямо сейчас получают полноценное питание.',
    scientificReference: 'CDC Tobacco Cessation Milestones',
  },
  {
    id: 'who-7',
    title: 'Активация микросомального ферментативного очищения в печени',
    category: 'Внешность и метаболизм',
    timeframe: '18 часов',
    secondsRequired: 18 * 3600,
    description: 'Ферменты цитохрома P450 (CYP1A2) перестраиваются на естественный метаболический режим.',
    benefit: 'Печень разгружается от нейтрализации полициклических ароматических углеводородов.',
    cellularEffect: 'Снижение индукции ферментов фазы I детоксикации ксенобиотиков.',
    whatYouFeel: 'Улучшается аппетит, уменьшается чувство тошноты и дискомфорта в правом подреберье.',
    practicalTip: 'Пейте зеленый чай с лимоном, богатый антиоксидантами EGCG.',
    scientificReference: 'Hepatology / Xenobiotic Metabolism & Tobacco Smoke',
  },
  {
    id: 'who-8',
    title: 'Снижение риска внезапного инфаркта миокарда на 25%',
    category: 'Сердечно-сосудистая',
    timeframe: '24 часа (1 сутки)',
    secondsRequired: 24 * 3600,
    description: 'Суточный перерыв снижает вероятность спазма коронарных артерий и тромбоза.',
    benefit: 'Снижение риска острой коронарной недостаточности на 25% от базового уровня курильщика.',
    cellularEffect: 'Снижение агрегации тромбоцитов, уменьшение вязкости плазмы и риска тромбообразования.',
    whatYouFeel: 'Пик психологического отвыкания. Помните: это не «желание покурить», а агония никотинового паразита.',
    practicalTip: 'Примите теплый душ или ванну с магниевой солью, чтобы снять мышечное напряжение.',
    scientificReference: 'U.S. Surgeon General’s Report on Smoking and Health',
  },
  {
    id: 'who-9',
    title: 'Релаксация гортани и голосовых связок',
    category: 'Дыхательная',
    timeframe: '36 часов',
    secondsRequired: 36 * 3600,
    description: 'Слизистая оболочка глотки и гортани начинает освобождаться от химических ожогов горячим дымом/аэрозолем.',
    benefit: 'Уменьшается осиплость голоса, спадает першение в горле.',
    cellularEffect: 'Снижение лейкоцитарной инфильтрации в эпителии верхних дыхательных путей.',
    whatYouFeel: 'Голос звучит мягче, пропадает сухость и желание постоянно откашливаться.',
    practicalTip: 'Пейте теплый травяной чай с ромашкой или мятой.',
    scientificReference: 'European Respiratory Society Guidelines',
  },
  {
    id: 'who-10',
    title: 'Регенерация нервных окончаний вкуса и обоняния',
    category: 'Внешность и метаболизм',
    timeframe: '48 часов (2 суток)',
    secondsRequired: 48 * 3600,
    description: 'Нервные окончания вкусовых сосочков языка и обонятельной луковицы оживают.',
    benefit: 'Еда обретает невероятно яркие вкусы и тонкие ароматы, о которых вы забыли.',
    cellularEffect: 'Регенерация вкусовых рецепторных клеток (TRCs) и обонятельных нейронов слизистой носа.',
    whatYouFeel: 'Привычные блюда кажутся насыщеннее и вкуснее, запахи на улице и дома раскрываются в деталях.',
    practicalTip: 'Порадуйте себя вкусным свежим фруктом или качественным чаем без сахара.',
    scientificReference: 'National Institutes of Health (NIH) Sensory Research',
  },
  {
    id: 'who-11',
    title: 'Снижение вязкости крови и риска микротромбозов',
    category: 'Сердечно-сосудистая',
    timeframe: '60 часов (2.5 суток)',
    secondsRequired: 60 * 3600,
    description: 'Уровень фибриногена и адгезивность кровяных пластинок снижаются.',
    benefit: 'Кровь свободно течет по тончайшим капиллярам мозга, почек и глазного дна.',
    cellularEffect: 'Снижение уровня тромбоксана A2 (TXA2) и нормализация простациклина (PGI2).',
    whatYouFeel: 'Меньше устают глаза при чтении и работе за экраном, проходит пульсация в висках.',
    practicalTip: 'Сделайте гимнастику для глаз: переводите взгляд с близкого предмета вдаль.',
    scientificReference: 'Thrombosis and Haemostasis Research',
  },
  {
    id: 'who-12',
    title: '100% очищение организма от никотина и котинина',
    category: 'Нейробиология',
    timeframe: '72 часа (3 суток)',
    secondsRequired: 72 * 3600,
    description: 'Никотин и котинин полностью метаболизированы печенью и выведены почками. Физическая ломка пройдена!',
    benefit: 'Бронхиальные ветви расслабляются, максимальный объем легких увеличивается.',
    cellularEffect: 'Полное отсутствие свободного никотина в кровеносном русле. Начинается перестройка ацетилхолиновых путей.',
    whatYouFeel: 'Переломный момент: физическая зависимость капитулировала! Впереди только психологическая свобода.',
    practicalTip: 'Поздравьте себя — самый тяжелый физический барьер позади. Дальше с каждым днем будет легче.',
    scientificReference: 'British Thoracic Society & CDC Guidelines',
  },
  {
    id: 'who-13',
    title: 'Расширение бронхиального дерева',
    category: 'Дыхательная',
    timeframe: '4 дня',
    secondsRequired: 4 * 86400,
    description: 'Бронхиолы расширяются, улучшается газообмен в альвеолах при вдохе.',
    benefit: 'Глубокий вдох без хрипов и ощущения сопротивления в груди.',
    cellularEffect: 'Снижение гиперреактивности гладких миоцитов бронхов к раздражителям.',
    whatYouFeel: 'При ходьбе в гору или по лестнице дыхание остается ровным значительно дольше.',
    practicalTip: 'Сделайте серию из 10 диафрагмальных глубоких вдохов на свежем воздухе.',
    scientificReference: 'American Lung Association (ALA)',
  },
  {
    id: 'who-14',
    title: 'Стабилизация эндогенного метаболизма глюкозы',
    category: 'Внешность и метаболизм',
    timeframe: '5 дней',
    secondsRequired: 5 * 86400,
    description: 'Организм учится поддерживать стабильный уровень сахара в крови без никотиновых скачков.',
    benefit: 'Исчезают приступы внезапной слабости, улучшается пищеварение.',
    cellularEffect: 'Нормализация чувствительности бета-клеток поджелудочной железы к выработке инсулина.',
    whatYouFeel: 'Тяга к сладкому становится управляемой, уровень энергии в течение дня выравнивается.',
    practicalTip: 'Перекусывайте орехами, ягодами или морковными палочками вместо сладостей.',
    scientificReference: 'World Health Organization Metabolism Data',
  },
  {
    id: 'who-15',
    title: 'Восстановление фаз глубокого и быстрого сна',
    category: 'Нейробиология',
    timeframe: '7 дней (1 неделя)',
    secondsRequired: 7 * 86400,
    description: 'Архитектура сна нормализуется, мозг получает полноценный ночной отдых.',
    benefit: 'Утренний подъем становится легким и бодрым, уходит раздражительность.',
    cellularEffect: 'Восстановление естественной циркадной секреции мелатонина и фазы REM-сна без ночной никотиновой абстиненции.',
    whatYouFeel: 'Вы просыпаетесь действительно отдохнувшим, а не разбитым.',
    practicalTip: 'Ложитесь спать в темноте и прохладе (18–20°C) для максимальной выработки соматотропина.',
    scientificReference: 'Sleep Foundation & Huberman Lab Neuroscience',
  },
  {
    id: 'who-16',
    title: 'Оздоровление десен и устранение табачного галитоза',
    category: 'Внешность и метаболизм',
    timeframe: '10 дней',
    secondsRequired: 10 * 86400,
    description: 'Капиллярный кровоток в тканях пародонта восстанавливается, микрофлора рта нормализуется.',
    benefit: 'Полное исчезновение запаха табачного перегара, десны перестают кровоточить.',
    cellularEffect: 'Снижение патогенной анаэробной флоры в полости рта, ускорение регенерации эпителия десен.',
    whatYouFeel: 'Свежее дыхание в течение всего дня, зубы становятся чище и гладче.',
    practicalTip: 'Смените зубную щетку на новую в честь обновления улыбки.',
    scientificReference: 'American Dental Association (ADA) Research',
  },
  {
    id: 'who-17',
    title: 'Рост общей выносливости и физической силы на 30%',
    category: 'Сердечно-сосудистая',
    timeframe: '14 дней (2 недели)',
    secondsRequired: 14 * 86400,
    description: 'Эффективность кровоснабжения скелетных мышц и миокарда возрастает почти на треть.',
    benefit: 'Подъем на 4-й этаж больше не вызывает одышки и учащенного сердцебиения.',
    cellularEffect: 'Увеличение плотности митохондрий в мышечных волокнах и насыщения миоглобина кислородом.',
    whatYouFeel: 'Легкость в теле, прилив сил для тренировок и прогулок.',
    practicalTip: 'Попробуйте легкую пробежку или быструю ходьбу 3–4 км — вы удивитесь выносливости!',
    scientificReference: 'Cochrane Tobacco Addiction Group Systematic Review',
  },
  {
    id: 'who-18',
    title: 'Повышение эластичности легочной паренхимы',
    category: 'Дыхательная',
    timeframe: '18 дней',
    secondsRequired: 18 * 86400,
    description: 'Альвеолярные мешочки освобождаются от микроотека, сурфактантный слой обновляется.',
    benefit: 'Газообмен CO2 на O2 в альвеолах происходит с максимальной биомеханической эффективностью.',
    cellularEffect: 'Синтез полноценного дипальмитоилфосфатидилхолина клетками Клара и пневмоцитами II типа.',
    whatYouFeel: 'Исчезает ощущение скованности в реберных дугах при глубоком зевке или вдохе.',
    practicalTip: 'Практикуйте пешие прогулки в сосновом бору или парке.',
    scientificReference: 'American Journal of Physiology: Lung Cellular & Molecular Physiology',
  },
  {
    id: 'who-19',
    title: 'Перекалибровка никотиновых ацетилхолиновых рецепторов (nAChR)',
    category: 'Нейробиология',
    timeframe: '21 день (3 недели)',
    secondsRequired: 21 * 86400,
    description: 'Число избыточных никотиновых рецепторов в мозге падает до нормы некурящего человека.',
    benefit: 'Психологическая зависимость и автоматическая привычка разрушены на 85%.',
    cellularEffect: 'Даунрегуляция α4β2 никотиновых ацетилхолиновых рецепторов в вентральной области покрышки.',
    whatYouFeel: 'Мысли о курении возникают редко и вызывают скорее удивление, чем импульс.',
    practicalTip: 'Помните главное правило форумов NOPE: Not One Puff Ever (Ни одной затяжки никогда!).',
    scientificReference: 'Stanford Medicine / Dr. Andrew Huberman Lab',
  },
  {
    id: 'who-20',
    title: 'Ускорение клеточного цикла кератиноцитов кожи',
    category: 'Внешность и метаболизм',
    timeframe: '25 дней',
    secondsRequired: 25 * 86400,
    description: 'Полный цикл обновления верхнего слоя эпидермиса проходит в чистых условиях.',
    benefit: 'Здоровый румянец, выравнивание микрорельефа кожи, сужение пор.',
    cellularEffect: 'Снижение разрушения эластических волокон матриксными металлопротеиназами (ММП-1).',
    whatYouFeel: 'Кожа выглядит моложе, исчезает серый землистый оттенок «лица курильщика».',
    practicalTip: 'Используйте увлажняющий крем с гиалуроновой кислотой.',
    scientificReference: 'Journal of Investigative Dermatology',
  },
  {
    id: 'who-21',
    title: 'Полная регенерация ресничек мерцательного эпителия легких',
    category: 'Дыхательная',
    timeframe: '30 дней (1 месяц)',
    secondsRequired: 30 * 86400,
    description: 'Миллионы микроскопических ресничек в бронхах восстановили подвижность и выметают слизь со смолами.',
    benefit: 'Риск бронхолегочных инфекций падает в 3 раза, кашель курильщика уходит навсегда.',
    cellularEffect: 'Восстановление мукоцилиарного клиренса и выведение накопленных макрофагов со смолами.',
    whatYouFeel: 'Грудь чистая, глубокое дыхание приносит истинное физическое наслаждение.',
    practicalTip: 'Сделайте спирометрию у врача — объем ваших легких покажет отличный рост!',
    scientificReference: 'European Respiratory Journal',
  },
  {
    id: 'who-22',
    title: 'Нормализация синтеза эндогенного серотонина и ГАМК',
    category: 'Нейробиология',
    timeframe: '40 дней',
    secondsRequired: 40 * 86400,
    description: 'Нейромедиаторный баланс центральной нервной системы выходит на плато гармонии.',
    benefit: 'Устойчивость к повседневным стрессам без потребности в никотине.',
    cellularEffect: 'Восстановление плотности ГАМК-А рецепторов в префронтальной коре.',
    whatYouFeel: 'Эмоциональный штиль: проблемы на работе решаются спокойно, без паники и перекуров.',
    practicalTip: 'Добавьте в рацион продукты, богатые триптофаном (индейка, бананы, кунжут).',
    scientificReference: 'Neuropsychopharmacology Journal',
  },
  {
    id: 'who-23',
    title: 'Начало восстановления дофаминового плато',
    category: 'Нейробиология',
    timeframe: '45 дней (1.5 месяца)',
    secondsRequired: 45 * 86400,
    description: 'Мозг восстанавливает естественный синтез дофамина без внешних химических костылей.',
    benefit: 'Преодоление дофаминовой ямы, возвращение мотивации, креативности и радости.',
    cellularEffect: 'Синтез дофамина в прилежащем ядре (Nucleus Accumbens) стабилизируется на нормальном уровне.',
    whatYouFeel: 'Жизнь снова играет красками, простые хобби и общение приносят искреннее удовольствие.',
    practicalTip: 'Займитесь новым проектом или хобби — ваш мозг готов к глубокому фокусу.',
    scientificReference: 'Psychiatry Research & Neurobiology of Addiction',
  },
  {
    id: 'who-24',
    title: 'Преодоление психологической дофаминовой ямы',
    category: 'Нейробиология',
    timeframe: '60 дней (2 месяца)',
    secondsRequired: 60 * 86400,
    description: 'Завершен переходный период нейропластичности. Мозг полностью перестроился на здоровую жизнь.',
    benefit: 'Эмоциональная устойчивость к стрессам без потребности в сигарете.',
    cellularEffect: 'Плотность D2/D3 рецепторов дофамина в базальных ганглиях сравнима с контрольной группой некурящих.',
    whatYouFeel: 'Глубокое спокойствие и уверенность в себе. Вы чувствуете себя истинно свободным.',
    practicalTip: 'Обратите внимание на свои сэкономленные деньги и сделайте себе заслуженный подарок.',
    scientificReference: 'Journal of Neuroscience Research',
  },
  {
    id: 'who-25',
    title: 'Нормализация свертываемости крови и эластичности сосудов',
    category: 'Сердечно-сосудистая',
    timeframe: '75 дней (2.5 месяца)',
    secondsRequired: 75 * 86400,
    description: 'Вязкость крови и уровень фибриногена приходят в норму.',
    benefit: 'Резкое снижение риска тромбоза глубоких вен и микроинсультов.',
    cellularEffect: 'Нормализация функции эндотелиальных клеток и уровней фактора фон Виллебранда.',
    whatYouFeel: 'Исчезают головные боли напряжения и метеозависимость.',
    practicalTip: 'Поддерживайте водный баланс (1.5–2 л воды в день).',
    scientificReference: 'Circulation Journal (AHA)',
  },
  {
    id: 'who-26',
    title: 'Рост форсированной жизненной емкости легких (ФЖЕЛ) до +15%',
    category: 'Дыхательная',
    timeframe: '90 дней (3 месяца)',
    secondsRequired: 90 * 86400,
    description: 'Объем форсированного выдоха за 1 секунду (ОФВ1) увеличивается до 15%.',
    benefit: 'Свободное дыхание при любых спортивных нагрузках, улучшение цвета и эластичности кожи.',
    cellularEffect: 'Увеличение альвеолярно-капиллярной диффузионной способности газов (DLCO).',
    whatYouFeel: 'Кожа выглядит свежей и отдохнувшей, исчезли темные круги под глазами.',
    practicalTip: 'Попробуйте интервальный бег, плавание или велосипедные поездки.',
    scientificReference: 'American Journal of Respiratory and Critical Care Medicine',
  },
  {
    id: 'who-27',
    title: 'Глубокое обновление сосудистого русла и капиллярной плотности',
    category: 'Сердечно-сосудистая',
    timeframe: '100 дней',
    secondsRequired: 100 * 86400,
    description: 'Ангиогенез в миокарде и скелетных мышцах обеспечивает идеальную оксигенацию.',
    benefit: 'Быстрое восстановление после физических тренировок и тяжелого рабочего дня.',
    cellularEffect: 'Секреция фактора роста эндотелия сосудов (VEGF) в физиологическом балансе.',
    whatYouFeel: 'Неисчерпаемый запас энергии: нет дневной сонливости после еды.',
    practicalTip: 'Зафиксируйте 100 дней свободы — это грандиозный юбилей!',
    scientificReference: 'Microvascular Research Journal',
  },
  {
    id: 'who-28',
    title: 'Укрепление тканей десен и восстановление тонуса голосовых связок',
    category: 'Внешность и метаболизм',
    timeframe: '120 дней (4 месяца)',
    secondsRequired: 120 * 86400,
    description: 'Плотность коллагена в деснах и дерме лица восстанавливается.',
    benefit: 'Голос чистый, звонкий, мимические морщины вокруг рта («кисетные») разглаживаются.',
    cellularEffect: 'Ускорение неоколлагенеза I и III типов в дерме без окислительного стресса от свободных радикалов.',
    whatYouFeel: 'Окружающие замечают, как вы помолодели и посвежели.',
    practicalTip: 'Улыбайтесь чаще — ваша улыбка теперь свободна от табачного налета.',
    scientificReference: 'British Dental Journal & Dermatology Reports',
  },
  {
    id: 'who-29',
    title: 'Полная активность легочных макрофагов',
    category: 'Дыхательная',
    timeframe: '150 дней (5 месяцев)',
    secondsRequired: 150 * 86400,
    description: 'Иммунные клетки легких работают с той же силой, что и у никогда не курящих.',
    benefit: 'Надежная защита от сезонных ОРВИ, гриппа и бактериальных бронхитов.',
    cellularEffect: 'Фагоцитарная активность альвеолярных макрофагов полностью восстановлена.',
    whatYouFeel: 'Простуды проходят в легкой форме за пару дней без осложнений на бронхи.',
    practicalTip: 'Занимайтесь закаливанием и дыхательными практиками.',
    scientificReference: 'Thorax International Journal of Respiratory Medicine',
  },
  {
    id: 'who-30',
    title: 'Очищение придаточных пазух носа и избавление от застойного бронхита',
    category: 'Дыхательная',
    timeframe: '180 дней (6 месяцев)',
    secondsRequired: 180 * 86400,
    description: 'Хроническое воспаление в бронхах полностью угасло.',
    benefit: 'Легкость при кардионагрузках, чистый утренний вдох без намека на мокроту.',
    cellularEffect: 'Инволюция гиперплазированных бокаловидных клеток дыхательного тракта.',
    whatYouFeel: 'Полное ощущение чистоты дыхательных путей от носа до основания легких.',
    practicalTip: 'Отпразднуйте полугодие свободы — вы совершили колоссальный подвиг!',
    scientificReference: 'CDC / WHO Global Tobacco Control Data',
  },
  {
    id: 'who-31',
    title: 'Нормализация липидного профиля крови и холестерина',
    category: 'Сердечно-сосудистая',
    timeframe: '210 дней (7 месяцев)',
    secondsRequired: 210 * 86400,
    description: 'Уровень окисленного холестерина ЛПНП снижается, ЛПВП (хороший холестерин) растет.',
    benefit: 'Остановка процессов кальцификации и формирования атеросклеротических бляшек.',
    cellularEffect: 'Снижение перекисного окисления липидов и окислительной модификации апобелков.',
    whatYouFeel: 'Легкость в теле, нормализация давления даже при сильных эмоциональных нагрузках.',
    practicalTip: 'Сдайте биохимический анализ липидного спектра — врач будет впечатлен!',
    scientificReference: 'Atherosclerosis Journal (Elsevier)',
  },
  {
    id: 'who-32',
    title: 'Снижение воспалительных маркеров сосудистой стенки (СРБ)',
    category: 'Сердечно-сосудистая',
    timeframe: '270 дней (9 месяцев)',
    secondsRequired: 270 * 86400,
    description: 'Высокочувствительный С-реактивный белок (СРБ) в крови падает до безопасных значений.',
    benefit: 'Стенки артерий защищены от образования атеросклеротических бляшек.',
    cellularEffect: 'Снижение экспрессии молекул адгезии VCAM-1 и ICAM-1 на поверхности эндотелиоцитов.',
    whatYouFeel: 'Высокая работоспособность, стабильное артериальное давление в покое и при стрессе.',
    practicalTip: 'Пройдите плановый чекап крови — результаты биохимии вас обрадуют.',
    scientificReference: 'Journal of the American College of Cardiology (JACC)',
  },
  {
    id: 'who-33',
    title: 'Повышение максимального потребления кислорода VO2 max',
    category: 'Сердечно-сосудистая',
    timeframe: '300 дней (10 месяцев)',
    secondsRequired: 300 * 86400,
    description: 'Показатель аэробной мощности организма вырос на 20–25%.',
    benefit: 'Высокая физическая работоспособность на уровне профессиональных спортсменов.',
    cellularEffect: 'Оптимизация артериовенозной разницы по кислороду и ударного объема сердца.',
    whatYouFeel: 'Легкость в беге, плавании и велоспорте без усталости и боли в мышцах.',
    practicalTip: 'Поставьте спортивную цель: пробежать 5 км или подняться на вершину горы.',
    scientificReference: 'Medicine & Science in Sports & Exercise',
  },
  {
    id: 'who-34',
    title: 'Снижение риска ишемической болезни сердца (ИБС) на 50%',
    category: 'Сердечно-сосудистая',
    timeframe: '1 год (365 дней)',
    secondsRequired: 365 * 86400,
    description: 'Избыточный риск развития ИБС падает вдвое по сравнению с продолжающим курить человеком.',
    benefit: 'Ваше сердце восстановило структурный баланс и долговечность.',
    cellularEffect: 'Регресс ранних липидных полосок в интиме коронарных артерий.',
    whatYouFeel: 'Огромное чувство гордости: целый год чистой и осознанной жизни.',
    practicalTip: 'Вы сэкономили колоссальную сумму денег и прибавили себе годы здоровой жизни!',
    scientificReference: 'WHO Global Report on Trends in Prevalence of Tobacco Smoking',
  },
  {
    id: 'who-35',
    title: 'Значительное восстановление эластичности аорты',
    category: 'Сердечно-сосудистая',
    timeframe: '1.5 года',
    secondsRequired: Math.floor(1.5 * 365 * 86400),
    description: 'Скорость распространения пульсовой волны (PWV) нормализуется.',
    benefit: 'Снижение риска аневризмы аорты и гипертонических кризов.',
    cellularEffect: 'Восстановление баланса эластина и коллагена в медии крупных артерий.',
    whatYouFeel: 'Ровный пульс, отсутствие внезапных сердечных толчков при нагрузках.',
    practicalTip: 'Продолжайте поддерживать аэробную активность: 10 000 шагов в день.',
    scientificReference: 'Arteriosclerosis, Thrombosis, and Vascular Biology',
  },
  {
    id: 'who-36',
    title: 'Риск инфаркта миокарда снижен до минимума',
    category: 'Сердечно-сосудистая',
    timeframe: '2 года',
    secondsRequired: 2 * 365 * 86400,
    description: 'Риск повторного или первичного инфаркта миокарда снижается почти до уровня некурящего.',
    benefit: 'Сердечная мышца функционирует в оптимальных биохимических условиях.',
    cellularEffect: 'Стабилизация фиброзных покрышек существующих сосудистых отложений.',
    whatYouFeel: 'Спокойствие за свое здоровье на десятилетия вперед.',
    practicalTip: 'Вы стали вдохновляющим примером для друзей и близких.',
    scientificReference: 'The Lancet Cardiovascular Health Series',
  },
  {
    id: 'who-37',
    title: 'Регенерация альвеолярно-капиллярной мембраны при пиковых нагрузках',
    category: 'Дыхательная',
    timeframe: '2.5 года',
    secondsRequired: Math.floor(2.5 * 365 * 86400),
    description: 'Легкие полностью восстановили способность диффузии кислорода в стрессовых условиях.',
    benefit: 'Максимальная защита от возрастной эмфиземы и гипоксии.',
    cellularEffect: 'Нормализация толщины интерстициального пространства легочных ацинусов.',
    whatYouFeel: 'Свободное и глубокое дыхание на высокогорье и при интенсивном спорте.',
    practicalTip: 'Попробуйте горный хайкинг — вы ощутите силу своих легких.',
    scientificReference: 'Chest Journal of the American College of Chest Physicians',
  },
  {
    id: 'who-38',
    title: 'Снижение риска рака шейки матки и мочевого пузыря на 50%',
    category: 'Долголетие и онкозащита',
    timeframe: '3 года',
    secondsRequired: 3 * 365 * 86400,
    description: 'Токсичные канцерогены табачного дыма полностью элиминированы из эпителия мочевыводящих путей.',
    benefit: 'Снижение онкологических рисков мочеполовой системы на 40–50%.',
    cellularEffect: 'Снижение частоты мутаций TP53 в уротелиальных клетках.',
    whatYouFeel: 'Здоровая работа выделительной системы.',
    practicalTip: 'Пейте достаточное количество минеральной воды и зеленого чая.',
    scientificReference: 'International Agency for Research on Cancer (IARC)',
  },
  {
    id: 'who-39',
    title: 'Нормализация экспрессии генов-супрессоров опухолей (p53)',
    category: 'Долголетие и онкозащита',
    timeframe: '4 года',
    secondsRequired: 4 * 365 * 86400,
    description: 'Клетки организма восстановили генетический механизм апоптоза дефектных клеток.',
    benefit: 'Мощный внутренний противоопухолевый иммунитет во всех органах.',
    cellularEffect: 'Репарация ДНК-повреждений бензо[a]пирена и специфических табачных нитрозаминов.',
    whatYouFeel: 'Омоложение организма на глубоком клеточном уровне.',
    practicalTip: 'Питайтесь цельными натуральными продуктами с высоким содержанием сульфорафана (брокколи).',
    scientificReference: 'Nature Reviews Cancer / DNA Repair Pathways',
  },
  {
    id: 'who-40',
    title: 'Риск инсульта снижен до уровня никогда не курившего человека',
    category: 'Долголетие и онкозащита',
    timeframe: '5 лет',
    secondsRequired: 5 * 365 * 86400,
    description: 'Риск ишемического инсульта и субарахноидального кровоизлияния падает на 60–70%.',
    benefit: 'Сосуды головного мозга абсолютно чисты и защищены от кальцификации.',
    cellularEffect: 'Полное восстановление ауторегуляции мозгового кровообращения.',
    whatYouFeel: 'Ясность ума, высокая память и концентрация внимания в любом возрасте.',
    practicalTip: '5-летний рубеж — золотой стандарт наркологии и кардиологии!',
    scientificReference: 'Stroke: Journal of the American Heart Association',
  },
  {
    id: 'who-41',
    title: 'Снижение риска рака полости рта, горла и пищевода на 50%',
    category: 'Долголетие и онкозащита',
    timeframe: '7 лет',
    secondsRequired: 7 * 365 * 86400,
    description: 'Слизистая верхних отделов ЖКТ и дыхательных путей полностью обновилась.',
    benefit: 'Вдвое меньше риск злокачественных новообразований головы и шеи.',
    cellularEffect: 'Репарация ДНК-аддуктов, вызванных табакоспецифичными нитрозаминами (NNK и NNN).',
    whatYouFeel: 'Комфортное пищеварение и здоровье ротоглотки.',
    practicalTip: 'Наслаждайтесь натуральной здоровой пищей.',
    scientificReference: 'World Cancer Research Fund (WCRF) Guidelines',
  },
  {
    id: 'who-42',
    title: 'Риск рака легких снижен вдвое (на 50%)',
    category: 'Долголетие и онкозащита',
    timeframe: '10 лет',
    secondsRequired: 10 * 365 * 86400,
    description: 'Риск смерти от рака легких вдвое ниже, чем у продолжающего курить со стажем.',
    benefit: 'Резко падает вероятность рака поджелудочной железы и гортани.',
    cellularEffect: 'Устранение предраковых дисплазий и метаплазий бронхиального эпителия.',
    whatYouFeel: '10 лет свободы: ваши легкие прошли глубочайшее очищение.',
    practicalTip: 'Вы подарили себе как минимум 10 дополнительных лет активной жизни!',
    scientificReference: 'New England Journal of Medicine (NEJM)',
  },
  {
    id: 'who-43',
    title: 'Риск рака поджелудочной железы сравнивается с некурящими',
    category: 'Долголетие и онкозащита',
    timeframe: '12 лет',
    secondsRequired: 12 * 365 * 86400,
    description: 'Ткани поджелудочной железы полностью очищены от токсического канцерогенного груза.',
    benefit: 'Надежная защита от одного из самых коварных онкологических заболеваний.',
    cellularEffect: 'Полная элиминация микроочагов воспаления в протоках поджелудочной железы.',
    whatYouFeel: 'Идеальное пищеварение и метаболическое здоровье.',
    practicalTip: 'Поддерживайте здоровый вес и сбалансированное питание.',
    scientificReference: 'Gastroenterology & Pancreatology Journal',
  },
  {
    id: 'who-44',
    title: 'Риск ИБС сравнивается с некурящим от рождения',
    category: 'Долголетие и онкозащита',
    timeframe: '15 лет',
    secondsRequired: 15 * 365 * 86400,
    description: 'Риск ишемической болезни сердца абсолютно идентичен человеку, никогда не прикасавшемуся к никотину.',
    benefit: 'Полное устранение сосудистого ущерба от курения.',
    cellularEffect: 'Нормализация толщины комплекса интима-медиа (КИМ) сонных артерий.',
    whatYouFeel: 'Здоровое, сильное сердце зрелого и мудрого человека.',
    practicalTip: 'Ваше решение бросить курить спасло вашу сердечно-сосудистую систему.',
    scientificReference: 'World Health Organization (WHO) Monograph on Tobacco',
  },
  {
    id: 'who-45',
    title: 'Общая смертность равна уровню некурящего человека',
    category: 'Долголетие и онкозащита',
    timeframe: '20–25 лет',
    secondsRequired: 20 * 365 * 86400,
    description: 'Риск смерти от всех причин, связанных с табаком (включая ХОБЛ и онкологию), снижается до фонового уровня популяции.',
    benefit: 'Организм полностью нейтрализовал последствия табачного стажа.',
    cellularEffect: 'Полное обновление клеточных популяций всех органов и тканей.',
    whatYouFeel: 'Абсолютная победа и свобода на всю оставшуюся жизнь.',
    practicalTip: 'Вы сотворили настоящее чудо для своего тела и будущего поколения.',
    scientificReference: 'U.S. Surgeon General / International Agency for Research on Cancer (IARC)',
  },
];

