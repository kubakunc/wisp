import { describe, it, expect } from 'vitest';
import { createAudioEngine } from './audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';
import type { NativeAudioAdapter } from '$lib/adapters/nativeAudio';

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

  it('stopping the last sound leaves activeIds empty and does not throw', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');
    await expect(engine.stop('rain')).resolves.not.toThrow();
    expect(engine.activeIds()).toEqual([]);
  });

  it('stopping the notification owner transfers ownership to a remaining active sound', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);

    // rain is first — becomes owner
    await engine.play('rain');
    expect(state.tracks.get('rain')?.useForNotification).toBe(true);

    // fan is second — not owner
    await engine.play('fan');
    expect(state.tracks.get('fan')?.useForNotification).toBe(false);

    // Set fan to a non-default volume so we can verify restoration after promotion
    await engine.setVolume('fan', 0.6);
    expect(state.tracks.get('fan')?.volume).toBe(0.6);

    // Stop the owner (rain) — fan must be promoted
    await engine.stop('rain');

    expect(engine.activeIds()).toEqual(['fan']);

    // fan must have been re-established as notification owner
    const fanTrack = state.tracks.get('fan');
    expect(fanTrack?.useForNotification).toBe(true);

    // fan must still be playing after re-establishment
    expect(fanTrack?.playing).toBe(true);

    // fan's volume must be restored to what it was before promotion
    expect(fanTrack?.volume).toBe(0.6);
  });

  it('fadeOutAll ramps volumes strictly decreasing to 0 then stops everything', async () => {
    const volumeLog: Array<{ id: string; volume: number }> = [];

    const { adapter: baseAdapter, state } = createFakeNativeAudio();

    // Wrap the adapter to record setVolume calls
    const recordingAdapter: NativeAudioAdapter = {
      ...baseAdapter,
      async setVolume(id: string, v: number) {
        volumeLog.push({ id, volume: v });
        return baseAdapter.setVolume(id, v);
      }
    };

    const engine = createAudioEngine(recordingAdapter);
    await engine.play('rain');
    await engine.play('fan');

    // 1000ms / 250ms = 4 steps
    await engine.fadeOutAll(1000, 250, noSleep);

    expect(engine.activeIds()).toEqual([]);
    expect(state.tracks.size).toBe(0);

    // Check that volumes were applied for each sound
    const rainVolumes = volumeLog.filter((e) => e.id === 'rain').map((e) => e.volume);
    const fanVolumes = volumeLog.filter((e) => e.id === 'fan').map((e) => e.volume);

    // Must have 4 steps recorded per sound
    expect(rainVolumes.length).toBe(4);
    expect(fanVolumes.length).toBe(4);

    // Volumes must be strictly decreasing
    for (let i = 1; i < rainVolumes.length; i++) {
      expect(rainVolumes[i]).toBeLessThan(rainVolumes[i - 1]);
    }
    for (let i = 1; i < fanVolumes.length; i++) {
      expect(fanVolumes[i]).toBeLessThan(fanVolumes[i - 1]);
    }

    // Final volume must be 0
    expect(rainVolumes[rainVolumes.length - 1]).toBe(0);
    expect(fanVolumes[fanVolumes.length - 1]).toBe(0);
  });

  it('fadeOutAll sleep is called between steps only (not after last step)', async () => {
    const sleepCalls: number[] = [];
    const recordingSleep = async (ms: number) => {
      sleepCalls.push(ms);
    };

    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    await engine.play('rain');

    // 1000ms / 250ms = 4 steps — sleep should be called 3 times (between steps)
    await engine.fadeOutAll(1000, 250, recordingSleep);

    expect(sleepCalls.length).toBe(3);
  });
});
