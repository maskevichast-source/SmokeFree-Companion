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
  ChevronDown,
  BookOpen,
  Zap,
  Activity,
  Award,
  Filter,
  Layers,
  BarChart3,
  Flame,
  Info,
  Medal,
  Trophy,
  Coins,
  Compass,
} from 'lucide-react';
import { FreedomStats, HealthMilestone, UserProfile } from '../types';
import { WHO_HEALTH_MILESTONES } from '../data/auditReport';
import { calculatePhysiologicalPhases } from '../data/recoveryPhases';
import { calculateUserBadges } from '../data/badges';
import { BadgeCard } from './BadgeCard';

interface HealthTimelineViewProps {
  stats: FreedomStats;
  profile?: UserProfile;
}

export const HealthTimelineView: React.FC<HealthTimelineViewProps> = ({ stats, profile }) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'phases' | 'milestones'>('badges');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'in-progress' | 'locked'>('all');
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<string>('all');
  const [badgeStatusFilter, setBadgeStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>('phase-1');

  // Compute live user badges
  const userBadges = useMemo(() => {
    return calculateUserBadges(stats, profile);
  }, [stats, profile]);

  const unlockedBadgesCount = userBadges.filter((b) => b.isUnlocked).length;
  const totalBadgePoints = userBadges
    .filter((b) => b.isUnlocked)
    .reduce((acc, curr) => acc + curr.points, 0);
  const maxBadgePoints = userBadges.reduce((acc, curr) => acc + curr.points, 0);

  // Compute physiological recovery phases
  const recoveryPhases = useMemo(() => {
    return calculatePhysiologicalPhases(stats.totalSeconds);
  }, [stats.totalSeconds]);

  const categories = [
    { id: 'all', label: 'Все системы', icon: Activity, count: WHO_HEALTH_MILESTONES.length },
    { id: 'Сердечно-сосудистая', label: 'Сердце и сосуды', icon: Heart },
    { id: 'Дыхательная', label: 'Легкие и дыхание', icon: Wind },
    { id: 'Нейробиология', label: 'Мозг и дофамин', icon: Brain },
    { id: 'Внешность и метаболизм', label: 'Внешность и энергия', icon: Sparkles },
    { id: 'Долголетие и онкозащита', label: 'Онкозащита и жизнь', icon: ShieldAlert },
  ];

  const badgeCategories = [
    { id: 'all', label: 'Все награды', icon: Trophy, count: userBadges.length },
    { id: 'streak', label: 'Серии чистоты', icon: Flame },
    { id: 'money', label: 'Финансовые рубежи', icon: Coins },
    { id: 'endurance', label: 'Выносливость', icon: ShieldAlert },
    { id: 'willpower', label: 'Победы над тягой', icon: Zap },
    { id: 'cellular', label: 'Биомаркеры и клетки', icon: Sparkles },
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

  // Filtered badges
  const filteredBadges = useMemo(() => {
    return userBadges.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.requirement.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = badgeCategoryFilter === 'all' || b.category === badgeCategoryFilter;
      const matchesStatus =
        badgeStatusFilter === 'all' ||
        (badgeStatusFilter === 'unlocked' && b.isUnlocked) ||
        (badgeStatusFilter === 'locked' && !b.isUnlocked);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [userBadges, searchQuery, badgeCategoryFilter, badgeStatusFilter]);

  // Filtered milestones list
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
        {/* Main Status & XP Counter */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Доказательная медицина &bull; ВОЗ, AHA, CDC
              </span>
              <span className="text-xs text-slate-400">Награды &bull; 5 фаз &bull; 32 этапа</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {totalBadgePoints} / {maxBadgePoints} XP
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {unlockedBadgesCount}/{userBadges.length} Бейджей
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">
              Система наград и физиологическая карта регенерации
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Зарабатывай интерактивные 3D-бейджи за чистые серии, финансовые рубежи ($100 Milestone, 7 Days Clean)
              и победы над тягой. Следи за биомаркерами O₂, CO и емкостью легких.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Совокупный прогресс регенерации организма:</span>
              <span className="text-emerald-400 font-mono font-bold">{overallHealthScore}%</span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
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

      {/* Main View Switcher: 3 Tabs (Badges with 3D flip, 5 Phases breakdown, All 32 Milestones) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Коллекция 3D-бейджей</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 font-mono">
            {unlockedBadgesCount}/{userBadges.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('phases')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'phases'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>5 физиологических фаз</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 font-mono">
            {recoveryPhases.filter((p) => p.status === 'completed').length}/5
          </span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'milestones'
              ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-400/10'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Каталог 32 вех ВОЗ</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 font-mono">
            {unlockedCount}/{WHO_HEALTH_MILESTONES.length}
          </span>
        </button>
      </div>

      {/* Tab 0: BADGES SYSTEM WITH 3D CSS FLIP CARDS */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Badge Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск бейджа ('7 Days Clean', '$100', 'Endurance')..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium w-full md:w-auto overflow-x-auto">
                <button
                  onClick={() => setBadgeStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    badgeStatusFilter === 'all'
                      ? 'bg-slate-800 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Все ({userBadges.length})
                </button>
                <button
                  onClick={() => setBadgeStatusFilter('unlocked')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                    badgeStatusFilter === 'unlocked'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  Разблокированные ({unlockedBadgesCount})
                </button>
                <button
                  onClick={() => setBadgeStatusFilter('locked')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                    badgeStatusFilter === 'locked'
                      ? 'bg-slate-800 text-slate-200 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  В процессе ({userBadges.length - unlockedBadgesCount})
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {badgeCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = badgeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setBadgeCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm'
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

          {/* Interactive 3D Flip Badge Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Награды не найдены</h4>
              <p className="text-xs text-slate-500">Попробуйте изменить поисковый запрос или фильтры категорий</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: 5 Detailed Physiological Phases with Granular Indicators & Progress Bars */}
      {activeTab === 'phases' && (
        <div className="space-y-6">
          {/* Phase cards accordion / detailed breakdown */}
          <div className="space-y-4">
            {recoveryPhases.map((phase) => {
              const isExpanded = expandedPhaseId === phase.id;
              const isCurrent = phase.status === 'in-progress';
              const isDone = phase.status === 'completed';

              return (
                <div
                  key={phase.id}
                  className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isDone
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : isCurrent
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-amber-500/50 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/20'
                      : 'bg-slate-900/50 border-slate-800/80 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Phase Header */}
                  <div
                    onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                    className="p-5 sm:p-6 cursor-pointer select-none space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isCurrent
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {isDone ? '✓' : phase.phaseNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              Фаза {phase.phaseNumber} &bull; {phase.durationRange}
                            </span>
                            {isDone && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Завершена ✓
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Flame className="w-3 h-3 animate-bounce" />
                                Активная фаза
                              </span>
                            )}
                            {phase.status === 'upcoming' && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                🔒 Предстоит
                              </span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
                            {phase.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Прогресс фазы</span>
                          <span
                            className={`text-sm font-mono font-black ${
                              isDone ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            {phase.progressPercent}%
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded-xl bg-slate-800/80 text-slate-300 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Phase Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDone
                              ? 'bg-emerald-500'
                              : isCurrent
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                              : 'bg-slate-800'
                          }`}
                          style={{ width: `${phase.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>

                  {/* Expanded Phase Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-slate-800/80 space-y-5 animate-in fade-in">
                      {/* Granular Physiological Indicators */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          Ключевые физиологические биомаркеры фазы:
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {phase.indicators.map((ind) => (
                            <div
                              key={ind.id}
                              className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                                    {ind.icon}
                                  </span>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-100">{ind.name}</h5>
                                    <span className="text-[10px] text-slate-400">
                                      Цель: {ind.targetValue}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    {ind.currentValue}
                                  </span>
                                  <span className="text-[10px] block text-slate-500 font-mono">
                                    {ind.progressPercent}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800/80">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 transition-all duration-500"
                                  style={{ width: `${ind.progressPercent}%` }}
                                />
                              </div>

                              <p className="text-[11px] text-slate-300 leading-snug">
                                {ind.description}
                              </p>

                              <div className="pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-[10px] text-slate-400">
                                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                <span className="italic">{ind.medicalInsight}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Structural Changes Checklist */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Клинические результаты этапа:
                        </h4>
                        <ul className="space-y-1.5">
                          {phase.keyChanges.map((change, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
                            >
                              <span className="text-emerald-400 font-bold shrink-0">&bull;</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Milestones inside this phase */}
                      {phase.milestones.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Вехи ВОЗ в рамках этой фазы ({phase.milestones.length}):
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {phase.milestones.map((m) => {
                              const isPassed = stats.totalSeconds >= m.secondsRequired;
                              return (
                                <div
                                  key={m.id}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                    isPassed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-100'
                                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <span className="font-semibold block truncate text-slate-200">
                                      {m.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {m.timeframe}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                      isPassed
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isPassed ? '✓ Пройдено' : '🔒 Ожидается'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Full Catalog of 32 WHO Milestones with Search, Filters & Expanded Details */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
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
                  placeholder="Поиск вехи (кислород, альвеолы, пульс...)"
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
            {filteredMilestones.map((m) => {
              const isExpanded = expandedMilestoneId === m.id;
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
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
                      >
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
                      onClick={() =>
                        setExpandedMilestoneId(isExpanded ? null : m.id)
                      }
                      className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                        {isExpanded ? 'Скрыть клеточный механизм' : 'Клеточный механизм и советы врачей'}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* Expanded Biological Insights */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 text-xs border-t border-slate-800/80 animate-in fade-in">
                        {m.cellularEffect && (
                          <div className="p-3 rounded-xl bg-purple-950/15 border border-purple-900/30 space-y-1">
                            <strong className="text-purple-300 block font-bold">
                              🔬 Что происходит на уровне клеток:
                            </strong>
                            <p className="text-purple-200/90 leading-relaxed">{m.cellularEffect}</p>
                          </div>
                        )}

                        {m.whatYouFeel && (
                          <div className="p-3 rounded-xl bg-sky-950/15 border border-sky-900/30 space-y-1">
                            <strong className="text-sky-300 block font-bold">
                              🧠 Что вы физически ощущаете:
                            </strong>
                            <p className="text-sky-200/90 leading-relaxed">{m.whatYouFeel}</p>
                          </div>
                        )}

                        {m.practicalTip && (
                          <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-900/30 space-y-1">
                            <strong className="text-emerald-300 block font-bold">
                              💡 Практический совет нарколога/пульмонолога:
                            </strong>
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
      )}
    </div>
  );
};
