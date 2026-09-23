(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const $ = (id) => document.getElementById(id);
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
    return null;
  }

  function setCookie(name, val) {
    if (!val) return;
    document.cookie = `${name}=${encodeURIComponent(val)}; max-age=31536000; path=/; samesite=lax`;
  }

  const params = new URLSearchParams(window.location.search);
  let userId = params.get("user_id")
    || (tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null)
    || localStorage.getItem("smokefree_user_id")
    || getCookie("smokefree_user_id");

  let token = params.get("token")
    || localStorage.getItem("smokefree_token")
    || getCookie("smokefree_token")
    || "";

  if (userId) {
    localStorage.setItem("smokefree_user_id", String(userId));
    setCookie("smokefree_user_id", String(userId));
  }
  if (token) {
    localStorage.setItem("smokefree_token", token);
    setCookie("smokefree_token", token);
  }

  function updateManifestTag() {
    const mLink = $("manifestLink");
    if (mLink && userId && token) {
      mLink.href = `/manifest.json?user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
    }
  }
  updateManifestTag();

  if (userId && token && (!params.has("user_id") || !params.has("token"))) {
    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("user_id", userId);
      currentUrl.searchParams.set("token", token);
      window.history.replaceState({}, "", currentUrl.toString());
    } catch {}
  }

  let stats = null;
  let chart = null;
  let quitTimestamp = null;
  let hudInterval = null;
  let triggerListCache = [];

  // Currency setup (Default KZT)
  let currentCurrency = localStorage.getItem("smokefree_currency") || "KZT";
  const CURRENCY_RATES = {
    KZT: { sign: "₸", rate: 1.0, sub: "₸" },
    RUB: { sign: "₽", rate: 0.20, sub: "₽" },
    USD: { sign: "$", rate: 0.0021, sub: "$" }
  };

  function haptic(type = "light") {
    try {
      if (type === "heavy") tg?.HapticFeedback?.impactOccurred("heavy");
      else if (type === "medium") tg?.HapticFeedback?.impactOccurred("medium");
      else if (type === "success") tg?.HapticFeedback?.notificationOccurred("success");
      else tg?.HapticFeedback?.impactOccurred("light");
    } catch {}
  }

  function formatMoney(amountKzt) {
    const config = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.KZT;
    const converted = Math.round((amountKzt || 0) * config.rate);
    return new Intl.NumberFormat("ru-RU").format(converted);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
  }

  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2800);
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (tg?.initData) headers["X-Telegram-Init-Data"] = tg.initData;
    const effectiveToken = token || localStorage.getItem("smokefree_token") || getCookie("smokefree_token");
    if (effectiveToken) headers["X-App-Token"] = effectiveToken;

    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `Ошибка ${response.status}`);
    }
    return response.json();
  }

  /* -------------------------------------------------------------
     LIVE HUD TIMER
  ------------------------------------------------------------- */
  function updateLiveHud() {
    if (!quitTimestamp) return;
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - quitTimestamp) / 1000));

    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    const pad = (n) => String(n).padStart(2, "0");

    if ($("hudDays")) $("hudDays").textContent = days;
    if ($("hudHours")) $("hudHours").textContent = pad(hours);
    if ($("hudMinutes")) $("hudMinutes").textContent = pad(minutes);
    if ($("hudSeconds")) $("hudSeconds").textContent = pad(seconds);

    // Update Days Free in Hero
    if ($("daysFree")) $("daysFree").textContent = days;

    // Ring progress (30 days cycle = 100%)
    const ringOffset = Math.max(0, 314 - (Math.min(days, 30) / 30) * 314);
    const ringEl = $("ringProgress");
    if (ringEl) ringEl.style.strokeDashoffset = ringOffset;

    // Check Nearest Trigger
    checkNearestTrigger();

    // Recompute WHO Health Phases progress
    renderHealthTimeline(diffSec);
  }

  function startLiveHud() {
    if (hudInterval) clearInterval(hudInterval);
    updateLiveHud();
    hudInterval = setInterval(updateLiveHud, 1000);
  }

  /* -------------------------------------------------------------
     RENDER STATS
  ------------------------------------------------------------- */
  function renderStats(data, saveToCache = true) {
    stats = data;
    if (saveToCache) {
      try {
        localStorage.setItem("smokefree_cached_stats", JSON.stringify(data));
      } catch {}
    }
    if (data.app_token) {
      token = data.app_token;
      localStorage.setItem("smokefree_token", token);
      setCookie("smokefree_token", token);
      updateManifestTag();
    }
    if ($("authNotice")) $("authNotice").style.display = "none";
    const currencyConfig = CURRENCY_RATES[currentCurrency];

    if ($("greeting")) {
      $("greeting").textContent = `${data.user.name || data.user.first_name || "Друг"}, твой стаж свободы:`;
    }

    // Money
    if ($("savedKzt")) $("savedKzt").textContent = formatMoney(data.saved_kzt);
    if ($("currencySign")) $("currencySign").textContent = currencyConfig.sign;
    if ($("dailyCost")) $("dailyCost").textContent = formatMoney(data.daily_cost_kzt);
    document.querySelectorAll(".curr-sub").forEach(el => el.textContent = currencyConfig.sign);

    // Life Returned & Cravings
    if ($("minutesReturned")) $("minutesReturned").textContent = formatNumber(data.minutes_returned);
    if ($("hoursReturned")) $("hoursReturned").textContent = (data.minutes_returned / 60).toFixed(1);
    if ($("cravingsResisted")) $("cravingsResisted").textContent = data.cravings_resisted;

    // Clean percent
    const cleanPct = `${data.clean_percent ?? data.clean_track_percent ?? 100}%`;
    if ($("cleanPercent")) $("cleanPercent").textContent = cleanPct;
    if ($("cleanTrackLarge")) $("cleanTrackLarge").textContent = cleanPct;
    if ($("cleanBar")) $("cleanBar").style.width = cleanPct;

    // Financial Goal
    const goalKzt = data.user.financial_goal_kzt || 50000;
    const saved = data.saved_kzt || 0;
    const goalPct = Math.min(100, Math.round((saved / goalKzt) * 100));
    if ($("goalProgressBar")) $("goalProgressBar").style.width = `${goalPct}%`;
    if ($("goalPercentBadge")) $("goalPercentBadge").textContent = `${goalPct}%`;
    if ($("goalSavedLabel")) $("goalSavedLabel").textContent = `${formatMoney(saved)} ${currencyConfig.sign} накоплено`;
    if ($("goalTargetLabel")) $("goalTargetLabel").textContent = `Цель: ${formatMoney(goalKzt)} ${currencyConfig.sign}`;

    // Start point
    if (data.user.quit_at) {
      const qd = new Date(data.user.quit_at);
      quitTimestamp = qd.getTime();
      if ($("startPointLabel")) {
        $("startPointLabel").textContent = `Старт: ${qd.toLocaleDateString("ru-RU")} в ${qd.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
      }
    } else if (data.user.quit_date) {
      const qd = new Date(data.user.quit_date);
      quitTimestamp = qd.getTime();
      if ($("startPointLabel")) {
        $("startPointLabel").textContent = `Старт: ${qd.toLocaleDateString("ru-RU")}`;
      }
    }

    startLiveHud();
    renderAchievements(data.achievements || []);
    renderChart(data.cravings_by_day || []);
  }

  /* -------------------------------------------------------------
     CHART & ANALYTICS STATE
  ------------------------------------------------------------- */
  let currentChartMode = 'cumulative'; // 'cumulative' | 'daily' | 'cravings'
  let currentChartHorizon = 'goal'; // '30d' | '90d' | '180d' | '1y' | 'goal'

  function updateAnalyticsKpis() {
    if (!stats) return;
    const currencyConfig = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.KZT;
    const saved = stats.saved_kzt || 0;
    const goal = stats.user?.financial_goal_kzt || 0;
    const packPrice = stats.user?.pack_price_kzt || 900;
    const unitsPerDay = stats.user?.units_per_day || 20;
    const dailyExpenseKzt = (packPrice / 20) * unitsPerDay;

    if ($("analyticsSavedVal")) $("analyticsSavedVal").textContent = `${formatMoney(saved)} ${currencyConfig.sign}`;
    if ($("analyticsGoalVal")) $("analyticsGoalVal").textContent = goal > 0 ? `${formatMoney(goal)} ${currencyConfig.sign}` : "Не задана";
    if ($("analyticsDailyVal")) $("analyticsDailyVal").textContent = `${formatMoney(dailyExpenseKzt)} ${currencyConfig.sign}/д`;

    if ($("analyticsRemainingVal")) {
      if (goal <= 0) {
        $("analyticsRemainingVal").textContent = "—";
      } else if (saved >= goal) {
        $("analyticsRemainingVal").textContent = "Достигнута! 🎉";
      } else {
        const remainingKzt = goal - saved;
        const daysLeft = dailyExpenseKzt > 0 ? Math.ceil(remainingKzt / dailyExpenseKzt) : 0;
        $("analyticsRemainingVal").textContent = `${daysLeft} дн.`;
      }
    }
  }

  /* -------------------------------------------------------------
     WHO RECOVERY TIMELINE (GRANULAR BIOMARKERS & PROGRESS BARS)
  ------------------------------------------------------------- */
  const WHO_STAGES = [
    { id: "20m", targetSec: 20 * 60, title: "20 минут: Пульс и давление", desc: "Частота сердечных сокращений и артериальное давление возвращаются к норме. Кровообращение в конечностях заметно улучшается.", icon: "❤️" },
    { id: "2h", targetSec: 2 * 3600, title: "2 часа: Снятие периферического спазма", desc: "Кончики пальцев рук и ног согреваются, восстанавливается микроциркуляция капилляров.", icon: "🩺" },
    { id: "8h", targetSec: 8 * 3600, title: "8 часов: Кислород в крови (+100%)", desc: "Уровень токсичного угарного газа (CO) снижается вдвое. Концентрация свободного кислорода в артериальной крови достигает оптимума.", icon: "🫁" },
    { id: "12h", targetSec: 12 * 3600, title: "12 часов: Детоксикация CO (Норма)", desc: "Угарный газ полностью вытеснен кислородом. Гемоглобин транспортирует максимум O₂ к клеткам сердца и мозга.", icon: "🌬️" },
    { id: "24h", targetSec: 24 * 3600, title: "24 часа: Дренаж легких & Сердце", desc: "Риск внезапного инфаркта начинает снижаться. Легкие запускают процесс выведения мокроты и остатков продуктов горения.", icon: "⚡" },
    { id: "48h", targetSec: 48 * 3600, title: "48 часов: Регенерация нервов & Вкус", desc: "Организм полностью свободен от никотина. Нервные окончания регенерируют, вкус любимых блюд и ароматы становятся яркими.", icon: "🍓" },
    { id: "72h", targetSec: 72 * 3600, title: "72 часа: Расслабление бронхов", desc: "Бронхиальные трубки расслабляются, вдох становится свободным. Пик физиологической никотиновой ломки успешно пройден!", icon: "🏔️" },
    { id: "5d", targetSec: 5 * 86400, title: "5 дней: Вывод котинина из органов", desc: "Печень и почки полностью очищены от метаболита никотина — котинина. Физическая зависимость уступила место свободе.", icon: "🛡️" },
    { id: "7d", targetSec: 7 * 86400, title: "7 дней: Неделя триумфа & Сон", desc: "Восстанавливается здоровая архитектура медленного сна (REM). Утренний пульс стабилен, уходит навязчивая тахикардия.", icon: "🌙" },
    { id: "10d", targetSec: 10 * 86400, title: "10 дней: Свежее дыхание & Десны", desc: "Исчезает специфический табачный налет на зубах и запах от кожи. Улучшается микрофлора и кровоснабжение десен.", icon: "✨" },
    { id: "14d", targetSec: 14 * 86400, title: "2 недели: Кардио-разгон (+30%)", desc: "Кровообращение во всех органах возросло на 30%. Подъем по лестнице и быстрый шаг больше не вызывают одышки.", icon: "🔥" },
    { id: "21d", targetSec: 21 * 86400, title: "21 день: Нейропластичность", desc: "Разрушен старый рефлекс «стресс — сигарета». Мозг вырабатывает эндорфины и дофамин естественным путем.", icon: "🧠" },
    { id: "30d", targetSec: 30 * 86400, title: "1 месяц: Регенерация ресничек бронхов", desc: "Реснички мерцательного эпителия бронхов восстановились и очищают легкие. Исчезает хронический утренний кашель курильщика.", icon: "🌿" },
    { id: "60d", targetSec: 60 * 86400, title: "2 месяца: Дофаминовый баланс", desc: "Плотность никотиновых ацетилхолиновых рецепторов нормализовалась. Естественные события приносят глубокое удовольствие.", icon: "☀️" },
    { id: "90d", targetSec: 90 * 86400, title: "3 месяца: Емкость легких (ФЖЕЛ +15%)", desc: "Форсированная жизненная емкость легких увеличивается до +15%. Спорт и кардионагрузки даются легко и в кайф.", icon: "💎" },
    { id: "180d", targetSec: 180 * 86400, title: "6 месяцев: Чистые пазухи носа", desc: "Хроническое воспаление в носоглотке и бронхах полностью угасло. Сезонные простуды проходят быстро и без осложнений.", icon: "🛡️" },
    { id: "270d", targetSec: 270 * 86400, title: "9 месяцев: Защита сосудов (СРБ в норме)", desc: "Маркер сосудистого воспаления (СРБ) в крови снизился до нормы некурящего человека. Артерии защищены от склероза.", icon: "🩸" },
    { id: "365d", targetSec: 365 * 86400, title: "1 год: Новое сердце (-50% риск ИБС)", desc: "Избыточный риск развития ишемической болезни сердца снижен ровно на 50% по сравнению с курящим человеком!", icon: "🏆" },
    { id: "730d", targetSec: 730 * 86400, title: "2 года: Паритет по инфаркту", desc: "Риск инфаркта миокарда упал до уровня среднестатистического никогда не курившего человека.", icon: "👑" },
    { id: "1825d", targetSec: 1825 * 86400, title: "5 лет: Золотой стандарт ВОЗ", desc: "Риск ишемического инсульта и сосудистых катастроф мозга снизился до показателей абсолютно некурящего человека!", icon: "🌟" }
  ];

  function renderHealthTimeline(currentSec) {
    const container = $("healthTimeline");
    if (!container) return;

    container.innerHTML = WHO_STAGES.map((stage) => {
      const isDone = currentSec >= stage.targetSec;
      const pct = isDone ? 100 : Math.min(99, Math.round((currentSec / stage.targetSec) * 100));
      const statusClass = isDone ? "completed" : pct > 0 ? "in-progress" : "locked";
      const badgeHtml = isDone
        ? `<span class="health-badge badge-done">Выполнено 100% ✓</span>`
        : pct > 0
        ? `<span class="health-badge badge-progress">${pct}% в процессе</span>`
        : `<span class="health-badge badge-locked">Предстоит (0%)</span>`;

      return `
        <article class="health-item ${statusClass}">
          <div class="health-item-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">${stage.icon}</span>
              <strong class="health-title">${stage.title}</strong>
            </div>
            ${badgeHtml}
          </div>
          <p class="health-desc">${stage.desc}</p>
          <div class="health-bar-wrap">
            <div class="health-bar-fill ${isDone ? "fill-done" : "fill-progress"}" style="width: ${pct}%;"></div>
          </div>
        </article>
      `;
    }).join("");
  }

  /* -------------------------------------------------------------
     3D FLIP BADGE SYSTEM (UNIQUE BADGES & INTERACTIVE 3D ANIMATION)
  ------------------------------------------------------------- */
  const BADGES_DEFINITIONS = [
    {
      id: "badge_first_win",
      code: "first_craving",
      title: "First Victory",
      name: "Первая победа",
      icon: "🔥",
      xp: 100,
      category: "mindset",
      rarity: "common",
      reqText: "Преодолеть 1 приступ тяги",
      perk: "Осознание, что тяга — это лишь 3-минутная волна",
      check: (s) => (s?.cravings_resisted || 0) >= 1,
      calcProgress: (s) => Math.min(100, Math.round(((s?.cravings_resisted || 0) / 1) * 100)),
    },
    {
      id: "badge_oxygen_master",
      code: "first_day",
      title: "Oxygen Master",
      name: "Кислородный мастер",
      icon: "🫁",
      xp: 150,
      category: "health",
      rarity: "common",
      reqText: "24 часа без табака (CO = 0)",
      perk: "Угарный газ покинул кровь, клетки дышат на 100%",
      check: (s) => (s?.days_free || 0) >= 1,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 1) * 100)),
    },
    {
      id: "badge_7d_clean",
      code: "week_free",
      title: "7 Days Clean",
      name: "7 дней чистоты",
      icon: "⚡",
      xp: 250,
      category: "streak",
      rarity: "rare",
      reqText: "7 дней подряд без срывов",
      perk: "Стабилизация сна, спокойный пульс и преодоление физической ломки",
      check: (s) => (s?.days_free || 0) >= 7,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 7) * 100)),
    },
    {
      id: "badge_money_100",
      code: "money_saver_2",
      title: "Money Milestone $100",
      name: "Рубеж $100 (50 000 ₸)",
      icon: "💰",
      xp: 300,
      category: "money",
      rarity: "epic",
      reqText: "Сберечь 50 000 ₸ (~$100)",
      perk: "Реальный личный капитал в кармане, а не в табачном пепле",
      check: (s) => (s?.saved_kzt || 0) >= 50000,
      calcProgress: (s) => Math.min(100, Math.round(((s?.saved_kzt || 0) / 50000) * 100)),
    },
    {
      id: "badge_endurance_streak",
      code: "two_weeks",
      title: "Endurance Streak",
      name: "Стрик выносливости",
      icon: "🥋",
      xp: 400,
      category: "streak",
      rarity: "epic",
      reqText: "14 дней свободы и 5+ побед над тягой",
      perk: "Рост выносливости на 30% и формирование железного самоконтроля",
      check: (s) => (s?.days_free || 0) >= 14 && (s?.cravings_resisted || 0) >= 5,
      calcProgress: (s) => {
        const dPct = Math.min(50, ((s?.days_free || 0) / 14) * 50);
        const cPct = Math.min(50, ((s?.cravings_resisted || 0) / 5) * 50);
        return Math.round(dPct + cPct);
      },
    },
    {
      id: "badge_stoic_guardian",
      code: "craving_master",
      title: "Stoic Guardian",
      name: "Страж спокойствия",
      icon: "🏛️",
      xp: 350,
      category: "mindset",
      rarity: "rare",
      reqText: "10 осознанно преодоленных приступов тяги",
      perk: "Иммунитет к провокациям и стоическое владение импульсами",
      check: (s) => (s?.cravings_resisted || 0) >= 10,
      calcProgress: (s) => Math.min(100, Math.round(((s?.cravings_resisted || 0) / 10) * 100)),
    },
    {
      id: "badge_iron_lungs",
      code: "month_free",
      title: "Iron Lungs",
      name: "Железные легкие",
      icon: "🏔️",
      xp: 500,
      category: "health",
      rarity: "legendary",
      reqText: "30 дней чистых легких без табака",
      perk: "Полная регенерация ресничек бронхов и исчезновение кашля",
      check: (s) => (s?.days_free || 0) >= 30,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 30) * 100)),
    },
    {
      id: "badge_investor_life",
      code: "money_saver_3",
      title: "Life Investor",
      name: "Инвестор в жизнь",
      icon: "🏦",
      xp: 600,
      category: "money",
      rarity: "legendary",
      reqText: "Сберечь 100 000 ₸ (~$200)",
      perk: "Финансовая автономия и ощутимый вклад в главную цель",
      check: (s) => (s?.saved_kzt || 0) >= 100000,
      calcProgress: (s) => Math.min(100, Math.round(((s?.saved_kzt || 0) / 100000) * 100)),
    },
    {
      id: "badge_brain_reset",
      code: "two_months",
      title: "Dopamine Reset",
      name: "Нейро-перезагрузка",
      icon: "🧠",
      xp: 750,
      category: "health",
      rarity: "legendary",
      reqText: "60 дней чистоты (баланс рецепторов)",
      perk: "Откалиброваны α4β2 рецепторы, возвращение естественной радости",
      check: (s) => (s?.days_free || 0) >= 60,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 60) * 100)),
    },
    {
      id: "badge_century_club",
      code: "year_free",
      title: "Century Club",
      name: "Клуб 100 дней",
      icon: "👑",
      xp: 1000,
      category: "streak",
      rarity: "mythic",
      reqText: "100 дней абсолютной свободы",
      perk: "Статус легенды сообщества и несокрушимый трек независимости",
      check: (s) => (s?.days_free || 0) >= 100,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 100) * 100)),
    },
    {
      id: "badge_gold_standard",
      code: "five_years",
      title: "Gold Standard",
      name: "Золотой стандарт ВОЗ",
      icon: "🌟",
      xp: 2000,
      category: "health",
      rarity: "mythic",
      reqText: "365 дней победы над курением",
      perk: "Риск сердечно-сосудистых катастроф снижен наполовину!",
      check: (s) => (s?.days_free || 0) >= 365,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 365) * 100)),
    },
    {
      id: "badge_zero_relapse",
      code: "clean_month_track",
      title: "Zero Relapse Master",
      name: "Абсолютная чистота",
      icon: "🎯",
      xp: 500,
      category: "streak",
      rarity: "legendary",
      reqText: "100% чистый трек без единого срыва",
      perk: "Безупречная дисциплина и доказанная сила воли",
      check: (s) => (s?.days_free || 0) >= 14 && (s?.clean_percent || 100) >= 99,
      calcProgress: (s) => Math.min(100, Math.round(((s?.days_free || 0) / 14) * 100)),
    }
  ];

  let activeBadgeFilter = "all";

  function renderAchievements(serverItems) {
    const el = $("achievements");
    if (!el) return;

    // Check unlocks
    const unlockedBadges = BADGES_DEFINITIONS.map((badge) => {
      const isUnlocked = badge.check(stats);
      const progress = badge.calcProgress(stats);
      return { ...badge, isUnlocked, progress };
    });

    const totalCount = unlockedBadges.length;
    const earnedCount = unlockedBadges.filter(b => b.isUnlocked).length;
    const totalXp = unlockedBadges.filter(b => b.isUnlocked).reduce((sum, b) => sum + b.xp, 0);

    // Update Achievement Counter & XP Ribbon
    if ($("achievementCount")) $("achievementCount").textContent = `${earnedCount} / ${totalCount}`;
    if ($("xpScoreVal")) $("xpScoreVal").textContent = `${totalXp} XP`;

    let rankTitle = "Неофит свободы";
    let rankPercent = Math.min(100, Math.round((totalXp / 3000) * 100));
    if (totalXp >= 2500) rankTitle = "👑 Легендарный Стоик";
    else if (totalXp >= 1500) rankTitle = "💎 Мастер Независимости";
    else if (totalXp >= 800) rankTitle = "⚡ Страж Чистого Дыхания";
    else if (totalXp >= 300) rankTitle = "🌱 Практик Свободы";

    if ($("xpLevelTitle")) $("xpLevelTitle").textContent = `Ранг: ${rankTitle}`;
    if ($("xpBarFill")) $("xpBarFill").style.width = `${Math.max(8, rankPercent)}%`;

    const filtered = unlockedBadges.filter((b) => {
      if (activeBadgeFilter === "unlocked") return b.isUnlocked;
      if (activeBadgeFilter === "locked") return !b.isUnlocked;
      if (activeBadgeFilter === "streak") return b.category === "streak";
      if (activeBadgeFilter === "health") return b.category === "health";
      if (activeBadgeFilter === "money") return b.category === "money";
      if (activeBadgeFilter === "mindset") return b.category === "mindset";
      return true;
    });

    el.innerHTML = `
      <div class="ach-filters-wrap" style="grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
        <button class="ach-filter-btn ${activeBadgeFilter === 'all' ? 'active' : ''}" data-filter="all">Все (${totalCount})</button>
        <button class="ach-filter-btn ${activeBadgeFilter === 'unlocked' ? 'active' : ''}" data-filter="unlocked">Получено (${earnedCount})</button>
        <button class="ach-filter-btn ${activeBadgeFilter === 'streak' ? 'active' : ''}" data-filter="streak">⚡ Стрики</button>
        <button class="ach-filter-btn ${activeBadgeFilter === 'health' ? 'active' : ''}" data-filter="health">🫁 Здоровье</button>
        <button class="ach-filter-btn ${activeBadgeFilter === 'money' ? 'active' : ''}" data-filter="money">💰 Финансы</button>
      </div>

      <div class="badges-grid-layout">
        ${filtered.map((b) => {
          const rarityColors = {
            common: "border-slate-700 text-slate-300",
            rare: "border-sky-500/50 text-sky-400",
            epic: "border-purple-500/50 text-purple-400",
            legendary: "border-amber-500/60 text-amber-400",
            mythic: "border-rose-500/60 text-rose-400",
          };
          const rarityClass = rarityColors[b.rarity] || "border-slate-700 text-slate-300";

          return `
            <div class="badge-flip-container ${b.isUnlocked ? 'badge-unlocked' : 'badge-locked'}" data-badge-id="${b.id}">
              <div class="badge-flip-inner">
                <!-- FRONT -->
                <div class="badge-face badge-face-front ${b.rarity}">
                  <div class="badge-face-top">
                    <span class="badge-xp-pill">+${b.xp} XP</span>
                    <span class="badge-status-dot ${b.isUnlocked ? 'dot-unlocked' : 'dot-locked'}"></span>
                  </div>
                  <div class="badge-icon-wrap">
                    <span class="badge-emoji">${b.icon}</span>
                  </div>
                  <strong class="badge-title">${b.name}</strong>
                  <span class="badge-subtitle">${b.title}</span>
                  <div class="badge-progress-mini">
                    <div class="badge-progress-mini-bar" style="width: ${b.progress}%;"></div>
                  </div>
                  <span class="badge-flip-hint">Нажми для деталей ↻</span>
                </div>

                <!-- BACK -->
                <div class="badge-face badge-face-back">
                  <div class="badge-back-header">
                    <strong>${b.name}</strong>
                    <span class="badge-rarity-tag ${b.rarity}">${b.rarity.toUpperCase()}</span>
                  </div>
                  <div class="badge-back-section">
                    <span class="badge-back-lbl">Условие:</span>
                    <p>${b.reqText}</p>
                  </div>
                  <div class="badge-back-section">
                    <span class="badge-back-lbl">Эффект / Награда:</span>
                    <p class="badge-perk-text">${b.perk}</p>
                  </div>
                  <div class="badge-back-footer">
                    <span>${b.isUnlocked ? '✓ Открыто!' : `Прогресс: ${b.progress}%`}</span>
                    <strong>+${b.xp} XP</strong>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    // Bind Filter clicks
    el.querySelectorAll(".ach-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        haptic("light");
        activeBadgeFilter = btn.dataset.filter || "all";
        renderAchievements(serverItems);
      });
    });

    // Bind 3D Flip Card clicks
    el.querySelectorAll(".badge-flip-container").forEach((card) => {
      card.addEventListener("click", () => {
        haptic("medium");
        card.classList.toggle("flipped");
      });
    });
  }

  /* -------------------------------------------------------------
     INTERACTIVE CHART (BAR VS LINE TOGGLE WITH RECHARTS/CHART.JS)
  ------------------------------------------------------------- */
  function renderChart(points) {
    const canvas = $("cravingChart");
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      console.error("Chart.js not loaded — skipping chart render");
      return;
    }
    updateAnalyticsKpis();
    const ctx = canvas.getContext("2d");
    if (chart) chart.destroy();

    const currencyConfig = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.KZT;
    const packPrice = stats?.user?.pack_price_kzt || 900;
    const unitsPerDay = stats?.user?.units_per_day || 20;
    const dailyExpenseKzt = (packPrice / 20) * unitsPerDay;
    const currentDays = Math.max(0, stats?.days_free || 0);
    const goalKzt = stats?.user?.financial_goal_kzt || 0;
    const daysToReachGoal = goalKzt > 0 && dailyExpenseKzt > 0 ? Math.ceil(goalKzt / dailyExpenseKzt) : 60;

    if (currentChartMode === 'cumulative') {
      // 📈 CUMULATIVE LINE CHART: Money Saved Trajectory vs Goal
      let totalDays = 60;
      if (currentChartHorizon === '30d') totalDays = Math.max(30, currentDays + 7);
      else if (currentChartHorizon === '90d') totalDays = Math.max(90, currentDays + 14);
      else if (currentChartHorizon === '180d') totalDays = Math.max(180, currentDays + 30);
      else if (currentChartHorizon === '1y') totalDays = Math.max(365, currentDays + 30);
      else if (currentChartHorizon === 'goal') totalDays = Math.max(Math.ceil(daysToReachGoal * 1.15), currentDays + 14, 30);

      const step = Math.max(1, Math.round(totalDays / 18));
      const labels = [];
      const actualData = [];
      const projectedData = [];
      const goalLineData = [];

      for (let d = 0; d <= totalDays; d += step) {
        labels.push(d === currentDays ? `Сегодня` : `Д.${d}`);
        const projVal = Math.round(d * dailyExpenseKzt * currencyConfig.rate);
        projectedData.push(projVal);

        if (d <= currentDays) {
          actualData.push(d === currentDays ? Math.round((stats?.saved_kzt || 0) * currencyConfig.rate) : projVal);
        } else {
          actualData.push(null);
        }

        if (goalKzt > 0) {
          goalLineData.push(Math.round(goalKzt * currencyConfig.rate));
        }
      }

      const datasets = [
        {
          label: "Фактически сэкономлено",
          data: actualData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Прогнозная траектория",
          data: projectedData,
          borderColor: "#38bdf8",
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        }
      ];

      if (goalKzt > 0) {
        datasets.push({
          label: `Цель (${formatMoney(goalKzt)} ${currencyConfig.sign})`,
          data: goalLineData,
          borderColor: "#f59e0b",
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        });
      }

      chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              labels: { color: "#94a3b8", font: { family: "Manrope", size: 11, weight: "bold" } },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${new Intl.NumberFormat("ru-RU").format(ctx.raw || 0)} ${currencyConfig.sign}`
              }
            }
          },
          scales: {
            x: { ticks: { color: "#8fa1b5" }, grid: { display: false } },
            y: {
              ticks: {
                color: "#8fa1b5",
                callback: (val) => `${val >= 1000 ? Math.round(val / 1000) + 'k' : val} ${currencyConfig.sign}`
              },
              grid: { color: "rgba(255,255,255,0.06)" }
            },
          },
        },
      });

    } else if (currentChartMode === 'daily') {
      // 📊 DAILY SAVINGS BAR CHART
      const daysCount = currentChartHorizon === '30d' ? 30 : currentChartHorizon === '90d' ? 30 : 20;
      const startDay = Math.max(1, currentDays >= daysCount ? currentDays - Math.floor(daysCount / 2) : 1);
      const endDay = startDay + daysCount - 1;

      const labels = [];
      const values = [];
      const bgColors = [];

      for (let d = startDay; d <= endDay; d++) {
        const isToday = d === currentDays + 1 || (currentDays === 0 && d === 1);
        const isPast = d < currentDays + 1;
        labels.push(isToday ? "Сегодня" : `Д.${d}`);
        values.push(Math.round(dailyExpenseKzt * currencyConfig.rate));

        if (isToday) bgColors.push("#f59e0b"); // Gold for today
        else if (isPast) bgColors.push("#10b981"); // Green for past
        else bgColors.push("#0284c7"); // Blue for future
      }

      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: `Экономия за день (${formatMoney(dailyExpenseKzt)} ${currencyConfig.sign})`,
              data: values,
              backgroundColor: bgColors,
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#94a3b8", font: { family: "Manrope", size: 11, weight: "bold" } } },
            tooltip: {
              callbacks: {
                afterLabel: () => `Не выкурено: ~${unitsPerDay} шт.`
              }
            }
          },
          scales: {
            x: { ticks: { color: "#8fa1b5" }, grid: { display: false } },
            y: {
              ticks: { color: "#8fa1b5" },
              grid: { color: "rgba(255,255,255,0.06)" }
            }
          }
        }
      });

    } else {
      // 🛡️ CRAVINGS & RELAPSES BY DAY
      const pts = points || stats?.cravings_by_day || [];
      const labels = pts.map((p) => p.date ? p.date.slice(5) : "");
      const resisted = pts.map((p) => p.resisted || 0);
      const relapses = pts.map((p) => p.relapses || 0);

      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels.length ? labels : ["Сегодня"],
          datasets: [
            {
              label: "Преодолено тяг",
              data: resisted.length ? resisted : [stats?.cravings_resisted || 1],
              backgroundColor: "#10b981",
              borderRadius: 6,
            },
            {
              label: "Срывы",
              data: relapses.length ? relapses : [0],
              backgroundColor: "#f97316",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#8fa1b5", font: { family: "Manrope", size: 11 } } },
          },
          scales: {
            x: { ticks: { color: "#8fa1b5" }, grid: { display: false } },
            y: { ticks: { color: "#8fa1b5", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.06)" } },
          },
        },
      });
    }

    renderWeeklyMilestones();
  }

  /* -------------------------------------------------------------
     WEEKLY SAVINGS MILESTONES & CELEBRATION
  ------------------------------------------------------------- */
  function renderWeeklyMilestones() {
    const grid = $("weeklyMilestonesGrid");
    if (!grid || !stats) return;

    const currencyConfig = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.KZT;
    const packPrice = stats.user?.pack_price_kzt || 900;
    const unitsPerDay = stats.user?.units_per_day || 20;
    const dailyExpenseKzt = (packPrice / 20) * unitsPerDay;
    const currentDays = Math.max(0, stats.fractional_days || stats.days || 0);
    const savedKzt = stats.saved_kzt || 0;

    const milestones = [
      {
        week: 1,
        daysRequired: 7,
        title: "Неделя 1: Первый щит",
        targetKzt: 7 * dailyExpenseKzt,
        icon: "🌱",
        reward: "Сбережено на приятный ужин или подарок себе",
      },
      {
        week: 2,
        daysRequired: 14,
        title: "Неделя 2: Двойной рубеж",
        targetKzt: 14 * dailyExpenseKzt,
        icon: "⚡",
        reward: "Сбережено на абонемент в зал / СПА",
      },
      {
        week: 3,
        daysRequired: 21,
        title: "Неделя 3: Привычка свободы",
        targetKzt: 21 * dailyExpenseKzt,
        icon: "🔥",
        reward: "Сформирован устойчивый паттерн чистоты",
      },
      {
        week: 4,
        daysRequired: 28,
        title: "Неделя 4: Месячный триумф",
        targetKzt: 28 * dailyExpenseKzt,
        icon: "💎",
        reward: "Ощутимый месячный капитал сохранен в бюджете",
      },
      {
        week: 8,
        daysRequired: 56,
        title: "Неделя 8: Двухмесячный капитал",
        targetKzt: 56 * dailyExpenseKzt,
        icon: "👑",
        reward: "Крупная сумма на поездку или гаджет",
      },
      {
        week: 12,
        daysRequired: 84,
        title: "Неделя 12: Квартальная победа",
        targetKzt: 84 * dailyExpenseKzt,
        icon: "🏆",
        reward: "Квартальный бюджет направлен на главную мечту",
      },
    ];

    let completedCount = 0;
    const itemsHtml = milestones.map((m) => {
      const isCompleted = currentDays >= m.daysRequired || savedKzt >= m.targetKzt;
      if (isCompleted) completedCount++;

      const progress = isCompleted ? 100 : Math.min(99, Math.round((currentDays / m.daysRequired) * 100));
      const daysLeft = Math.max(0, Math.ceil(m.daysRequired - currentDays));
      const amountLeftKzt = Math.max(0, m.targetKzt - savedKzt);

      return `
        <div class="weekly-milestone-item ${isCompleted ? 'completed' : ''}" data-week="${m.week}">
          <div class="wm-top">
            <div class="wm-title-wrap">
              <span class="wm-icon">${m.icon}</span>
              <div>
                <span class="wm-week-lbl">НЕДЕЛЯ ${m.week}</span>
                <strong class="wm-name">${m.title}</strong>
              </div>
            </div>
            ${isCompleted
              ? `<span class="wm-badge-completed">✓ Взято!</span>`
              : `<span class="wm-badge-progress">${progress}%</span>`
            }
          </div>

          <div class="wm-body">
            <div class="wm-row">
              <span class="wm-sub">Цель рубежа:</span>
              <strong class="wm-target-val">${formatMoney(m.targetKzt)} ${currencyConfig.sign}</strong>
            </div>

            <div class="wm-bar-bg">
              <div class="wm-bar-fill ${isCompleted ? 'wm-bar-done' : ''}" style="width: ${progress}%;"></div>
            </div>

            <div class="wm-footer">
              ${isCompleted
                ? `<span class="wm-reward-text">✨ ${m.reward}</span>`
                : `<span class="wm-left-text">Осталось: <strong>${daysLeft} дн.</strong> (${formatMoney(amountLeftKzt)} ${currencyConfig.sign})</span>`
              }
            </div>
          </div>
        </div>
      `;
    }).join("");

    grid.innerHTML = itemsHtml;

    if ($("milestonesCompletedCount")) {
      $("milestonesCompletedCount").textContent = `${completedCount} / ${milestones.length}`;
    }

    const banner = $("milestoneCelebrateBanner");
    if (banner) {
      if (completedCount > 0) {
        banner.style.display = "flex";
        const latestCompleted = milestones.filter(m => currentDays >= m.daysRequired || savedKzt >= m.targetKzt).slice(-1)[0];
        if (latestCompleted && $("celebrateBannerTitle")) {
          $("celebrateBannerTitle").textContent = `🎉 РУБЕЖ ${latestCompleted.week}-Й НЕДЕЛИ ЗАКРЫТ!`;
        }
      } else {
        banner.style.display = "none";
      }
    }

    // Attach click triggers to celebrate with animation
    grid.querySelectorAll(".weekly-milestone-item").forEach((item) => {
      item.addEventListener("click", () => {
        haptic("medium");
        const week = parseInt(item.dataset.week, 10);
        const m = milestones.find(x => x.week === week);
        if (m) {
          triggerCelebrationEffect(m.title, m.reward, formatMoney(m.targetKzt) + " " + currencyConfig.sign);
        }
      });
    });

    const btnConfetti = $("btnTriggerConfetti");
    if (btnConfetti) {
      btnConfetti.onclick = () => {
        haptic("heavy");
        triggerCelebrationEffect("🎉 ФИНАНСОВЫЙ ТРИУМФ!", "Деньги сохранены в вашем бюджете!", formatMoney(savedKzt) + " " + currencyConfig.sign);
      };
    }
  }

  /* -------------------------------------------------------------
     CELEBRATION CONFETTI & POPUP EFFECT
  ------------------------------------------------------------- */
  function triggerCelebrationEffect(title, desc, amount) {
    // 1. Trigger Screen Confetti Particles
    const confettiContainer = document.createElement("div");
    confettiContainer.className = "confetti-overlay-wrap";
    document.body.appendChild(confettiContainer);

    const colors = ["#f59e0b", "#10b981", "#38bdf8", "#ec4899", "#a855f7", "#eab308"];
    for (let i = 0; i < 40; i++) {
      const particle = document.createElement("div");
      particle.className = "confetti-piece";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = `${Math.random() * 0.4}s`;
      particle.style.transform = `rotate(${Math.random() * 360}deg)`;
      confettiContainer.appendChild(particle);
    }

    setTimeout(() => {
      if (confettiContainer.parentNode) confettiContainer.parentNode.removeChild(confettiContainer);
    }, 2500);

    toast(`${title} — ${desc}`);
  }

  /* -------------------------------------------------------------
     RADAR & TRIGGERS
  ------------------------------------------------------------- */
  async function loadTriggers() {
    if (!userId) return;
    try {
      const items = await api(`/api/triggers/${userId}`);
      triggerListCache = items;
      checkNearestTrigger();

      $("triggers").innerHTML = items.length
        ? items.map((item) => `
          <div class="trigger-row">
            <div>
              <span class="trigger-time">${item.time}</span>
              <span class="trigger-label">${item.label}</span>
            </div>
            <div class="trigger-actions">
              <button class="toggle ${item.enabled ? "on" : ""}" data-trigger="${item.id}" aria-label="Переключить">
                <span></span>
              </button>
              <button class="btn-del-trigger" data-del-trigger="${item.id}" title="Удалить триггер">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9.5 7V4.2h5V7"/><path d="M6.3 7l.9 12.4a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4L17.7 7"/><path d="M10.2 11v6"/><path d="M13.8 11v6"/></svg>
              </button>
            </div>
          </div>
        `).join("")
        : `<div class="info-note"><p>Добавь опасный час — радар предупредит в Telegram за 15 минут.</p></div>`;

      // Event listeners for toggle
      document.querySelectorAll("[data-trigger]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          haptic("light");
          try {
            await api(`/api/triggers/${userId}/${btn.dataset.trigger}`, { method: "PATCH" });
            await loadTriggers();
          } catch (err) {
            toast(err.message);
          }
        })
      );

      // Event listeners for delete
      document.querySelectorAll("[data-del-trigger]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          haptic("medium");
          try {
            await api(`/api/triggers/${userId}/${btn.dataset.delTrigger}`, { method: "DELETE" });
            toast("Триггер удален");
            await loadTriggers();
          } catch (err) {
            toast(err.message);
          }
        })
      );

    } catch (err) {
      console.error(err);
    }
  }

  function checkNearestTrigger() {
    const box = $("nearestTriggerBox");
    if (!box || !triggerListCache.length) {
      if (box) box.style.display = "none";
      return;
    }

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const enabledTriggers = triggerListCache.filter(t => t.enabled);
    if (!enabledTriggers.length) {
      box.style.display = "none";
      return;
    }

    let nearest = null;
    let minDiff = Infinity;

    for (const t of enabledTriggers) {
      const [h, m] = t.time.split(":").map(Number);
      let trigMin = h * 60 + m;
      let diff = trigMin - currentMin;
      if (diff < 0) diff += 1440; // tomorrow
      if (diff < minDiff) {
        minDiff = diff;
        nearest = t;
      }
    }

    if (nearest) {
      box.style.display = "flex";
      $("nearestTriggerTitle").textContent = `Ближайший триггер: «${nearest.label}» (${nearest.time})`;
      const hoursLeft = Math.floor(minDiff / 60);
      const minsLeft = minDiff % 60;
      const timeLeftStr = hoursLeft > 0 ? `${hoursLeft} ч. ${minsLeft} мин.` : `${minsLeft} мин.`;
      $("nearestTriggerTime").textContent = `Предупреждение за 15 мин до события (через ${timeLeftStr})`;
    }
  }

  // Trigger quick presets
  document.querySelectorAll(".preset-pill").forEach((pill) => {
    pill.addEventListener("click", async () => {
      haptic("light");
      const time = pill.dataset.time;
      const label = pill.dataset.label;
      if (!userId || !time || !label) return;
      try {
        await api("/api/triggers", {
          method: "POST",
          body: JSON.stringify({ user_id: Number(userId), time, label }),
        });
        toast(`Добавлен триггер: ${label}`);
        await loadTriggers();
      } catch (err) {
        toast(err.message);
      }
    });
  });

  $("triggerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    haptic("medium");
    const form = new FormData(e.target);
    try {
      await api("/api/triggers", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userId),
          time: form.get("time"),
          label: form.get("label"),
        }),
      });
      e.target.reset();
      toast("Радар настроен!");
      await loadTriggers();
    } catch (err) {
      toast(err.message);
    }
  });

  /* -------------------------------------------------------------
     INTERACTIVE 3-MINUTE SOS BREATHWORK ENGINE
  ------------------------------------------------------------- */
  let sosTimer = null;
  let sosSecondsLeft = 180;
  let breathStepTimer = null;
  let breathPhase = "inhale"; // inhale (4s) -> hold (4s) -> exhale (4s) -> pause (4s)
  let breathCount = 4;

  function openSosModal() {
    haptic("heavy");
    const modal = $("modalSos");
    if (!modal) return;
    modal.classList.add("active");

    // Reset & start 3-min timer
    sosSecondsLeft = 180;
    updateSosCountdown();
    if (sosTimer) clearInterval(sosTimer);
    sosTimer = setInterval(() => {
      sosSecondsLeft--;
      updateSosCountdown();
      if (sosSecondsLeft <= 0) {
        clearInterval(sosTimer);
        toast("🎉 3 минуты позади! Острая тяга отступила.");
      }
    }, 1000);

    startBreathingCycle();
  }

  function closeSosModal() {
    $("modalSos")?.classList.remove("active");
    if (sosTimer) clearInterval(sosTimer);
    if (breathStepTimer) clearInterval(breathStepTimer);
  }

  function updateSosCountdown() {
    const mins = Math.floor(sosSecondsLeft / 60);
    const secs = sosSecondsLeft % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if ($("sosCountdown")) $("sosCountdown").textContent = `${pad(mins)}:${pad(secs)}`;
  }

  function startBreathingCycle() {
    breathPhase = "inhale";
    breathCount = 4;
    applyBreathPhaseUI();

    if (breathStepTimer) clearInterval(breathStepTimer);
    breathStepTimer = setInterval(() => {
      breathCount--;
      if (breathCount <= 0) {
        // Next phase in box breathing: inhale -> hold -> exhale -> pause
        if (breathPhase === "inhale") breathPhase = "hold";
        else if (breathPhase === "hold") breathPhase = "exhale";
        else if (breathPhase === "exhale") breathPhase = "pause";
        else if (breathPhase === "pause") breathPhase = "inhale";
        breathCount = 4;
        haptic("light");
      }
      applyBreathPhaseUI();
    }, 1000);
  }

  function applyBreathPhaseUI() {
    const orb = $("breathOrb");
    const act = $("breathAction");
    const sec = $("breathSeconds");
    const hint = $("breathHint");

    if (sec) sec.textContent = breathCount;

    if (orb) {
      orb.className = `breath-orb ${breathPhase}`;
    }

    if (breathPhase === "inhale") {
      if (act) act.textContent = "Вдох";
      if (hint) hint.textContent = "Медленно вдыхай через нос, наполняя легкие и живот...";
    } else if (breathPhase === "hold") {
      if (act) act.textContent = "Задержка";
      if (hint) hint.textContent = "Удерживай воздух, почувствуй покой и контроль...";
    } else if (breathPhase === "exhale") {
      if (act) act.textContent = "Выдох";
      if (hint) hint.textContent = "Плавный спокойный выдох через рот, отпуская напряжение...";
    } else if (breathPhase === "pause") {
      if (act) act.textContent = "Пауза";
      if (hint) hint.textContent = "Небольшая пауза перед следующим вдохом...";
    }
  }

  // SOS Mode switch (Breathing vs Grounding)
  document.querySelectorAll(".sos-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".sos-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const mode = btn.dataset.mode;
      if (mode === "breathing") {
        $("sosBreathingView")?.classList.add("active");
        $("sosGroundingView")?.classList.remove("active");
      } else {
        $("sosBreathingView")?.classList.remove("active");
        $("sosGroundingView")?.classList.add("active");
      }
    });
  });

  $("sosButton")?.addEventListener("click", openSosModal);
  $("btnCloseSos")?.addEventListener("click", closeSosModal);

  // Victory inside SOS modal
  $("btnSosResisted")?.addEventListener("click", async () => {
    haptic("success");
    closeSosModal();
    try {
      await api("/api/cravings", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userId),
          intensity: 8,
          outcome: "resisted",
          trigger: "SOS 3 минуты",
        }),
      });
      toast("🏆 Победа зафиксирована! Ты справился с тягой.");
      await load();
    } catch (err) {
      toast(err.message);
    }
  });

  // Direct "Я справился" button on Overview
  $("resistedButton")?.addEventListener("click", async () => {
    haptic("success");
    try {
      await api("/api/cravings", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userId),
          intensity: 5,
          outcome: "resisted",
          trigger: "Быстрая кнопка",
        }),
      });
      toast("Победа зафиксирована! Ты выбрал свободу.");
      await load();
    } catch (err) {
      toast(err.message);
    }
  });

  /* -------------------------------------------------------------
     NO-SHAME RELAPSE REFLECTION MODAL (REPLACES ALL PROMPTS!)
  ------------------------------------------------------------- */
  function openRelapseModal() {
    haptic("medium");
    const modal = $("modalRelapse");
    if (!modal) return;
    modal.classList.add("active");
  }

  function closeRelapseModal() {
    $("modalRelapse")?.classList.remove("active");
  }

  $("relapseButton")?.addEventListener("click", openRelapseModal);
  $("btnCloseRelapse")?.addEventListener("click", closeRelapseModal);
  $("btnCancelRelapse")?.addEventListener("click", closeRelapseModal);

  // Helper for chip groups
  function setupChipGroup(containerId, hiddenInputId) {
    const container = $(containerId);
    const input = $(hiddenInputId);
    if (!container || !input) return;

    container.querySelectorAll(".choice-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        haptic("light");
        container.querySelectorAll(".choice-chip").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        input.value = btn.dataset.val;
      });
    });
  }

  setupChipGroup("relapseCountChips", "inputRelapseCigarettes");
  setupChipGroup("relapseTriggerChips", "inputRelapseTrigger");
  setupChipGroup("relapsePlanChips", "inputRelapsePlan");

  $("formRelapse")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    haptic("medium");
    const cigarettes = Number($("inputRelapseCigarettes")?.value || 1);
    const trigger = $("inputRelapseTrigger")?.value || "Стресс";
    const plan = $("inputRelapsePlan")?.value || "Сделать паузу";

    try {
      await api("/api/relapses", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userId),
          cigarettes,
          trigger,
          reflection: "Запись из приложения",
          plan,
        }),
      });
      quitTimestamp = Date.now();
      updateLiveHud();
      renderHealthTimeline(0);
      closeRelapseModal();
      toast("Зафиксировано. Фазы здоровья сброшены на старт!");
      await load();
    } catch (err) {
      toast(err.message);
    }
  });

  /* -------------------------------------------------------------
     AI COACH CHAT & WISDOM ENGINE
  ------------------------------------------------------------- */
  function formatCoachText(rawText) {
    if (!rawText) return "";
    let formatted = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^[\s]*[-•*]\s+(.*)$/gm, "• $1")
      .replace(/\n\n+/g, "<br><br>")
      .replace(/\n/g, "<br>");
    return formatted;
  }

  function addCoachMessage(sender, text) {
    const box = $("coachChatBox");
    if (!box) return;

    const msgEl = document.createElement("div");
    msgEl.className = `coach-msg coach-msg-${sender}`;

    const formattedContent = formatCoachText(text);

    if (sender === "assistant") {
      msgEl.innerHTML = `
        <div class="coach-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="10" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/><path d="M12 8V4.5"/><circle cx="12" cy="3.2" r="1.1" fill="currentColor" stroke="none"/></svg></div>
        <div class="coach-bubble">${formattedContent}</div>
      `;
    } else {
      msgEl.innerHTML = `
        <div class="coach-bubble">${formattedContent}</div>
      `;
    }
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
  }

  async function sendCoachMessage(messageText) {
    if (!messageText.trim() || !userId) return;
    haptic("medium");
    addCoachMessage("user", messageText);

    // Placeholder typing indicator
    const typingBubble = document.createElement("div");
    typingBubble.className = "coach-msg coach-msg-assistant";
    typingBubble.innerHTML = `
      <div class="coach-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="10" rx="3"/><circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/><path d="M12 8V4.5"/><circle cx="12" cy="3.2" r="1.1" fill="currentColor" stroke="none"/></svg></div>
      <div class="coach-bubble" style="opacity: 0.7;">Изучаю контекст и формулирую ответ…</div>
    `;
    $("coachChatBox")?.appendChild(typingBubble);
    $("coachChatBox").scrollTop = $("coachChatBox").scrollHeight;

    try {
      const res = await api("/api/coach/chat", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(userId),
          message: messageText,
        }),
      });
      typingBubble.remove();
      addCoachMessage("assistant", res.reply);
      haptic("light");
    } catch (err) {
      typingBubble.remove();
      addCoachMessage(
        "assistant",
        "📖 Аллен Карр («Легкий способ»):\n«Сигарета не снимает стресс — она лишь временно утоляет муки абстиненции от предыдущей сигареты.»\n\n💡 Тяга — это не твоё истинное желание, а агония никотинового паразита. Выпей сейчас стакан воды мелкими глотками. Что сильнее всего провоцирует желание прямо сейчас?"
      );
    }
  }

  $("coachForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("coachInput");
    if (!input || !input.value.trim()) return;
    const txt = input.value.trim();
    input.value = "";
    sendCoachMessage(txt);
  });

  document.querySelectorAll(".quick-prompt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendCoachMessage(prompt);
    });
  });

  /* Dynamic Quote / Wisdom Loader */
  async function fetchWisdom(category = null) {
    try {
      const q = category ? `?category=${category}` : "";
      const res = await api(`/api/wisdom${q}`);
      if (res && $("quoteText")) {
        $("quoteText").textContent = res.quote;
        if ($("quoteAuthor")) $("quoteAuthor").textContent = `— ${res.source}`;
        if ($("quoteBadge")) $("quoteBadge").textContent = res.badge;
      }
    } catch (e) {
      // Quiet failover
    }
  }

  $("quoteCard")?.addEventListener("click", () => {
    haptic("light");
    fetchWisdom();
  });

  /* -------------------------------------------------------------
     CURRENCY TOGGLE
  ------------------------------------------------------------- */
  document.querySelectorAll(".currency-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".currency-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCurrency = btn.dataset.currency;
      localStorage.setItem("smokefree_currency", currentCurrency);
      if (stats) renderStats(stats);
    });
  });

  // Init currency state
  const activeCurBtn = document.querySelector(`[data-currency="${currentCurrency}"]`);
  if (activeCurBtn) {
    document.querySelectorAll(".currency-btn").forEach(b => b.classList.remove("active"));
    activeCurBtn.classList.add("active");
  }

  /* -------------------------------------------------------------
     QUIT TIME MODAL
  ------------------------------------------------------------- */
  function openQuitTimeModal() {
    haptic("light");
    const modal = $("modalQuitTime");
    if (!modal) return;
    const targetDate = quitTimestamp ? new Date(quitTimestamp) : new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localIso = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
    
    if ($("inputQuitDateTime")) $("inputQuitDateTime").value = localIso;
    modal.classList.add("active");
  }

  function closeQuitTimeModal() {
    $("modalQuitTime")?.classList.remove("active");
  }

  $("btnEditTime")?.addEventListener("click", openQuitTimeModal);
  $("btnCloseQuitTime")?.addEventListener("click", closeQuitTimeModal);
  $("btnCancelQuitTime")?.addEventListener("click", closeQuitTimeModal);

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      haptic("light");
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      let d = new Date(now);
      const preset = btn.dataset.preset;
      if (preset === "now") {
        // Now
      } else if (preset === "1h") {
        d.setHours(d.getHours() - 1);
      } else if (preset === "today8") {
        d.setHours(8, 0, 0, 0);
      } else if (preset === "yesterday20") {
        d.setDate(d.getDate() - 1);
        d.setHours(20, 0, 0, 0);
      }
      if ($("inputQuitDateTime")) {
        $("inputQuitDateTime").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    });
  });

  $("formQuitTime")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    haptic("medium");
    const val = $("inputQuitDateTime")?.value;
    if (!val || !userId) return;
    const localDate = new Date(val);
    const isoString = localDate.toISOString();
    try {
      const res = await api("/api/user/quit_time", {
        method: "POST",
        body: JSON.stringify({ user_id: Number(userId), quit_at: isoString }),
      });
      closeQuitTimeModal();
      toast("⏱ Время отказа обновлено!");
      quitTimestamp = localDate.getTime();
      renderStats(res.stats);
    } catch (err) {
      toast(err.message);
    }
  });

  /* -------------------------------------------------------------
     IOS SAFARI GUIDE MODAL
  ------------------------------------------------------------- */
  function openIosGuide() {
    haptic("light");
    const modal = $("modalIosGuide");
    if (!modal) return;
    const origin = window.location.origin;
    const effectiveToken = token || localStorage.getItem("smokefree_token") || getCookie("smokefree_token") || "";
    const effectiveUserId = userId || localStorage.getItem("smokefree_user_id") || getCookie("smokefree_user_id") || "";
    const url = `${origin}/?user_id=${effectiveUserId}&token=${effectiveToken}`;
    if ($("iosShareUrl")) $("iosShareUrl").value = url;
    const safariBtn = $("btnOpenInSafari");
    if (safariBtn) {
      safariBtn.href = url;
      safariBtn.style.display = "inline-flex";
    }
    modal.classList.add("active");
  }

  function closeIosGuide() {
    $("modalIosGuide")?.classList.remove("active");
  }

  $("btnIosGuide")?.addEventListener("click", openIosGuide);
  $("btnCloseIosGuide")?.addEventListener("click", closeIosGuide);
  $("btnUnderstandIos")?.addEventListener("click", closeIosGuide);
  $("btnCopyIosUrl")?.addEventListener("click", async () => {
    haptic("light");
    const input = $("iosShareUrl");
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
      toast("📋 Ссылка скопирована! Открой её в Safari.");
    } catch {
      input.select();
      document.execCommand("copy");
      toast("📋 Ссылка скопирована!");
    }
  });

  /* -------------------------------------------------------------
     TAB NAVIGATION & CHART CONTROLS
  ------------------------------------------------------------- */
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".tab, .tab-panel").forEach((el) => el.classList.remove("active"));
      tab.classList.add("active");
      const target = $(tab.dataset.tab);
      if (target) target.classList.add("active");
      if (tab.dataset.tab === "analytics") {
        renderChart(stats?.cravings_by_day || []);
      }
    })
  );

  // Chart Mode Switcher (Cumulative vs Daily vs Cravings)
  document.querySelectorAll(".chart-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".chart-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentChartMode = btn.dataset.mode || "cumulative";
      const horizonWrap = $("horizonControls");
      if (horizonWrap) {
        horizonWrap.style.display = currentChartMode === "cravings" ? "none" : "flex";
      }
      renderChart(stats?.cravings_by_day || []);
    });
  });

  // Time Horizon Switcher (30d, 90d, 180d, 1y, goal)
  document.querySelectorAll(".horizon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".horizon-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentChartHorizon = btn.dataset.horizon || "goal";
      renderChart(stats?.cravings_by_day || []);
    });
  });

  /* -------------------------------------------------------------
     STORY CARD EXPORT
  ------------------------------------------------------------- */
  $("storyButton")?.addEventListener("click", () => {
    if (!stats) return;
    haptic("medium");
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#15273d");
    gradient.addColorStop(1, "#080d14");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent header
    ctx.fillStyle = "#10b981";
    ctx.font = "700 36px Manrope, sans-serif";
    ctx.fillText("SMOKEFREE · ТРЕК СВОБОДЫ", 85, 145);

    // Main Days
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "800 200px Manrope, sans-serif";
    ctx.fillText(String(stats.days_free), 80, 680);

    ctx.font = "600 44px Manrope, sans-serif";
    ctx.fillText("дней чистоты без никотина", 92, 760);

    // Sub metrics
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 32px Manrope, sans-serif";
    ctx.fillText(`Сэкономлено: ${formatMoney(stats.saved_kzt)} ${CURRENCY_RATES[currentCurrency].sign}`, 92, 850);
    ctx.fillText(`Возвращено жизни: ${formatNumber(stats.minutes_returned)} мин.`, 92, 910);
    ctx.fillText(`Преодолено тяг: ${stats.cravings_resisted} побед`, 92, 970);

    const link = document.createElement("a");
    link.download = `smokefree-${stats.days_free}-days.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("Карточка трека сохранена!");
  });

  /* -------------------------------------------------------------
     MANUAL SYNC MODAL HANDLERS
  ------------------------------------------------------------- */
  function openSyncModal() {
    haptic("light");
    $("modalSync")?.classList.add("active");
    setTimeout(() => $("inputSyncUrl")?.focus(), 150);
  }
  function closeSyncModal() {
    $("modalSync")?.classList.remove("active");
  }

  $("btnManualSync")?.addEventListener("click", openSyncModal);
  $("btnCloseSync")?.addEventListener("click", closeSyncModal);
  $("btnCancelSync")?.addEventListener("click", closeSyncModal);

  $("formManualSync")?.addEventListener("submit", (e) => {
    e.preventDefault();
    haptic("medium");
    const val = $("inputSyncUrl")?.value.trim();
    if (!val) return;

    try {
      let extractedId = null;
      let extractedToken = null;

      if (val.includes("user_id=")) {
        const parsedUrl = new URL(val.startsWith("http") ? val : `http://dummy.local/${val}`);
        extractedId = parsedUrl.searchParams.get("user_id");
        extractedToken = parsedUrl.searchParams.get("token");
      } else if (/^\d+$/.test(val)) {
        extractedId = val;
      }

      if (extractedId) {
        userId = extractedId;
        localStorage.setItem("smokefree_user_id", extractedId);
        setCookie("smokefree_user_id", extractedId);
      }
      if (extractedToken) {
        token = extractedToken;
        localStorage.setItem("smokefree_token", extractedToken);
        setCookie("smokefree_token", extractedToken);
      }

      updateManifestTag();
      closeSyncModal();
      toast("Синхронизировано! Загрузка данных…");
      load();
    } catch {
      toast("Не удалось распознать ссылку");
    }
  });

  /* -------------------------------------------------------------
     INITIAL LOAD & CACHE BOOTSTRAP
  ------------------------------------------------------------- */
  // Instant render from localStorage cache so the user NEVER sees 0s on launch!
  const cachedStatsRaw = localStorage.getItem("smokefree_cached_stats");
  if (cachedStatsRaw) {
    try {
      const cached = JSON.parse(cachedStatsRaw);
      renderStats(cached, false);
    } catch (e) {
      console.error("Cache load error:", e);
    }
  }

  async function load() {
    if (!userId || (!token && !tg?.initData)) {
      if (!stats) {
        if ($("greeting")) $("greeting").textContent = "Требуется авторизация через Telegram";
        if ($("authNotice")) $("authNotice").style.display = "flex";
      }
      return;
    }

    // Step 1 — the actual network call. Only a failure here means we're
    // genuinely offline / unauthenticated; this is the only thing allowed
    // to trigger the recovery-sync / offline-banner path below.
    let data;
    try {
      data = await api(`/api/stats/${userId}`);
    } catch (err) {
      try {
        const cached = localStorage.getItem("smokefree_cached_stats");
        if (cached) {
          const cachedObj = JSON.parse(cached);
          const cachedQuitAt = cachedObj.quit_at || cachedObj.user?.quit_at;
          if (cachedObj && cachedQuitAt) {
            const syncRes = await api("/api/user/sync", {
              method: "POST",
              body: JSON.stringify({
                user_id: Number(userId),
                name: cachedObj.user?.name || cachedObj.user?.first_name || cachedObj.name || cachedObj.first_name || "Друг",
                quit_at: cachedQuitAt,
                nicotine_type: cachedObj.user?.nicotine_type || cachedObj.nicotine_type || "Сигареты",
                pack_price_kzt: cachedObj.user?.pack_price_kzt || cachedObj.pack_price_kzt || 900,
                units_per_day: cachedObj.user?.units_per_day || cachedObj.units_per_day || 20,
                financial_goal_kzt: cachedObj.user?.financial_goal_kzt || cachedObj.financial_goal_kzt || 0,
              })
            });
            const restored = syncRes?.stats || (await api(`/api/stats/${userId}`));
            renderStats(restored, true);
            await loadTriggers();
            toast("Прогресс успешно синхронизирован!");
            return;
          }
        }
      } catch (recoveryErr) {
        console.warn("Recovery failed:", recoveryErr);
      }

      if (stats) {
        toast("Офлайн: показаны сохраненные данные");
      } else {
        toast(err.message);
        if ($("greeting")) $("greeting").textContent = "Ошибка авторизации";
        if ($("authNotice")) $("authNotice").style.display = "flex";
      }
      return;
    }

    // Step 2 — auto-heal: server DB was wiped on redeploy or has an uninitialized
    // quit_at, but we have a valid value cached locally.
    try {
      const cached = localStorage.getItem("smokefree_cached_stats");
      if (cached && data) {
        const cachedObj = JSON.parse(cached);
        const cachedQuitAt = cachedObj.quit_at || cachedObj.user?.quit_at;
        const serverQuitAt = data.user?.quit_at || data.quit_at;

        const isServerQuitMissing = !serverQuitAt && !data.user?.quit_date;

        if (cachedQuitAt && isServerQuitMissing) {
          const syncRes = await api("/api/user/sync", {
            method: "POST",
            body: JSON.stringify({
              user_id: Number(userId),
              name: cachedObj.user?.name || cachedObj.user?.first_name || cachedObj.name || cachedObj.first_name || "Друг",
              quit_at: cachedQuitAt,
              nicotine_type: cachedObj.user?.nicotine_type || cachedObj.nicotine_type || "Сигареты",
              pack_price_kzt: cachedObj.user?.pack_price_kzt || cachedObj.pack_price_kzt || 900,
              units_per_day: cachedObj.user?.units_per_day || cachedObj.units_per_day || 20,
              financial_goal_kzt: cachedObj.user?.financial_goal_kzt || cachedObj.financial_goal_kzt || 0,
            })
          });
          if (syncRes?.stats) {
            data = syncRes.stats;
          } else {
            data = await api(`/api/stats/${userId}`);
          }
          toast("Прогресс синхронизирован с сервером!");
        }
      }
    } catch (syncErr) {
      console.warn("Auto-sync fallback error:", syncErr);
    }

    // Step 3 — rendering. A bug here (a bad chart config, a missing DOM
    // node, etc.) must never be mistaken for a network/offline failure —
    // that would wrongly show the offline banner and skip loadTriggers()
    // even though the data we have is perfectly fresh.
    try {
      renderStats(data, true);
    } catch (renderErr) {
      console.error("renderStats failed:", renderErr);
    }
    try {
      await loadTriggers();
    } catch (triggersErr) {
      console.error("loadTriggers failed:", triggersErr);
    }
  }

  $("refreshButton")?.addEventListener("click", () => {
    haptic("light");
    load();
  });

  // Auto-refresh stats when tab becomes visible or every 45s
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      load();
    }
  });

  setInterval(() => {
    if (document.visibilityState === "visible") {
      load();
    }
  }, 45000);

  load();
})();
