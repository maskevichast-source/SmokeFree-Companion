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
     WHO RECOVERY TIMELINE (DYNAMIC COMPUTED)
  ------------------------------------------------------------- */
  const WHO_STAGES = [
    { id: "20m", targetSec: 20 * 60, title: "20 минут: Пульс и давление", desc: "Частота сердечных сокращений и артериальное давление возвращаются к норме. Кровообращение в конечностях улучшается." },
    { id: "8h", targetSec: 8 * 3600, title: "8 часов: Кислород в крови", desc: "Уровень угарного газа (CO) снижается вдвое. Концентрация кислорода в артериальной крови достигает оптимальных значений." },
    { id: "24h", targetSec: 24 * 3600, title: "24 часа: Очищение легких", desc: "Риск инфаркта начинает снижаться. Легкие начинают избавляться от остатков слизи и продуктов горения табака." },
    { id: "48h", targetSec: 48 * 3600, title: "48 часов: Вкус и обоняние", desc: "Организм полностью освободился от никотина. Нервные окончания начинают восстанавливаться, вкусы и запахи становятся ярче." },
    { id: "72h", targetSec: 72 * 3600, title: "72 часа: Легкость дыхания", desc: "Бронхиальные трубки расслабляются, дыхание становится глубже. Пик физиологической никотиновой ломки пройден!" },
    { id: "14d", targetSec: 14 * 86400, title: "2 недели: Энергия и выносливость", desc: "Кровообращение во всем теле существенно улучшилось. Функционирование легких увеличивается на 30%." },
    { id: "30d", targetSec: 30 * 86400, title: "1 месяц: Регенерация бронхов", desc: "Уходит одышка и кашель курильщика. Реснички бронхиального эпителия восстанавливают способность очищать дыхательные пути." },
    { id: "365d", targetSec: 365 * 86400, title: "1 год: Здоровое сердце", desc: "Риск развития ишемической болезни сердца снижается на 50% по сравнению с продолжающим курить человеком." },
  ];

  function renderHealthTimeline(currentSec) {
    const container = $("healthTimeline");
    if (!container) return;

    container.innerHTML = WHO_STAGES.map((stage) => {
      const isDone = currentSec >= stage.targetSec;
      const pct = isDone ? 100 : Math.min(99, Math.round((currentSec / stage.targetSec) * 100));
      const statusClass = isDone ? "completed" : pct > 0 ? "in-progress" : "locked";
      const badgeHtml = isDone
        ? `<span class="health-badge badge-done">Выполнено ✓</span>`
        : pct > 0
        ? `<span class="health-badge badge-progress">${pct}% в процессе</span>`
        : `<span class="health-badge badge-locked">Предстоит</span>`;

      return `
        <article class="health-item ${statusClass}">
          <div class="health-item-header">
            <strong class="health-title">${stage.title}</strong>
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
     ACHIEVEMENTS
  ------------------------------------------------------------- */
  const ACHIEVEMENT_META = {
    first_day: { title: "Первый чистый день", description: "24 часа без табака — организм очищается от CO", icon: "🌱" },
    week_free: { title: "Неделя свободы", description: "7 дней без сигарет — пик физической тяги позади", icon: "✦" },
    month_free: { title: "Месяц нового ритма", description: "30 дней без дыма — дыхание восстановлено", icon: "◆" },
    craving_master: { title: "Мастер тяги", description: "10 побед над приступами тяги", icon: "◉" },
  };

  function renderAchievements(items) {
    const el = $("achievements");
    if (!el) return;
    if ($("achievementCount")) $("achievementCount").textContent = items.length;

    el.innerHTML = items.length
      ? items.map((item) => {
        const meta = ACHIEVEMENT_META[item.code] || {};
        const title = item.title || meta.title || item.code || "Награда";
        const desc = item.description || meta.description || "Награда получена!";
        const icon = item.icon || meta.icon || "🏅";
        return `
        <article class="achievement-item unlocked">
          <span class="ach-icon">${icon}</span>
          <div>
            <strong>${title}</strong>
            <p>${desc}</p>
          </div>
        </article>
      `;
      }).join("")
      : `<div class="info-note"><p>Первая награда откроется уже через 24 часа чистой свободы!</p></div>`;
  }

  /* -------------------------------------------------------------
     CHART
  ------------------------------------------------------------- */
  function renderChart(points) {
    const canvas = $("cravingChart");
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      console.error("Chart.js not loaded — skipping chart render");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (chart) chart.destroy();

    const labels = points.map((p) => p.date ? p.date.slice(5) : "");
    const resisted = points.map((p) => p.resisted || 0);
    const relapses = points.map((p) => p.relapses || 0);

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Сегодня"],
        datasets: [
          {
            label: "Преодолено",
            data: resisted.length ? resisted : [1],
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
     TAB NAVIGATION
  ------------------------------------------------------------- */
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      haptic("light");
      document.querySelectorAll(".tab, .tab-panel").forEach((el) => el.classList.remove("active"));
      tab.classList.add("active");
      const target = $(tab.dataset.tab);
      if (target) target.classList.add("active");
      if (tab.dataset.tab === "analytics") {
        if (stats && stats.cravings_by_day) {
          renderChart(stats.cravings_by_day);
        } else {
          load();
        }
      }
    })
  );

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
          if (cachedObj && cachedObj.quit_at) {
            await api("/api/user/sync", {
              method: "POST",
              body: JSON.stringify({
                user_id: userId,
                name: cachedObj.first_name || "Друг",
                quit_at: cachedObj.quit_at,
                nicotine_type: cachedObj.nicotine_type || "Сигареты",
                pack_price_kzt: cachedObj.pack_price_kzt || 900,
                units_per_day: cachedObj.units_per_day || 20,
                financial_goal_kzt: cachedObj.financial_goal_kzt || 0,
              })
            });
            const restored = await api(`/api/stats/${userId}`);
            renderStats(restored, true);
            await loadTriggers();
            toast("Прогресс успешно восстановлен!");
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

    // Step 2 — auto-heal: server DB was wiped on redeploy or has a reset/
    // missing quit_at, but we have a newer value cached locally. This does
    // its own network calls and can fail on its own without that meaning
    // we're offline — `data` from Step 1 is always a valid fallback.
    try {
      const cached = localStorage.getItem("smokefree_cached_stats");
      if (cached && data) {
        const cachedObj = JSON.parse(cached);
        const cachedQuitAt = cachedObj.quit_at || (cachedObj.user && cachedObj.user.quit_at);
        const serverQuitAt = data.user?.quit_at;

        const isServerQuitMissing = !serverQuitAt && !data.user?.quit_date;
        const isServerQuitReset = cachedQuitAt && serverQuitAt && (new Date(cachedQuitAt).getTime() < new Date(serverQuitAt).getTime() - 600000);

        if (cachedQuitAt && (isServerQuitMissing || isServerQuitReset)) {
          await api("/api/user/sync", {
            method: "POST",
            body: JSON.stringify({
              user_id: Number(userId),
              name: cachedObj.first_name || cachedObj.user?.name || "Друг",
              quit_at: cachedQuitAt,
              nicotine_type: cachedObj.nicotine_type || cachedObj.user?.nicotine_type || "Сигареты",
              pack_price_kzt: cachedObj.pack_price_kzt || cachedObj.user?.pack_price_kzt || 900,
              units_per_day: cachedObj.units_per_day || cachedObj.user?.units_per_day || 20,
              financial_goal_kzt: cachedObj.financial_goal_kzt || cachedObj.user?.financial_goal_kzt || 0,
            })
          });
          data = await api(`/api/stats/${userId}`);
          toast("Прогресс успешно восстановлен!");
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
