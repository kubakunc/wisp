import { nativeAudioAdapter, type NativeAudioAdapter } from '$lib/adapters/nativeAudio';
import { purchasesAdapter, type PurchasesAdapter } from '$lib/adapters/purchases';
import { preferencesAdapter, type PreferencesAdapter } from '$lib/adapters/preferences';
import { analyticsAdapter, type AnalyticsAdapter } from '$lib/adapters/analytics';
import { createAudioEngine } from '$lib/services/audioEngine';
import { createStorageService } from '$lib/services/storageService';
import { createSubscriptionService } from '$lib/services/subscriptionService';
import { createAnalyticsService } from '$lib/services/analyticsService';
import { createActiveSoundsStore } from '$lib/stores/activeSounds';
import { createSavedMixesStore } from '$lib/stores/savedMixes';
import { createTimerStore, type TimerDeps } from '$lib/stores/timer';
import { createSubscriptionStore } from '$lib/stores/subscription';

export interface AppDeps {
  audio?: NativeAudioAdapter;
  purchases?: PurchasesAdapter;
  preferences?: PreferencesAdapter;
  analytics?: AnalyticsAdapter;
  timerDeps?: TimerDeps;
}

export function createApp(deps: AppDeps = {}) {
  const audio = deps.audio ?? nativeAudioAdapter;
  const purchases = deps.purchases ?? purchasesAdapter;
  const preferences = deps.preferences ?? preferencesAdapter;
  const analyticsAdapterImpl = deps.analytics ?? analyticsAdapter;

  const engine = createAudioEngine(audio);
  const storage = createStorageService(preferences);
  const subscriptionSvc = createSubscriptionService(purchases);
  const analytics = createAnalyticsService(analyticsAdapterImpl);

  const sounds = createActiveSoundsStore(engine);
  const mixes = createSavedMixesStore(storage);
  const timer = createTimerStore(engine, deps.timerDeps);
  const subscription = createSubscriptionStore(subscriptionSvc);

  return { engine, sounds, mixes, timer, subscription, analytics };
}

export const RC_API_KEY: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_RC_API_KEY ?? '';

export const app = createApp();
export type App = ReturnType<typeof createApp>;
