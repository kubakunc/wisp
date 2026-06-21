import { describe, it, expect, vi } from 'vitest';
import { get } from 'svelte/store';
import { createTimerStore } from './timer';
import { createAudioEngine } from '$lib/services/audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';

function make() {
  const { adapter } = createFakeNativeAudio();
  const engine = createAudioEngine(adapter);
  let scheduled: (() => void) | null = null;
  const store = createTimerStore(engine, {
    now: () => 1_000_000,
    setTimer: (cb) => {
      scheduled = cb;
      return 1;
    },
    clearTimer: () => {
      scheduled = null;
    },
    fadeMs: 0
  });
  return { engine, store, fire: () => scheduled?.() };
}

describe('timer store', () => {
  it('starts a 30 minute preset', () => {
    const { store } = make();
    store.startPreset(30);
    const s = get(store);
    expect(s.mode).toBe('preset');
    expect(s.durationSec).toBe(1800);
    expect(s.endsAt).toBe(1_000_000 + 1800 * 1000);
  });

  it('until-stop has no end time', () => {
    const { store } = make();
    store.startUntilStop();
    expect(get(store)).toMatchObject({ mode: 'until-stop', durationSec: null, endsAt: null });
  });

  it('custom minutes set duration', () => {
    const { store } = make();
    store.startCustom(5);
    expect(get(store).durationSec).toBe(300);
  });

  it('cancel resets to off', () => {
    const { store } = make();
    store.startPreset(15);
    store.cancel();
    expect(get(store)).toEqual({ mode: 'off', durationSec: null, endsAt: null });
  });

  it('expiry fades out audio and resets', async () => {
    const { engine, store } = make();
    await engine.play('rain');
    store.startPreset(15);
    await store.fireNow();
    expect(engine.activeIds()).toEqual([]);
    expect(get(store).mode).toBe('off');
  });

  it('scheduled callback triggers fade', async () => {
    const { engine, store, fire } = make();
    await engine.play('rain');
    store.startPreset(15);
    await fire();
    expect(engine.activeIds()).toEqual([]);
  });
});
