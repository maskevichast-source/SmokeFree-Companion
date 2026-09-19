import React, { useState } from 'react';
import { Settings, X, Clock, Check, Download, Upload, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { UserProfile, NicotineType, CurrencyType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onExportData?: () => void;
  onImportData?: (jsonData: string) => void;
  onResetData?: () => void;
}

const NICOTINE_OPTIONS: NicotineType[] = [
  'Сигареты',
  'IQOS / glo',
  'Вейп / Pod',
  'Одноразки (HQD)',
  'Кальян',
  'Снюс',
];

const CURRENCY_OPTIONS: { code: CurrencyType; symbol: string; label: string; presets: number[] }[] = [
  { code: 'KZT', symbol: '₸', label: 'Тенге (₸ KZT)', presets: [700, 900, 1100, 1400, 1800] },
  { code: 'RUB', symbol: '₽', label: 'Рубли (₽ RUB)', presets: [160, 200, 240, 280, 350] },
  { code: 'USD', symbol: '$', label: 'Доллары ($ USD)', presets: [5, 8, 10, 12, 16] },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onExportData,
  onImportData,
  onResetData,
}) => {
  const [name, setName] = useState(profile.name);
  const [quitAt, setQuitAt] = useState(profile.quitAt.slice(0, 16));
  const [nicotineType, setNicotineType] = useState<NicotineType>(profile.nicotineType);
  const [currency, setCurrency] = useState<CurrencyType>(profile.currency);
  const [packPrice, setPackPrice] = useState(profile.packPrice);
  const [unitsPerDay, setUnitsPerDay] = useState(profile.unitsPerDay);
  const [financialGoal, setFinancialGoal] = useState(profile.financialGoal);
  const [financialGoalLabel, setFinancialGoalLabel] = useState(profile.financialGoalLabel);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const currentCurrencyConfig = CURRENCY_OPTIONS.find((c) => c.code === currency) || CURRENCY_OPTIONS[0];

  const setPreset = (preset: 'now' | '1h' | 'today8' | 'yesterday20' | '3d') => {
    const now = new Date();
    if (preset === '1h') {
      now.setHours(now.getHours() - 1);
    } else if (preset === 'today8') {
      now.setHours(8, 0, 0, 0);
    } else if (preset === 'yesterday20') {
      now.setDate(now.getDate() - 1);
      now.setHours(20, 0, 0, 0);
    } else if (preset === '3d') {
      now.setDate(now.getDate() - 3);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setQuitAt(local);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...profile,
      name: name.trim() || 'Друг',
      quitAt: new Date(quitAt).toISOString(),
      nicotineType,
      currency,
      currencySymbol: currentCurrencyConfig.symbol,
      packPrice: Math.max(1, packPrice),
      unitsPerDay: Math.max(0.5, unitsPerDay),
      financialGoal: Math.max(0, financialGoal),
      financialGoalLabel: financialGoalLabel.trim() || 'Подарок себе',
      timezone,
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportData) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        onImportData(content);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-emerald-950/30">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2 text-emerald-400">
            <Settings className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-100">Настройки трекера и привычек</h3>
              <p className="text-[11px] text-slate-400">Точная адаптация под личный темп и валюту</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Name & Timezone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Часовой пояс</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                <option value="Asia/Almaty">Asia/Almaty (UTC+5)</option>
                <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
                <option value="Asia/Bishkek">Asia/Bishkek (UTC+6)</option>
                <option value="Asia/Tbilisi">Asia/Tbilisi (UTC+4)</option>
                <option value="Europe/Kyiv">Europe/Kyiv (UTC+2)</option>
                <option value="UTC">UTC (GMT)</option>
              </select>
            </div>
          </div>

          {/* Start Point & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Точное время последней сигареты</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setPreset('now')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Только что
              </button>
              <button
                type="button"
                onClick={() => setPreset('1h')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                1 час назад
              </button>
              <button
                type="button"
                onClick={() => setPreset('today8')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Сегодня в 08:00
              </button>
              <button
                type="button"
                onClick={() => setPreset('yesterday20')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Вчера в 20:00
              </button>
              <button
                type="button"
                onClick={() => setPreset('3d')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                3 дня назад
              </button>
            </div>
            <input
              type="datetime-local"
              value={quitAt}
              onChange={(e) => setQuitAt(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Nicotine Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Тип никотинового продукта
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {NICOTINE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNicotineType(opt)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center truncate transition-colors ${
                    nicotineType === opt
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-850 text-slate-400 border-slate-750 hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Currency & Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Валюта</label>
              <select
                value={currency}
                onChange={(e) => {
                  const newCurr = e.target.value as CurrencyType;
                  setCurrency(newCurr);
                  const cfg = CURRENCY_OPTIONS.find((c) => c.code === newCurr);
                  if (cfg && cfg.presets.length > 0) {
                    setPackPrice(cfg.presets[1]);
                  }
                }}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Цена пачки / единицы ({currentCurrencyConfig.symbol})
              </label>
              <input
                type="number"
                min="1"
                value={packPrice}
                onChange={(e) => setPackPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick pack price presets */}
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Быстрый выбор цены:</div>
            <div className="flex flex-wrap gap-1.5">
              {currentCurrencyConfig.presets.map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setPackPrice(price)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors ${
                    packPrice === price
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {price} {currentCurrencyConfig.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Штук в день раньше</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={unitsPerDay}
                onChange={(e) => setUnitsPerDay(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Цель накопления ({currentCurrencyConfig.symbol})
              </label>
              <input
                type="number"
                min="0"
                value={financialGoal}
                onChange={(e) => setFinancialGoal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Название цели</label>
            <input
              type="text"
              value={financialGoalLabel}
              onChange={(e) => setFinancialGoalLabel(e.target.value)}
              placeholder="Новый смартфон, путешествие, спортзал..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Backup & Export Section */}
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Резервное копирование и безопасность</span>
            </div>
            <div className="flex items-center gap-2">
              {onExportData && (
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Скачать JSON бэкап</span>
                </button>
              )}
              {onImportData && (
                <label className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Загрузить бэкап</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Danger Zone: Reset */}
            {onResetData && (
              <div className="pt-2 border-t border-slate-800/80">
                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Сбросить данные и начать трекер заново</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Вы уверены? Это действие сотрет историю.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onResetData();
                          setShowResetConfirm(false);
                          onClose();
                        }}
                        className="py-1 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold"
                      >
                        Да, сбросить
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить профиль</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
