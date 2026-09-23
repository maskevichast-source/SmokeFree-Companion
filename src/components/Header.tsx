import React from 'react';
import { ShieldCheck, Smartphone, Monitor, Activity, Cpu, FileCode2, Sparkles, HeartPulse, BarChart3, Bot, Users } from 'lucide-react';

export type MainTabType = 'companion' | 'health' | 'social' | 'analytics' | 'coach' | 'audit' | 'architecture' | 'patches';

interface HeaderProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  isMobilePreview: boolean;
  setIsMobilePreview: (val: boolean) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMobilePreview,
  setIsMobilePreview,
  onOpenSettings,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 text-white font-bold text-lg">
            SF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-100 tracking-tight">SmokeFree Companion</span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Persisted Backend
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Аналитика &bull; 32 этапа здоровья &bull; Соц-лидерборд &bull; КПТ-коуч
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs font-medium overflow-x-auto">
          <button
            id="tab-companion"
            onClick={() => setActiveTab('companion')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'companion'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Трекер</span>
          </button>

          <button
            id="tab-health"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            <span>Здоровье (32)</span>
          </button>

          <button
            id="tab-social"
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'social'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Соц-круг</span>
          </button>

          <button
            id="tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Аналитика & Тесты</span>
          </button>

          <button
            id="tab-coach"
            onClick={() => setActiveTab('coach')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'coach'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Коуч</span>
          </button>

          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap hidden md:flex ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Аудит</span>
          </button>

          <button
            id="tab-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap hidden lg:flex ${
              activeTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Редеплой</span>
          </button>

          <button
            id="tab-patches"
            onClick={() => setActiveTab('patches')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap hidden lg:flex ${
              activeTab === 'patches'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Патчи</span>
          </button>
        </nav>

        {/* Right Controls: Telegram Frame toggle & Profile Settings */}
        <div className="flex items-center gap-2">
          {activeTab === 'companion' && (
            <button
              id="toggle-preview-mode"
              onClick={() => setIsMobilePreview(!isMobilePreview)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isMobilePreview
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title={isMobilePreview ? 'Переключить на полный экран' : 'Включить вид Telegram Mini App (iPhone)'}
            >
              {isMobilePreview ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              <span className="hidden xl:inline">{isMobilePreview ? 'Десктоп' : 'Mini App'}</span>
            </button>
          )}

          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Настройки</span>
          </button>
        </div>
      </div>
    </header>
  );
};

