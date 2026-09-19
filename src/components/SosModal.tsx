import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, X, Check, Droplets, Wind, Sparkles, Volume2, VolumeX, Heart, Eye } from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVictory: () => void;
  onAskCoach: () => void;
}

type TechniqueType = 'box' | '478' | 'coherence';

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  onVictory,
  onAskCoach,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [technique, setTechnique] = useState<TechniqueType>('box');
  const [breathPhase, setBreathPhase] = useState<'Вдох' | 'Задержка' | 'Выдох' | 'Пауза'>('Вдох');
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Soft tone generator for breathing transitions
  const playTone = (freq: number = 432, duration: number = 0.3) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  // Get duration for current phase based on technique
  const getPhaseDuration = (tech: TechniqueType, phase: 'Вдох' | 'Задержка' | 'Выдох' | 'Пауза') => {
    if (tech === 'box') {
      return 4; // 4-4-4-4
    }
    if (tech === '478') {
      if (phase === 'Вдох') return 4;
      if (phase === 'Задержка') return 7;
      if (phase === 'Выдох') return 8;
      return 0; // No pause
    }
    if (tech === 'coherence') {
      if (phase === 'Вдох') return 5;
      if (phase === 'Выдох') return 5;
      return 0; // No hold, no pause
    }
    return 4;
  };

  // Initialize countdown when opened
  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(180);
      setIsActive(true);
      setBreathPhase('Вдох');
      setBreathSeconds(getPhaseDuration(technique, 'Вдох'));
      playTone(432, 0.4);
    } else {
      setIsActive(false);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    }
  }, [isOpen]);

  // Main 3-minute countdown
  useEffect(() => {
    if (!isActive || !isOpen) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playTone(528, 0.6);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, isOpen]);

  // Breathing cycle
  useEffect(() => {
    if (!isActive || !isOpen) return;
    const breathTimer = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          let nextPhase: 'Вдох' | 'Задержка' | 'Выдох' | 'Пауза' = 'Вдох';
          if (technique === 'box') {
            if (breathPhase === 'Вдох') nextPhase = 'Задержка';
            else if (breathPhase === 'Задержка') nextPhase = 'Выдох';
            else if (breathPhase === 'Выдох') nextPhase = 'Пауза';
            else nextPhase = 'Вдох';
          } else if (technique === '478') {
            if (breathPhase === 'Вдох') nextPhase = 'Задержка';
            else if (breathPhase === 'Задержка') nextPhase = 'Выдох';
            else nextPhase = 'Вдох';
          } else if (technique === 'coherence') {
            if (breathPhase === 'Вдох') nextPhase = 'Выдох';
            else nextPhase = 'Вдох';
          }

          setBreathPhase(nextPhase);
          const nextDuration = getPhaseDuration(technique, nextPhase);
          // Tone pitch based on phase
          if (nextPhase === 'Вдох') playTone(432, 0.3);
          else if (nextPhase === 'Выдох') playTone(360, 0.3);
          else if (nextPhase === 'Задержка') playTone(500, 0.2);
          return nextDuration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(breathTimer);
  }, [isActive, isOpen, technique, breathPhase]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const progressPercent = Math.round(((180 - secondsRemaining) / 180) * 100);

  const getScaleClass = () => {
    switch (breathPhase) {
      case 'Вдох':
        return 'scale-115 border-emerald-400/80 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/20';
      case 'Задержка':
        return 'scale-115 border-amber-400/80 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/20';
      case 'Выдох':
        return 'scale-90 border-teal-400/80 bg-teal-500/15 text-teal-300 shadow-md';
      case 'Пауза':
        return 'scale-90 border-slate-600 bg-slate-800/50 text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-rose-950/40">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-rose-500/10">
          <div className="flex items-center gap-2.5 text-rose-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-100">SOS-Протокол: 3 Минуты</h3>
              <p className="text-[11px] text-slate-400">Пик физиологической тяги спадает через 180 секунд</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={soundEnabled ? 'Звук включен' : 'Включить мягкий звуковой сигнал'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Main 3-minute timer bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-400">Острая фаза спадает через:</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Technique Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setTechnique('box');
                setBreathPhase('Вдох');
                setBreathSeconds(4);
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                technique === 'box'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Квадрат 4×4
            </button>
            <button
              type="button"
              onClick={() => {
                setTechnique('478');
                setBreathPhase('Вдох');
                setBreathSeconds(4);
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                technique === '478'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Релакс 4-7-8
            </button>
            <button
              type="button"
              onClick={() => {
                setTechnique('coherence');
                setBreathPhase('Вдох');
                setBreathSeconds(5);
              }}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                technique === 'coherence'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Баланс 5-5
            </button>
          </div>

          {/* Interactive Breathing Visualizer */}
          <div className="flex flex-col items-center justify-center py-5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div
              className={`w-36 h-36 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${getScaleClass()}`}
            >
              <Wind className="w-6 h-6 mb-1 opacity-85" />
              <span className="text-sm font-bold tracking-wider uppercase">{breathPhase}</span>
              <span className="text-2xl font-black font-mono mt-0.5">{breathSeconds}</span>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center px-4">
              {technique === 'box' && 'Квадрат: Вдох (4) → Задержка (4) → Выдох (4) → Пауза (4)'}
              {technique === '478' && 'Метод Вейла: Вдох (4) → Глубокая задержка (7) → Длинный выдох (8)'}
              {technique === 'coherence' && 'Когерентность: Плавный вдох (5) → Спокойный выдох (5)'}
            </p>
          </div>

          {/* Grounding & Quick Actions */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 flex items-start gap-2.5">
              <Droplets className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block text-[11px]">Ледяная вода:</strong>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Выпей стакан холодной воды мелкими глотками. Это переключает рецепторы.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 flex items-start gap-2.5">
              <Eye className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block text-[11px]">Заземление 5-4-3:</strong>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Найди 3 синих предмета и дотронься до прохладной поверхности.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              id="sos-victory-btn"
              onClick={() => {
                onVictory();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Я справился с тягой (Зафиксировать победу)</span>
            </button>

            <button
              id="sos-coach-btn"
              onClick={() => {
                onClose();
                onAskCoach();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Открыть диалог с AI Коучем</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
