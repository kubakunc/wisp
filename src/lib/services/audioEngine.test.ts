import { describe, it, expect } from 'vitest';
import { createAudioEngine } from './audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';

const noSleep = async () => {};

describe('audioEngine', () => {
  it('preloads and plays a sound, marking the first active as notification owner', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    expect(state.tracks.get('rain')).toMatchObject({ playing: true, useForNotification: true, loop: true });
    expect(engine.activeIds()).toEqual(['rain']);
  });

  it('second sound is not the notification owner', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await engine.play('fan');
    expect(state.tracks.get('fan')?.useForNotification).toBe(false);
    expect(engine.activeIds().sort()).toEqual(['fan', 'rain']);
  });

  it('clamps volume to 0..1', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await engine.setVolume('rain', 5);
    expect(state.tracks.get('rain')?.volume).toBe(1);
    await engine.setVolume('rain', -1);
    expect(state.tracks.get('rain')?.volume).toBe(0);
  });

  it('does not preload twice', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.ensurePreloaded('rain');
    const first = state.tracks.get('rain');
    await engine.ensurePreloaded('rain');
    expect(state.tracks.get('rain')).toBe(first);
  });

  it('throws for unknown sound ids', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await expect(engine.play('nope')).rejects.toThrow();
  });

  it('pause keeps the track; stop removes it from active', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await engine.pause('rain');
    expect(state.tracks.get('rain')?.playing).toBe(false);
    await engine.stop('rain');
    expect(engine.activeIds()).toEqual([]);
  });

  it('fadeOutAll ramps volumes to 0 then stops everything', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await engine.play('fan');
    await engine.fadeOutAll(1000, 250, noSleep);
    expect(engine.activeIds()).toEqual([]);
    expect(state.tracks.size).toBe(0);
  });
});
