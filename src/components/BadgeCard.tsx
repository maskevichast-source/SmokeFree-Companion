import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
  Award,
  Zap,
  ShieldAlert,
  Info,
  ExternalLink,
} from 'lucide-react';
import { BadgeItem } from '../types';

interface BadgeCardProps {
  badge: BadgeItem;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Tier color styling
  const getTierStyles = (tier: BadgeItem['tier'], isUnlocked: boolean) => {
    if (!isUnlocked) {
      return {
        cardBorder: 'border-slate-800 hover:border-slate-700 bg-slate-900/60',
        badgeBg: 'bg-slate-800/80 text-slate-500 border-slate-700',
        glow: '',
        rarityBadge: 'bg-slate-800 text-slate-400 border-slate-700',
        progressBar: 'bg-slate-700',
      };
    }

    switch (tier) {
      case 'bronze':
        return {
          cardBorder: 'border-amber-700/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 hover:border-amber-600/60',
          badgeBg: 'bg-amber-700/20 text-amber-400 border-amber-600/40',
          glow: 'shadow-lg shadow-amber-900/20',
          rarityBadge: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
          progressBar: 'bg-amber-500',
        };
      case 'silver':
        return {
          cardBorder: 'border-slate-400/40 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/40 hover:border-slate-300/60',
          badgeBg: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
          glow: 'shadow-lg shadow-slate-500/10',
          rarityBadge: 'bg-slate-800/90 text-slate-200 border-slate-500/40',
          progressBar: 'bg-slate-300',
        };
      case 'gold':
        return {
          cardBorder: 'border-amber-400/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-900/30 hover:border-amber-300 shadow-xl shadow-amber-500/10',
          badgeBg: 'bg-amber-400/25 text-amber-300 border-amber-400/60 ring-1 ring-amber-400/30',
          glow: 'shadow-xl shadow-amber-500/20',
          rarityBadge: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
          progressBar: 'bg-amber-400',
        };
      case 'platinum':
        return {
          cardBorder: 'border-teal-400/50 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/30 hover:border-teal-300 shadow-xl shadow-teal-500/10',
          badgeBg: 'bg-teal-400/20 text-teal-300 border-teal-400/60 ring-1 ring-teal-400/30',
          glow: 'shadow-xl shadow-teal-500/20',
          rarityBadge: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
          progressBar: 'bg-teal-400',
        };
      case 'diamond':
        return {
          cardBorder: 'border-cyan-400/60 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 hover:border-cyan-300 shadow-2xl shadow-cyan-500/20 ring-1 ring-cyan-400/30',
          badgeBg: 'bg-cyan-400/25 text-cyan-200 border-cyan-400/70 ring-2 ring-cyan-400/40',
          glow: 'shadow-2xl shadow-cyan-500/30',
          rarityBadge: 'bg-cyan-950 text-cyan-300 border-cyan-400/60',
          progressBar: 'bg-gradient-to-r from-cyan-400 to-sky-300',
        };
      case 'mythic':
        return {
          cardBorder: 'border-purple-400/70 bg-gradient-to-br from-slate-900 via-purple-950/20 to-pink-950/30 hover:border-purple-300 shadow-2xl shadow-purple-500/25 ring-2 ring-purple-500/40',
          badgeBg: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border-purple-400 ring-2 ring-pink-400/50',
          glow: 'shadow-2xl shadow-purple-500/40',
          rarityBadge: 'bg-purple-950 text-pink-300 border-pink-500/60',
          progressBar: 'bg-gradient-to-r from-purple-400 to-pink-400',
        };
      default:
        return {
          cardBorder: 'border-slate-800 bg-slate-900',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          glow: '',
          rarityBadge: 'bg-slate-800 text-slate-300 border-slate-700',
          progressBar: 'bg-emerald-500',
        };
    }
  };

  const styles = getTierStyles(badge.tier, badge.isUnlocked);

  return (
    <div className="perspective-1000 w-full h-[270px] select-none">
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className={`relative w-full h-full duration-500 transform-style-3d cursor-pointer transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT FACE OF BADGE */}
        <div
          className={`absolute inset-0 w-full h-full rounded-3xl border p-5 flex flex-col justify-between backface-hidden ${styles.cardBorder} ${styles.glow} transition-all`}
        >
          {/* Unlocked Shimmer Effect Overlay */}
          {badge.isUnlocked && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="w-full h-full animate-shimmer" />
            </div>
          )}

          {/* Top Row: Rarity & Tier Points */}
          <div className="flex items-center justify-between z-10">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${styles.rarityBadge}`}
            >
              {badge.rarity} &bull; {badge.tier.toUpperCase()}
            </span>

            <div className="flex items-center gap-1">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded-lg border border-slate-800">
                <Sparkles className="w-3 h-3 text-amber-400" />
                +{badge.points} XP
              </span>
            </div>
          </div>

          {/* Central Emblem & Title */}
          <div className="flex items-center gap-3.5 my-auto z-10">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border relative transition-transform group-hover:scale-105 ${styles.badgeBg}`}
            >
              <span>{badge.icon}</span>
              {badge.isUnlocked ? (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center border-2 border-slate-900 shadow">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center border-2 border-slate-800 shadow">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-base font-black text-slate-100 truncate tracking-tight">
                {badge.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                {badge.subtitle}
              </p>
              <span className="text-[11px] font-mono text-emerald-400/90 block mt-1">
                {badge.requirement}
              </span>
            </div>
          </div>

          {/* Bottom Row: Progress or Unlocked Banner + Flip Prompt */}
          <div className="z-10 pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                {badge.isUnlocked ? 'Статус:' : 'Прогресс:'}
              </span>
              <span
                className={`font-bold ${
                  badge.isUnlocked ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {badge.isUnlocked ? '✓ ПОЛУЧЕНО' : `${badge.currentProgressText} (${badge.progressPercent}%)`}
              </span>
            </div>

            {!badge.isUnlocked && (
              <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80">
                <div
                  className={`h-full rounded-full ${styles.progressBar} transition-all duration-500`}
                  style={{ width: `${badge.progressPercent}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 hover:text-slate-400">
              <RotateCcw className="w-3 h-3" />
              <span>Нажми для науки и деталей ↻</span>
            </div>
          </div>
        </div>

        {/* BACK FACE OF BADGE (Medical Insight, Full Lore, Criteria) */}
        <div
          className={`absolute inset-0 w-full h-full rounded-3xl border p-5 flex flex-col justify-between rotate-y-180 backface-hidden bg-slate-950 border-slate-700/80 shadow-2xl space-y-3`}
        >
          {/* Back Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{badge.icon}</span>
              <div>
                <h5 className="text-xs font-bold text-slate-100">{badge.title}</h5>
                <span className="text-[10px] text-slate-400">{badge.requirement}</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${styles.rarityBadge}`}
            >
              {badge.rarity}
            </span>
          </div>

          {/* Description & Clinical Note */}
          <div className="space-y-2 overflow-y-auto pr-1 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {badge.description}
            </p>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[10px] uppercase">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Медицинское обоснование (ВОЗ):</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug italic">
                {badge.medicalInsight}
              </p>
            </div>
          </div>

          {/* Back Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 font-mono font-bold">
              +{badge.points} Очков свободы
            </span>
            <span className="text-slate-400 flex items-center gap-1 hover:text-slate-200">
              <RotateCcw className="w-3 h-3" />
              <span>Повернуть карту ↻</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
