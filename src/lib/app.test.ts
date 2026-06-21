import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createApp } from './app';
import { createFakeNativeAudio } from '$lib/adapters/fakes/fakeNativeAudio';
import { createFakePurchases } from '$lib/adapters/fakes/fakePurchases';
import { createFakePreferences } from '$lib/adapters/fakes/fakePreferences';
import { createFakeAnalytics } from '$lib/adapters/fakes/fakeAnalytics';

function makeApp(startPremium = false) {
  return createApp({
    audio: createFakeNativeAudio().adapter,
    purchases: createFakePurchases({ startPremium }).adapter,
    preferences: createFakePreferences().adapter,
    analytics: createFakeAnalytics().adapter,
    timerDeps: { fadeMs: 0 }
  });
}

describe('app composition root', () => {
  it('wires stores that interoperate (play then timer fade)', async () => {
    const app = makeApp();
    await app.sounds.toggle('rain');
    expect(get(app.sounds)).toEqual({ rain: 1 });
    app.timer.startPreset(15);
    await app.timer.fireNow();
    await app.sounds.stopAll();
    expect(get(app.sounds)).toEqual({});
  });

  it('exposes a subscription store', async () => {
    const app = makeApp(true);
    await app.subscription.init('key');
    expect(get(app.subscription.isPremium)).toBe(true);
  });
});
