import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createTimerStore } from './timer';
import { createAudioEngine } from '$lib/services/audioEngine';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';

function make(fadeMs = 0) {
  const { adapter } = createFakeNativeAudio();
  const engine = createAudioEngine(adapter);
  let scheduled: (() => void) | null = null;
  let scheduledMs = -1;
  const store = createTimerStore(engine, {
    now: () => 1_000_000,
    setTimer: (cb, ms) => {
      scheduled = cb;
      scheduledMs = ms;
      return 1;
    },
    clearTimer: () => {
      scheduled = null;
    },
    fadeMs
  });
  return { engine, store, fire: () => scheduled?.(), schedMs: () => scheduledMs };
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

  it('schedules the fade so it completes at 0:00 (starts fadeMs before the end)', () => {
    const { store, schedMs } = make(30_000); // 30s fade
    store.startPreset(15); // 900s = 900_000ms
    // fire is scheduled 30s before the end so the fade lands silence at 0:00
    expect(schedMs()).toBe(900_000 - 30_000);
  });

  it('clamps the fade to the timer length for short custom timers', () => {
    const { store, schedMs } = make(30_000);
    store.startCustom(0.25); // 15s timer, shorter than the 30s fade
    // fade can be at most the whole timer → fires immediately (delay 0)
    expect(schedMs()).toBe(0);
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
    expect(get(store)).toEqual({ mode: 'off', durationSec: null, endsAt: null, remainingMs: null });
  });

  it('pause freezes the remaining time and cancels the scheduled fire', () => {
    let t = 1_000_000;
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    let scheduled: (() => void) | null = null;
    const store = createTimerStore(engine, {
      now: () => t,
      setTimer: (cb) => { scheduled = cb; return 1; },
      clearTimer: () => { scheduled = null; },
      fadeMs: 0
    });
    store.startPreset(15); // endsAt = t + 900_000
    t += 300_000; // 5 min elapse
    store.pause();
    const s = get(store);
    expect(s.endsAt).toBeNull();
    expect(s.remainingMs).toBe(600_000); // 10 min left, frozen
    expect(s.mode).toBe('preset');
    expect(scheduled).toBeNull(); // fire was cancelled — won't run while paused
  });

  it('starting a timer then immediately pausing (set while paused) freezes it at full duration and schedules nothing', () => {
    // Regression: setting a sleep timer while playback is already paused must
    // NOT let the countdown run over silence — the player freezes it on start.
    let t = 1_000_000;
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    let scheduled: (() => void) | null = null;
    const store = createTimerStore(engine, {
      now: () => t,
      setTimer: (cb) => { scheduled = cb; return 1; },
      clearTimer: () => { scheduled = null; },
      fadeMs: 0
    });
    store.startPreset(30); // endsAt = t + 1_800_000
    store.pause(); // no time elapsed — set while paused
    const s = get(store);
    expect(s.endsAt).toBeNull();
    expect(s.remainingMs).toBe(1_800_000); // full 30 min preserved
    expect(scheduled).toBeNull(); // nothing will fire while paused
  });

  it('resume reschedules for the frozen remaining and clears the paused state', () => {
    let t = 1_000_000;
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    let scheduledMs = -1;
    const store = createTimerStore(engine, {
      now: () => t,
      setTimer: (_cb, ms) => { scheduledMs = ms; return 1; },
      clearTimer: () => {},
      fadeMs: 10_000
    });
    store.startPreset(15);
    t += 300_000;
    store.pause(); // 600_000 remaining
    t += 999_999; // wall-clock moves while paused — must NOT affect the remainder
    store.resume();
    const s = get(store);
    expect(s.remainingMs).toBeNull();
    expect(s.endsAt).toBe(t + 600_000);
    // rescheduled with the 10s fade landing at 0:00
    expect(scheduledMs).toBe(600_000 - 10_000);
  });

  it('pause/resume are no-ops for until-stop and off', () => {
    const { store } = make();
    store.startUntilStop();
    store.pause();
    expect(get(store)).toMatchObject({ mode: 'until-stop', endsAt: null, remainingMs: null });
    store.cancel();
    store.pause();
    store.resume();
    expect(get(store).mode).toBe('off');
  });

  it('expiry fades out + pauses but KEEPS the mix loaded, and resets timer', async () => {
    const { engine, store } = make();
    await engine.play('rain');
    store.startPreset(15);
    await store.fireNow();
    // Sound is kept (paused), not torn down — the user can resume.
    expect(engine.activeIds()).toEqual(['rain']);
    expect(get(store).mode).toBe('off');
  });

  it('scheduled callback triggers the fade-and-pause', async () => {
    const { engine, store, fire } = make();
    await engine.play('rain');
    store.startPreset(15);
    await fire();
    expect(engine.activeIds()).toEqual(['rain']);
  });

  it('concurrent fireNow calls fade audio only once', async () => {
    const { engine, store } = make();
    await engine.play('rain');
    store.startPreset(15);
    let fadeCount = 0;
    const originalFade = engine.fadeOutAndPause.bind(engine);
    engine.fadeOutAndPause = async (ms: number) => {
      fadeCount++;
      await originalFade(ms);
    };
    await Promise.all([store.fireNow(), store.fireNow()]);
    expect(fadeCount).toBe(1);
    expect(engine.activeIds()).toEqual(['rain']);
    expect(get(store).mode).toBe('off');
  });

  it('calls onExpire when the timer fires', async () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    let expired = 0;
    const store = createTimerStore(engine, {
      now: () => 0,
      setTimer: () => 1,
      clearTimer: () => {},
      fadeMs: 0,
      onExpire: () => { expired++; }
    });
    store.startPreset(15);
    await store.fireNow();
    expect(expired).toBe(1);
  });

  it('does NOT call onExpire on manual cancel', () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    let expired = 0;
    const store = createTimerStore(engine, {
      now: () => 0,
      setTimer: () => 1,
      clearTimer: () => {},
      fadeMs: 0,
      onExpire: () => { expired++; }
    });
    store.startPreset(15);
    store.cancel();
    expect(expired).toBe(0);
    expect(get(store).mode).toBe('off');
  });

  it('constructs with production defaults (no injected deps)', () => {
    const { adapter } = createFakeNativeAudio();
    const engine = createAudioEngine(adapter);
    const store = createTimerStore(engine); // real performance.now + setTimeout + clearTimeout
    store.startPreset(1);          // schedules a real setTimeout (1 min) — we won't wait
    expect(get(store).mode).toBe('preset');
    store.cancel();                // clears the real timeout immediately
    expect(get(store).mode).toBe('off');
  });
});
