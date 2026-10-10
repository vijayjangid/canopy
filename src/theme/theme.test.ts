import { describe, expect, it } from 'vitest';
import { cornerRadius } from '../canvas/TopicNode';
import { createMap, createSubTopic, parseFile, setPrefs, toFile } from '../model';
import { connectorPath, seedOf } from '../layout';
import { LOOK_VOICE, VOICES } from './voices';

const parent = { x: 0, y: 0, w: 100, h: 40 };
const child = { x: 160, y: 80, w: 100, h: 40 };

describe('connector styles', () => {
  it('draws every style between the same two points', () => {
    for (const style of ['curved', 'elbow', 'straight', 'tapered'] as const) {
      const d = connectorPath(parent, child, 'right', { style });
      expect(d.startsWith('M')).toBe(true);
      expect(d).toContain('160 100');
    }
  });

  it('draws a filled outline for tapered connectors', () => {
    expect(connectorPath(parent, child, 'right', 'tapered').endsWith('Z')).toBe(true);
  });

  it('turns corners with arcs for elbow connectors', () => {
    const d = connectorPath(parent, child, 'right', 'elbow');
    expect(d).toContain('Q');
    expect(d).not.toContain('C');
  });

  it('wobble is stable for a given seed and differs between seeds', () => {
    const a = connectorPath(parent, child, 'right', { wobble: 4, seed: seedOf('a') });
    const again = connectorPath(parent, child, 'right', { wobble: 4, seed: seedOf('a') });
    const b = connectorPath(parent, child, 'right', { wobble: 4, seed: seedOf('b') });
    expect(a).toBe(again);
    expect(a).not.toBe(b);
  });

  it('swaps axes for the Down flow', () => {
    const d = connectorPath(
      { x: 0, y: 0, w: 100, h: 40 },
      { x: 80, y: 100, w: 100, h: 40 },
      'down',
    );
    expect(d.startsWith('M50 40')).toBe(true);
    expect(d.endsWith('130 100')).toBe(true);
  });
});

describe('looks', () => {
  it('gives each level its own corner in High Contrast', () => {
    const radii = [0, 1, 2].map((depth) => cornerRadius('contrast', depth, 40));
    expect(new Set(radii).size).toBe(3);
  });

  it('softly rounds Playful topics', () => {
    expect(cornerRadius('playful', 1, 30)).toBe(12);
    expect(cornerRadius('playful', 1, 60)).toBe(16);
  });
});

describe('voices', () => {
  it('has a stack and scale for each', () => {
    for (const voice of Object.values(VOICES)) {
      expect(voice.stack.length).toBeGreaterThan(0);
      expect(voice.scale).toBeGreaterThan(0.5);
    }
  });

  it('gives each theme its own font', () => {
    expect(LOOK_VOICE).toEqual({ minimal: 'clean', contrast: 'editorial', playful: 'sketch' });
    expect(Object.values(LOOK_VOICE).every((v) => VOICES[v] !== undefined)).toBe(true);
  });
});

describe('map preferences', () => {
  it('setPrefs changes only the given preferences', () => {
    const map = createMap({ coreId: 'core' });
    const next = setPrefs(map, { look: 'playful', density: 'airy' });
    expect(next.prefs.look).toBe('playful');
    expect(next.prefs.density).toBe('airy');
    expect(next.prefs.flow).toBe(map.prefs.flow);
    expect(map.prefs.look).toBe('minimal');
  });

  it('keeps preferences through save and open', () => {
    let map = createMap({ coreId: 'core' });
    map = createSubTopic(map, 'core', { id: 'a', title: 'A' }).map;
    map = setPrefs(map, {
      look: 'contrast',
      showLevels: true,
    });
    const result = parseFile(JSON.parse(JSON.stringify(toFile(map))));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.prefs).toEqual(map.prefs);
  });

  it('rejects unknown values', () => {
    const file = JSON.parse(JSON.stringify(toFile(createMap({ coreId: 'core' }))));
    file.prefs.look = 'neon';
    expect(parseFile(file).ok).toBe(false);
  });
});

describe('the Standard theme', () => {
  it('is stored as `minimal`, so files saved before the rename still open', () => {
    const map = setPrefs(createMap({ coreId: 'core' }), { look: 'minimal' });
    const file = JSON.parse(JSON.stringify(toFile(map)));
    expect(file.prefs.look).toBe('minimal');
    const result = parseFile(file);
    expect(result.ok && result.map.prefs.look).toBe('minimal');
    expect(LOOK_VOICE.minimal).toBe('clean');
  });
});
