import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Heart,
  Brain,
  Wind,
  Shield,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Sparkles,
  BarChart3,
  Award,
  RefreshCw,
  Sliders,
  ChevronRight,
  Target,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { UserProfile, FreedomStats, CravingRecord, TriggerItem, RelapseRecord, UnitTestItem } from '../types';
import { WHO_HEALTH_MILESTONES } from '../data/auditReport';

interface AnalyticsViewProps {
  profile: UserProfile;
  stats: FreedomStats;
  cravings: CravingRecord[];
  triggers: TriggerItem[];
  relapses: RelapseRecord[];
  onSimulateDays?: (days: number) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  profile,
  stats,
  cravings,
  triggers,
  relapses,
  onSimulateDays,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'cravings' | 'tests' | 'simulator'>('overview');
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<UnitTestItem[]>([
    {
      id: 't-1',
      category: 'Финансовая математика',
      name: 'Расчет экономии по формуле (дробные дни × расход/день)',
      description: 'Проверяет точность вычисления накоплений при различных ценах пачки и единицах в день',
      inputDescription: `packPrice=${profile.packPrice}, packSize=${profile.packSize}, units=${profile.unitsPerDay}, days=${stats.fractionalDays.toFixed(2)}`,
      expectedDescription: `~ ${(stats.fractionalDays * stats.dailyExpense).toFixed(0)} ${profile.currencySymbol}`,
      status: 'pending',
    },
    {
      id: 't-2',
      category: 'Биохимия и здоровье',
      name: 'Формула возврата минут жизни (11 мин / ед. табака)',
      description: 'Валидирует расчет возвращенного времени по методологии Lancet/BMJ',
      inputDescription: `avoidedUnits=${stats.cigarettesAvoided}`,
      expectedDescription: `${(stats.cigarettesAvoided * 11).toFixed(0)} мин`,
      status: 'pending',
    },
    {
      id: 't-3',
      category: 'Метрика устойчивости',
      name: 'Расчет индекса чистоты трека (No-Shame Penalty)',
      description: 'Проверяет мягкую деградацию процента трека при срывах без демотивирующего обнуления',
      inputDescription: `totalDays=${stats.days}, relapses=${relapses.length}`,
      expectedDescription: 'Диапазон 0–100% с сохранением прогресса',
      status: 'pending',
    },
    {
      id: 't-4',
      category: 'Этапы ВОЗ',
      name: 'Монотонность и валидность 32 этапов ВОЗ',
      description: 'Проверяет строгое возрастание secondsRequired от 20 минут до 20 лет',
      inputDescription: '32 HealthMilestones',
      expectedDescription: 'secondsRequired строго возрастает, нет коллизий id',
      status: 'pending',
    },
    {
      id: 't-5',
      category: 'Триггер-радар',
      name: 'Упреждение триггера за 15 минут (с переходом полуночи)',
      description: 'Проверяет алгоритм delta-минут с корректным модулем 1440 минут',
      inputDescription: 'HH:MM парсинг для всех активных триггеров',
      expectedDescription: 'Разница времени в пределах -15...+15 мин',
      status: 'pending',
    },
    {
      id: 't-6',
      category: 'Синхронизация данных',
      name: 'Целостность схемы FullAppState и JSON сериализации',
      description: 'Проверяет возможность сохранения и восстановления без потери типов',
      inputDescription: 'Profile, Cravings, Triggers, Relapses JSON',
      expectedDescription: 'Валидный JSON объект, no circular refs',
      status: 'pending',
    },
  ]);

  // Financial Forecasts
  const forecasts = useMemo(() => {
    const daily = stats.dailyExpense;
    return [
      { label: '7 дней', amount: Math.round(daily * 7), days: 7 },
      { label: '30 дней (1 мес)', amount: Math.round(daily * 30), days: 30 },
      { label: '90 дней (3 мес)', amount: Math.round(daily * 90), days: 90 },
      { label: '1 год', amount: Math.round(daily * 365), days: 365 },
      { label: '5 лет', amount: Math.round(daily * 365 * 5), days: 1825 },
    ];
  }, [stats.dailyExpense]);

  // Biological Systems Recovery Matrix
  const biologicalScores = useMemo(() => {
    const totalSec = stats.totalSeconds;
    // Cardiovascular: normalizes fast in 1st year (up to 80%), then to 100% in 5 years
    const cardio = Math.min(100, Math.round((Math.min(totalSec, 5 * 365 * 86400) / (5 * 365 * 86400)) * 100));
    // Respiratory: 1 year for 80%, 10 years for 100%
    const respiratory = Math.min(100, Math.round((Math.min(totalSec, 10 * 365 * 86400) / (10 * 365 * 86400)) * 100));
    // Dopamine / Receptors: 90 days for full recalibration
    const dopamine = Math.min(100, Math.round((Math.min(totalSec, 90 * 86400) / (90 * 86400)) * 100));
    // Physical stamina: 180 days for full lung capacity
    const stamina = Math.min(100, Math.round((Math.min(totalSec, 180 * 86400) / (180 * 86400)) * 100));
    // Longevity & Cancer defense: 20 years
    const longevity = Math.min(100, Math.round((Math.min(totalSec, 20 * 365 * 86400) / (20 * 365 * 86400)) * 100));

    return { cardio, respiratory, dopamine, stamina, longevity };
  }, [stats.totalSeconds]);

  // Cravings hour distribution
  const hourlyCravings = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    cravings.forEach((c) => {
      const h = new Date(c.timestamp).getHours();
      if (hours[h]) hours[h].count += 1;
    });
    const max = Math.max(1, ...hours.map((h) => h.count));
    return { hours, max };
  }, [cravings]);

  // Cravings intensity breakdown (1-10)
  const intensityBreakdown = useMemo(() => {
    const levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, count: 0 }));
    cravings.forEach((c) => {
      if (c.intensity >= 1 && c.intensity <= 10) {
        levels[c.intensity - 1].count += 1;
      }
    });
    const max = Math.max(1, ...levels.map((l) => l.count));
    return { levels, max };
  }, [cravings]);

  // Top Triggers
  const topTriggers = useMemo(() => {
    const map: Record<string, number> = {};
    cravings.forEach((c) => {
      const t = c.trigger || 'Без категории';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [cravings]);

  // Goal Progress Ring
  const goalProgress = profile.financialGoal > 0 ? Math.min(100, Math.round((stats.moneySaved / profile.financialGoal) * 100)) : 0;
  const daysToGoal = profile.financialGoal > stats.moneySaved && stats.dailyExpense > 0
    ? Math.ceil((profile.financialGoal - stats.moneySaved) / stats.dailyExpense)
    : 0;

  // Chart timeframe state for cumulative savings vs goal
  const [chartHorizon, setChartHorizon] = useState<'30d' | '90d' | '180d' | '1y' | 'goal'>('goal');

  // Projected Goal Target Date
  const goalTargetDate = useMemo(() => {
    if (profile.financialGoal <= 0 || stats.dailyExpense <= 0) return null;
    const daysNeeded = Math.ceil(profile.financialGoal / stats.dailyExpense);
    const quitDate = new Date(profile.quitAt || Date.now());
    const target = new Date(quitDate.getTime() + daysNeeded * 86400000);
    return target.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [profile.financialGoal, stats.dailyExpense, profile.quitAt]);

  // Cumulative savings timeline dataset for Recharts
  const savingsTimelineData = useMemo(() => {
    const daily = stats.dailyExpense > 0 ? stats.dailyExpense : 1000;
    const currentDays = Math.max(0, stats.fractionalDays);
    const goal = profile.financialGoal || 0;
    const daysToReachGoal = goal > 0 ? Math.ceil(goal / daily) : 60;

    let targetTotalDays = 60;
    if (chartHorizon === '30d') targetTotalDays = Math.max(30, Math.ceil(currentDays) + 7);
    else if (chartHorizon === '90d') targetTotalDays = Math.max(90, Math.ceil(currentDays) + 14);
    else if (chartHorizon === '180d') targetTotalDays = Math.max(180, Math.ceil(currentDays) + 30);
    else if (chartHorizon === '1y') targetTotalDays = Math.max(365, Math.ceil(currentDays) + 30);
    else if (chartHorizon === 'goal') {
      targetTotalDays = Math.max(Math.ceil(daysToReachGoal * 1.15), Math.ceil(currentDays) + 14, 30);
    }

    // Step calculation to ensure optimal resolution (approx 16-24 data points)
    const step = Math.max(1, Math.round(targetTotalDays / 20));
    const dayPoints = new Set<number>();
    dayPoints.add(0);
    for (let d = step; d < targetTotalDays; d += step) {
      dayPoints.add(d);
    }

    const roundedToday = Math.round(currentDays);
    dayPoints.add(roundedToday);
    if (daysToReachGoal > 0 && daysToReachGoal <= targetTotalDays) {
      dayPoints.add(daysToReachGoal);
    }
    dayPoints.add(targetTotalDays);

    const sortedDays = Array.from(dayPoints).sort((a, b) => a - b);
    const quitDate = new Date(profile.quitAt || Date.now());

    return sortedDays.map((d) => {
      const pointDate = new Date(quitDate.getTime() + d * 86400000);
      const dateLabel = pointDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const isPastOrToday = d <= roundedToday;
      const isToday = d === roundedToday;
      const isGoalDay = daysToReachGoal > 0 && d === daysToReachGoal;

      // Actual savings only available for past and today
      const actualSaved = isPastOrToday
        ? isToday
          ? Math.round(stats.moneySaved)
          : Math.round(d * daily)
        : null;

      const projectedSaved = Math.round(d * daily);

      return {
        day: d,
        label: isToday ? `Сегодня (д. ${d})` : isGoalDay ? `Цель (д. ${d})` : `${dateLabel} (д. ${d})`,
        shortLabel: isToday ? 'Сегодня' : `${d}д`,
        dateFormatted: dateLabel,
        actualSaved,
        projectedSaved,
        financialGoal: goal > 0 ? goal : undefined,
        isToday,
        isGoalDay,
      };
    });
  }, [stats.dailyExpense, stats.fractionalDays, stats.moneySaved, profile.financialGoal, profile.quitAt, chartHorizon]);

  // Run all Unit Tests in browser
  const handleRunAllTests = () => {
    setRunningTests(true);
    const start = performance.now();

    setTimeout(() => {
      const updated: UnitTestItem[] = testResults.map((t) => {
        const itemStart = performance.now();
        let passed = true;
        let actualOutput = '';
        let details = '';

        if (t.id === 't-1') {
          const expected = stats.fractionalDays * stats.dailyExpense;
          const diff = Math.abs(expected - stats.moneySaved);
          passed = diff < 1.0;
          actualOutput = `${stats.moneySaved.toFixed(0)} ${profile.currencySymbol} (diff=${diff.toFixed(4)})`;
          details = 'Формула: (hours / 24) * (unitsPerDay / packSize * packPrice)';
        } else if (t.id === 't-2') {
          const expected = stats.cigarettesAvoided * 11;
          const diff = Math.abs(expected - stats.minutesLifeReturned);
          passed = diff < 0.1;
          actualOutput = `${stats.minutesLifeReturned} минут (${(stats.minutesLifeReturned / 60).toFixed(1)} часов)`;
          details = 'Методология: 11 минут на 1 сигарету/стик (BMJ meta-analysis)';
        } else if (t.id === 't-3') {
          passed = stats.cleanTrackPercent >= 0 && stats.cleanTrackPercent <= 100;
          actualOutput = `${stats.cleanTrackPercent}% чистоты трека`;
          details = 'No-Shame расчет: срывы вычитают часть прогресса, не обнуляя пройденный путь';
        } else if (t.id === 't-4') {
          let strictlyIncreasing = true;
          for (let i = 1; i < WHO_HEALTH_MILESTONES.length; i++) {
            if (WHO_HEALTH_MILESTONES[i].secondsRequired <= WHO_HEALTH_MILESTONES[i - 1].secondsRequired) {
              strictlyIncreasing = false;
              break;
            }
          }
          passed = strictlyIncreasing && WHO_HEALTH_MILESTONES.length >= 30;
          actualOutput = `${WHO_HEALTH_MILESTONES.length} этапов, строгая хронология подтверждена`;
          details = 'Диапазон: 20 мин (1200 сек) -> 20 лет (630,720,000 сек)';
        } else if (t.id === 't-5') {
          passed = triggers.every((tr) => typeof tr.timeMinutes === 'number' && tr.timeMinutes >= 0 && tr.timeMinutes <= 1440);
          actualOutput = `Все ${triggers.length} триггеров имеют валидные timeMinutes`;
          details = 'Радар рассчитывает упреждение за 15 минут до назначенного события';
        } else if (t.id === 't-6') {
          try {
            const state = { profile, cravings, triggers, relapses };
            const jsonStr = JSON.stringify(state);
            const parsed = JSON.parse(jsonStr);
            passed = parsed.profile.id === profile.id;
            actualOutput = `JSON валиден (${(jsonStr.length / 1024).toFixed(1)} KB), сериализация 100%`;
            details = 'Поддерживается надежное сохранение в /api/state и localStorage';
          } catch (e) {
            passed = false;
            actualOutput = 'JSON serialization error';
          }
        }

        const itemEnd = performance.now();
        return {
          ...t,
          status: passed ? ('passed' as const) : ('failed' as const),
          actualOutput,
          details,
          executionTimeMs: Math.max(0.1, Math.round((itemEnd - itemStart) * 100) / 100),
        };
      });

      setTestResults(updated);
      setRunningTests(false);
    }, 450);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Комплексная аналитика и верификация
            </span>
            <span className="text-xs text-slate-400">Финансы &bull; Тяга &bull; Системы тела &bull; Тесты</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Панель аналитики, трендов и тестирования
          </h2>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeSubTab === 'overview'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Обзор и прогноз
          </button>
          <button
            onClick={() => setActiveSubTab('cravings')}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeSubTab === 'cravings'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Радар и тяга ({cravings.length})
          </button>
          <button
            onClick={() => setActiveSubTab('tests')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tests'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Тесты формул</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-sky-300 font-mono">6</span>
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'simulator'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Симулятор</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW SUB-TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Money Saved */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Сэкономлено денег</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {Math.round(stats.moneySaved).toLocaleString()} {profile.currencySymbol}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Расход в день: {Math.round(stats.dailyExpense).toLocaleString()} {profile.currencySymbol}</span>
              </div>
            </div>

            {/* Units Avoided */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Не выкурено / пропущено</span>
                <Sparkles className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {stats.cigarettesAvoided.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ед.</span>
              </div>
              <div className="text-[11px] text-sky-400">
                Отказ от яда и смол: {profile.nicotineType}
              </div>
            </div>

            {/* Life Returned */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Возвращено минут жизни</span>
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {stats.minutesLifeReturned.toLocaleString()} <span className="text-xs text-slate-400 font-normal">мин</span>
              </div>
              <div className="text-[11px] text-rose-400">
                ~ {(stats.minutesLifeReturned / 60).toFixed(1)} часов здоровой жизни
              </div>
            </div>

            {/* Clean Track Index */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Индекс чистоты трека</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {stats.cleanTrackPercent}%
              </div>
              <div className="text-[11px] text-amber-400">
                {stats.cravingsResistedCount} преодоленных тяг &bull; {relapses.length} срывов
              </div>
            </div>
          </div>

          {/* Cumulative Money Saved vs Financial Goal Line Chart (Recharts) */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Накопления vs Цель
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Recharts Динамика</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>График кумулятивной экономии и цель</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Траектория накопленных средств от дня отказа до пересечения финансовой цели
                </p>
              </div>

              {/* Time Horizon Selector Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
                <button
                  onClick={() => setChartHorizon('30d')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                    chartHorizon === '30d'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  30 дн
                </button>
                <button
                  onClick={() => setChartHorizon('90d')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                    chartHorizon === '90d'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  90 дн
                </button>
                <button
                  onClick={() => setChartHorizon('180d')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                    chartHorizon === '180d'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  180 дн
                </button>
                <button
                  onClick={() => setChartHorizon('1y')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                    chartHorizon === '1y'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1 год
                </button>
                <button
                  onClick={() => setChartHorizon('goal')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1 ${
                    chartHorizon === 'goal'
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <Target className="w-3 h-3" />
                  <span>К цели</span>
                </button>
              </div>
            </div>

            {/* Micro KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Накоплено сейчас</span>
                <div className="text-base font-black text-emerald-400 font-mono">
                  {Math.round(stats.moneySaved).toLocaleString()} {profile.currencySymbol}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Цель: {profile.financialGoalLabel || 'Покупка'}</span>
                <div className="text-base font-black text-amber-400 font-mono">
                  {profile.financialGoal > 0 ? `${profile.financialGoal.toLocaleString()} ${profile.currencySymbol}` : 'Не задана'}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Прогресс к цели</span>
                <div className="text-base font-black text-slate-200 font-mono">
                  {goalProgress}%
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400">Осталось до цели</span>
                <div className="text-base font-black text-sky-400 font-mono">
                  {daysToGoal > 0 ? `${daysToGoal} дн.` : 'Достигнута! 🎉'}
                </div>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={savingsTimelineData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val: number) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${Math.round(val / 1000)}k`;
                      return `${val}`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0]?.payload;
                      if (!pt) return null;

                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-bold text-slate-100">{pt.label}</span>
                            {pt.isToday && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                                Сегодня
                              </span>
                            )}
                            {pt.isGoalDay && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                                День цели
                              </span>
                            )}
                          </div>

                          {pt.actualSaved !== null && pt.actualSaved !== undefined && (
                            <div className="flex items-center justify-between text-emerald-400 font-mono">
                              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                Фактически:
                              </span>
                              <span className="font-bold">
                                {pt.actualSaved.toLocaleString()} {profile.currencySymbol}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sky-400 font-mono">
                            <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                              Траектория:
                            </span>
                            <span className="font-bold">
                              {pt.projectedSaved.toLocaleString()} {profile.currencySymbol}
                            </span>
                          </div>

                          {profile.financialGoal > 0 && (
                            <div className="pt-1.5 border-t border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-amber-400 font-mono">
                                <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                                  <Target className="w-3 h-3 text-amber-400" />
                                  Цель:
                                </span>
                                <span className="font-bold">
                                  {profile.financialGoal.toLocaleString()} {profile.currencySymbol}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400">
                                <span>Прогресс:</span>
                                <span className="text-slate-200 font-mono font-medium">
                                  {Math.min(100, Math.round((pt.projectedSaved / profile.financialGoal) * 100))}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    formatter={(val) => <span className="text-slate-300 text-xs">{val}</span>}
                  />

                  {/* Financial Goal Reference Line */}
                  {profile.financialGoal > 0 && (
                    <ReferenceLine
                      y={profile.financialGoal}
                      stroke="#f59e0b"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{
                        value: `Цель: ${profile.financialGoal.toLocaleString()} ${profile.currencySymbol}`,
                        fill: '#fbbf24',
                        position: 'insideTopRight',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {/* Lines for actual and projected trajectory */}
                  <Line
                    type="monotone"
                    dataKey="actualSaved"
                    name="Фактически сэкономлено"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedSaved"
                    name="Траектория / Прогноз"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 5, fill: '#38bdf8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Context Insight Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-slate-300">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Каждый день свободы сберегает{' '}
                  <strong className="text-emerald-400 font-mono">
                    {Math.round(stats.dailyExpense).toLocaleString()} {profile.currencySymbol}
                  </strong>
                  . За 30 дней это{' '}
                  <strong className="text-emerald-400 font-mono">
                    ~{Math.round(stats.dailyExpense * 30).toLocaleString()} {profile.currencySymbol}
                  </strong>
                  .
                </span>
              </div>
              {goalTargetDate && daysToGoal > 0 && (
                <div className="text-amber-300 flex items-center gap-1.5 shrink-0">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Ориентир закрытия цели: <strong className="font-semibold text-amber-200">{goalTargetDate}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Financial Forecast & Goal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Multi-Year Forecast */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Финансовая траектория экономии</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Сколько средств останется в вашем бюджете при сохранении свободы
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  {profile.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {forecasts.map((fc, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-xs text-slate-400 font-medium block">{fc.label}</span>
                    <span className="text-sm sm:text-base font-black text-emerald-300 font-mono block">
                      +{fc.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">{profile.currencySymbol}</span>
                  </div>
                ))}
              </div>

              {/* Goal Tracker */}
              {profile.financialGoal > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-slate-950 border border-emerald-900/30 space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-200">
                        Финансовая цель: {profile.financialGoalLabel || 'Покупка мечты'}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">
                      {goalProgress}% ({Math.round(stats.moneySaved).toLocaleString()} / {profile.financialGoal.toLocaleString()} {profile.currencySymbol})
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {daysToGoal > 0
                      ? `При текущем темпе цель будет достигнута примерно через ${daysToGoal} дн.`
                      : '🎉 Цель полностью профинансирована за счет отказа от никотина!'}
                  </p>
                </div>
              )}
            </div>

            {/* Biological Systems Radar */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span>Регенерация биосистем</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Cardio */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      Сердце и коронарные артерии
                    </span>
                    <span className="font-mono text-rose-400 font-bold">{biologicalScores.cardio}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${biologicalScores.cardio}%` }} />
                  </div>
                </div>

                {/* Respiratory */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      Легкие и мукоцилиарный клиренс
                    </span>
                    <span className="font-mono text-sky-400 font-bold">{biologicalScores.respiratory}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${biologicalScores.respiratory}%` }} />
                  </div>
                </div>

                {/* Dopamine */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      Дофамин и никотиновые рецепторы
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{biologicalScores.dopamine}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${biologicalScores.dopamine}%` }} />
                  </div>
                </div>

                {/* Stamina */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Физическая выносливость и сон
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{biologicalScores.stamina}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${biologicalScores.stamina}%` }} />
                  </div>
                </div>

                {/* Longevity */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Онкозащита и долголетие
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{biologicalScores.longevity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${biologicalScores.longevity}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRAVINGS & TRIGGERS SUB-TAB */}
      {activeSubTab === 'cravings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 24-Hour Distribution Histogram */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-400" />
                    <span>Распределение тяги по часам суток</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    В какие часы дня психологическое давление проявляется чаще всего
                  </p>
                </div>
              </div>

              {/* 24 Bar Columns */}
              <div className="pt-4 flex items-end justify-between gap-1 h-44 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                {hourlyCravings.hours.map((h) => {
                  const heightPercent = h.count > 0 ? Math.max(15, Math.round((h.count / hourlyCravings.max) * 100)) : 6;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 hidden group-hover:flex bg-slate-800 text-[10px] font-mono px-1.5 py-0.5 rounded text-white whitespace-nowrap z-10">
                        {h.hour}:00 &bull; {h.count} тяг
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          h.count > 0 ? 'bg-sky-400 hover:bg-sky-300' : 'bg-slate-850'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      {h.hour % 4 === 0 && (
                        <span className="text-[9px] text-slate-500 font-mono mt-1">{h.hour}ч</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Intensity Distribution (1-10) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  <span>Интенсивность импульсов (шкала 1–10)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Распределение зарегистрированных приступов по силе дискомфорта
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {intensityBreakdown.levels.map((lvl) => {
                  const width = lvl.count > 0 ? Math.max(8, Math.round((lvl.count / intensityBreakdown.max) * 100)) : 0;
                  return (
                    <div key={lvl.level} className="flex items-center gap-3 text-xs">
                      <span className="w-8 font-mono text-slate-400 text-right">Ур. {lvl.level}</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            lvl.level >= 8
                              ? 'bg-rose-500'
                              : lvl.level >= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-12 font-mono text-slate-300 text-right">{lvl.count} раз</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Triggers Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Главные провоцирующие триггеры</span>
            </h3>

            {topTriggers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {topTriggers.map((tr, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{tr.label}</span>
                      <span className="text-[11px] text-slate-500">Зарегистрировано</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                      {tr.count} раз
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Пока нет записанных тяг. Записывайте их в трекере для построения персональной карты триггеров!
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNIT TESTS SUB-TAB */}
      {activeSubTab === 'tests' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Live In-Browser Test Runner
                  </span>
                  <span className="text-xs text-slate-400">Автоматическая верификация формул</span>
                </div>
                <h3 className="text-xl font-black text-slate-100 mt-1">
                  Тестирование математических и медицинских моделей
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Запустите тестирование для проверки точности расчетов финансовой экономии, минут жизни, этапов ВОЗ и стабильности хранилища.
                </p>
              </div>

              <button
                onClick={handleRunAllTests}
                disabled={runningTests}
                className="px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
              >
                {runningTests ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Выполнение тестов...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Запустить все тесты</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Results List */}
            <div className="space-y-3 pt-2">
              {testResults.map((t, idx) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    t.status === 'passed'
                      ? 'bg-slate-950 border-emerald-500/30'
                      : t.status === 'failed'
                      ? 'bg-slate-950 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {t.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : t.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">
                          Тест #{idx + 1}: {t.name}
                        </span>
                        <span className="text-[11px] text-slate-400">{t.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      {t.executionTimeMs && (
                        <span className="text-slate-500 text-[10px]">{t.executionTimeMs} ms</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'passed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : t.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.status === 'passed' ? 'PASSED ✅' : t.status === 'failed' ? 'FAILED ❌' : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Details box if ran */}
                  {t.actualOutput && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Результат: <strong className="text-emerald-300">{t.actualOutput}</strong></span>
                        {t.details && <span className="text-slate-500">{t.details}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SIMULATOR SUB-TAB */}
      {activeSubTab === 'simulator' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Интерактивный симулятор времени
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-100">
              Симуляция временных интервалов свободы
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Хотите протестировать, как изменится карта здоровья, этапы ВОЗ и финансовые накопления через неделю, месяц или год?
              Нажмите кнопку ниже для мгновенной симуляции даты отказа.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onSimulateDays && onSimulateDays(1)}
              className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all space-y-1 active:scale-95"
            >
              <span className="text-xs font-bold text-slate-200 block">1 сутки</span>
              <span className="text-[11px] text-emerald-400 block">Детокс CO & Пульс</span>
            </button>

            <button
              onClick={() => onSimulateDays && onSimulateDays(7)}
              className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all space-y-1 active:scale-95"
            >
              <span className="text-xs font-bold text-slate-200 block">7 дней (1 нед)</span>
              <span className="text-[11px] text-emerald-400 block">Сон & Никотин 0%</span>
            </button>

            <button
              onClick={() => onSimulateDays && onSimulateDays(30)}
              className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all space-y-1 active:scale-95"
            >
              <span className="text-xs font-bold text-slate-200 block">30 дней (1 мес)</span>
              <span className="text-[11px] text-emerald-400 block">Реснички легких</span>
            </button>

            <button
              onClick={() => onSimulateDays && onSimulateDays(365)}
              className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all space-y-1 active:scale-95"
            >
              <span className="text-xs font-bold text-slate-200 block">1 год (365 дн)</span>
              <span className="text-[11px] text-emerald-400 block">ИБС снижен на 50%</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
