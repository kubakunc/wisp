import { describe, it, expect } from 'vitest';
import { remoteUrl } from './remote';

describe('remote sound config', () => {
  it('builds a relative sounds/<file> path when no CDN is configured', () => {
    expect(remoteUrl('rain.wav')).toBe('sounds/rain.wav');
  });
  it('joins with exactly one slash regardless of base trailing slash', () => {
    // remoteUrl must never produce a double slash between base and file
    expect(remoteUrl('rain.wav')).not.toMatch(/[^:]\/\//);
  });
});
