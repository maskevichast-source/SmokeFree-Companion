import React, { useState } from 'react';
import { Smile, Sparkles, Send, Calendar, Clock, ChevronDown, ChevronUp, Check, Flame, MessageSquare, History } from 'lucide-react';
import { MoodRecord } from '../types';
import { playMilestoneChime } from '../utils/audioFeedback';

interface MoodLoggerCardProps {
  daysClean: number;
  cigarettesAvoided: number;
  moods: MoodRecord[];
  onLogMood: (score: number, note?: string, tags?: string[]) => void;
}

const MOOD_LEVELS = [
  {
    score: 1,
    emoji: '😫',
    label: 'Тяжело',
    sublabel: 'Острая тяга / стресс',
    color: 'from-rose-500/20 to-red-950/40 border-rose-500/40 text-rose-300 hover:border-rose-400',
    selectedRing: 'ring-2 ring-rose-500 bg-rose-500/20 text-rose-200',
  },
  {
    score: 2,
    emoji: '😕',
    label: 'Нестабильно',
    sublabel: 'Раздражительность',
    color: 'from-orange-500/20 to-amber-950/40 border-orange-500/40 text-orange-300 hover:border-orange-400',
    selectedRing: 'ring-2 ring-orange-500 bg-orange-500/20 text-orange-200',
  },
  {
    score: 3,
    emoji: '😐',
    label: 'Нормально',
    sublabel: 'Держусь ровно',
    color: 'from-amber-500/20 to-slate-900 border-amber-500/40 text-amber-300 hover:border-amber-400',
    selectedRing: 'ring-2 ring-amber-500 bg-amber-500/20 text-amber-200',
  },
  {
    score: 4,
    emoji: '🙂',
    label: 'Хорошо',
    sublabel: 'Уверенность & ясность',
    color: 'from-emerald-500/20 to-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400',
    selectedRing: 'ring-2 ring-emerald-500 bg-emerald-500/20 text-emerald-200',
  },
  {
    score: 5,
    emoji: '🌟',
    label: 'Превосходно',
    sublabel: 'Эйфория свободы',
    color: 'from-teal-500/20 to-cyan-950/40 border-teal-500/40 text-teal-300 hover:border-teal-400',
    selectedRing: 'ring-2 ring-teal-400 bg-teal-500/20 text-teal-200',
  },
];

const PRESET_TAGS = [
  '💪 Гордость',
  '🫁 Легкое дыхание',
  '☕ Кофе без дыма',
  '🧘 Спокойствие',
  '⚡ Прилив энергии',
  '😴 Глубокий сон',
  '🥊 Отразил тягу',
  '💼 Рабочий стресс',
];

export const MoodLoggerCard: React.FC<MoodLoggerCardProps> = ({
  daysClean,
  cigarettesAvoided,
  moods,
  onLogMood,
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveMood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScore) return;

    onLogMood(selectedScore, noteText.trim() || undefined, selectedTags.length > 0 ? selectedTags : undefined);

    playMilestoneChime();
    setJustLogged(true);
    setTimeout(() => {
      setJustLogged(false);
      setSelectedScore(null);
      setSelectedTags([]);
      setNoteText('');
    }, 2000);
  };

  const averageScore = moods.length > 0
    ? (moods.reduce((acc, m) => acc + m.score, 0) / moods.length).toFixed(1)
    : '0';

  const todayLogged = moods.some((m) => {
    const d = new Date(m.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Дневник настроения & Эмоциональный радар
              {todayLogged && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Сегодня отмечено
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Связь между днями без сигарет ({daysClean.toFixed(1)} дн.) и эмоциональным подъемом
            </p>
          </div>
        </div>

        {moods.length > 0 && (
          <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
            <span className="text-slate-400">Ср. настроение:</span>
            <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-400">
              {averageScore} / 5.0
            </span>
          </div>
        )}
      </div>

      {justLogged ? (
        <div className="py-8 text-center space-y-2 animate-fadeIn">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-emerald-300">Настроение записано!</h4>
          <p className="text-xs text-slate-400">
            Данные добавлены в корреляционный график аналитики. Продолжайте чистый трек!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSaveMood} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Как вы чувствуете себя прямо сейчас? (Шкала 1–5):
            </label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {MOOD_LEVELS.map((lvl) => {
                const isSelected = selectedScore === lvl.score;
                return (
                  <button
                    key={lvl.score}
                    type="button"
                    onClick={() => setSelectedScore(lvl.score)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? lvl.selectedRing
                        : `bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400`
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl transition-transform transform group-hover:scale-110">
                      {lvl.emoji}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200 line-clamp-1">
                      {lvl.label}
                    </span>
                    <span className="text-[9px] text-slate-400 hidden sm:block">
                      {lvl.score}/5
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedScore !== null && (
            <div className="space-y-3 pt-2 animate-fadeIn">
              {/* Quick Tags */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
                  Что повлияло на ваше состояние? (опционально):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((tag) => {
                    const isTagActive = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isTagActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note input */}
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Заметка: например, легко провел вечер без желания покурить..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  🚭 Не выкурено за трек: <strong className="text-emerald-400">{cigarettesAvoided} шт.</strong>
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Сохранить оценку</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* History toggle */}
      {moods.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>История записей настроения ({moods.length})</span>
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
              {moods.slice().reverse().map((m) => {
                const lvl = MOOD_LEVELS.find((l) => l.score === m.score) || MOOD_LEVELS[2];
                const dateStr = new Date(m.timestamp).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl shrink-0">{m.emoji || lvl.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{lvl.label} ({m.score}/5)</span>
                          <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                        </div>
                        {m.note && <p className="text-slate-300 text-[11px] mt-0.5">{m.note}</p>}
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                      День {m.daysClean?.toFixed(1) || '0'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
