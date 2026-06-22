import { describe, it, expect } from 'vitest';
import { SOUNDS, getSound, freeSounds, isPlayable, playableLayers, isBundled } from './registry';

describe('premium gating', () => {
  it('free users may play free sounds but not premium', () => {
    expect(isPlayable('rain', false)).toBe(true);
    expect(isPlayable('thunder', false)).toBe(false);
  });
  it('a free user may play the featured premium sound, but not other premium sounds', () => {
    expect(isPlayable('thunder', false, 'thunder')).toBe(true);
    expect(isPlayable('blue-noise', false, 'thunder')).toBe(false);
  });
  it('playableLayers keeps the featured premium layer for a free user', () => {
    const layers = [{ soundId: 'thunder', volume: 0.5 }, { soundId: 'blue-noise', volume: 0.5 }];
    expect(playableLayers(layers, false, 'thunder').map((l) => l.soundId)).toEqual(['thunder']);
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

describe('bundled metadata', () => {
  it('marks the 3 noise colors as bundled', () => {
    expect(isBundled('white-noise')).toBe(true);
    expect(isBundled('pink-noise')).toBe(true);
    expect(isBundled('brown-noise')).toBe(true);
  });

  it('marks nature/premium sounds as not bundled', () => {
    expect(isBundled('rain')).toBe(false);
    expect(isBundled('thunder')).toBe(false);
  });

  it('exposes bundled on SoundDef', () => {
    expect(getSound('white-noise')?.bundled).toBe(true);
    expect(getSound('rain')?.bundled).toBe(false);
  });

  it('unknown id is not bundled', () => {
    expect(isBundled('nope')).toBe(false);
  });

  it('exposes file name on SoundDef', () => {
    expect(getSound('rain')?.file).toBe('rain.wav');
  });

  it('carries the bare file name for bundled sounds too', () => {
    expect(getSound('white-noise')?.file).toBe('white-noise.wav');
  });
});
