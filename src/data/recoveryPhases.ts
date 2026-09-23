import { HealthMilestone, PhysiologicalPhase, PhysiologicalIndicator } from '../types';
import { WHO_HEALTH_MILESTONES } from './auditReport';

export interface PhaseDefinition {
  id: string;
  phaseNumber: number;
  name: string;
  subtitle: string;
  durationRange: string;
  startSec: number;
  endSec: number;
  description: string;
  keyChanges: string[];
  indicatorTemplates: {
    id: string;
    name: string;
    category: PhysiologicalIndicator['category'];
    startValue: string;
    targetValue: string;
    durationSec: number;
    description: string;
    medicalInsight: string;
    icon: string;
    calcValue: (progress: number) => string;
  }[];
}

export const RECOVERY_PHASES_CONFIG: PhaseDefinition[] = [
  {
    id: 'phase-1',
    phaseNumber: 1,
    name: 'Острая детоксикация и сатурация O₂',
    subtitle: 'Устранение гипоксии, элиминация CO и преодоление физического пика',
    durationRange: '0 – 72 часа (1–3 дня)',
    startSec: 0,
    endSec: 72 * 3600,
    description:
      'Первичный этап очищения кровотока. Монооксид углерода (угарный газ) замещается кислородом, гемоглобин возвращает способность питать ткани, а никотин полностью покидает кровеносное русло.',
    keyChanges: [
      'Снижение частоты пульса и стабилизация давления до физиологической нормы (за 20–120 минут)',
      'Падение уровня угарного газа в крови до нуля (<1.0% HbCO за 12–24 часа)',
      'Восстановление сатурации кислорода (SpO₂) до 99–100% (за 8–24 часа)',
      'Начало регенерации вкусовых и обонятельных рецепторов (за 48 часов)',
      'Полное выведение никотина и котинина почками и печенью (к 72 часам)',
    ],
    indicatorTemplates: [
      {
        id: 'ind-spo2',
        name: 'Сатурация крови кислородом (SpO₂)',
        category: 'oxygen',
        startValue: '93.0%',
        targetValue: '99.5%',
        durationSec: 24 * 3600,
        description: 'Степень насыщения артериального гемоглобина молекулярным кислородом.',
        medicalInsight: 'Ткани головного мозга и миокарда перестают испытывать хроническое кислородное голодание.',
        icon: '🫁',
        calcValue: (p) => `${(93.0 + (99.5 - 93.0) * (p / 100)).toFixed(1)}%`,
      },
      {
        id: 'ind-co',
        name: 'Очищение от монооксида углерода (HbCO)',
        category: 'co_clearing',
        startValue: '8.5% HbCO',
        targetValue: '< 0.8% HbCO',
        durationSec: 24 * 3600,
        description: 'Концентрация токсичного карбоксигемоглобина, блокировавшего перенос кислорода.',
        medicalInsight: 'К 24 часам угарный газ полностью элиминирован через альвеолы легких.',
        icon: '💨',
        calcValue: (p) => `${Math.max(0.5, (8.5 - (8.5 - 0.7) * (p / 100))).toFixed(1)}% HbCO`,
      },
      {
        id: 'ind-nicotine-clear',
        name: 'Выведение свободного никотина',
        category: 'co_clearing',
        startValue: '100% токсинов',
        targetValue: '0% (Чисто)',
        durationSec: 72 * 3600,
        description: 'Печеночный клиренс никотина ферментом CYP2A6 до неактивных метаболитов.',
        medicalInsight: 'Через 72 часа физическая тяга сменяется психологической перестройкой.',
        icon: '🧪',
        calcValue: (p) => p >= 100 ? '0% (Очищено)' : `${Math.round(100 - p)}% в крови`,
      },
      {
        id: 'ind-nerve-taste',
        name: 'Регенерация нервных окончаний вкуса/обоняния',
        category: 'nerve_regeneration',
        startValue: '15% чувствительности',
        targetValue: '100% яркость',
        durationSec: 48 * 3600,
        description: 'Восстановление сенсорных клеток вкусовых сосочков (TRC) и обонятельной луковицы.',
        medicalInsight: 'Блокированные смолами рецепторы сбрасывают слой токсинов и восстанавливают синаптическую передачу.',
        icon: '🍓',
        calcValue: (p) => `${Math.min(100, Math.round(15 + 85 * (p / 100)))}%`,
      },
    ],
  },
  {
    id: 'phase-2',
    phaseNumber: 2,
    name: 'Бронхиальное расширение и нейропластичность',
    subtitle: 'Снятие спазма бронхиол, стабилизация сна и разрушение никотинового рефлекса',
    durationRange: '3 – 21 день (1–3 недели)',
    startSec: 72 * 3600,
    endSec: 21 * 86400,
    description:
      'Период глубокой перестройки нервной системы и дыхательных путей. Гладкая мускулатура бронхов расслабляется, легкие начинают вмещать больше воздуха, а плотность никотиновых рецепторов в мозге снижается.',
    keyChanges: [
      'Расслабление бронхиального дерева и увеличение дыхательного объема (4–7 дней)',
      'Стабилизация уровня сахара в крови и устранение скачков аппетита (5–10 дней)',
      'Восстановление архитектуры фаз глубокого и REM-сна (7–14 дней)',
      'Рост физической выносливости скелетных мышц на 30% (14 дней)',
      'Даунрегуляция никотиновых ацетилхолиновых рецепторов α4β2 (21 день)',
    ],
    indicatorTemplates: [
      {
        id: 'ind-bronchi-relax',
        name: 'Проходимость бронхиального дерева',
        category: 'lung_capacity',
        startValue: '60% от нормы',
        targetValue: '95% проводимости',
        durationSec: 10 * 86400,
        description: 'Снятие воспалительного вазоконстрикторного тонуса с мелких дыхательных путей.',
        medicalInsight: 'Бронхиолы расширяются, устраняя сопротивление воздушному потоку при выдохе.',
        icon: '🌬️',
        calcValue: (p) => `${Math.min(100, Math.round(60 + 35 * (p / 100)))}%`,
      },
      {
        id: 'ind-sleep-rem',
        name: 'Качество фазы глубокого и быстрого сна (REM)',
        category: 'dopamine_reset',
        startValue: '45% восстановительного сна',
        targetValue: '95% баланс',
        durationSec: 14 * 86400,
        description: 'Нормализация естественной секреции мелатонина и фаз ночного отдыха.',
        medicalInsight: 'Мозг прекращает просыпаться от микроабстиненции посреди ночи.',
        icon: '🌙',
        calcValue: (p) => `${Math.min(100, Math.round(45 + 50 * (p / 100)))}%`,
      },
      {
        id: 'ind-nachr-density',
        name: 'Даунрегуляция рецепторов nAChR в мозге',
        category: 'dopamine_reset',
        startValue: 'Гиперэкспрессия (250%)',
        targetValue: 'Норма некурящего (100%)',
        durationSec: 21 * 86400,
        description: 'Снижение числа патологических никотиновых рецепторов в вентральной области покрышки.',
        medicalInsight: 'Разрушается биологический крючок привычки. Мысли о сигарете теряют силу.',
        icon: '🧠',
        calcValue: (p) => `${Math.round(250 - 150 * (p / 100))}% к норме`,
      },
      {
        id: 'ind-muscular-energy',
        name: 'Кровоснабжение и выносливость мышц',
        category: 'cardiovascular',
        startValue: 'Базовый уровень',
        targetValue: '+30% прирост силы',
        durationSec: 14 * 86400,
        description: 'Плотность оксигенации мышечных волокон и синтез АТФ в митохондриях.',
        medicalInsight: 'Подъем по лестнице и спортивные нагрузки перестают вызывать закисление и одышку.',
        icon: '⚡',
        calcValue: (p) => `+${Math.round(30 * (p / 100))}% выносливости`,
      },
    ],
  },
  {
    id: 'phase-3',
    phaseNumber: 3,
    name: 'Мукоцилиарный клиренс и рост емкости легких',
    subtitle: 'Регенерация мерцательного эпителия, рост ФЖЕЛ и дофаминовый баланс',
    durationRange: '21 – 90 дней (1–3 месяца)',
    startSec: 21 * 86400,
    endSec: 90 * 86400,
    description:
      'Клеточное очищение респираторной системы. Микроскопические реснички в легких восстанавливают волнообразные движения, выводя застарелые смолы и слизь. Форсированная емкость легких увеличивается до 15–20%.',
    keyChanges: [
      'Полная регенерация ресничек мерцательного эпителия легких (30–60 дней)',
      'Преодоление психологической дофаминовой ямы и стабилизация настроения (45–60 дней)',
      'Снижение вязкости крови и риска тромбоза глубоких вен (75 дней)',
      'Рост форсированной жизненной емкости легких (ФЖЕЛ / ОФВ1) на 15–20% (90 дней)',
      'Улучшение тургора кожи, цвета лица и разглаживание микроморщин (60–90 дней)',
    ],
    indicatorTemplates: [
      {
        id: 'ind-cilia-regen',
        name: 'Плотность и подвижность ресничек эпителия',
        category: 'lung_capacity',
        startValue: '20% (Парализованы)',
        targetValue: '100% (Полный клиренс)',
        durationSec: 60 * 86400,
        description: 'Эвакуация скопившихся частиц смол и слизи миллионами ресничек эпителия.',
        medicalInsight: 'Утренний кашель курильщика сменяется абсолютно чистым дыханием.',
        icon: '🌾',
        calcValue: (p) => `${Math.min(100, Math.round(20 + 80 * (p / 100)))}% регенерации`,
      },
      {
        id: 'ind-fvc-capacity',
        name: 'Жизненная емкость легких (ФЖЕЛ / ОФВ1)',
        category: 'lung_capacity',
        startValue: 'База курильщика',
        targetValue: '+15–20% объем',
        durationSec: 90 * 86400,
        description: 'Диффузионная способность альвеолярно-капиллярной мембраны (DLCO).',
        medicalInsight: 'Максимальный объем глубокого вдоха вырастает на 400–600 мл.',
        icon: '🫁',
        calcValue: (p) => `+${(15.0 * (p / 100)).toFixed(1)}% объема`,
      },
      {
        id: 'ind-dopamine-homeostasis',
        name: 'Собственный синтез дофамина (D2/D3 рецепторы)',
        category: 'dopamine_reset',
        startValue: 'Яма (50%)',
        targetValue: '100% баланс',
        durationSec: 60 * 86400,
        description: 'Плотность дофаминовых рецепторов в полосатом теле головного мозга.',
        medicalInsight: 'Возвращается естественная мотивация, интерес к жизни и концентрация без стимуляторов.',
        icon: '✨',
        calcValue: (p) => `${Math.min(100, Math.round(50 + 50 * (p / 100)))}% синтеза`,
      },
      {
        id: 'ind-blood-viscosity',
        name: 'Текучесть крови и уровень фибриногена',
        category: 'cardiovascular',
        startValue: 'Повышенная вязкость',
        targetValue: 'Оптимальная норма',
        durationSec: 75 * 86400,
        description: 'Снижение уровня тромбогенного белка фибриногена и адгезии тромбоцитов.',
        medicalInsight: 'Риск микроинсультов и транзиторных ишемических атак резко падает.',
        icon: '🩸',
        calcValue: (p) => p >= 100 ? 'Оптимальная норма' : `${Math.round(p)}% нормализации`,
      },
    ],
  },
  {
    id: 'phase-4',
    phaseNumber: 4,
    name: 'Кардиоваскулярная и иммунная репарация',
    subtitle: 'Активация альвеолярных макрофагов, снижение СРБ и защита миокарда на 50%',
    durationRange: '3 – 12 месяцев (1 год)',
    startSec: 90 * 86400,
    endSec: 365 * 86400,
    description:
      'Глубокое восстановление иммунной защиты и сосудистой стенки. Воспалительные маркеры (С-реактивный белок) снижаются до безопасных значений, а избыточный риск инфаркта миокарда падает ровно в 2 раза.',
    keyChanges: [
      'Полная фагоцитарная активность альвеолярных макрофагов (150 дней)',
      'Очищение придаточных пазух носа и устранение застойного бронхита (180 дней / полгода)',
      'Падение высокочувствительного С-реактивного белка (СРБ) и молекул сосудистой адгезии (270 дней)',
      'Снижение избыточного риска ишемической болезни сердца (ИБС) на 50% (365 дней / 1 год)',
      'Регресс ранних липидных полосок в интиме коронарных артерий (1 год)',
    ],
    indicatorTemplates: [
      {
        id: 'ind-macrophage-immunity',
        name: 'Иммунная активность макрофагов легких',
        category: 'lung_capacity',
        startValue: '40% защита',
        targetValue: '100% иммунитет',
        durationSec: 150 * 86400,
        description: 'Способность макрофагов уничтожать патогенные бактерии и вирусы в альвеолах.',
        medicalInsight: 'Респираторные инфекции перестают перерастать в затяжной бронхит.',
        icon: '🛡️',
        calcValue: (p) => `${Math.min(100, Math.round(40 + 60 * (p / 100)))}% защиты`,
      },
      {
        id: 'ind-crp-inflammation',
        name: 'Снижение сосудистого воспаления (СРБ)',
        category: 'cardiovascular',
        startValue: 'Высокий риск (3.8 мг/л)',
        targetValue: 'Безопасно (< 1.0 мг/л)',
        durationSec: 270 * 86400,
        description: 'Уровень высокочувствительного С-реактивного белка (hs-CRP) в сыворотке крови.',
        medicalInsight: 'Эндотелий артерий надежно защищен от прилипания холестериновых бляшек.',
        icon: '📉',
        calcValue: (p) => `${Math.max(0.8, 3.8 - (3.8 - 0.8) * (p / 100)).toFixed(1)} мг/л`,
      },
      {
        id: 'ind-coronary-risk',
        name: 'Снижение избыточного риска ИБС',
        category: 'cardiovascular',
        startValue: '0% снижение (Максимум)',
        targetValue: '-50% риска инфаркта',
        durationSec: 365 * 86400,
        description: 'Вероятность внезапного инфаркта миокарда по шкале SCORE / Framingham.',
        medicalInsight: 'Сердечная мышца функционирует в условиях оптимального коронарного кровообращения.',
        icon: '❤️',
        calcValue: (p) => `-${Math.round(50 * (p / 100))}% риска`,
      },
    ],
  },
  {
    id: 'phase-5',
    phaseNumber: 5,
    name: 'Онкопротекция, репарация ДНК и долголетие',
    subtitle: 'Репарация ДНК-аддуктов, снижение риска инсульта и онкологии до нормы',
    durationRange: '1 – 20 лет',
    startSec: 365 * 86400,
    endSec: 20 * 365 * 86400,
    description:
      'Долгосрочный горизонт регенерации. Полное устранение мутагенных рисков табачных нитрозаминов, очищение клеток на эпигенетическом уровне и возврат ожидаемой продолжительности жизни к норме никогда не курившего человека.',
    keyChanges: [
      'Восстановление эластичности аорты и эндотелия (1.5–2 года)',
      'Снижение риска рака шейки матки, мочевого пузыря и пищевода на 50% (3–7 лет)',
      'Риск инсульта снижен до уровня никогда не курившего человека (5 лет)',
      'Риск рака легких снижен вдвое (10 лет)',
      'Общая смертность и риск всех причин сравниваются со здоровой популяцией (15–20 лет)',
    ],
    indicatorTemplates: [
      {
        id: 'ind-stroke-risk',
        name: 'Нормализация риска инсульта (до уровня некурящих)',
        category: 'cardiovascular',
        startValue: 'Повышен в 3 раза',
        targetValue: 'Уровень некурящего',
        durationSec: 5 * 365 * 86400,
        description: 'Ауторегуляция церебрального кровотока и предотвращение кальцификации мозговых артерий.',
        medicalInsight: 'Через 5 лет риск инсульта полностью сравнивается со здоровым человеком.',
        icon: '🧠',
        calcValue: (p) => p >= 100 ? '100% (Норма некурящего)' : `${Math.round(p)}% защиты`,
      },
      {
        id: 'ind-lung-cancer-risk',
        name: 'Снижение риска рака легких',
        category: 'oxygen',
        startValue: 'Высокий риск',
        targetValue: '-50% риска онкологии',
        durationSec: 10 * 365 * 86400,
        description: 'Элиминация предраковых метаплазий бронхиального эпителия и репарация ДНК-аддуктов.',
        medicalInsight: 'Смертность от рака легких уменьшается вдвое к 10-летнему юбилею свободы.',
        icon: '🛡️',
        calcValue: (p) => `-${Math.round(50 * (p / 100))}% риска`,
      },
      {
        id: 'ind-total-longevity',
        name: 'Индекс возвращенного долголетия',
        category: 'cardiovascular',
        startValue: '-10 лет жизни',
        targetValue: '+10 лет полной жизни',
        durationSec: 15 * 365 * 86400,
        description: 'Компенсация потерянных лет жизни и выравнивание кривой дожития.',
        medicalInsight: 'Вы полностью вернули себе десятилетие здоровой, активной и радостной жизни.',
        icon: '🏆',
        calcValue: (p) => `+${(10 * (p / 100)).toFixed(1)} лет жизни`,
      },
    ],
  },
];

/**
 * Calculates physiological recovery phases and dynamic indicators based on user total clean seconds.
 */
export function calculatePhysiologicalPhases(totalSeconds: number): PhysiologicalPhase[] {
  return RECOVERY_PHASES_CONFIG.map((phaseDef) => {
    let status: 'completed' | 'in-progress' | 'upcoming' = 'upcoming';
    let progressPercent = 0;

    if (totalSeconds >= phaseDef.endSec) {
      status = 'completed';
      progressPercent = 100;
    } else if (totalSeconds > phaseDef.startSec) {
      status = 'in-progress';
      const range = phaseDef.endSec - phaseDef.startSec;
      const elapsed = totalSeconds - phaseDef.startSec;
      progressPercent = Math.min(99, Math.max(1, Math.round((elapsed / range) * 100)));
    } else {
      status = 'upcoming';
      progressPercent = 0;
    }

    // Indicators calculation
    const indicators: PhysiologicalIndicator[] = phaseDef.indicatorTemplates.map((template) => {
      let indProgress = 0;
      if (totalSeconds >= template.durationSec) {
        indProgress = 100;
      } else {
        indProgress = Math.min(100, Math.max(0, Math.round((totalSeconds / template.durationSec) * 100)));
      }

      return {
        id: template.id,
        name: template.name,
        category: template.category,
        currentValue: template.calcValue(indProgress),
        targetValue: template.targetValue,
        progressPercent: indProgress,
        timeToCompleteSec: template.durationSec,
        description: template.description,
        medicalInsight: template.medicalInsight,
        icon: template.icon,
      };
    });

    // Associated WHO milestones for this phase
    const milestones = WHO_HEALTH_MILESTONES.filter((m) => {
      return m.secondsRequired > phaseDef.startSec && m.secondsRequired <= phaseDef.endSec;
    });

    return {
      id: phaseDef.id,
      phaseNumber: phaseDef.phaseNumber,
      name: phaseDef.name,
      subtitle: phaseDef.subtitle,
      durationRange: phaseDef.durationRange,
      startSec: phaseDef.startSec,
      endSec: phaseDef.endSec,
      status,
      progressPercent,
      description: phaseDef.description,
      keyChanges: phaseDef.keyChanges,
      indicators,
      milestones,
    };
  });
}
