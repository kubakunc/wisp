import { describe, it, expect } from 'vitest';
import { SOUNDS, getSound, freeSounds } from './registry';

describe('sound registry', () => {
  it('has unique ids', () => {
    const ids = SOUNDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the three core noise colors as free', () => {
    for (const id of ['white-noise', 'pink-noise', 'brown-noise']) {
      const s = getSound(id);
      expect(s?.tier).toBe('free');
    }
  });

  it('exposes at least 8 free and 30+ total sounds', () => {
    expect(freeSounds().length).toBeGreaterThanOrEqual(8);
    expect(SOUNDS.length).toBeGreaterThanOrEqual(30);
  });

  it('gives every sound a non-empty assetPath', () => {
    expect(SOUNDS.every((s) => s.assetPath.length > 0)).toBe(true);
  });

  it('returns undefined for unknown ids', () => {
    expect(getSound('nope')).toBeUndefined();
  });
});
