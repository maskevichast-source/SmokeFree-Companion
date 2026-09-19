import React, { useState } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  FileCode2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Flame,
  Info,
  Layers,
} from 'lucide-react';
import { AUDIT_BUGS } from '../data/auditReport';
import { AuditBug } from '../types';

export const AuditView: React.FC = () => {
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [expandedBugId, setExpandedBugId] = useState<string | null>('bug-1');

  const filteredBugs = AUDIT_BUGS.filter((b) =>
    selectedSeverity === 'ALL' ? true : b.severity === selectedSeverity
  );

  const criticalCount = AUDIT_BUGS.filter((b) => b.severity === 'CRITICAL').length;
  const highCount = AUDIT_BUGS.filter((b) => b.severity === 'HIGH').length;
  const mediumCount = AUDIT_BUGS.filter((b) => b.severity === 'MEDIUM').length;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Executive Summary Card */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Глубокий Технический Аудит
              </span>
              <span className="text-xs text-slate-400">Репозиторий: maskevichast-source/SmokeFree-Companion</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">
              Результаты аудита кодовой базы и баг-трекинг
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Проанализирована полная структура проекта: асинхронный Telegram-бот на <code className="text-emerald-400 font-mono">aiogram 3.17</code>,
              веб-сервер <code className="text-emerald-400 font-mono">FastAPI</code>, база данных <code className="text-emerald-400 font-mono">SQLAlchemy + asyncpg</code>,
              планировщик <code className="text-emerald-400 font-mono">APScheduler</code> и интеграция с <code className="text-emerald-400 font-mono">Gemini 2.5 Flash</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-center px-3 border-r border-slate-800">
              <span className="text-xl font-black text-rose-400 font-mono block">{criticalCount}</span>
              <span className="text-[10px] font-semibold text-rose-400/80 uppercase">Критических</span>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <span className="text-xl font-black text-amber-400 font-mono block">{highCount}</span>
              <span className="text-[10px] font-semibold text-amber-400/80 uppercase">Высоких</span>
            </div>
            <div className="text-center px-3">
              <span className="text-xl font-black text-sky-400 font-mono block">{mediumCount}</span>
              <span className="text-[10px] font-semibold text-sky-400/80 uppercase">Средних</span>
            </div>
          </div>
        </div>

        {/* Highlight Banner on Root Deployment Traps */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="text-amber-200 font-semibold block mb-1">
              Главная ловушка деплоя на Railway (Корень репозитория):
            </strong>
            <p className="text-slate-300">
              В корневом каталоге репозитория находятся файлы Node.js шаблона Replit (<code className="text-amber-300 font-mono">package.json</code>, <code className="text-amber-300 font-mono">pnpm-lock.yaml</code>).
              При подключении GitHub к Railway Nixpacks автоматически пытается собрать проект как Node.js, тогда как весь рабочий Python-код находится во вложенной папке <code className="text-amber-300 font-mono">/smokefree_bot</code>.
              Без указания <code className="text-amber-300 font-mono">Root Directory</code> или специального <code className="text-amber-300 font-mono">railway.json</code> сборка падает с ошибкой.
            </p>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedSeverity === 'ALL'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Все ошибки ({AUDIT_BUGS.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedSeverity === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Критические ({criticalCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('HIGH')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedSeverity === 'HIGH'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Высокие ({highCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('MEDIUM')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedSeverity === 'MEDIUM'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                : 'text-slate-400 hover:text-sky-300'
            }`}
          >
            Средние ({mediumCount})
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          Нажмите на карточку ошибки для просмотра диффа кода
        </span>
      </div>

      {/* Bugs List */}
      <div className="space-y-3">
        {filteredBugs.map((bug) => {
          const isExpanded = expandedBugId === bug.id;

          const badgeColor =
            bug.severity === 'CRITICAL'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : bug.severity === 'HIGH'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

          return (
            <div
              key={bug.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-slate-900/90 border-slate-700 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Card Header (clickable) */}
              <button
                onClick={() => setExpandedBugId(isExpanded ? null : bug.id)}
                className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {bug.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {bug.location}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100">{bug.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{bug.description}</p>
                </div>

                <div className="p-1 rounded-lg bg-slate-800 text-slate-400 shrink-0 mt-1">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Card Body with Code Diff */}
              {isExpanded && (
                <div className="px-4 pb-5 sm:px-5 border-t border-slate-800/80 pt-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <strong className="text-rose-400 font-semibold block mb-1">Причина сбоя:</strong>
                      <p className="text-slate-300 leading-relaxed">{bug.cause}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <strong className="text-amber-400 font-semibold block mb-1">Влияние на Railway и пользователя:</strong>
                      <p className="text-slate-300 leading-relaxed">{bug.impact}</p>
                    </div>
                  </div>

                  {/* Side-by-side Code Comparison */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-rose-400 flex items-center gap-1">
                        <Bug className="w-3.5 h-3.5" />
                        Ошибочный код в репозитории:
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Исправленный стабильный код:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono text-[11px]">
                      {/* Buggy Code Box */}
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-200 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{bug.buggyCode}</pre>
                      </div>

                      {/* Fixed Code Box */}
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{bug.fixedCode}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
