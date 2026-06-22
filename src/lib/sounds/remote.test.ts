import { describe, it, expect } from 'vitest';
import { remoteUrl, SOUND_CDN_BASE } from './remote';

describe('remote sound config', () => {
  it('builds a URL from base + file', () => {
    // SOUND_CDN_BASE is '' in tests (no VITE_SOUND_CDN) → relative path with sounds/ prefix
    const expected = SOUND_CDN_BASE === '' ? 'sounds/rain.wav' : `${SOUND_CDN_BASE}rain.wav`;
    expect(remoteUrl('rain.wav')).toBe(expected);
  });
  it('joins with exactly one slash regardless of base trailing slash', () => {
    // remoteUrl must never produce a double slash between base and file
    expect(remoteUrl('rain.wav')).not.toMatch(/[^:]\/\//);
  });
});
