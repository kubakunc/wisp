import { writable, get } from 'svelte/store';
import type { AudioEngine } from '$lib/services/audioEngine';
import type { Mix, MixLayer } from '$lib/types';

export function createActiveSoundsStore(engine: AudioEngine) {
  const { subscribe, set, update } = writable<Record<string, number>>({});
  const { subscribe: subscribePaused, set: setPaused } = writable<boolean>(false);

  const isActive = (soundId: string) => soundId in get({ subscribe });

  async function stopAll(): Promise<void> {
    for (const id of engine.activeIds()) {
      await engine.stop(id);
    }
    set({});
    setPaused(false);
  }

  /** Pause all active sounds without removing them from the store. */
  async function pauseAll(): Promise<void> {
    for (const id of Object.keys(get({ subscribe }))) {
      await engine.pause(id);
    }
    setPaused(true);
  }

  /** Resume all sounds that are in the store (were paused, not stopped). */
  async function resumeAll(): Promise<void> {
    for (const id of Object.keys(get({ subscribe }))) {
      await engine.play(id);
    }
    setPaused(false);
  }

  /** Toggle between paused and playing for all active sounds. */
  async function togglePlayback(): Promise<void> {
    if (get({ subscribe: subscribePaused })) {
      await resumeAll();
    } else {
      await pauseAll();
    }
  }

  return {
    subscribe,
    paused: { subscribe: subscribePaused },
    isActive,
    async toggle(soundId: string): Promise<void> {
      if (isActive(soundId)) {
        await engine.stop(soundId);
        update((s) => {
          const { [soundId]: _removed, ...rest } = s;
          return rest;
        });
        // If no sounds left, reset paused state
        if (Object.keys(get({ subscribe })).length === 0) {
          setPaused(false);
        }
      } else {
        await engine.play(soundId);
        update((s) => ({ ...s, [soundId]: 1 }));
        // A new sound starting should clear paused state
        setPaused(false);
      }
    },
    async setVolume(soundId: string, volume: number): Promise<void> {
      if (!isActive(soundId)) return;
      await engine.setVolume(soundId, volume);
      update((s) => ({ ...s, [soundId]: volume }));
    },
    currentLayers(): MixLayer[] {
      const s = get({ subscribe });
      return Object.entries(s).map(([soundId, volume]) => ({ soundId, volume }));
    },
    async applyMix(mix: Mix): Promise<void> {
      await stopAll();
      const newState: Record<string, number> = {};
      for (const layer of mix.layers) {
        await engine.play(layer.soundId);
        await engine.setVolume(layer.soundId, layer.volume);
        newState[layer.soundId] = layer.volume;
      }
      set(newState);
    },
    stopAll,
    pauseAll,
    resumeAll,
    togglePlayback
  };
}

export type ActiveSoundsStore = ReturnType<typeof createActiveSoundsStore>;
