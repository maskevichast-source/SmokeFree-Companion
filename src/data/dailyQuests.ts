export interface DailyQuestItem {
  id: string;
  title: string;
  category: 'mindset' | 'body' | 'craving_defense' | 'financial';
  categoryLabel: string;
  description: string;
  actionHint: string;
  rewardXp: number;
  icon: string;
  isCompleted: boolean;
}

export const BASE_DAILY_QUEST_POOL: Omit<DailyQuestItem, 'isCompleted'>[] = [
  {
    id: 'quest-water',
    title: 'Гидратация чистых легких',
    category: 'body',
    categoryLabel: 'Биохимия',
    description: 'Выпить стакан чистой воды при первом возникновении мысли о никотине',
    actionHint: 'Вода вымывает метаболиты и купирует сухость во рту',
    rewardXp: 25,
    icon: '💧',
  },
  {
    id: 'quest-breath',
    title: 'Дыхательный щит 4-7-8',
    category: 'craving_defense',
    categoryLabel: 'Нейропрактика',
    description: 'Выполнить 2-минутную дыхательную сессию (вдох 4с, задержка 7с, выдох 8с)',
    actionHint: 'Активирует блуждающий нерв и снижает кортизол',
    rewardXp: 40,
    icon: '🧘',
  },
  {
    id: 'quest-reason',
    title: 'Декларация свободы',
    category: 'mindset',
    categoryLabel: 'Осознанность',
    description: 'Сформулировать и проговорить вслух главную причину своего выбора быть некурящим',
    actionHint: 'Укрепляет префронтальную кору и самоидентификацию',
    rewardXp: 30,
    icon: '✨',
  },
  {
    id: 'quest-trigger-audit',
    title: 'Аудит триггер-радара',
    category: 'craving_defense',
    categoryLabel: 'Безопасность',
    description: 'Проверить опасные часы в радаре и подготовить план отвлечения на сегодня',
    actionHint: 'Предупрежден — значит вооружен',
    rewardXp: 35,
    icon: '🛡️',
  },
  {
    id: 'quest-savings-check',
    title: 'Фиксация сбережений',
    category: 'financial',
    categoryLabel: 'Финансы',
    description: 'Открыть раздел Аналитика и проверить прогресс к недельному рубежу или цели',
    actionHint: 'Положительное финансовое подкрепление победы',
    rewardXp: 25,
    icon: '💰',
  },
  {
    id: 'quest-cbt-mind',
    title: 'КПТ-переосмысление 1 ловушки',
    category: 'mindset',
    categoryLabel: 'КПТ',
    description: 'Разобрать одну никотиновую иллюзию в тренажере мышления',
    actionHint: 'Разрушает миф о ценности сигареты',
    rewardXp: 45,
    icon: '🧠',
  },
];

export function getTodayQuests(completedQuestIds: string[] = []): DailyQuestItem[] {
  // Select 3 deterministic quests for today
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const pool = [...BASE_DAILY_QUEST_POOL];
  const selected: DailyQuestItem[] = [];

  for (let i = 0; i < 3; i++) {
    const idx = (absHash + i * 2) % pool.length;
    const item = pool.splice(idx, 1)[0];
    selected.push({
      ...item,
      isCompleted: completedQuestIds.includes(item.id),
    });
  }

  return selected;
}
