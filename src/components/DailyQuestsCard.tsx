import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Flame,
  Award,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { DailyQuestItem, getTodayQuests } from '../data/dailyQuests';
import { playMilestoneChime } from '../utils/audioFeedback';

interface DailyQuestsCardProps {
  daysFree: number;
  onQuestCompleted?: (quest: DailyQuestItem) => void;
  showToast?: (msg: string) => void;
}

export const DailyQuestsCard: React.FC<DailyQuestsCardProps> = ({
  daysFree,
  onQuestCompleted,
  showToast,
}) => {
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`smokefree_quests_${today}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('smokefree_quest_streak');
      return saved ? parseInt(saved, 10) : Math.max(1, Math.min(7, Math.floor(daysFree)));
    } catch {
      return 1;
    }
  });

  const quests = getTodayQuests(completedIds);
  const completedCount = quests.filter((q) => q.isCompleted).length;
  const progressPercent = Math.round((completedCount / quests.length) * 100);
  const isAllCompleted = completedCount === quests.length;

  const handleToggleQuest = (quest: DailyQuestItem) => {
    if (quest.isCompleted) return; // Once completed for the day

    const today = new Date().toISOString().slice(0, 10);
    const updated = [...completedIds, quest.id];
    setCompletedIds(updated);

    try {
      localStorage.setItem(`smokefree_quests_${today}`, JSON.stringify(updated));
    } catch {}

    playMilestoneChime();

    if (updated.length === quests.length) {
      const newStreak = streakDays + 1;
      setStreakDays(newStreak);
      try {
        localStorage.setItem('smokefree_quest_streak', newStreak.toString());
      } catch {}
      if (showToast) showToast(`🎉 ВСЕ КВЕСТЫ ВЫПОЛНЕНЫ! Бонус дня +50 XP! Стрик: ${newStreak} дн. 🔥`);
    } else {
      if (showToast) showToast(`✓ Квест «${quest.title}» выполнен! +${quest.rewardXp} XP`);
    }

    if (onQuestCompleted) onQuestCompleted(quest);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-100">
                Дневные микро-квесты
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Стрик {streakDays} дн.
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              3 микро-задачи для защиты чистого трека на сегодня
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400">
            {completedCount} / {quests.length}
          </span>
          <span className="text-[10px] text-slate-400 block">закрыто</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Quest Items */}
      <div className="space-y-2.5">
        {quests.map((q) => (
          <div
            key={q.id}
            onClick={() => handleToggleQuest(q)}
            className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group ${
              q.isCompleted
                ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400 group-hover:text-emerald-400 transition-colors">
                {q.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 shrink-0" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{q.icon}</span>
                  <strong
                    className={`text-xs font-bold ${
                      q.isCompleted ? 'line-through text-slate-400' : 'text-slate-200'
                    }`}
                  >
                    {q.title}
                  </strong>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {q.categoryLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{q.description}</p>
              </div>
            </div>

            <span
              className={`shrink-0 text-xs font-mono font-bold px-2 py-1 rounded-xl ${
                q.isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              +{q.rewardXp} XP
            </span>
          </div>
        ))}
      </div>

      {/* Completion Banner */}
      {isAllCompleted && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <strong className="text-amber-300 block">ДЕНЬ ИДЕАЛЬНОЙ ЧИСТОТЫ!</strong>
              <span className="text-[11px] text-slate-300">
                Все задачи дня закрыты. Стрик обновлен!
              </span>
            </div>
          </div>
          <span className="font-black text-amber-400 font-mono">+50 XP BONUS</span>
        </div>
      )}
    </div>
  );
};
