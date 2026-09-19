import React, { useState } from 'react';
import {
  ShieldAlert,
  Check,
  RotateCcw,
  Clock,
  Coins,
  HeartPulse,
  Radar,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Share2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import {
  UserProfile,
  FreedomStats,
  TriggerItem,
  CravingRecord,
  RelapseRecord,
  ChatMessage,
} from '../types';
import { WHO_HEALTH_MILESTONES } from '../data/auditReport';

interface CompanionViewProps {
  profile: UserProfile;
  stats: FreedomStats;
  triggers: TriggerItem[];
  cravings: CravingRecord[];
  relapses: RelapseRecord[];
  onOpenSos: () => void;
  onOpenRelapse: () => void;
  onOpenSettings: () => void;
  onLogResisted: () => void;
  onToggleTrigger: (id: string) => void;
  onAddTrigger: (time: string, label: string) => void;
  onDeleteTrigger: (id: string) => void;
  isMobilePreview: boolean;
}

export const CompanionView: React.FC<CompanionViewProps> = ({
  profile,
  stats,
  triggers,
  cravings,
  relapses,
  onOpenSos,
  onOpenRelapse,
  onOpenSettings,
  onLogResisted,
  onToggleTrigger,
  onAddTrigger,
  onDeleteTrigger,
  isMobilePreview,
}) => {
  const [subTab, setSubTab] = useState<'health' | 'radar' | 'coach' | 'diary'>('health');
  const [newTriggerTime, setNewTriggerTime] = useState('18:30');
  const [newTriggerLabel, setNewTriggerLabel] = useState('');

  // AI Coach state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'coach',
      text: `Привет, ${profile.name}! Ты держишь чистоту уже ${stats.days} дн. ${stats.hours} ч. Твой мозг прямо сейчас освобождается от никотиновой ловушки. Если возникнет тяга — жми кнопку SOS или напиши мне сюда в любой момент.`,
      timestamp: 'Только что',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);

  // Send message to AI Coach
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isCoachTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsCoachTyping(true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          daysFree: stats.days,
          trigger: profile.nicotineType,
        }),
      });
      const data = await response.json();
      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.reply || 'Дыши спокойно. Ты сильнее этой привычки.',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, coachMsg]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          sender: 'coach',
          text: 'Сделай 4 медленных цикла дыхания 4-4. Пик тяги длится всего 180 секунд и уже идет на спад.',
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCoachTyping(false);
    }
  };

  // Add trigger handler
  const handleCreateTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerLabel.trim()) return;
    onAddTrigger(newTriggerTime, newTriggerLabel.trim());
    setNewTriggerLabel('');
  };

  // Generate and download story card
  const handleDownloadStory = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#022c22');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative glow
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(540, 700, 400, 0, Math.PI * 2);
    ctx.fill();

    // App header
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('SMOKEFREE COMPANION · ТРЕК СВОБОДЫ', 100, 180);

    // Main big number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 240px sans-serif';
    ctx.fillText(String(stats.days), 100, 640);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '700 64px sans-serif';
    ctx.fillText('ДНЕЙ БЕЗ НИКОТИНА', 105, 740);

    // Detail lines
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 44px sans-serif';
    ctx.fillText(`🟢 Точное время: ${stats.days} дн. ${stats.hours} ч. ${stats.minutes} мин.`, 105, 960);
    ctx.fillText(
      `💰 Сэкономлено: ${Math.round(stats.moneySaved).toLocaleString('ru-RU')} ${profile.currencySymbol}`,
      105,
      1050
    );
    ctx.fillText(`⏱ Возвращено жизни: ${Math.round(stats.minutesLifeReturned).toLocaleString('ru-RU')} мин.`, 105, 1140);
    ctx.fillText(`🚭 Не выкурено: ~${Math.round(stats.cigarettesAvoided)} шт.`, 105, 1230);
    ctx.fillText(`🧭 Чистота трека: ${stats.cleanTrackPercent.toFixed(1)}%`, 105, 1320);

    // Footer note
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 32px sans-serif';
    ctx.fillText('Сформировано персональным трекером SmokeFree', 105, 1780);

    const link = document.createElement('a');
    link.download = `smokefree-track-${stats.days}days.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const containerClass = isMobilePreview
    ? 'max-w-sm mx-auto border-[8px] border-slate-800 rounded-[44px] shadow-2xl overflow-hidden bg-slate-950 my-4'
    : 'max-w-5xl mx-auto py-6 px-4 sm:px-6';

  return (
    <div className={containerClass}>
      {/* Mobile Frame Top Notch (only if mobile preview) */}
      {isMobilePreview && (
        <div className="bg-slate-900 px-6 py-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800">
          <span>9:41</span>
          <div className="w-20 h-4 bg-slate-950 rounded-full"></div>
          <span>100% 🔋</span>
        </div>
      )}

      {/* Hero Card: Live Freedom HUD */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-xl shadow-emerald-950/10 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/70">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                В ПРОЦЕССЕ СВОБОДЫ
              </span>
              <span className="text-xs text-slate-400">&bull; {profile.nicotineType}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {profile.name}, твой чистый трек
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Старт:{' '}
                {new Date(profile.quitAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                в{' '}
                {new Date(profile.quitAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>

          {/* Clean track circular score */}
          <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2.5 rounded-2xl border border-slate-800">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (125.6 * Math.min(100, stats.cleanTrackPercent)) / 100}
                  strokeLinecap="round"
                  className="text-emerald-400 transition-all duration-1000"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-slate-100">
                {Math.round(stats.cleanTrackPercent)}%
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Чистота трека</span>
              <span className="text-[11px] text-slate-400">
                {stats.relapseCount === 0 ? 'Без срывов' : `${stats.relapseCount} срыв(ов)`}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time ticker: Days : Hours : Minutes : Seconds */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 my-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 text-center">
            <span className="text-2xl sm:text-4xl font-black font-mono text-emerald-400 block tracking-tight">
              {stats.days}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase text-slate-400 tracking-wider mt-1 block">
              Дней
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 text-center">
            <span className="text-2xl sm:text-4xl font-black font-mono text-emerald-300 block tracking-tight">
              {String(stats.hours).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase text-slate-400 tracking-wider mt-1 block">
              Часов
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 text-center">
            <span className="text-2xl sm:text-4xl font-black font-mono text-teal-300 block tracking-tight">
              {String(stats.minutes).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase text-slate-400 tracking-wider mt-1 block">
              Минут
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 text-center">
            <span className="text-2xl sm:text-4xl font-black font-mono text-amber-400 block tracking-tight animate-pulse">
              {String(stats.seconds).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase text-slate-400 tracking-wider mt-1 block">
              Секунд
            </span>
          </div>
        </div>

        {/* 4 Action Buttons (Human Adapted) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <button
            id="companion-sos-btn"
            onClick={onOpenSos}
            className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 flex flex-col items-center text-center transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center mb-1 text-rose-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <strong className="text-xs font-bold text-slate-100">SOS 3 Минуты</strong>
            <span className="text-[10px] text-rose-300/80">Острая тяга</span>
          </button>

          <button
            id="companion-resisted-btn"
            onClick={onLogResisted}
            className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex flex-col items-center text-center transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-1 text-emerald-400 group-hover:scale-110 transition-transform">
              <Check className="w-4 h-4" />
            </div>
            <strong className="text-xs font-bold text-slate-100">Я справился</strong>
            <span className="text-[10px] text-emerald-300/80">Победа (+1)</span>
          </button>

          <button
            id="companion-relapse-btn"
            onClick={onOpenRelapse}
            className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex flex-col items-center text-center transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center mb-1 text-amber-400 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
            <strong className="text-xs font-bold text-slate-100">Я оступился</strong>
            <span className="text-[10px] text-amber-300/80">Без обнуления</span>
          </button>

          <button
            id="companion-time-btn"
            onClick={onOpenSettings}
            className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex flex-col items-center text-center transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-700/60 flex items-center justify-center mb-1 text-slate-300 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <strong className="text-xs font-bold text-slate-100">Изменить время</strong>
            <span className="text-[10px] text-slate-400">Точка старта</span>
          </button>
        </div>
      </section>

      {/* Metrics Row: Money Saved, Life Minutes, Cigarettes avoided */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Сэкономлено денег
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {Math.round(stats.moneySaved).toLocaleString('ru-RU')} {profile.currencySymbol}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              В день остаётся:{' '}
              <span className="text-slate-200 font-medium">
                {Math.round(stats.dailyExpense).toLocaleString('ru-RU')} {profile.currencySymbol}
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Возвращено жизни
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-400">
              {Math.round(stats.minutesLifeReturned).toLocaleString('ru-RU')}
            </span>
            <span className="text-xs text-sky-400/80 ml-1">минут</span>
            <p className="text-[11px] text-slate-400 mt-1">
              ~{(stats.minutesLifeReturned / 60).toFixed(1)} часов чистого времени
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Не попало в легкие
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              ~{Math.round(stats.cigarettesAvoided).toLocaleString('ru-RU')}
            </span>
            <span className="text-xs text-amber-400/80 ml-1">штук/стиков</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Преодолено тяг:{' '}
              <span className="text-emerald-400 font-semibold">{stats.cravingsResistedCount}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Secondary Feature Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 mb-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setSubTab('health')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'health'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Здоровье (ВОЗ)</span>
          </button>

          <button
            onClick={() => setSubTab('radar')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'radar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Триггер-радар</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {triggers.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('coach')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'coach'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI-Коуч (КПТ)</span>
          </button>

          <button
            onClick={() => setSubTab('diary')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'diary'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Дневник & История</span>
          </button>
        </div>

        <button
          onClick={handleDownloadStory}
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 transition-colors"
          title="Сгенерировать Stories-карточку для Instagram/Telegram"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Stories-карточка</span>
        </button>
      </div>

      {/* Subtab 1: WHO Health Milestones */}
      {subTab === 'health' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
            <span>Таймлайн восстановления организма по медицинским стандартам ВОЗ:</span>
            <span className="text-emerald-400 font-semibold">
              {WHO_HEALTH_MILESTONES.filter((m) => stats.totalSeconds >= m.secondsRequired).length} из{' '}
              {WHO_HEALTH_MILESTONES.length} этапов пройдено
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WHO_HEALTH_MILESTONES.map((item) => {
              const isAchieved = stats.totalSeconds >= item.secondsRequired;
              const progressPct = Math.min(100, Math.round((stats.totalSeconds / item.secondsRequired) * 100));

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isAchieved
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                      : 'bg-slate-900/70 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {isAchieved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0"></div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.category}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        isAchieved
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.timeframe}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">{item.description}</p>

                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isAchieved ? 'bg-emerald-400' : 'bg-slate-700'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{item.scientificReference}</span>
                    <span className="font-mono">{isAchieved ? '100%' : `${progressPct}%`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 2: Trigger Radar */}
      {subTab === 'radar' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-3">
            <Radar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-100 block mb-1">Принцип работы триггер-радара за 15 минут:</strong>
              <p className="text-slate-400 leading-relaxed">
                Автоматическая привычка побеждается предупреждением. Радар присылает сообщение ровно за 15 минут до вашей
                критической точки (утренний кофе, обеденный перерыв, вечерняя пробка), позволяя заранее выпить воды и
                сменить паттерн поведения.
              </p>
            </div>
          </div>

          {/* Add Trigger Form */}
          <form onSubmit={handleCreateTrigger} className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-3">
            <div className="sm:w-32">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Время</label>
              <input
                type="time"
                value={newTriggerTime}
                onChange={(e) => setNewTriggerTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Описание опасной точки</label>
              <input
                type="text"
                placeholder="Например: кофе перед работой или пробки на Сарыарка"
                value={newTriggerLabel}
                onChange={(e) => setNewTriggerLabel(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                required
              />
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
            </div>
          </form>

          {/* Trigger List */}
          <div className="space-y-2">
            {triggers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                Нет сохраненных точек радара. Добавьте ваши привычные часы курения выше.
              </div>
            ) : (
              triggers.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleTrigger(item.id)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                        item.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      title={item.enabled ? 'Включено' : 'Выключено'}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          item.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-emerald-400">{item.time}</span>
                        <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Оповещение придет в {getNotificationTime(item.time)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteTrigger(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg"
                    title="Удалить точку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: AI Coach Chat */}
      {subTab === 'coach' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[480px]">
          {/* Coach Chat Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">ИИ-Наставник: Книги, Кино, Форумы & КПТ</h4>
                <p className="text-[10px] text-slate-400">Карр, Брюер, Губерман, кино-расследования и опыт сообществ</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Онлайн
            </span>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleSendMessage('У меня сейчас сильная тяга, помоги продержаться эти 3 минуты!')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 shrink-0 transition-colors"
            >
              🚨 Острая тяга
            </button>
            <button
              onClick={() => handleSendMessage('Как Аллен Карр объясняет концепцию Маленького чудовища и почему сигарета не снимает стресс?')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shrink-0 transition-colors"
            >
              📖 Метод Карра
            </button>
            <button
              onClick={() => handleSendMessage('Как в фильмах «Здесь курят» и «Свой человек» раскрываются обман и химические манипуляции табачников?')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0 transition-colors"
            >
              🎬 Правда из кино
            </button>
            <button
              onClick={() => handleSendMessage('Что сейчас происходит с моими дофаминовыми рецепторами по Huberman Lab и почему мир кажется пресным?')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shrink-0 transition-colors"
            >
              🧠 Мозг и дофамин
            </button>
            <button
              onClick={() => handleSendMessage('Почему на форумах категорически запрещают правило «всего одной затяжки»?')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0 transition-colors"
            >
              💬 Ловушка «одной сигареты»
            </button>
            <button
              onClick={() => handleSendMessage('Я выпил кофе, рука автоматически потянулась к сигарете. Как перепрошить этот триггер?')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 shrink-0 transition-colors"
            >
              ☕️ Кофе и триггер
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {isCoachTyping && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-2xl p-2.5 w-24">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
          </div>

          {/* Message Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Напишите, что вы чувствуете или о чем думаете..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isCoachTyping}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-colors shrink-0 font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Subtab 4: Diary & History */}
      {subTab === 'diary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Resisted Cravings Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Преодолённые тяги</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {cravings.length} побед
                </span>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {cravings.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">Пока нет записей. Нажмите «Я справился», когда пройдет волна.</p>
                ) : (
                  cravings.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200 block">{item.trigger}</span>
                        <span className="text-[10px] text-slate-400">Интенсивность: {item.intensity}/10</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Relapses Log without shame */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Журнал срывов (No-Shame)</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {relapses.length} эпизода
                </span>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {relapses.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">Ни одного срыва не зафиксировано. Чистый трек!</p>
                ) : (
                  relapses.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-amber-300 font-semibold">{item.trigger} ({item.cigarettes} шт.)</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic mb-1">«{item.reflection}»</p>
                      <p className="text-[10px] text-emerald-400">План: {item.plan}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getNotificationTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m - 15;
  if (total < 0) total += 24 * 60;
  const targetH = Math.floor(total / 60);
  const targetM = total % 60;
  return `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
}
