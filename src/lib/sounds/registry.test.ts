import { describe, it, expect } from 'vitest';
import { SOUNDS, getSound, freeSounds, isPlayable, playableLayers } from './registry';

describe('premium gating', () => {
  it('free users may play free sounds but not premium', () => {
    expect(isPlayable('rain', false)).toBe(true);
    expect(isPlayable('thunder', false)).toBe(false);
  });
  it('premium users may play everything', () => {
    expect(isPlayable('thunder', true)).toBe(true);
  });
  it('unknown ids are not playable', () => {
    expect(isPlayable('nope', true)).toBe(false);
  });
  it('playableLayers strips premium layers for free users', () => {
    const layers = [{ soundId: 'rain' }, { soundId: 'thunder' }, { soundId: 'white-noise' }];
    expect(playableLayers(layers, false).map((l) => l.soundId)).toEqual(['rain', 'white-noise']);
    expect(playableLayers(layers, true).map((l) => l.soundId)).toEqual(['rain', 'thunder', 'white-noise']);
  });
});

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
