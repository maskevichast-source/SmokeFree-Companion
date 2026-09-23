/**
 * Web Audio API Sound Generator for SmokeFree Companion
 * Generates subtle, soothing, synthesized notification sounds without external audio assets.
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a subtle harmonic celebratory chime when a milestone is reached.
 * An uplifting arpeggiated major chord with soft decay (C5 -> E5 -> G5 -> C6).
 */
export function playMilestoneChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Smooth attack and soft organic decay
      const noteStart = now + idx * 0.08;
      const noteEnd = noteStart + 0.5;

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteEnd);
    } catch {}
  });
}

/**
 * Play a gentle, grounding double-tone chime when the SOS craving timer finishes.
 * Uses 528 Hz (relaxation & renewal) into 432 Hz with soft warmth.
 */
export function playSosTimerEndChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const sequence = [
    { freq: 528, start: now, duration: 0.6, volume: 0.09 },
    { freq: 432, start: now + 0.28, duration: 0.9, volume: 0.08 },
  ];

  sequence.forEach(({ freq, start, duration, volume }) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    } catch {}
  });
}

/**
 * Play a subtle soft sine pulse for breathing guidance in SOS modal
 */
export function playBreathCue(phase: 'in' | 'hold' | 'out' | 'pause'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqMap = {
    in: 440,
    hold: 493.88,
    out: 392,
    pause: 349.23,
  };

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqMap[phase] || 432, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}
