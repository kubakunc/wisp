import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createActiveSoundsStore } from './activeSounds';
import { createAudioEngine } from '$lib/services/audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';

function make() {
  const { adapter, state } = createFakeNativeAudio();
  const engine = createAudioEngine(adapter);
  return { store: createActiveSoundsStore(engine, async () => ''), state };
}

describe('activeSounds store', () => {
  it('toggle adds a playing sound at full volume', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    expect(get(store)).toEqual({ rain: 1 });
    expect(state.tracks.get('rain')?.playing).toBe(true);
    expect(store.isActive('rain')).toBe(true);
  });

  it('toggle twice stops the sound', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.toggle('rain');
    expect(get(store)).toEqual({});
    expect(state.tracks.has('rain')).toBe(false);
  });

  it('setVolume updates the store and the engine', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.setVolume('rain', 0.4);
    expect(get(store).rain).toBe(0.4);
    expect(state.tracks.get('rain')?.volume).toBe(0.4);
  });

  it('currentLayers reflects active sounds', async () => {
    const { store } = make();
    await store.toggle('rain');
    await store.setVolume('rain', 0.3);
    await store.toggle('fan');
    expect(store.currentLayers().sort((a, b) => a.soundId.localeCompare(b.soundId))).toEqual([
      { soundId: 'fan', volume: 1 },
      { soundId: 'rain', volume: 0.3 }
    ]);
  });

  it('setVolume on an inactive id is a no-op', async () => {
    const { store, state } = make();
    await store.setVolume('rain', 0.5);
    expect(get(store)).toEqual({});
    expect(state.tracks.has('rain')).toBe(false);
  });

  it('applyMix replaces active sounds with the mix layers', async () => {
    const { store, state } = make();
    await store.toggle('ocean');
    await store.applyMix({ id: 'm', name: 'x', layers: [{ soundId: 'rain', volume: 0.6 }, { soundId: 'fan', volume: 0.2 }] });
    expect(get(store)).toEqual({ rain: 0.6, fan: 0.2 });
    expect(state.tracks.has('ocean')).toBe(false);
    expect(state.tracks.get('rain')?.playing).toBe(true);
    expect(state.tracks.get('rain')?.volume).toBe(0.6);
    expect(state.tracks.get('fan')?.playing).toBe(true);
    expect(state.tracks.get('fan')?.volume).toBe(0.2);
  });

  it('stopAll clears everything', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.toggle('fan');
    await store.stopAll();
    expect(get(store)).toEqual({});
    expect(state.tracks.size).toBe(0);
  });

  it('pauseAll pauses tracks without removing them from the store', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.toggle('fan');
    await store.pauseAll();
    // Store still contains both sounds
    expect(get(store)).toEqual({ rain: 1, fan: 1 });
    // Tracks still exist but are paused
    expect(state.tracks.get('rain')?.playing).toBe(false);
    expect(state.tracks.get('fan')?.playing).toBe(false);
    // paused sub-store reflects state
    expect(get(store.paused)).toBe(true);
  });

  it('resumeAll resumes paused tracks', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.pauseAll();
    await store.resumeAll();
    expect(state.tracks.get('rain')?.playing).toBe(true);
    expect(get(store.paused)).toBe(false);
    // Store still contains the sound
    expect(get(store)).toEqual({ rain: 1 });
  });

  it('togglePlayback pauses when playing, resumes when paused', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    // Initially not paused
    expect(get(store.paused)).toBe(false);
    // First toggle → pauses
    await store.togglePlayback();
    expect(get(store.paused)).toBe(true);
    expect(state.tracks.get('rain')?.playing).toBe(false);
    // Second toggle → resumes
    await store.togglePlayback();
    expect(get(store.paused)).toBe(false);
    expect(state.tracks.get('rain')?.playing).toBe(true);
  });

  it('toggle clears paused state when last sound is removed', async () => {
    const { store } = make();
    await store.toggle('rain');
    await store.pauseAll();
    expect(get(store.paused)).toBe(true);
    await store.toggle('rain'); // remove the only sound
    expect(get(store.paused)).toBe(false);
  });

  it('toggle resets paused state when adding a new sound', async () => {
    const { store, state } = make();
    await store.toggle('rain');
    await store.pauseAll();
    await store.toggle('fan');
    expect(get(store.paused)).toBe(false);
    expect(state.tracks.get('fan')?.playing).toBe(true);
  });

  it('stopAll resets paused state', async () => {
    const { store } = make();
    await store.toggle('rain');
    await store.pauseAll();
    await store.stopAll();
    expect(get(store.paused)).toBe(false);
  });

  it('toggle resolves the uri and plays with it', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    const store = createActiveSoundsStore(engine, async (id) => `file:///data/sounds/${id}.wav`);
    await store.toggle('rain');
    expect(state.tracks.get('rain')?.assetPath).toBe('file:///data/sounds/rain.wav');
    expect(Object.keys(get(store))).toContain('rain');
  });

  it('applyMix resolves uri for each layer and plays with it', async () => {
    const { adapter, state } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    const store = createActiveSoundsStore(engine, async (id) => `file:///data/sounds/${id}.wav`);
    await store.applyMix({ id: 'm', name: 'x', layers: [{ soundId: 'rain', volume: 0.6 }] });
    expect(state.tracks.get('rain')?.assetPath).toBe('file:///data/sounds/rain.wav');
    expect(get(store)).toEqual({ rain: 0.6 });
  });

  it('toggle propagates a resolver rejection and does not mark the sound active', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    const store = createActiveSoundsStore(engine, async () => { throw new Error('download failed'); });
    await expect(store.toggle('rain')).rejects.toThrow('download failed');
    expect(Object.keys(get(store))).not.toContain('rain');
  });
});
