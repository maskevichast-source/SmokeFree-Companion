import React from 'react';
import {
  Cpu,
  Layers,
  Network,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react';
import { ARCHITECTURE_FLAWS } from '../data/auditReport';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* Title section */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Системный Дизайн и Масштабирование
          </span>
          <span className="text-xs text-slate-400">Хостинг: Railway.app &bull; Telegram Bot API</span>
        </div>
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">
          Архитектурные проблемы и модель оптимизации
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Текущая версия проекта объединяет веб-сервер, Telegram-бота и фоновые задачи в одном процессе. Ниже разобран детальный план перехода к надежной, продакшен-готовой архитектуре.
        </p>
      </div>

      {/* Visual Architectural Comparison */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span>Сравнение: Текущая архитектура vs Оптимальная</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Flawed Architecture */}
          <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Текущая схема (Монолит в одном цикле)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                Низкая надежность
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="text-rose-400 font-bold">1 Контейнер Railway: main.py</div>
              <div className="pl-3 border-l-2 border-slate-800 space-y-1">
                <div>├── asyncio.gather()</div>
                <div>│   ├── Uvicorn (FastAPI WebApp) : 8000</div>
                <div>│   ├── Aiogram Polling (getUpdates) ⚠️</div>
                <div>│   └── APScheduler (Ежеминутный радар) ⚠️</div>
                <div>└── Direct SQLAlchemy (Без pool_pre_ping) ⚠️</div>
              </div>
            </div>

            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>При рестарте Railway старый и новый контейнеры дерутся за Telegram getUpdates.</li>
              <li>Тяжелый AI-запрос к Gemini блокирует отдачу статики Mini App.</li>
              <li>Любой упавший job планировщика крашит весь процесс.</li>
            </ul>
          </div>

          {/* Optimized Architecture */}
          <div className="p-5 rounded-2xl bg-emerald-950/10 border border-emerald-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Рекомендуемая продакшен-схема
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Enterprise-Ready
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="text-emerald-400 font-bold">FastAPI + Telegram Webhook + Pool:</div>
              <div className="pl-3 border-l-2 border-slate-800 space-y-1">
                <div>├── POST /webhook/telegram (Мгновенная доставка)</div>
                <div>├── GET/POST /api/* (REST API для Mini App)</div>
                <div>├── PostgreSQL Pool (pool_pre_ping + recycle=1800)</div>
                <div>└── Background Tasks (APScheduler / Celery)</div>
              </div>
            </div>

            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Ноль конфликтов Long Polling при zero-downtime перезапусках Railway.</li>
              <li>Мгновенная реакция бота на кнопки благодаря Webhook.</li>
              <li>Автоматическое восстановление разорванных TCP-сессий с базой данных.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5 Structural Flaws Breakdown */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>Детализация 5 ключевых системных проблем</span>
        </h3>

        <div className="space-y-3">
          {ARCHITECTURE_FLAWS.map((flaw, idx) => (
            <div key={flaw.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-100">{flaw.title}</h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {flaw.category}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <strong className="text-slate-300 block mb-1">Проблема в коде:</strong>
                  <p className="text-slate-400 leading-relaxed">{flaw.issue}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/15 border border-rose-900/30">
                  <strong className="text-rose-300 block mb-1">Последствия на Railway:</strong>
                  <p className="text-rose-200/90 leading-relaxed">{flaw.railwayImpact}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-900/30">
                  <strong className="text-emerald-300 block mb-1">Решение & Оптимизация:</strong>
                  <p className="text-emerald-200/90 leading-relaxed">{flaw.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Railway Deployment Step-by-Step Guide */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-400" />
          <span>Пошаговое руководство по стабильному деплою на Railway.com</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 text-sm block">Шаг 1: Настройка Root Directory</span>
            <p className="text-slate-400 leading-relaxed">
              В панели управления Railway откройте <code className="text-emerald-300 font-mono">Settings &rarr; Service &rarr; Root Directory</code> и укажите:
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-emerald-400 text-xs border border-slate-800">
              smokefree_bot
            </div>
            <p className="text-slate-400 text-[11px]">
              Это заставит Railway искать requirements.txt и main.py в нужной папке вместо корневых node-файлов.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 text-sm block">Шаг 2: Переменные окружения (.env)</span>
            <p className="text-slate-400 leading-relaxed">
              Добавьте в Railway Variables обязательные ключи:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-300">
              <li><span className="text-amber-400">BOT_TOKEN</span>=секрет_бота</li>
              <li><span className="text-amber-400">DATABASE_DSN</span>=${`{Postgres.DATABASE_URL}`}</li>
              <li><span className="text-amber-400">GEMINI_API_KEY</span>=ключ_google_genai</li>
              <li><span className="text-amber-400">WEBAPP_URL</span>=https://${`{RAILWAY_STATIC_URL}`}</li>
              <li><span className="text-amber-400">TIMEZONE</span>=Asia/Almaty</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 text-sm block">Шаг 3: Healthcheck и Restart Policy</span>
            <p className="text-slate-400 leading-relaxed">
              Настройте проверку работоспособности в Railway:
            </p>
            <ul className="space-y-1 text-slate-300">
              <li>• Healthcheck Path: <code className="text-emerald-300 font-mono">/health</code></li>
              <li>• Timeout: 30 секунд</li>
              <li>• Restart Policy: On failure (max 5 retries)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400 text-sm block">Шаг 4: Меню Telegram Mini App</span>
            <p className="text-slate-400 leading-relaxed">
              В @BotFather выполните команду <code className="text-sky-300 font-mono">/setmenubutton</code> и укажите публичный URL Railway:
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-sky-400 text-xs border border-slate-800">
              https://your-app.up.railway.app
            </div>
            <p className="text-slate-400 text-[11px]">
              Кнопка Mini App появится в левом нижнем углу диалога с ботом у каждого пользователя.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
