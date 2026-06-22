import { writable } from 'svelte/store';
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

const OFF: TimerState = { mode: 'off', durationSec: null, endsAt: null };

export function createTimerStore(engine: AudioEngine, deps: TimerDeps = {}) {
  const now = deps.now ?? (() => performance.now());
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const fadeMs = deps.fadeMs ?? 10000;
  const onExpire = deps.onExpire;

  const { subscribe, set } = writable<TimerState>({ ...OFF });
  let handle: TimerHandle | null = null;
  let firing = false;
  // Fade duration for the current run, clamped so it never exceeds the timer
  // itself (a 10s custom timer can't have a 30s fade).
  let runFadeMs = fadeMs;

  function clear() {
    if (handle !== null) {
      clearTimer(handle);
      handle = null;
    }
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
    set({ mode, durationSec, endsAt: now() + totalMs });
    // The fade happens over the LAST runFadeMs of the countdown, so playback is
    // silent right at 0:00 (matching "fades gently over the last 10 seconds")
    // rather than starting the fade after the timer already elapsed.
    runFadeMs = Math.min(fadeMs, totalMs);
    handle = setTimer(() => fireNow(), Math.max(0, totalMs - runFadeMs));
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
      set({ mode: 'until-stop', durationSec: null, endsAt: null });
    },
    cancel() {
      clear();
      set({ ...OFF });
    },
    fireNow
  };
}

export type TimerStore = ReturnType<typeof createTimerStore>;
