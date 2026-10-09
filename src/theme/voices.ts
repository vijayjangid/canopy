import '@fontsource/patrick-hand/latin-400.css';
import './patrick-hand.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-500.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import type { FontSize, Voice } from '../model';

export interface VoiceSpec {
  label: string;
  stack: string;
  /** Scales all type so each face reads at a similar size. */
  scale: number;
  sample: string;
}

/** The four type styles. Fonts are bundled, so maps look the same offline. */
export const VOICES: Record<Voice, VoiceSpec> = {
  clean: {
    label: 'Clean',
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    scale: 1,
    sample: 'Sans-serif',
  },
  editorial: {
    label: 'Editorial',
    stack: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    scale: 1.04,
    sample: 'Bookish serif',
  },
  mono: {
    label: 'Mono',
    stack: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    scale: 0.92,
    sample: 'Monospace',
  },
  sketch: {
    label: 'Sketch',
    stack: "'Patrick Hand', 'Comic Sans MS', cursive",
    scale: 1.12,
    sample: 'Hand-drawn',
  },
};

/** How much each Font size scales the Voice's own scale. */
export const FONT_SIZE_SCALE: Record<FontSize, number> = { small: 0.88, medium: 1, large: 1.2 };

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};
