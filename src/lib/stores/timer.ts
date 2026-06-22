import { writable, get } from 'svelte/store';
import type { AudioEngine } from '$lib/services/audioEngine';
import type { TimerState } from '$lib/types';

type TimerHandle = ReturnType<typeof setTimeout> | number;

export interface TimerDeps {
  now?: () => number;
  setTimer?: (cb: () => void, ms: number) => TimerHandle;
  clearTimer?: (h: TimerHandle) => void;
  fadeMs?: number;
  /** Called only when the timer actually EXPIRES (not on manual cancel), after
   *  the fade-out completes — lets the app clear the active-sounds store. */
  onExpire?: () => void;
}

const OFF: TimerState = { mode: 'off', durationSec: null, endsAt: null, remainingMs: null };

export function createTimerStore(engine: AudioEngine, deps: TimerDeps = {}) {
  const now = deps.now ?? (() => performance.now());
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const fadeMs = deps.fadeMs ?? 30000;
  const onExpire = deps.onExpire;

  const store = writable<TimerState>({ ...OFF });
  const { subscribe, set } = store;
  let handle: TimerHandle | null = null;
  let firing = false;
  // Fade duration for the current run, clamped so it never exceeds the time
  // remaining (a 10s remainder can't have a 30s fade).
  let runFadeMs = fadeMs;
  const isTimed = (m: TimerState['mode']) => m === 'preset' || m === 'custom';

  function clear() {
    if (handle !== null) {
      clearTimer(handle);
      handle = null;
    }
  }

  // Schedule the fade so it COMPLETES at 0:00 (starts runFadeMs before the end).
  function schedule(remainingMs: number) {
    runFadeMs = Math.min(fadeMs, remainingMs);
    handle = setTimer(() => fireNow(), Math.max(0, remainingMs - runFadeMs));
  }

  async function fireNow(): Promise<void> {
    if (firing) return;
    firing = true;
    try {
      clear();
      await engine.fadeOutAndPause(runFadeMs);
      set({ ...OFF });
      onExpire?.();
    } finally {
      firing = false;
    }
  }

  function startTimed(mode: 'preset' | 'custom', minutes: number) {
    clear();
    const durationSec = Math.round(minutes * 60);
    const totalMs = durationSec * 1000;
    set({ mode, durationSec, endsAt: now() + totalMs, remainingMs: null });
    schedule(totalMs);
  }

  return {
    subscribe,
    startPreset(minutes: number) {
      startTimed('preset', minutes);
    },
    startCustom(minutes: number) {
      startTimed('custom', minutes);
    },
    startUntilStop() {
      clear();
      set({ mode: 'until-stop', durationSec: null, endsAt: null, remainingMs: null });
    },
    /** Pause the countdown (playback paused): freeze the remaining time and
     *  cancel the scheduled fire. No-op unless a timed timer is actively running. */
    pause() {
      const s = get(store);
      if (!isTimed(s.mode) || s.endsAt === null) return;
      const remainingMs = Math.max(0, s.endsAt - now());
      clear();
      set({ ...s, endsAt: null, remainingMs });
    },
    /** Resume a paused countdown (playback resumed): reschedule for the frozen
     *  remaining time. No-op unless a timed timer is currently paused. */
    resume() {
      const s = get(store);
      if (!isTimed(s.mode) || s.remainingMs === null) return;
      const remainingMs = s.remainingMs;
      set({ ...s, endsAt: now() + remainingMs, remainingMs: null });
      schedule(remainingMs);
    },
    cancel() {
      clear();
      set({ ...OFF });
    },
    fireNow
  };
}

export type TimerStore = ReturnType<typeof createTimerStore>;
