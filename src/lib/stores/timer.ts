import { writable } from 'svelte/store';
import type { AudioEngine } from '$lib/services/audioEngine';
import type { TimerState } from '$lib/types';

type TimerHandle = ReturnType<typeof setTimeout> | number;

export interface TimerDeps {
  now?: () => number;
  setTimer?: (cb: () => void, ms: number) => TimerHandle;
  clearTimer?: (h: TimerHandle) => void;
  fadeMs?: number;
}

const OFF: TimerState = { mode: 'off', durationSec: null, endsAt: null };

export function createTimerStore(engine: AudioEngine, deps: TimerDeps = {}) {
  const now = deps.now ?? (() => performance.now());
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const fadeMs = deps.fadeMs ?? 30000;

  const { subscribe, set } = writable<TimerState>({ ...OFF });
  let handle: TimerHandle | null = null;

  function clear() {
    if (handle !== null) {
      clearTimer(handle);
      handle = null;
    }
  }

  async function fireNow(): Promise<void> {
    clear();
    await engine.fadeOutAll(fadeMs);
    set({ ...OFF });
  }

  function startTimed(mode: 'preset' | 'custom', minutes: number) {
    clear();
    const durationSec = Math.round(minutes * 60);
    set({ mode, durationSec, endsAt: now() + durationSec * 1000 });
    handle = setTimer(() => fireNow(), durationSec * 1000);
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
