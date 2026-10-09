import '@fontsource/kalam/latin-400.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-500.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import type { Look } from '../model';

export type Voice = 'clean' | 'editorial' | 'sketch';

export interface VoiceSpec {
  label: string;
  stack: string;
  /** Scales all type so each face reads at a similar size. */
  scale: number;
}

/** The type styles. Fonts are bundled, so maps look the same offline. */
export const VOICES: Record<Voice, VoiceSpec> = {
  clean: {
    label: 'Clean',
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    scale: 1,
  },
  editorial: {
    label: 'Editorial',
    stack: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    scale: 1.04,
  },
  sketch: {
    label: 'Sketch',
    stack: "'Kalam', 'Comic Sans MS', cursive",
    scale: 0.96,
  },
};

/** Each theme is a preset: its colours, its shapes, and its font. */
export const LOOK_VOICE: Record<Look, Voice> = {
  minimal: 'clean',
  contrast: 'editorial',
  playful: 'sketch',
};
