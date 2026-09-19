import React, { useState, useMemo } from 'react';
import {
  Heart,
  Wind,
  Brain,
  Sparkles,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  ChevronRight,
  BookOpen,
  Zap,
  Activity,
  Award,
  Filter,
} from 'lucide-react';
import { FreedomStats, HealthMilestone } from '../types';
import { WHO_HEALTH_MILESTONES } from '../data/auditReport';

interface HealthTimelineViewProps {
  stats: FreedomStats;
}

export const HealthTimelineView: React.FC<HealthTimelineViewProps> = ({ stats }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'in-progress' | 'locked'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Все системы', icon: Activity, count: WHO_HEALTH_MILESTONES.length },
    { id: 'Сердечно-сосудистая', label: 'Сердце и сосуды', icon: Heart },
    { id: 'Дыхательная', label: 'Легкие и дыхание', icon: Wind },
    { id: 'Нейробиология', label: 'Мозг и дофамин', icon: Brain },
    { id: 'Внешность и метаболизм', label: 'Внешность и энергия', icon: Sparkles },
    { id: 'Долголетие и онкозащита', label: 'Онкозащита и жизнь', icon: ShieldAlert },
  ];

  // Calculate milestones progress
  const enrichedMilestones = useMemo(() => {
    return WHO_HEALTH_MILESTONES.map((m) => {
      const isPassed = stats.totalSeconds >= m.secondsRequired;
      const progressPercent = isPassed
        ? 100
        : Math.min(100, Math.max(0, Math.round((stats.totalSeconds / m.secondsRequired) * 100)));
      
      const secondsLeft = Math.max(0, m.secondsRequired - stats.totalSeconds);
      let status: 'unlocked' | 'in-progress' | 'locked' = 'locked';
      if (isPassed) {
        status = 'unlocked';
      } else if (progressPercent > 0) {
        status = 'in-progress';
      }

      return {
        ...m,
        isPassed,
        progressPercent,
        secondsLeft,
        status,
      };
    });
  }, [stats.totalSeconds]);

  const unlockedCount = enrichedMilestones.filter((m) => m.isPassed).length;
  const overallHealthScore = Math.round(
    (enrichedMilestones.reduce((acc, curr) => acc + curr.progressPercent, 0) / (enrichedMilestones.length * 100)) * 100
  );

  // Find next closest milestone
  const nextMilestone = enrichedMilestones.find((m) => !m.isPassed);

  const formatRemainingTime = (secs: number) => {
    if (secs <= 0) return 'Пройдено!';
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);

    if (days > 365) {
      const years = (days / 365).toFixed(1);
      return `~ ${years} г.`;
    }
    if (days > 30) {
      const months = (days / 30).toFixed(1);
      return `~ ${months} мес.`;
    }
    if (days > 0) {
      return `${days} дн. ${hours} ч.`;
    }
    if (hours > 0) {
      return `${hours} ч. ${minutes} мин.`;
    }
    return `${minutes} мин.`;
  };

  // Filtered list
  const filteredMilestones = useMemo(() => {
    return enrichedMilestones.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.benefit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.cellularEffect && m.cellularEffect.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.timeframe.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unlocked' && m.status === 'unlocked') ||
        (statusFilter === 'in-progress' && m.status === 'in-progress') ||
        (statusFilter === 'locked' && m.status === 'locked');

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [enrichedMilestones, searchQuery, selectedCategory, statusFilter]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Сердечно-сосудистая':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Дыхательная':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Нейробиология':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Внешность и метаболизм':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Долголетие и онкозащита':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Status */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Доказательная медицина &bull; ВОЗ, AHA, CDC
              </span>
              <span className="text-xs text-slate-400">32 этапа регенерации</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {unlockedCount} из {WHO_HEALTH_MILESTONES.length} разблокировано
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">
              Биохимическая карта восстановления организма
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              От первых 20 минут нормализации пульса до 20-летнего полного равенства с человеком, никогда не курящим.
              Каждая минута чистоты запускает клеточный ремонт.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Совокупный индекс регенерации систем:</span>
              <span className="text-emerald-400 font-mono font-bold">{overallHealthScore}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-all duration-700"
                style={{ width: `${Math.max(3, overallHealthScore)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Goal Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 animate-spin-slow" />
              Ближайший рубеж здоровья
            </span>
            {nextMilestone ? (
              <div className="mt-2 space-y-1">
                <h4 className="text-sm font-bold text-slate-100 line-clamp-2">{nextMilestone.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-emerald-400 font-bold">{nextMilestone.timeframe}</span>
                  <span>&bull;</span>
                  <span className="text-amber-300 font-mono">
                    Осталось: {formatRemainingTime(nextMilestone.secondsLeft)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-emerald-400 font-bold">
                🎉 Поздравляем! Все этапы ВОЗ успешно достигнуты!
              </div>
            )}
          </div>

          {nextMilestone && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Прогресс этапа</span>
                <span className="text-slate-200">{nextMilestone.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${nextMilestone.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск этапа (дофамин, легкие, CO...)"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все ({enrichedMilestones.length})
            </button>
            <button
              onClick={() => setStatusFilter('unlocked')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'unlocked'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Пройденные ({unlockedCount})
            </button>
            <button
              onClick={() => setStatusFilter('in-progress')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'in-progress'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              В процессе
            </button>
            <button
              onClick={() => setStatusFilter('locked')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'locked'
                  ? 'bg-slate-800 text-slate-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              Предстоящие
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Milestones Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMilestones.map((m, idx) => {
          const isExpanded = expandedId === m.id;
          const badgeStyle = getCategoryColor(m.category);

          return (
            <div
              key={m.id}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                m.isPassed
                  ? 'bg-slate-900 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                  : m.status === 'in-progress'
                  ? 'bg-slate-900/95 border-amber-500/40 hover:border-amber-500/70 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/60 border-slate-800/80 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="p-5 space-y-3">
                {/* Header row: time & status */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                    {m.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {m.isPassed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Пройдено
                      </span>
                    ) : m.status === 'in-progress' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        {m.progressPercent}% ({formatRemainingTime(m.secondsLeft)})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        <Lock className="w-3 h-3" />
                        Через {formatRemainingTime(m.secondsLeft)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title and timeframe */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-slate-100">{m.title}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold block mt-0.5">
                    Срок: {m.timeframe}
                  </span>
                </div>

                {/* Description & Benefit */}
                <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span>Главный профит для тела:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{m.benefit}</p>
                </div>

                {/* Progress bar if in progress */}
                {!m.isPassed && (
                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                      style={{ width: `${m.progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Toggle details */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    {isExpanded ? 'Скрыть клеточный механизм' : 'Клеточный механизм и советы врачей'}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Expanded Biological Insights */}
                {isExpanded && (
                  <div className="space-y-3 pt-2 text-xs border-t border-slate-800/80 animate-in fade-in">
                    {m.cellularEffect && (
                      <div className="p-3 rounded-xl bg-purple-950/15 border border-purple-900/30 space-y-1">
                        <strong className="text-purple-300 block font-bold">🔬 Что происходит на уровне клеток:</strong>
                        <p className="text-purple-200/90 leading-relaxed">{m.cellularEffect}</p>
                      </div>
                    )}

                    {m.whatYouFeel && (
                      <div className="p-3 rounded-xl bg-sky-950/15 border border-sky-900/30 space-y-1">
                        <strong className="text-sky-300 block font-bold">🧠 Что вы физически ощущаете:</strong>
                        <p className="text-sky-200/90 leading-relaxed">{m.whatYouFeel}</p>
                      </div>
                    )}

                    {m.practicalTip && (
                      <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-900/30 space-y-1">
                        <strong className="text-emerald-300 block font-bold">💡 Практический совет нарколога/пульмонолога:</strong>
                        <p className="text-emerald-200/90 leading-relaxed">{m.practicalTip}</p>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-mono text-right">
                      Источник: {m.scientificReference}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMilestones.length === 0 && (
        <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">Ничего не найдено</h4>
          <p className="text-xs text-slate-500">Попробуйте изменить поисковый запрос или фильтры</p>
        </div>
      )}
    </div>
  );
};
