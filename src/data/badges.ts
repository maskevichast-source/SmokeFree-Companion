import { BadgeItem, FreedomStats, UserProfile } from '../types';

export interface BadgeDefinition {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  category: BadgeItem['category'];
  tier: BadgeItem['tier'];
  rarity: BadgeItem['rarity'];
  icon: string;
  points: number;
  requirement: string;
  description: string;
  medicalInsight: string;
  calculate: (stats: FreedomStats, profile?: UserProfile) => {
    isUnlocked: boolean;
    progressPercent: number;
    currentProgressText: string;
    targetRequirementText: string;
  };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // --- CLEAN STREAKS ---
  {
    id: 'badge-clean-24h',
    code: 'clean_24h',
    title: '24 Hours Clean',
    subtitle: 'Первый чистый суточный круг',
    category: 'streak',
    tier: 'bronze',
    rarity: 'Common',
    icon: '🌱',
    points: 50,
    requirement: '24 часа без табака и никотина',
    description: 'Ты выдержал самый первый и важный день. Монооксид углерода полностью покинул твою кровь.',
    medicalInsight: 'Уровень карбоксигемоглобина снизился до некурящей нормы. Ткани свободно дышат.',
    calculate: (stats) => {
      const targetSec = 24 * 3600;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      const hours = (stats.totalSeconds / 3600).toFixed(1);
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${hours} ч.`,
        targetRequirementText: '24 часа',
      };
    },
  },
  {
    id: 'badge-clean-3d',
    code: 'clean_3d',
    title: '3 Days Breakthrough',
    subtitle: 'Пик никотиновой абстиненции позади',
    category: 'streak',
    tier: 'silver',
    rarity: 'Rare',
    icon: '⚡',
    points: 100,
    requirement: '72 часа (3 дня) свободы',
    description: 'Организм на 100% очищен от свободного никотина. Самый тяжелый химический пик позади!',
    medicalInsight: 'Бронхиальное дерево расслабляется, легкие вмещают на 10–15% больше чистого воздуха.',
    calculate: (stats) => {
      const targetSec = 72 * 3600;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      const days = (stats.totalSeconds / 86400).toFixed(1);
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${days} дн.`,
        targetRequirementText: '3 дня (72 ч)',
      };
    },
  },
  {
    id: 'badge-clean-7d',
    code: 'clean_7d',
    title: '7 Days Clean',
    subtitle: 'Первая неделя абсолютной чистоты',
    category: 'streak',
    tier: 'gold',
    rarity: 'Rare',
    icon: '🏆',
    points: 250,
    requirement: '7 полных дней без никотина',
    description: 'Неделя свободы! Твоя вегетативная нервная система нормализует ночной сон и частоту пульса.',
    medicalInsight: 'Сон стал глубже, утренний пульс спокоен, вкусовые рецепторы восстанавливают тонкие оттенки.',
    calculate: (stats) => {
      const targetSec = 7 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      const days = (stats.totalSeconds / 86400).toFixed(1);
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${days} из 7 дн.`,
        targetRequirementText: '7 дней',
      };
    },
  },
  {
    id: 'badge-clean-14d',
    code: 'clean_14d',
    title: '14 Days Cardio Burst',
    subtitle: '2 недели чистого кровотока',
    category: 'streak',
    tier: 'gold',
    rarity: 'Epic',
    icon: '🫀',
    points: 400,
    requirement: '14 дней чистой жизни',
    description: 'Кровообращение в конечностях и сердце выросло на 30%. Подъем по лестнице больше не вызывает одышки.',
    medicalInsight: 'Эластичность капилляров восстанавливается, снижается вязкость плазмы крови.',
    calculate: (stats) => {
      const targetSec = 14 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      const days = (stats.totalSeconds / 86400).toFixed(1);
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${days} из 14 дн.`,
        targetRequirementText: '14 дней',
      };
    },
  },
  {
    id: 'badge-clean-30d',
    code: 'clean_30d',
    title: '30 Days Iron Will',
    subtitle: 'Месяц полного триумфа',
    category: 'streak',
    tier: 'platinum',
    rarity: 'Epic',
    icon: '💎',
    points: 750,
    requirement: '30 дней непрерывной свободы',
    description: 'Психологическая привычка сломана на клеточном уровне. Реснички бронхов полностью очищают легкие.',
    medicalInsight: 'Мукоцилиарный аппарат легких удаляет застарелый деготь. Риск респираторных инфекций упал на 50%.',
    calculate: (stats) => {
      const targetSec = 30 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.days >= 30,
        progressPercent: progress,
        currentProgressText: `${stats.days} из 30 дн.`,
        targetRequirementText: '30 дней',
      };
    },
  },
  {
    id: 'badge-clean-90d',
    code: 'clean_90d',
    title: '90 Days Mountain Breath',
    subtitle: 'Квартал несокрушимости',
    category: 'streak',
    tier: 'diamond',
    rarity: 'Legendary',
    icon: '🏔️',
    points: 1500,
    requirement: '90 дней (3 месяца) свободы',
    description: 'Жизненная емкость легких выросла на 15–20%. Ты дышишь полной грудью, как горным воздухом.',
    medicalInsight: 'Форсированная емкость выдоха (ОФВ1) на максимуме, дофаминовые рецепторы сбалансированы.',
    calculate: (stats) => {
      const targetSec = 90 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.days >= 90,
        progressPercent: progress,
        currentProgressText: `${stats.days} из 90 дн.`,
        targetRequirementText: '90 дней',
      };
    },
  },
  {
    id: 'badge-clean-365d',
    code: 'clean_365d',
    title: '365 Days Immortal Heart',
    subtitle: 'Год суверенной жизни',
    category: 'streak',
    tier: 'mythic',
    rarity: 'Mythic',
    icon: '👑',
    points: 5000,
    requirement: '1 полный год свободы (365 дней)',
    description: 'Избыточный риск инфаркта миокарда и ИБС снизился ровно в 2 раза. Твое сердце обновлено.',
    medicalInsight: 'Регресс коронарного атеросклероза, нормализация фактора некроза опухоли и сосудистого эндотелия.',
    calculate: (stats) => {
      const targetSec = 365 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.days >= 365,
        progressPercent: progress,
        currentProgressText: `${stats.days} из 365 дн.`,
        targetRequirementText: '365 дней (1 год)',
      };
    },
  },

  // --- MONEY MILESTONES ---
  {
    id: 'badge-money-10k',
    code: 'money_10k',
    title: 'Money Milestone: First Vault',
    subtitle: 'Первая солидная копилка',
    category: 'money',
    tier: 'bronze',
    rarity: 'Common',
    icon: '🪙',
    points: 100,
    requirement: 'Сэкономить 10 000 ₸ (или $20+)',
    description: 'Деньги остались в твоем кармане, а не превратились в токсичный дым табачных магнатов.',
    medicalInsight: 'Осознание финансового выигрыша активирует полосатое тело и укрепляет самооценку.',
    calculate: (stats, profile) => {
      const target = profile?.currency === 'USD' ? 20 : profile?.currency === 'RUB' ? 2000 : 10000;
      const progress = Math.min(100, Math.round((stats.moneySaved / target) * 100));
      const sym = profile?.currencySymbol || '₸';
      return {
        isUnlocked: stats.moneySaved >= target,
        progressPercent: progress,
        currentProgressText: `${Math.round(stats.moneySaved)} ${sym}`,
        targetRequirementText: `${target.toLocaleString()} ${sym}`,
      };
    },
  },
  {
    id: 'badge-money-100usd',
    code: 'money_100usd',
    title: 'Money Milestone $100',
    subtitle: 'Финансовый рубеж свободы ($100 / 50 000 ₸)',
    category: 'money',
    tier: 'silver',
    rarity: 'Rare',
    icon: '💵',
    points: 350,
    requirement: 'Сберечь сумму, эквивалентную $100 (50 000 ₸ / 10 000 ₽)',
    description: 'Ты сохранил целую сотню долларов! Это отличный ужин, гаджет или взнос в твои цели.',
    medicalInsight: 'Снижение стресса от импульсивных трат и укрепление здорового дофаминового вознаграждения.',
    calculate: (stats, profile) => {
      const target = profile?.currency === 'USD' ? 100 : profile?.currency === 'RUB' ? 10000 : 50000;
      const progress = Math.min(100, Math.round((stats.moneySaved / target) * 100));
      const sym = profile?.currencySymbol || '₸';
      return {
        isUnlocked: stats.moneySaved >= target,
        progressPercent: progress,
        currentProgressText: `${Math.round(stats.moneySaved)} ${sym}`,
        targetRequirementText: `${target.toLocaleString()} ${sym}`,
      };
    },
  },
  {
    id: 'badge-money-100k',
    code: 'money_100k',
    title: 'Money Milestone: Freedom Capital',
    subtitle: 'Капитал независимости (100 000 ₸ / $200+)',
    category: 'money',
    tier: 'gold',
    rarity: 'Epic',
    icon: '💰',
    points: 700,
    requirement: 'Сберечь 100 000 ₸ (или $200+)',
    description: 'Сотня тысяч в твоем бюджете. Ты доказал, что можешь эффективно управлять своими ресурсами.',
    medicalInsight: 'Психологическая независимость от маркетинговых манипуляций никотиновой индустрии.',
    calculate: (stats, profile) => {
      const target = profile?.currency === 'USD' ? 200 : profile?.currency === 'RUB' ? 20000 : 100000;
      const progress = Math.min(100, Math.round((stats.moneySaved / target) * 100));
      const sym = profile?.currencySymbol || '₸';
      return {
        isUnlocked: stats.moneySaved >= target,
        progressPercent: progress,
        currentProgressText: `${Math.round(stats.moneySaved)} ${sym}`,
        targetRequirementText: `${target.toLocaleString()} ${sym}`,
      };
    },
  },
  {
    id: 'badge-money-goal',
    code: 'money_goal_achieved',
    title: 'Dream Goal Unlocked',
    subtitle: 'Личная финансовая цель покорена!',
    category: 'money',
    tier: 'platinum',
    rarity: 'Legendary',
    icon: '🎁',
    points: 1200,
    requirement: 'Накопить на цель из настроек профиля',
    description: 'Деньги, которые раньше сгорали в пепельнице, теперь оплатили твою настоящую мечту!',
    medicalInsight: 'Высшая точка поведенческого подкрепления: материализация усилий в реальную ценность.',
    calculate: (stats, profile) => {
      const target = profile?.financialGoal || 250000;
      const progress = Math.min(100, Math.round((stats.moneySaved / target) * 100));
      const sym = profile?.currencySymbol || '₸';
      const label = profile?.financialGoalLabel || 'Цель';
      return {
        isUnlocked: stats.moneySaved >= target,
        progressPercent: progress,
        currentProgressText: `${Math.round(stats.moneySaved)} ${sym}`,
        targetRequirementText: `${target.toLocaleString()} ${sym} (${label})`,
      };
    },
  },

  // --- ENDURANCE & WILLPOWER STREAKS ---
  {
    id: 'badge-endurance-streak',
    code: 'endurance_streak',
    title: 'Endurance Streak',
    subtitle: '7 дней подряд со 100% чистым треком',
    category: 'endurance',
    tier: 'silver',
    rarity: 'Rare',
    icon: '🛡️',
    points: 300,
    requirement: '7+ дней свободы и 0 срывов',
    description: 'Ты ни разу не поддался минутной слабости. Чистый старт без компромиссов.',
    medicalInsight: 'Префронтальная кора эффективно подавляет автоматические импульсы базальных ядер.',
    calculate: (stats) => {
      const isClean = stats.relapseCount === 0;
      const daysProgress = Math.min(100, Math.round((stats.days / 7) * 100));
      const progress = isClean ? daysProgress : 0;
      return {
        isUnlocked: stats.days >= 7 && stats.relapseCount === 0,
        progressPercent: progress,
        currentProgressText: `${stats.days} дн. (срывов: ${stats.relapseCount})`,
        targetRequirementText: '7 дней и 0 срывов',
      };
    },
  },
  {
    id: 'badge-iron-marathoner',
    code: 'endurance_marathon_30',
    title: 'Iron Marathoner 30D',
    subtitle: '30 дней идеальной стойкости',
    category: 'endurance',
    tier: 'platinum',
    rarity: 'Legendary',
    icon: '⚔️',
    points: 1000,
    requirement: '30 дней свободы и 0 срывов',
    description: 'Месяц безупречной стойкости. Ты несокрушим перед лицом любых стрессов и триггеров.',
    medicalInsight: 'Полная консолидация новой модели нейронных сетей самоконтроля.',
    calculate: (stats) => {
      const isClean = stats.relapseCount === 0;
      const progress = isClean ? Math.min(100, Math.round((stats.days / 30) * 100)) : 0;
      return {
        isUnlocked: stats.days >= 30 && stats.relapseCount === 0,
        progressPercent: progress,
        currentProgressText: `${stats.days} дн. (срывов: ${stats.relapseCount})`,
        targetRequirementText: '30 дней и 0 срывов',
      };
    },
  },
  {
    id: 'badge-craving-1',
    code: 'craving_first',
    title: 'Wave Surfer',
    subtitle: 'Первая обузданная тяга',
    category: 'willpower',
    tier: 'bronze',
    rarity: 'Common',
    icon: '🌊',
    points: 50,
    requirement: '1 зафиксированная победа в SOS-модуле',
    description: 'Ты не стал рабом 3-минутного биохимического импульса и оседлал волну.',
    medicalInsight: 'Лимбическая система получила сигнал о безопасности без никотиновой дозы.',
    calculate: (stats) => {
      const count = stats.cravingsResistedCount;
      return {
        isUnlocked: count >= 1,
        progressPercent: Math.min(100, count * 100),
        currentProgressText: `${count} побед`,
        targetRequirementText: '1 победа над тягой',
      };
    },
  },
  {
    id: 'badge-craving-10',
    code: 'craving_crusher_10',
    title: 'Craving Crusher 10x',
    subtitle: 'Мастер осознанного контроля',
    category: 'willpower',
    tier: 'gold',
    rarity: 'Epic',
    icon: '🥊',
    points: 400,
    requirement: '10 преодоленных приступов тяги',
    description: '10 раз ты посмотрел в лицо никотиновому червю и победил его осознанностью.',
    medicalInsight: 'Укрепление нисходящего тормозного контроля дорсолатеральной префронтальной коры.',
    calculate: (stats) => {
      const count = stats.cravingsResistedCount;
      const progress = Math.min(100, Math.round((count / 10) * 100));
      return {
        isUnlocked: count >= 10,
        progressPercent: progress,
        currentProgressText: `${count} из 10`,
        targetRequirementText: '10 побед над импульсом',
      };
    },
  },
  {
    id: 'badge-craving-25',
    code: 'stoic_shield_25',
    title: 'Stoic Fortress 25x',
    subtitle: 'Несокрушимый стоик',
    category: 'willpower',
    tier: 'diamond',
    rarity: 'Legendary',
    icon: '🏛️',
    points: 900,
    requirement: '25 побед над импульсами тяги',
    description: 'Твоя внутренняя цитадель непробиваема. Тяга больше не имеет над тобой власти.',
    medicalInsight: 'Угасание условного рефлекса Павлова на табачные триггеры окружающей среды.',
    calculate: (stats) => {
      const count = stats.cravingsResistedCount;
      const progress = Math.min(100, Math.round((count / 25) * 100));
      return {
        isUnlocked: count >= 25,
        progressPercent: progress,
        currentProgressText: `${count} из 25`,
        targetRequirementText: '25 побед',
      };
    },
  },

  // --- CELLULAR & PHYSIOLOGICAL BIOMARKERS ---
  {
    id: 'badge-oxygen-surge',
    code: 'oxygen_surge',
    title: 'Oxygen Surge 99%',
    subtitle: 'Сатурация артериальной крови',
    category: 'cellular',
    tier: 'silver',
    rarity: 'Rare',
    icon: '🫁',
    points: 150,
    requirement: '24 часа чистого газообмена',
    description: 'SpO₂ вернулась к эталонным 99.5%. Мозг и мышцы больше не страдают от гипоксии.',
    medicalInsight: 'Кривая диссоциации оксигемоглобина сместилась в оптимальную зону.',
    calculate: (stats) => {
      const targetSec = 24 * 3600;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${(stats.totalSeconds / 3600).toFixed(1)} ч.`,
        targetRequirementText: '24 часа (SpO₂ 99%+)',
      };
    },
  },
  {
    id: 'badge-taste-reborn',
    code: 'taste_reborn',
    title: 'Taste & Senses Reborn',
    subtitle: 'Регенерация вкуса и запаха',
    category: 'cellular',
    tier: 'gold',
    rarity: 'Rare',
    icon: '🍓',
    points: 200,
    requirement: '48 часов (2 дня) свободы',
    description: 'Нервные окончания языка и носовой полости сбросили налет смол и ожили.',
    medicalInsight: 'Сенсорные вкусовые клетки (TRC) и обонятельные рецепторы регенерировали синапсы.',
    calculate: (stats) => {
      const targetSec = 48 * 3600;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.totalSeconds >= targetSec,
        progressPercent: progress,
        currentProgressText: `${(stats.totalSeconds / 3600).toFixed(1)} ч.`,
        targetRequirementText: '48 часов',
      };
    },
  },
  {
    id: 'badge-dopamine-reset',
    code: 'dopamine_reset',
    title: 'Dopamine Independence',
    subtitle: 'Перезагрузка рецепторов радости',
    category: 'cellular',
    tier: 'platinum',
    rarity: 'Legendary',
    icon: '☀️',
    points: 800,
    requirement: '60 дней (2 месяца) свободы',
    description: 'Ацетилхолиновые и дофаминовые рецепторы вернулись к физиологической норме некурящего.',
    medicalInsight: 'Плотность никотиновых рецепторов α4β2 снизилась до базового уровня. Радость автономна.',
    calculate: (stats) => {
      const targetSec = 60 * 86400;
      const progress = Math.min(100, Math.round((stats.totalSeconds / targetSec) * 100));
      return {
        isUnlocked: stats.days >= 60,
        progressPercent: progress,
        currentProgressText: `${stats.days} из 60 дн.`,
        targetRequirementText: '60 дней',
      };
    },
  },
];

/**
 * Computes live status and progress for all badges based on user state
 */
export function calculateUserBadges(stats: FreedomStats, profile?: UserProfile): BadgeItem[] {
  return BADGE_DEFINITIONS.map((def) => {
    const calc = def.calculate(stats, profile);

    return {
      id: def.id,
      code: def.code,
      title: def.title,
      subtitle: def.subtitle,
      category: def.category,
      tier: def.tier,
      rarity: def.rarity,
      icon: def.icon,
      points: def.points,
      requirement: def.requirement,
      description: def.description,
      medicalInsight: def.medicalInsight,
      isUnlocked: calc.isUnlocked,
      progressPercent: calc.progressPercent,
      currentProgressText: calc.currentProgressText,
      targetRequirementText: calc.targetRequirementText,
      unlockedAtDate: calc.isUnlocked ? 'Разблокировано' : undefined,
    };
  });
}
