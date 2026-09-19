import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface RelapseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { cigarettes: number; trigger: string; reflection: string; plan: string }) => void;
}

const COMMON_TRIGGERS = [
  'Стресс / Конфликт',
  'Алкоголь / Вечеринка',
  'Пробки / За рулем',
  'Кофе / Привычка',
  'Компания курящих',
  'Скука / Ожидание',
  'Сильная усталость',
];

export const RelapseModal: React.FC<RelapseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [cigarettes, setCigarettes] = useState<number>(1);
  const [trigger, setTrigger] = useState<string>('Стресс / Конфликт');
  const [reflection, setReflection] = useState<string>('');
  const [plan, setPlan] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cigarettes: Math.max(1, cigarettes),
      trigger: trigger.trim() || 'Стресс',
      reflection: reflection.trim() || 'Запись рефлексии',
      plan: plan.trim() || 'В следующий раз запущу 3-минутный SOS-протокол',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-amber-950/20">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-400">
            <RotateCcw className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-100">Протокол No-Shame Relapse</h3>
              <p className="text-[11px] text-slate-400">Честная фиксация без обнуления и чувства вины</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Supportive note */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100 font-semibold">Важное научное правило:</strong> Срыв — это не поражение твоей личности, а физиологический сбой автоматизма. Твой организм не вернулся в исходную точку: дни чистоты и очищение легких остаются с тобой.
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Сколько сигарет / стиков / затяжек было?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCigarettes(num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    cigarettes === num
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {num} шт.
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="50"
                value={cigarettes}
                onChange={(e) => setCigarettes(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-center text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Что послужило триггером?
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TRIGGERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTrigger(item)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    trigger === item
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Или напишите свой вариант..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Reflection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Что происходило за 5 минут до этого? (эмоция, мысль)
            </label>
            <textarea
              rows={2}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Например: сильно поругался по работе, возникло чувство бессилия..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Какой 1 конкретный шаг поможет в следующий раз в такой же ситуации?
            </label>
            <input
              type="text"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="Например: сразу налью стакан холодной воды и выйду из курилки"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Зафиксировать опыт</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
