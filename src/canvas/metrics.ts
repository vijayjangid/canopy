import { createCanvasTextWidth, createTopicMeasurer } from '../layout';

let family: string | null = null;

/** Font stack from the theme tokens, read once. Call `refreshMetrics` when the Voice changes. */
function fontFamily(): string {
  if (family === null) {
    family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-map').trim() ||
      'system-ui, sans-serif';
  }
  return family;
}

export const textWidth = createCanvasTextWidth(fontFamily);
export const measureTopic = createTopicMeasurer(textWidth);

export function refreshMetrics(): void {
  family = null;
  measureTopic.invalidate();
}

/** Uses this font stack for measuring from now on, and forgets every cached size. */
export function setFontFamily(stack: string): void {
  family = stack;
  measureTopic.invalidate();
}
