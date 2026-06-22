import type { NativeAudioAdapter } from '$lib/adapters/nativeAudio';
import { getSound } from '$lib/sounds/registry';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Wraps the native-audio plugin into a simple multi-source mixer.
 *
 * Notification-owner model (dictated by @mediagrid/capacitor-native-audio):
 * exactly one source may have useForNotification=true, it must be CREATED first,
 * and it must be DESTROYED last (you cannot destroy it while other sources exist,
 * and there is no API to transfer ownership). So the first sound played becomes a
 * stable "anchor" for the whole session: if the user toggles it off while other
 * sounds play we PAUSE it (keep it as the silent notification anchor) rather than
 * destroy it; once the mix is empty we tear everything down, owner last.
 */
export function createAudioEngine(audio: NativeAudioAdapter) {
  const created = new Set<string>(); // sources that exist in the plugin
  const active = new Map<string, number>(); // soundId -> volume (the audible mix)
  let ownerId: string | null = null;

  async function teardownAll(): Promise<void> {
    for (const id of [...created].filter((x) => x !== ownerId)) {
      await audio.destroy(id);
      created.delete(id);
    }
    if (ownerId !== null && created.has(ownerId)) {
      await audio.destroy(ownerId);
      created.delete(ownerId);
    }
    created.clear();
    active.clear();
    ownerId = null;
  }

  return {
    async play(soundId: string, assetPath = ''): Promise<void> {
      if (!created.has(soundId)) {
        const def = getSound(soundId);
        if (!def) throw new Error(`Unknown sound: ${soundId}`);
        const isOwner = ownerId === null;
        await audio.preload({
          audioId: def.id,
          assetPath: assetPath || def.assetPath,
          loop: true,
          useForNotification: isOwner,
          title: def.name,
          artist: 'Wisp'
        });
        created.add(soundId);
        if (isOwner) ownerId = soundId;
      }
      await audio.play(soundId);
      if (!active.has(soundId)) active.set(soundId, 1);
    },
    async pause(soundId: string): Promise<void> {
      await audio.pause(soundId);
    },
    async stop(soundId: string): Promise<void> {
      if (!created.has(soundId)) {
        active.delete(soundId);
        return;
      }
      active.delete(soundId);
      const others = [...created].filter((x) => x !== soundId);
      if (soundId !== ownerId) {
        await audio.destroy(soundId);
        created.delete(soundId);
      } else if (others.length === 0) {
        await audio.destroy(soundId);
        created.delete(soundId);
        ownerId = null;
      } else {
        // Owner can't be destroyed while others exist — keep it as a silent anchor.
        await audio.pause(soundId);
      }
      // When nothing is audible anymore, fully release (incl. a lingering anchor).
      if (active.size === 0 && created.size > 0) {
        await teardownAll();
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
    /** Fade every active source to silence over durationMs, then PAUSE them and
     *  restore each volume so a later resume plays at the right level. Sources
     *  stay loaded — used by the sleep timer to stop playback WITHOUT removing
     *  the mix. */
    async fadeOutAndPause(durationMs: number, stepMs = 500, sleep = realSleep): Promise<void> {
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
      // Keep sources loaded: pause each and restore its pre-fade volume so the
      // mix can be resumed at the right level.
      for (const id of ids) {
        await audio.pause(id);
        await audio.setVolume(id, starts.get(id) ?? 1);
      }
    }
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
