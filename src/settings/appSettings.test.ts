import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './appSettings';

describe('parseSettings', () => {
  it('turns the Trail on unless it was saved as off', () => {
    expect(DEFAULT_SETTINGS.trail).toBe(true);
    expect(parseSettings(null).trail).toBe(true);
    expect(parseSettings('{"trail":false}').trail).toBe(false);
    expect(parseSettings('{"trail":"no"}').trail).toBe(true);
  });
});
