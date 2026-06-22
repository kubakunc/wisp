import { describe, it, expect } from 'vitest';
import { remoteUrl, buildRemoteUrl, normalizeCdnBase } from './remote';

describe('remote sound config', () => {
  it('builds a relative sounds/<file> path when no CDN is configured', () => {
    expect(remoteUrl('rain.wav')).toBe('sounds/rain.wav');
  });
  it('joins with exactly one slash regardless of base trailing slash', () => {
    // remoteUrl must never produce a double slash between base and file
    expect(remoteUrl('rain.wav')).not.toMatch(/[^:]\/\//);
  });
});

describe('normalizeCdnBase', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeCdnBase('')).toBe('');
  });
  it('adds trailing slash to non-empty base', () => {
    expect(normalizeCdnBase('https://cdn.example.com/sounds')).toBe('https://cdn.example.com/sounds/');
  });
  it('removes extra trailing slashes then adds exactly one', () => {
    expect(normalizeCdnBase('https://cdn.example.com/sounds//')).toBe('https://cdn.example.com/sounds/');
    expect(normalizeCdnBase('https://cdn.example.com/sounds///')).toBe('https://cdn.example.com/sounds/');
  });
});

describe('buildRemoteUrl', () => {
  it('buildRemoteUrl returns a relative path when base is empty', () => {
    expect(buildRemoteUrl('', 'rain.wav')).toBe('sounds/rain.wav');
  });
  it('buildRemoteUrl joins an absolute base with exactly one slash', () => {
    expect(buildRemoteUrl('https://cdn.example.com/sounds', 'rain.wav')).toBe('https://cdn.example.com/sounds/rain.wav');
    expect(buildRemoteUrl('https://cdn.example.com/sounds/', 'rain.wav')).toBe('https://cdn.example.com/sounds/rain.wav');
  });
  it('buildRemoteUrl strips leading slashes from the file', () => {
    expect(buildRemoteUrl('', '/rain.wav')).toBe('sounds/rain.wav');
  });
});
