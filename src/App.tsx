import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, MainTabType } from './components/Header';
import { CompanionView } from './components/CompanionView';
import { HealthTimelineView } from './components/HealthTimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { AiCoachView } from './components/AiCoachView';
import { AuditView } from './components/AuditView';
import { ArchitectureView } from './components/ArchitectureView';
import { PatchesView } from './components/PatchesView';
import { SosModal } from './components/SosModal';
import { RelapseModal } from './components/RelapseModal';
import { SettingsModal } from './components/SettingsModal';
import {
  UserProfile,
  FreedomStats,
  TriggerItem,
  CravingRecord,
  RelapseRecord,
  ChatMessage,
  FullAppState,
} from './types';

// Default initial profile tailored for an Astana user or customizable to any city
const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default-1',
  name: 'Азамат',
  quitAt: new Date(Date.now() - 3.5 * 86400 * 1000).toISOString(), // 3.5 days ago as default demo
  nicotineType: 'Сигареты',
  currency: 'KZT',
  currencySymbol: '₸',
  packPrice: 1050,
  packSize: 20,
  unitsPerDay: 15,
  financialGoal: 150000,
  financialGoalLabel: 'Подарок себе к 30 дням',
  timezone: 'Asia/Almaty',
};

const DEFAULT_TRIGGERS: TriggerItem[] = [
  { id: 'trig-1', label: 'Утренний кофе перед выходом', time: '08:30', timeMinutes: 8 * 60 + 30, enabled: true },
  { id: 'trig-2', label: 'Обед и выход на перекур', time: '13:15', timeMinutes: 13 * 60 + 15, enabled: true },
  { id: 'trig-3', label: 'Вечерняя пробка на пр. Туран / Дорога домой', time: '18:45', timeMinutes: 18 * 60 + 45, enabled: true },
  { id: 'trig-4', label: 'Поздний сериал перед сном', time: '22:30', timeMinutes: 22 * 60 + 30, enabled: false },
];

const DEFAULT_CHAT: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'coach',
    text: 'Привет! Я твой КПТ-наставник по свободе от никотина. Каждая преодоленная тяга делает нейронные связи зависимости слабее. В чем тебе нужна поддержка прямо сейчас?',
    timestamp: new Date().toISOString(),
    persona: 'cbt',
  },
];

export default function App() {
  // Navigation & view states
  const [activeTab, setActiveTab] = useState<MainTabType>('companion');
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isBackendSynced, setIsBackendSynced] = useState(false);

  // Modals
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isRelapseOpen, setIsRelapseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('smokefree_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Triggers
  const [triggers, setTriggers] = useState<TriggerItem[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_triggers');
      return saved ? JSON.parse(saved) : DEFAULT_TRIGGERS;
    } catch {
      return DEFAULT_TRIGGERS;
    }
  });

  // Cravings
  const [cravings, setCravings] = useState<CravingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_cravings');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'c-1',
              intensity: 8,
              trigger: 'Кофе с коллегами',
              outcome: 'resisted',
              timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
            },
            {
              id: 'c-2',
              intensity: 7,
              trigger: 'Пробка на мосту',
              outcome: 'resisted',
              timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            },
          ];
    } catch {
      return [];
    }
  });

  // Relapses
  const [relapses, setRelapses] = useState<RelapseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_relapses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Chat Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_chat');
      return saved ? JSON.parse(saved) : DEFAULT_CHAT;
    } catch {
      return DEFAULT_CHAT;
    }
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync state to backend server for true persistence across redeploys
  const syncStateToBackend = useCallback(async (state: FullAppState) => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (res.ok) {
        setIsBackendSynced(true);
      }
    } catch (e) {
      console.warn('Backend sync failed, using localStorage fallback');
    }
  }, []);

  // Initial load from backend (with conflict-free timestamp comparison)
  useEffect(() => {
    async function loadBackendState() {
      try {
        const localSavedTime = localStorage.getItem('smokefree_updated_at') || '1970-01-01T00:00:00.000Z';
        const hasLocalCustomProfile = localStorage.getItem('smokefree_profile') !== null;

        const res = await fetch('/api/state');
        if (res.ok) {
          const remoteState: FullAppState = await res.json();
          const remoteTime = remoteState.updatedAt || '1970-01-01T00:00:00.000Z';

          if (new Date(remoteTime).getTime() >= new Date(localSavedTime).getTime() || !hasLocalCustomProfile) {
            if (remoteState.profile) setProfile(remoteState.profile);
            if (remoteState.triggers) setTriggers(remoteState.triggers);
            if (remoteState.cravings) setCravings(remoteState.cravings);
            if (remoteState.relapses) setRelapses(remoteState.relapses);
            if (remoteState.chatMessages) setChatMessages(remoteState.chatMessages);
            setIsBackendSynced(true);
          } else {
            // Local user state is newer; restore database on server
            const localState: FullAppState = {
              profile,
              triggers,
              cravings,
              relapses,
              chatMessages,
              updatedAt: new Date().toISOString(),
            };
            syncStateToBackend(localState);
          }
        } else {
          // Initialize server with local state
          const localState: FullAppState = {
            profile,
            triggers,
            cravings,
            relapses,
            chatMessages,
            updatedAt: new Date().toISOString(),
          };
          syncStateToBackend(localState);
        }
      } catch {
        // Fallback to localStorage
      }
    }
    loadBackendState();
  }, []);

  // Save to localStorage & trigger backend save
  useEffect(() => {
    try {
      const nowIso = new Date().toISOString();
      localStorage.setItem('smokefree_updated_at', nowIso);
      localStorage.setItem('smokefree_profile', JSON.stringify(profile));
      localStorage.setItem('smokefree_triggers', JSON.stringify(triggers));
      localStorage.setItem('smokefree_cravings', JSON.stringify(cravings));
      localStorage.setItem('smokefree_relapses', JSON.stringify(relapses));
      localStorage.setItem('smokefree_chat', JSON.stringify(chatMessages));

      const fullState: FullAppState = {
        profile,
        triggers,
        cravings,
        relapses,
        chatMessages,
        updatedAt: nowIso,
      };
      syncStateToBackend(fullState);
    } catch (e) {
      console.error(e);
    }
  }, [profile, triggers, cravings, relapses, chatMessages, syncStateToBackend]);

  // Current time state that ticks every second
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live FreedomStats
  const stats: FreedomStats = useMemo(() => {
    const quitTimeMs = new Date(profile.quitAt).getTime();
    const diffMs = Math.max(0, currentTime - quitTimeMs);
    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const fractionalDays = totalSeconds / 86400;

    // Price calculations
    const pricePerUnit = profile.packPrice / (profile.packSize || 20);
    const dailyExpense = profile.unitsPerDay * pricePerUnit;
    const moneySaved = fractionalDays * dailyExpense;

    // Health & Units calculations (BMJ standard: ~11 minutes per cigarette avoided)
    const cigarettesAvoided = Math.round(fractionalDays * profile.unitsPerDay);
    const minutesLifeReturned = Math.round(cigarettesAvoided * 11);

    // Total relapsed units deducted from clean score
    const totalRelapseUnits = relapses.reduce((acc, curr) => acc + curr.cigarettes, 0);
    const cleanTrackPercent =
      cigarettesAvoided > 0
        ? Math.max(0, Math.min(100, Math.round(((cigarettesAvoided - totalRelapseUnits) / cigarettesAvoided) * 100)))
        : 100;

    return {
      seconds,
      minutes,
      hours,
      days,
      totalSeconds,
      fractionalDays,
      moneySaved,
      dailyExpense,
      minutesLifeReturned,
      cigarettesAvoided,
      cleanTrackPercent,
      cravingsResistedCount: cravings.length,
      relapseCount: relapses.length,
    };
  }, [currentTime, profile, cravings, relapses]);

  // Trigger handlers
  const handleToggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleAddTrigger = (time: string, label: string) => {
    const [h, m] = time.split(':').map(Number);
    const newItem: TriggerItem = {
      id: `trig-${Date.now()}`,
      label,
      time,
      timeMinutes: h * 60 + m,
      enabled: true,
    };
    setTriggers((prev) => [...prev, newItem].sort((a, b) => a.timeMinutes - b.timeMinutes));
    showToast(`Точка радара «${label}» на ${time} добавлена!`);
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
  };

  // Action handlers
  const handleLogResisted = () => {
    const newCraving: CravingRecord = {
      id: `c-${Date.now()}`,
      intensity: 7,
      trigger: 'Спонтанная тяга',
      outcome: 'resisted',
      timestamp: new Date().toISOString(),
    };
    setCravings((prev) => [newCraving, ...prev]);
    showToast('🏆 Тяга успешно преодолена! +1 к чистой победе.');
  };

  const handleRelapseSubmit = (data: { cigarettes: number; trigger: string; reflection: string; plan: string }) => {
    const nowIso = new Date().toISOString();
    const newRelapse: RelapseRecord = {
      id: `relapse-${Date.now()}`,
      cigarettes: data.cigarettes,
      trigger: data.trigger,
      reflection: data.reflection,
      plan: data.plan,
      timestamp: nowIso,
    };
    setRelapses((prev) => [newRelapse, ...prev]);
    setProfile((prev) => ({
      ...prev,
      quitAt: nowIso,
      quitDate: nowIso.split('T')[0],
    }));
    showToast('Зафиксировано. Таймер и фазы здоровья сброшены на старт!');
  };

  // Simulation handler for testing
  const handleSimulateDays = (days: number) => {
    const simulatedQuitDate = new Date(Date.now() - days * 86400 * 1000).toISOString();
    setProfile((prev) => ({ ...prev, quitAt: simulatedQuitDate }));
    showToast(`⚡ Симуляция: дата отказа установлена на ${days} дн. назад`);
  };

  const handleExportData = () => {
    try {
      const fullBackup: FullAppState = {
        profile,
        triggers,
        cravings,
        relapses,
        chatMessages,
        updatedAt: new Date().toISOString(),
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `smokefree_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Резервная копия сохранена на ваше устройство');
    } catch (e) {
      console.error(e);
      showToast('Не удалось экспортировать файл');
    }
  };

  const handleImportData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr) as FullAppState;
      if (parsed.profile) setProfile(parsed.profile);
      if (Array.isArray(parsed.triggers)) setTriggers(parsed.triggers);
      if (Array.isArray(parsed.cravings)) setCravings(parsed.cravings);
      if (Array.isArray(parsed.relapses)) setRelapses(parsed.relapses);
      if (Array.isArray(parsed.chatMessages)) setChatMessages(parsed.chatMessages);
      showToast('Данные успешно восстановлены из резервной копии!');
    } catch (e) {
      console.error(e);
      showToast('Ошибка при чтении файла бэкапа');
    }
  };

  const handleResetData = () => {
    try {
      const resetProfile: UserProfile = {
        id: 'user_default',
        name: 'Друг',
        quitAt: new Date().toISOString(),
        nicotineType: 'Сигареты',
        packPrice: 900,
        currency: 'KZT',
        currencySymbol: '₸',
        unitsPerDay: 20,
        packSize: 20,
        financialGoal: 250000,
        financialGoalLabel: 'Подарок себе',
        timezone: 'Asia/Almaty',
      };
      setProfile(resetProfile);
      setTriggers(DEFAULT_TRIGGERS);
      setCravings([]);
      setRelapses([]);
      setChatMessages([]);
      localStorage.clear();
      showToast('Трекер сброшен. Начинаем чистый путь!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Global Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'companion' && (
          <CompanionView
            profile={profile}
            stats={stats}
            triggers={triggers}
            cravings={cravings}
            relapses={relapses}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenRelapse={() => setIsRelapseOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogResisted={handleLogResisted}
            onToggleTrigger={handleToggleTrigger}
            onAddTrigger={handleAddTrigger}
            onDeleteTrigger={handleDeleteTrigger}
            isMobilePreview={isMobilePreview}
          />
        )}

        {activeTab === 'health' && (
          <HealthTimelineView stats={stats} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            profile={profile}
            stats={stats}
            cravings={cravings}
            triggers={triggers}
            relapses={relapses}
            onSimulateDays={handleSimulateDays}
          />
        )}

        {activeTab === 'coach' && (
          <AiCoachView
            profile={profile}
            stats={stats}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            onRelapseTrigger={() => setIsRelapseOpen(true)}
          />
        )}

        {activeTab === 'audit' && <AuditView />}

        {activeTab === 'architecture' && <ArchitectureView />}

        {activeTab === 'patches' && <PatchesView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmokeFree Companion &bull; Анализ репозитория maskevichast-source/SmokeFree-Companion</span>
          <span className="text-slate-400">
            {isBackendSynced ? '🟢 Хранилище синхронизировано (Сервер + Local)' : '🟡 Локальный режим'} &bull; Gemini 2.5 Flash
          </span>
        </div>
      </footer>

      {/* Modals */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onVictory={() => {
          handleLogResisted();
        }}
        onAskCoach={() => {
          setIsSosOpen(false);
          setActiveTab('coach');
        }}
      />

      <RelapseModal
        isOpen={isRelapseOpen}
        onClose={() => setIsRelapseOpen(false)}
        onSubmit={handleRelapseSubmit}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSave={(updated) => {
          setProfile(updated);
          showToast('Профиль и параметры привычек успешно обновлены!');
        }}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-500/30 animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

