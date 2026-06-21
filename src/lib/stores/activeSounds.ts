import { writable, get } from 'svelte/store';
import type { AudioEngine } from '$lib/services/audioEngine';
import type { Mix, MixLayer } from '$lib/types';

export function createActiveSoundsStore(engine: AudioEngine) {
  const { subscribe, set, update } = writable<Record<string, number>>({});

  const isActive = (soundId: string) => soundId in get({ subscribe });

  async function stopAll(): Promise<void> {
    for (const id of engine.activeIds()) {
      await engine.stop(id);
    }
    set({});
  }

  return {
    subscribe,
    isActive,
    async toggle(soundId: string): Promise<void> {
      if (isActive(soundId)) {
        await engine.stop(soundId);
        update((s) => {
          const { [soundId]: _removed, ...rest } = s;
          return rest;
        });
      } else {
        await engine.play(soundId);
        update((s) => ({ ...s, [soundId]: 1 }));
      }
    },
    async setVolume(soundId: string, volume: number): Promise<void> {
      await engine.setVolume(soundId, volume);
      update((s) => (soundId in s ? { ...s, [soundId]: volume } : s));
    },
    currentLayers(): MixLayer[] {
      const s = get({ subscribe });
      return Object.entries(s).map(([soundId, volume]) => ({ soundId, volume }));
    },
    async applyMix(mix: Mix): Promise<void> {
      await stopAll();
      for (const layer of mix.layers) {
        await engine.play(layer.soundId);
        await engine.setVolume(layer.soundId, layer.volume);
        update((s) => ({ ...s, [layer.soundId]: layer.volume }));
      }
    },
    stopAll
  };
}

export type ActiveSoundsStore = ReturnType<typeof createActiveSoundsStore>;
