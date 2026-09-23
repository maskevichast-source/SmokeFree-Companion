import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  ChevronRight,
  Flame,
  ArrowRight,
  Volume2,
  Copy,
  Check,
  HelpCircle,
  Clock,
  Heart,
  Lightbulb,
} from 'lucide-react';
import { CBT_THOUGHT_EXERCISES, CbtThoughtExercise } from '../data/cbtReframing';
import { playMilestoneChime } from '../utils/audioFeedback';

interface CbtReframingViewProps {
  onXpEarned?: (amount: number, reason: string) => void;
  showToast?: (msg: string) => void;
}

export const CbtReframingView: React.FC<CbtReframingViewProps> = ({ onXpEarned, showToast }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedExercise, setSelectedExercise] = useState<CbtThoughtExercise | null>(null);
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_cbt_mastered');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredExercises = CBT_THOUGHT_EXERCISES.filter((ex) => {
    if (activeCategory === 'all') return true;
    return ex.category === activeCategory;
  });

  const handleMasterExercise = (ex: CbtThoughtExercise) => {
    if (!masteredIds.includes(ex.id)) {
      const updated = [...masteredIds, ex.id];
      setMasteredIds(updated);
      try {
        localStorage.setItem('smokefree_cbt_mastered', JSON.stringify(updated));
      } catch {}

      playMilestoneChime();
      if (onXpEarned) onXpEarned(ex.xp, `КПТ-проработка: ${ex.categoryLabel}`);
      if (showToast) showToast(`🧠 Ловушка мышления успешно обезврежена! +${ex.xp} XP`);
    } else {
      if (showToast) showToast('Вы уже закрепили этот навык!');
    }
  };

  const handleCopyAffirmation = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showToast) showToast('Фраза-щит скопирована!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                КПТ-тренажер мышления
              </span>
              <span className="text-xs text-slate-400">Когнитивное переосмысление иллюзий</span>
            </div>
            <h3 className="text-xl font-black text-slate-100 tracking-tight">
              Разрушение никотиновых самообманов
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Тяга к никотину на 80% состоит из психологических рационализаций («мне нужно расслабиться», «только одна затяжка»). Обезвредь автоматическую мысль до того, как она превратится в срыв.
            </p>
          </div>

          <div className="bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800 shrink-0 text-center">
            <span className="text-[11px] text-slate-400 block">Освоено шаблонов:</span>
            <strong className="text-lg font-black text-purple-400 font-mono">
              {masteredIds.length} из {CBT_THOUGHT_EXERCISES.length}
            </strong>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-xs font-semibold relative z-10">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'all'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Все ({CBT_THOUGHT_EXERCISES.length})
          </button>
          <button
            onClick={() => setActiveCategory('craving_excuse')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'craving_excuse'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            ⚡ Одна затяжка / Скука
          </button>
          <button
            onClick={() => setActiveCategory('stress_relief')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'stress_relief'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            🧘 Антистресс
          </button>
          <button
            onClick={() => setActiveCategory('social_pressure')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'social_pressure'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            👥 Курилка и социум
          </button>
          <button
            onClick={() => setActiveCategory('identity_fear')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeCategory === 'identity_fear'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            🫁 Здоровье и сомнения
          </button>
        </div>
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExercises.map((ex) => {
          const isMastered = masteredIds.includes(ex.id);
          const isExpanded = selectedExercise?.id === ex.id;

          return (
            <div
              key={ex.id}
              className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                isMastered
                  ? 'bg-slate-900/90 border-purple-500/30 hover:border-purple-500/60'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => setSelectedExercise(isExpanded ? null : ex)}
                className="p-5 cursor-pointer select-none space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{ex.icon}</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                        {ex.categoryLabel}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{ex.trapTitle}</h4>
                    </div>
                  </div>
                  {isMastered ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-purple-400" />
                      <span>Освоено</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 shrink-0">
                      +{ex.xp} XP
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-rose-300/90 italic flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{ex.illusion}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>{isExpanded ? 'Свернуть разбор ▲' : 'Развернуть КПТ-разбор ▼'}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded Full Protocol */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 text-xs bg-slate-950/40">
                  {/* Neurobiology Reality */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      1. Биохимическая реальность (Neuro-Truth)
                    </span>
                    <p className="text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                      {ex.neuroReality}
                    </p>
                  </div>

                  {/* CBT Reframe */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      2. Железное КПТ-переосмысление
                    </span>
                    <p className="text-slate-100 font-medium leading-relaxed bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-900/40">
                      {ex.cbtReframe}
                    </p>
                  </div>

                  {/* Affirmation Shield */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        3. Фраза-щит (Повтори вслух)
                      </span>
                      <button
                        onClick={() => handleCopyAffirmation(ex.counterAffirmation, ex.id)}
                        className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        {copiedId === ex.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === ex.id ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 font-semibold text-center italic">
                      {ex.counterAffirmation}
                    </div>
                  </div>

                  {/* 60s Immediate Action */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      4. Действие на 60 секунд (Instant Shift)
                    </span>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-between gap-3">
                      <span>{ex.action60Sec}</span>
                    </div>
                  </div>

                  {/* Master Button */}
                  <button
                    onClick={() => handleMasterExercise(ex)}
                    className={`w-full py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                      isMastered
                        ? 'bg-slate-800 text-purple-300 border border-purple-500/30 hover:bg-slate-750'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isMastered ? '✓ Ловушка освоена и закреплена' : `Я осознал ловушку (+${ex.xp} XP)`}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
