import { describe, it, expect } from 'vitest';
import { createAudioEngine } from './audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';

const noSleep = async () => {};

describe('audioEngine', () => {
  it('first sound becomes the notification owner and plays', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    expect(state.tracks.get('rain')).toMatchObject({ playing: true, useForNotification: true, loop: true });
    expect(engine.activeIds()).toEqual(['rain']);
  });

  it('second sound is NOT the notification owner', async () => {
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

  it('play is idempotent — replaying an active sound does not recreate it (no "already exists")', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await expect(engine.play('rain')).resolves.toBeUndefined();
    expect(state.tracks.size).toBe(1);
  });

  it('throws for unknown sound ids', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await expect(engine.play('nope')).rejects.toThrow();
  });

  it('stopping a non-owner destroys only that source; owner keeps playing', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain'); // owner
    await engine.play('fan');
    await engine.stop('fan');
    expect(state.tracks.has('fan')).toBe(false);
    expect(state.tracks.get('rain')).toMatchObject({ playing: true });
    expect(engine.activeIds()).toEqual(['rain']);
  });

  it('stopping the owner while others play keeps it as a paused anchor (not destroyed)', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain'); // owner
    await engine.play('fan');
    await engine.stop('rain');
    expect(state.tracks.get('rain')).toMatchObject({ playing: false, useForNotification: true });
    expect(state.tracks.get('fan')).toMatchObject({ playing: true });
    expect(engine.activeIds()).toEqual(['fan']);
  });

  it('re-toggling the owner back on resumes it without recreating', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain'); // owner
    await engine.play('fan');
    await engine.stop('rain'); // anchor paused
    await engine.play('rain'); // resume
    expect(state.tracks.get('rain')).toMatchObject({ playing: true });
    expect(engine.activeIds().sort()).toEqual(['fan', 'rain']);
  });

  it('emptying the mix tears everything down, owner destroyed last', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain'); // owner
    await engine.play('fan');
    await engine.stop('rain'); // owner → paused anchor
    await engine.stop('fan'); // last audible gone → teardown all
    expect(state.tracks.size).toBe(0);
    expect(engine.activeIds()).toEqual([]);
  });

  it('stopping the only sound (owner alone) destroys it', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await engine.stop('rain');
    expect(state.tracks.size).toBe(0);
    expect(engine.activeIds()).toEqual([]);
  });

  it('fadeOutAndPause ramps volume to 0, then pauses and restores volume (sources kept)', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const vols: Record<string, number[]> = {};
    const recording = {
      ...adapter,
      async setVolume(id: string, v: number) {
        (vols[id] ??= []).push(v);
        await adapter.setVolume(id, v);
      }
    };
    const engine = createAudioEngine(recording);
    await engine.play('rain');
    await engine.play('fan');
    await engine.fadeOutAndPause(1000, 250, noSleep);
    // Sources stay loaded + active (not torn down) so the mix can be resumed.
    expect(engine.activeIds().sort()).toEqual(['fan', 'rain']);
    expect(state.tracks.size).toBe(2);
    for (const id of ['rain', 'fan']) {
      const t = state.tracks.get(id)!;
      expect(t.playing).toBe(false); // paused
      expect(t.volume).toBe(1); // volume restored for a clean resume
      const seq = vols[id];
      // 4 ramp steps down to 0, then 1 restore step back to the original volume
      expect(seq.length).toBe(5);
      expect(seq[3]).toBe(0);
      for (let i = 1; i < 4; i++) expect(seq[i]).toBeLessThan(seq[i - 1]);
      expect(seq[4]).toBe(1);
    }
  });

  it('default fade uses many small steps so the volume drop is inaudible (no jumps)', async () => {
    const { adapter } = createFakeNativeAudio();
    const ramp: number[] = [];
    const recording = {
      ...adapter,
      async setVolume(id: string, v: number) {
        ramp.push(v);
        await adapter.setVolume(id, v);
      }
    };
    const engine = createAudioEngine(recording);
    await engine.play('rain'); // starts at volume 1
    // 30s at the default 50ms step => 600 ramp steps (+1 restore). noSleep keeps it instant.
    await engine.fadeOutAndPause(30_000, undefined, noSleep);
    const steps = ramp.slice(0, -1); // drop the trailing restore-to-1
    expect(steps.length).toBe(600);
    expect(steps[steps.length - 1]).toBe(0);
    // Every consecutive drop is tiny (well under 1%), so no audible stepping.
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i - 1] - steps[i]).toBeLessThan(0.01);
    }
  });

  it('never triggers an illegal owner-destroy (the fake throws if it would)', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain'); // owner
    await engine.play('fan');
    await engine.play('ocean');
    await engine.stop('rain'); // owner anchored
    await engine.stop('ocean');
    await engine.stop('fan'); // teardown
    expect(engine.activeIds()).toEqual([]);
  });

  it('play(soundId, uri) preloads with the given uri instead of the registry assetPath', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain', 'file:///data/sounds/rain.wav');
    expect(state.tracks.get('rain')?.assetPath).toBe('file:///data/sounds/rain.wav');
  });
});
