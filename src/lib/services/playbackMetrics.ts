import { WispEvent, type WispEventName } from '$lib/analytics/events';
import { getSound } from '$lib/sounds/registry';

type Track = (event: WispEventName, params?: Record<string, string | number | boolean>) => void;

export interface PlaybackMetricsDeps {
  /** Fire-and-forget analytics sink. */
  track: Track;
  /** Wall clock in ms (injectable for tests). */
  now?: () => number;
  /** Whether a sound is Pro (injectable for tests). */
  isPremium?: (soundId: string) => boolean;
  /** Segments shorter than this (seconds) are ignored as noise. */
  minSeconds?: number;
}

/**
 * Accumulates how long each sound — and each multi-sound combination — is
 * actually playing, then emits duration analytics when playback stops (or on an
 * explicit flush, e.g. the app backgrounding).
 *
 * Combination keys are the sound ids sorted alphabetically and joined, so the
 * same set of sounds always produces the same `mix_played` key regardless of the
 * order they were added.
 */
export function createPlaybackMetrics(deps: PlaybackMetricsDeps) {
  const track = deps.track;
  const now = deps.now ?? (() => Date.now());
  const isPremium = deps.isPremium ?? ((id: string) => getSound(id)?.tier === 'premium');
  const minMs = (deps.minSeconds ?? 1) * 1000;

  const soundMs = new Map<string, number>();
  const comboMs = new Map<string, number>();
  let prevActive: string[] = [];
  let prevPlaying = false;
  let prevTs: number | null = null;

  const comboKey = (ids: string[]) => [...ids].sort().join('+');

  // Add the elapsed time of the segment that just ended to the running totals.
  function closeSegment(at: number) {
    if (prevTs === null || !prevPlaying || prevActive.length === 0) return;
    const dt = at - prevTs;
    if (dt <= 0) return;
    for (const id of prevActive) soundMs.set(id, (soundMs.get(id) ?? 0) + dt);
    if (prevActive.length >= 2) {
      const k = comboKey(prevActive);
      comboMs.set(k, (comboMs.get(k) ?? 0) + dt);
    }
  }

  function emitAll() {
    for (const [id, ms] of soundMs) {
      if (ms >= minMs) {
        track(WispEvent.soundPlayed, {
          sound_id: id,
          premium: isPremium(id),
          seconds: Math.round(ms / 1000)
        });
      }
    }
    for (const [k, ms] of comboMs) {
      if (ms >= minMs) {
        const ids = k.split('+');
        track(WispEvent.mixPlayed, {
          sounds: k,
          count: ids.length,
          premium_count: ids.filter(isPremium).length,
          seconds: Math.round(ms / 1000)
        });
      }
    }
    soundMs.clear();
    comboMs.clear();
  }

  return {
    /** Call whenever the active set or play/pause state changes. */
    sync(activeIds: string[], playing: boolean) {
      const t = now();
      closeSegment(t);
      prevActive = [...activeIds];
      prevPlaying = playing;
      prevTs = t;
      // Playback fully stopped → flush the session's totals.
      if (activeIds.length === 0) emitAll();
    },
    /** Emit accumulated totals now (e.g. app backgrounding) and keep counting. */
    flush() {
      const t = now();
      closeSegment(t);
      emitAll();
      prevTs = t;
    }
  };
}

export type PlaybackMetrics = ReturnType<typeof createPlaybackMetrics>;
