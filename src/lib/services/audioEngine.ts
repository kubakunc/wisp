import type { NativeAudioAdapter } from '$lib/adapters/nativeAudio';
import { getSound } from '$lib/sounds/registry';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createAudioEngine(audio: NativeAudioAdapter) {
  const preloaded = new Set<string>();
  const active = new Map<string, number>(); // soundId -> volume
  let notificationOwnerId: string | null = null;

  async function preloadTrack(soundId: string, useForNotification: boolean): Promise<void> {
    const def = getSound(soundId);
    if (!def) throw new Error(`Unknown sound: ${soundId}`);
    await audio.preload({
      audioId: def.id,
      assetPath: def.assetPath,
      loop: true,
      useForNotification,
      title: def.name,
      artist: 'Wisp'
    });
  }

  async function ensurePreloaded(soundId: string): Promise<void> {
    if (preloaded.has(soundId)) return;
    const isFirstActive = active.size === 0;
    await preloadTrack(soundId, isFirstActive);
    preloaded.add(soundId);
  }

  async function promoteToOwner(soundId: string): Promise<void> {
    const volume = active.get(soundId) ?? 1;
    // Re-establish the track with useForNotification: true
    await audio.stop(soundId);
    preloaded.delete(soundId);
    await preloadTrack(soundId, true);
    preloaded.add(soundId);
    await audio.play(soundId);
    await audio.setVolume(soundId, volume);
    notificationOwnerId = soundId;
  }

  return {
    ensurePreloaded,
    async play(soundId: string): Promise<void> {
      await ensurePreloaded(soundId);
      await audio.play(soundId);
      if (!active.has(soundId)) {
        active.set(soundId, 1);
        if (notificationOwnerId === null) {
          notificationOwnerId = soundId;
        }
      }
    },
    async pause(soundId: string): Promise<void> {
      await audio.pause(soundId);
    },
    async stop(soundId: string): Promise<void> {
      const wasOwner = notificationOwnerId === soundId;
      await audio.stop(soundId);
      active.delete(soundId);
      preloaded.delete(soundId);
      if (wasOwner) {
        notificationOwnerId = null;
        // Promote another active sound to owner if any remain
        const nextOwnerId = active.keys().next().value as string | undefined;
        if (nextOwnerId !== undefined) {
          await promoteToOwner(nextOwnerId);
        }
      }
    },
    async setVolume(soundId: string, volume: number): Promise<void> {
      const v = clamp01(volume);
      await audio.setVolume(soundId, v);
      if (active.has(soundId)) active.set(soundId, v);
    },
    activeIds(): string[] {
      return [...active.keys()];
    },
    async fadeOutAll(durationMs: number, stepMs = 500, sleep = realSleep): Promise<void> {
      const ids = [...active.keys()];
      const steps = Math.max(1, Math.floor(durationMs / stepMs));
      const starts = new Map(ids.map((id) => [id, active.get(id) ?? 1]));
      for (let i = 1; i <= steps; i++) {
        if (i > 1) await sleep(stepMs);
        const factor = 1 - i / steps;
        for (const id of ids) {
          await audio.setVolume(id, clamp01((starts.get(id) ?? 1) * factor));
        }
      }
      for (const id of ids) {
        await audio.stop(id);
        active.delete(id);
        preloaded.delete(id);
      }
      notificationOwnerId = null;
    }
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
