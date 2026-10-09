/** Durations in milliseconds. The same values exist as CSS variables in theme/tokens.css. */
export const MOTION = {
  instant: 80,
  quick: 160,
  standard: 240,
  layout: 420,
} as const;

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** A small overshoot, so things settle with a bounce. Playful uses it for layout changes. */
export const easeOutBack = (t: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

let layoutEase: (t: number) => number = easeOutCubic;

/** Layout changes use the ease of the current Look. */
export function setPlayfulMotion(playful: boolean): void {
  layoutEase = playful ? easeOutBack : easeOutCubic;
}

export const easeLayout = (t: number) => layoutEase(t);

/** `auto` follows the system setting. */
export type MotionPreference = 'auto' | 'full' | 'reduced';

let preference: MotionPreference = 'auto';

export function setMotionPreference(next: MotionPreference): void {
  preference = next;
}

/** True when motion should jump to its end: the person chose it here, or asked their system for it. */
export function prefersReducedMotion(): boolean {
  if (preference !== 'auto') return preference === 'reduced';
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
