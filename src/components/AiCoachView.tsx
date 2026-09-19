import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Brain,
  BookOpen,
  Zap,
  Shield,
  Flame,
  User,
  Bot,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { UserProfile, FreedomStats, ChatMessage, CoachPersona } from '../types';

interface AiCoachViewProps {
  profile: UserProfile;
  stats: FreedomStats;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onRelapseTrigger?: () => void;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  profile,
  stats,
  chatMessages,
  setChatMessages,
  onRelapseTrigger,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<CoachPersona>('cbt');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const personas = [
    {
      id: 'cbt' as CoachPersona,
      name: 'КПТ-Терапевт',
      tagline: 'Метод RAIN и осознанность',
      icon: Brain,
      color: 'from-emerald-500 to-teal-400',
      activeColor: 'bg-emerald-500 text-slate-950 font-bold',
    },
    {
      id: 'carr' as CoachPersona,
      name: 'Аллен Карр',
      tagline: 'Деконструкция иллюзии',
      icon: BookOpen,
      color: 'from-sky-500 to-indigo-400',
      activeColor: 'bg-sky-500 text-slate-950 font-bold',
    },
    {
      id: 'neuro' as CoachPersona,
      name: 'Huberman Lab',
      tagline: 'Нейробиология дофамина',
      icon: Zap,
      color: 'from-purple-500 to-pink-400',
      activeColor: 'bg-purple-500 text-slate-950 font-bold',
    },
    {
      id: 'stoic' as CoachPersona,
      name: 'Мудрый Стоик',
      tagline: 'Марк Аврелий & контроль',
      icon: Shield,
      color: 'from-amber-500 to-orange-400',
      activeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'sos' as CoachPersona,
      name: '🚨 SOS Напарник',
      tagline: 'Острый 3-минутный пик',
      icon: Flame,
      color: 'from-rose-500 to-red-400',
      activeColor: 'bg-rose-500 text-slate-950 font-bold animate-pulse',
    },
  ];

  const quickPrompts = [
    {
      label: '🚨 Накатила сильная тяга (3 мин)',
      text: 'У меня сильный приступ тяги прямо сейчас. Проведи меня через метод 3 минут!',
      persona: 'sos' as CoachPersona,
    },
    {
      label: '☕️ Как пить утренний кофе без никотина?',
      text: 'Как разорвать ассоциативную связку «кофе + сигарета/айкос»?',
      persona: 'cbt' as CoachPersona,
    },
    {
      label: '🧠 Почему на 3-й неделе накрывает апатия?',
      text: 'Почему на 2-3 неделе мир кажется серым и наступает дофаминовая яма?',
      persona: 'neuro' as CoachPersona,
    },
    {
      label: '📖 Развей иллюзию «сигарета снимает стресс»',
      text: 'Мой мозг шепчет, что одна сигарета снимет стресс на работе. Объясни по Карру, почему это обман.',
      persona: 'carr' as CoachPersona,
    },
    {
      label: '🏛 Как не поддаться чужому курению в компании?',
      text: 'Сегодня встреча с курящими друзьями. Дай стоический совет, как чувствовать силу, а не зависть.',
      persona: 'stoic' as CoachPersona,
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
      persona: selectedPersona,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          daysFree: stats.days,
          hoursFree: stats.hours,
          moneySaved: Math.round(stats.moneySaved),
          cigsAvoided: Math.round(stats.cigarettesAvoided || 0),
          trigger: profile.nicotineType,
          nicotineType: profile.nicotineType,
          persona: selectedPersona,
          history: historyPayload,
        }),
      });

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.reply || 'Я рядом. Продолжай держать фокус на свободе.',
        timestamp: new Date().toISOString(),
        persona: selectedPersona,
        source: data.source,
      };

      setChatMessages((prev) => [...prev, coachMsg]);
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: 'Тяга — это физиологическая волна, которая живет ровно 3 минуты. Сделай 4 глубоких вдоха, выпей полстакана прохладной воды и расслабь плечи. Ты сильнее сиюминутного импульса!',
        timestamp: new Date().toISOString(),
        persona: selectedPersona,
        source: 'local-resilience-engine',
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[«»*#_💡📖🎬🧠💬🏛🚨]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleClearHistory = () => {
    if (window.confirm('Очистить историю диалога с коучем?')) {
      setChatMessages([
        {
          id: 'welcome',
          sender: 'coach',
          text: `Привет, ${profile.name}! Я твой персональный наставник. Ты держишь свободу от ${profile.nicotineType} уже ${stats.days} дн. ${stats.hours} ч. Какой вызов мы разберем прямо сейчас?`,
          timestamp: new Date().toISOString(),
          persona: 'cbt',
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`max-w-5xl mx-auto py-6 px-4 sm:px-6 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-8 max-w-none' : 'space-y-6'
      }`}
    >
      {/* Top Banner & Context Info */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Персональный КПТ & Gemini Коуч
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">База знаний: Карр, Huberman, Стоики</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">
            Интерактивный диалог и преодоление тяги
          </h2>
        </div>

        {/* User Context Status Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 px-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Ваш статус:</span>
              <span className="text-emerald-400 font-bold">
                {stats.days}д {stats.hours}ч чистоты
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Отказ от:</span>
              <span className="text-slate-200 font-semibold">{profile.nicotineType}</span>
            </div>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:flex"
            title={isFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Persona Selector Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
          <span>Выберите школу наставничества:</span>
          <span className="text-[11px] text-emerald-400 font-mono">
            Активен: {personas.find((p) => p.id === selectedPersona)?.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {personas.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPersona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? `${p.activeColor} border-slate-700 shadow-md scale-[1.02]`
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4" />
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
                </div>
                <div>
                  <span className="text-xs font-bold block leading-tight">{p.name}</span>
                  <span className={`text-[10px] block opacity-80 ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                    {p.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px] relative">
        {/* Chat Control Header */}
        <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Диалог с наставником</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-500 text-[11px]">{chatMessages.length} сообщений</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
              title="Очистить диалог"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeaking = speakingId === msg.id;

            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 space-y-2 text-xs leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-emerald-600 text-slate-950 rounded-br-sm font-medium'
                      : 'bg-slate-950/90 text-slate-200 border border-slate-800/80 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Actions bar for coach responses */}
                  {!isUser && (
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono text-[10px]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.source && ` • ${msg.source}`}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSpeak(msg.text, msg.id)}
                          className={`p-1 rounded hover:text-slate-300 transition-colors ${
                            isSpeaking ? 'text-emerald-400 font-bold' : ''
                          }`}
                          title={isSpeaking ? 'Остановить голос' : 'Озвучить ответ'}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="p-1 rounded hover:text-slate-300 transition-colors"
                          title="Скопировать ответ"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shrink-0 animate-spin">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Наставник формирует персональный ответ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-mono shrink-0">Быстрый вопрос:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedPersona(qp.persona);
                handleSendMessage(qp.text);
              }}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 shrink-0 transition-colors whitespace-nowrap"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Text Box */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Спросите наставника (Shift+Enter для новой строки)...`}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all shrink-0 active:scale-95 shadow-md flex items-center justify-center"
            title="Отправить сообщение"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
