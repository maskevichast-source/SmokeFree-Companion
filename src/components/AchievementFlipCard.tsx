import React, { useState, useRef } from 'react';
import { RotateCw, Sparkles, CheckCircle2, Lock, Award, ShieldCheck } from 'lucide-react';
import { AppAchievement } from '../data/achievements';
import { triggerBadgeExplosion, getFlippedBadges, markBadgeAsFlipped } from '../utils/confettiExplosion';

interface AchievementFlipCardProps {
  achievement: AppAchievement & { unlocked: boolean };
}

export const AchievementFlipCard: React.FC<AchievementFlipCardProps> = ({ achievement }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [flippedSet, setFlippedSet] = useState<Set<string>>(() => getFlippedBadges());
  const cardRef = useRef<HTMLDivElement>(null);

  const isNewlyUnlocked = achievement.unlocked && !flippedSet.has(achievement.id);

  const tierColors: Record<string, { border: string; text: string; bg: string; glow: string }> = {
    bronze: {
      border: 'border-amber-700/50',
      text: 'text-amber-400',
      bg: 'bg-amber-950/30',
      glow: 'shadow-amber-900/10',
    },
    silver: {
      border: 'border-slate-400/50',
      text: 'text-slate-200',
      bg: 'bg-slate-800/40',
      glow: 'shadow-slate-500/10',
    },
    gold: {
      border: 'border-amber-400/70',
      text: 'text-amber-300',
      bg: 'bg-amber-500/15',
      glow: 'shadow-amber-500/20 shadow-lg',
    },
    platinum: {
      border: 'border-cyan-400/70',
      text: 'text-cyan-300',
      bg: 'bg-cyan-950/40',
      glow: 'shadow-cyan-500/20 shadow-lg',
    },
    diamond: {
      border: 'border-blue-400/80',
      text: 'text-blue-300',
      bg: 'bg-blue-950/50',
      glow: 'shadow-blue-500/30 shadow-xl ring-1 ring-blue-400/30',
    },
    mythic: {
      border: 'border-purple-400/90',
      text: 'text-purple-300',
      bg: 'bg-purple-950/50',
      glow: 'shadow-purple-500/35 shadow-2xl ring-1 ring-purple-400/40',
    },
  };

  const tierLabels: Record<string, string> = {
    bronze: 'Бронза',
    silver: 'Серебро',
    gold: 'Золото',
    platinum: 'Платина',
    diamond: 'Алмаз',
    mythic: 'Мифик',
  };

  const tierStyle = tierColors[achievement.tier] || tierColors.bronze;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent accidental clicks on text selection
    const willFlipToBack = !isFlipped;
    setIsFlipped(willFlipToBack);

    if (achievement.unlocked) {
      const isFirst = !flippedSet.has(achievement.id);
      triggerBadgeExplosion(cardRef.current, achievement.tier, isFirst);

      if (isFirst) {
        markBadgeAsFlipped(achievement.id);
        setFlippedSet(new Set(getFlippedBadges()));
      }
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className="perspective-1000 cursor-pointer select-none group min-h-[175px]"
    >
      <div
        className={`relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ================= FRONT OF CARD ================= */}
        <div
          className={`w-full h-full p-4 rounded-2xl border backface-hidden flex flex-col justify-between transition-all ${
            achievement.unlocked
              ? `bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 ${tierStyle.border} ${tierStyle.glow}`
              : 'bg-slate-900/60 border-slate-800/80 opacity-70 hover:opacity-85'
          } ${isNewlyUnlocked ? 'ring-2 ring-amber-400/60 animate-pulse' : ''}`}
        >
          {/* Top Row: Icon + Details Header */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <span
                className={`text-3xl p-2.5 rounded-2xl bg-slate-950/90 border block transition-transform group-hover:scale-105 ${
                  achievement.unlocked ? tierStyle.border : 'border-slate-800'
                }`}
              >
                {achievement.icon}
              </span>
              {achievement.unlocked ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">
                  ✓
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-700">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                    {achievement.title}
                    {achievement.timeframe && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        {achievement.timeframe}
                      </span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Цель: {achievement.requirement}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierStyle.border} ${tierStyle.text} ${tierStyle.bg}`}
                  >
                    {tierLabels[achievement.tier] || 'Бронза'}
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-amber-400">
                    +{achievement.xpReward} XP
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
                {achievement.description}
              </p>
            </div>
          </div>

          {/* Bottom Row / Status & Flip Action */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
            {isNewlyUnlocked ? (
              <span className="flex items-center gap-1 font-bold text-amber-300 animate-bounce">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Нажмите чтобы взорвать салют!</span>
              </span>
            ) : (
              <span className="italic line-clamp-1 text-slate-400">
                {achievement.medicalNote}
              </span>
            )}

            <span className="flex items-center gap-1 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2">
              <RotateCw className="w-3 h-3" />
              <span>Инфо</span>
            </span>
          </div>
        </div>

        {/* ================= BACK OF CARD (REVEAL & INSIGHT) ================= */}
        <div
          className={`absolute inset-0 w-full h-full p-4 rounded-2xl border backface-hidden rotate-y-180 flex flex-col justify-between ${
            achievement.unlocked
              ? `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 ${tierStyle.border} ${tierStyle.glow}`
              : 'bg-slate-900/90 border-slate-800 text-slate-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xl">{achievement.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{achievement.title}</h4>
                  <span className={`text-[10px] font-semibold ${tierStyle.text}`}>
                    Ранг: {tierLabels[achievement.tier]} (+{achievement.xpReward} XP)
                  </span>
                </div>
              </div>

              {achievement.unlocked ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Открыто</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  <Lock className="w-3 h-3" />
                  <span>Заблокировано</span>
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-slate-200">Значение:</strong> {achievement.description}
              </p>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-emerald-300">
                <span className="font-bold text-emerald-400 block text-[10px] uppercase tracking-wider">
                  Медицинский факт:
                </span>
                {achievement.medicalNote}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase tracking-wider font-semibold text-slate-500">
              Категория: {achievement.category}
            </span>
            <span className="flex items-center gap-1 text-slate-400 hover:text-slate-200">
              <RotateCw className="w-3 h-3" />
              <span>Назад</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
