import type { NativeAudioAdapter } from '$lib/adapters/nativeAudio';
import { getSound } from '$lib/sounds/registry';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createAudioEngine(audio: NativeAudioAdapter) {
  const preloaded = new Set<string>();
  const active = new Map<string, number>(); // soundId -> volume

  const hasNotificationOwner = () => active.size > 0;

  async function ensurePreloaded(soundId: string): Promise<void> {
    if (preloaded.has(soundId)) return;
    const def = getSound(soundId);
    if (!def) throw new Error(`Unknown sound: ${soundId}`);
    await audio.preload({
      audioId: def.id,
      assetPath: def.assetPath,
      loop: true,
      useForNotification: !hasNotificationOwner(),
      title: def.name,
      artist: 'Wisp'
    });
    preloaded.add(soundId);
  }

  return {
    ensurePreloaded,
    async play(soundId: string): Promise<void> {
      await ensurePreloaded(soundId);
      await audio.play(soundId);
      if (!active.has(soundId)) active.set(soundId, 1);
    },
    async pause(soundId: string): Promise<void> {
      await audio.pause(soundId);
    },
    async stop(soundId: string): Promise<void> {
      await audio.stop(soundId);
      active.delete(soundId);
      preloaded.delete(soundId);
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
        const factor = 1 - i / steps;
        for (const id of ids) {
          await audio.setVolume(id, clamp01((starts.get(id) ?? 1) * factor));
        }
        await sleep(stepMs);
      }
      for (const id of ids) {
        await audio.stop(id);
        active.delete(id);
        preloaded.delete(id);
      }
    }
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
