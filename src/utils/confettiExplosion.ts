import confetti from 'canvas-confetti';
import { playMilestoneChime } from './audioFeedback';

// Local storage key to track which badges have already had their first-time explosion
const FLIPPED_BADGES_KEY = 'smokefree_flipped_badges_v1';

export function getFlippedBadges(): Set<string> {
  try {
    const raw = localStorage.getItem(FLIPPED_BADGES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markBadgeAsFlipped(badgeId: string): void {
  try {
    const current = getFlippedBadges();
    current.add(badgeId);
    localStorage.setItem(FLIPPED_BADGES_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

const TIER_CONFIG: Record<
  string,
  {
    colors: string[];
    particleCount: number;
    spread: number;
    decay: number;
    shapes?: ('star' | 'circle' | 'square')[];
  }
> = {
  mythic: {
    colors: ['#a855f7', '#ec4899', '#fbbf24', '#c084fc', '#ffffff', '#e879f9'],
    particleCount: 85,
    spread: 100,
    decay: 0.92,
    shapes: ['star', 'circle'],
  },
  diamond: {
    colors: ['#38bdf8', '#60a5fa', '#93c5fd', '#ffffff', '#0284c7', '#3b82f6'],
    particleCount: 70,
    spread: 85,
    decay: 0.92,
    shapes: ['star', 'circle'],
  },
  platinum: {
    colors: ['#22d3ee', '#06b6d4', '#e2e8f0', '#94a3b8', '#ffffff', '#67e8f9'],
    particleCount: 55,
    spread: 75,
    decay: 0.91,
    shapes: ['circle', 'square'],
  },
  gold: {
    colors: ['#f59e0b', '#fbbf24', '#fde047', '#d97706', '#ffffff', '#b45309'],
    particleCount: 50,
    spread: 70,
    decay: 0.9,
    shapes: ['star', 'circle'],
  },
  silver: {
    colors: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#f8fafc', '#64748b'],
    particleCount: 40,
    spread: 60,
    decay: 0.9,
    shapes: ['circle', 'square'],
  },
  bronze: {
    colors: ['#d97706', '#b45309', '#92400e', '#f59e0b', '#fef3c7'],
    particleCount: 35,
    spread: 55,
    decay: 0.89,
    shapes: ['circle', 'square'],
  },
};

/**
 * Simple point or screen center confetti burst
 */
export function triggerConfetti(clientX?: number, clientY?: number): void {
  try {
    let originX = 0.5;
    let originY = 0.5;

    if (clientX !== undefined && clientY !== undefined && typeof window !== 'undefined') {
      originX = Math.max(0.1, Math.min(0.9, clientX / window.innerWidth));
      originY = Math.max(0.1, Math.min(0.9, clientY / window.innerHeight));
    }

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { x: originX, y: originY },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
      ticks: 180,
      gravity: 0.9,
      scalar: 1.0,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  } catch (e) {
    console.warn('Confetti burst failed:', e);
  }
}

/**
 * Fires a particle explosion positioned directly over the clicked badge element.
 */
export function triggerBadgeExplosion(
  targetElement: HTMLElement | null,
  tier: string = 'bronze',
  isFirstTime: boolean = false
): void {
  const config = TIER_CONFIG[tier.toLowerCase()] || TIER_CONFIG.bronze;

  let originX = 0.5;
  let originY = 0.5;

  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    originX = (rect.left + rect.width / 2) / window.innerWidth;
    originY = (rect.top + rect.height / 2) / window.innerHeight;
    // Bound origins safely
    originX = Math.max(0.1, Math.min(0.9, originX));
    originY = Math.max(0.1, Math.min(0.9, originY));
  }

  // Multiplier for first-time explosion
  const multiplier = isFirstTime ? 1.4 : 0.75;
  const count = Math.round(config.particleCount * multiplier);

  try {
    // Primary burst
    confetti({
      particleCount: count,
      spread: config.spread,
      startVelocity: isFirstTime ? 32 : 24,
      origin: { x: originX, y: originY },
      colors: config.colors,
      shapes: config.shapes || ['circle', 'square'],
      ticks: isFirstTime ? 240 : 160,
      gravity: 0.85,
      scalar: isFirstTime ? 1.15 : 0.9,
      drift: 0,
      disableForReducedMotion: true,
      zIndex: 9999,
    });

    // If first-time or high-tier, emit a second trailing spark wave for a rich explosive feeling
    if (isFirstTime || tier === 'mythic' || tier === 'diamond') {
      setTimeout(() => {
        try {
          confetti({
            particleCount: Math.round(count * 0.5),
            spread: config.spread * 1.3,
            startVelocity: 18,
            origin: { x: originX, y: originY },
            colors: config.colors,
            shapes: ['star'],
            ticks: 200,
            gravity: 0.65,
            scalar: 0.8,
            disableForReducedMotion: true,
            zIndex: 9999,
          });
        } catch {}
      }, 120);

      // Play audio chime
      playMilestoneChime();
    }
  } catch (err) {
    console.warn('Particle explosion failed:', err);
  }
}
