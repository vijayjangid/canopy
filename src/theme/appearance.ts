import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { measureTopic, setFontFamily } from '../canvas/metrics';
import { setChipMode, setLevelNumbers, setStickerType, setTypeScale } from '../layout';
import type { MapPrefs } from '../model';
import { setPlayfulMotion } from '../motion';
import { LOOK_VOICE, VOICES } from './voices';

/** Counts changes that alter text size, so layouts can be measured again. */
export const appearanceEpoch = createStore<{ epoch: number }>(() => ({ epoch: 0 }));
const bump = () => appearanceEpoch.setState((s) => ({ epoch: s.epoch + 1 }));

export const useAppearanceEpoch = () => useStore(appearanceEpoch, (s) => s.epoch);

/** A number that changes whenever the Look or colour scheme changes, so colours read from the page can be read again. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-look', 'data-scheme', 'data-mode'],
    });
    return () => observer.disconnect();
  }, []);
  return version;
}

let applied = '';

/** Puts a map's Theme on the page: its look and its font. Safe to call often. */
export function applyAppearance(prefs: Pick<MapPrefs, 'look' | 'chips' | 'showLevels'>): void {
  const key = `${prefs.look}/${prefs.chips}/${prefs.showLevels}`;
  if (key === applied) return;
  applied = key;

  const voiceName = LOOK_VOICE[prefs.look];
  const voice = VOICES[voiceName];
  const root = document.documentElement;
  root.setAttribute('data-look', prefs.look);
  root.setAttribute('data-voice', voiceName);
  root.style.setProperty('--font-map', voice.stack);
  setTypeScale(voice.scale);
  setStickerType(prefs.look === 'playful');
  setPlayfulMotion(prefs.look === 'playful');
  setChipMode(prefs.chips);
  setLevelNumbers(prefs.showLevels);
  measureTopic.invalidate();
  setFontFamily(voice.stack);
  bump();

  // Measuring needs the real font, so measure again once it has loaded.
  const family = voice.stack.split(',')[0]?.trim() ?? '';
  if (voiceName !== 'clean' && typeof document.fonts?.load === 'function') {
    void Promise.all(
      [400, 500, 600].map((weight) => document.fonts.load(`${weight} 16px ${family}`)),
    ).then(() => {
      if (applied === key) {
        setFontFamily(voice.stack);
        bump();
      }
    });
  }
}
