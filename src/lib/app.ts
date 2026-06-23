import { nativeAudioAdapter, type NativeAudioAdapter } from '$lib/adapters/nativeAudio';
import { purchasesAdapter, type PurchasesAdapter } from '$lib/adapters/purchases';
import { preferencesAdapter, type PreferencesAdapter } from '$lib/adapters/preferences';
import { analyticsAdapter, type AnalyticsAdapter } from '$lib/adapters/analytics';
import { admobAdapter, type AdMobAdapter } from '$lib/adapters/admob';
import { filesystemAdapter, type FilesystemAdapter } from '$lib/adapters/filesystem';
import { createAudioEngine } from '$lib/services/audioEngine';
import { createStorageService } from '$lib/services/storageService';
import { createSubscriptionService } from '$lib/services/subscriptionService';
import { createAnalyticsService } from '$lib/services/analyticsService';
import { createAdsService } from '$lib/services/adsService';
import { createSoundCacheService } from '$lib/services/soundCacheService';
import { createPlaybackMetrics } from '$lib/services/playbackMetrics';
import { NAV_HEIGHT_PX } from '$lib/ads/config';
import { createActiveSoundsStore } from '$lib/stores/activeSounds';
import { createSavedMixesStore } from '$lib/stores/savedMixes';
import { createTimerStore, type TimerDeps } from '$lib/stores/timer';
import { createSubscriptionStore } from '$lib/stores/subscription';
import { createAdsStore } from '$lib/stores/ads';
import { createDownloadsStore } from '$lib/stores/downloads';

export interface AppDeps {
  audio?: NativeAudioAdapter;
  purchases?: PurchasesAdapter;
  preferences?: PreferencesAdapter;
  analytics?: AnalyticsAdapter;
  admob?: AdMobAdapter;
  filesystem?: FilesystemAdapter;
  timerDeps?: TimerDeps;
}

export function createApp(deps: AppDeps = {}) {
  const audio = deps.audio ?? nativeAudioAdapter;
  const purchases = deps.purchases ?? purchasesAdapter;
  const preferences = deps.preferences ?? preferencesAdapter;
  const analyticsAdapterImpl = deps.analytics ?? analyticsAdapter;
  const admobAdapterImpl = deps.admob ?? admobAdapter;

  const filesystem = deps.filesystem ?? filesystemAdapter;
  const engine = createAudioEngine(audio);
  const storage = createStorageService(preferences);
  const subscriptionSvc = createSubscriptionService(purchases);
  const analytics = createAnalyticsService(analyticsAdapterImpl);
  // Banner sits one nav-height up from the bottom edge so it floats directly
  // above the bottom menu (menu at the very bottom, banner above it).
  const adsSvc = createAdsService(admobAdapterImpl, { marginBottomPx: NAV_HEIGHT_PX });

  const soundCache = createSoundCacheService(filesystem);
  const downloads = createDownloadsStore(soundCache);
  const sounds = createActiveSoundsStore(engine, (id) => downloads.ensure(id));
  const mixes = createSavedMixesStore(storage);
  // On timer EXPIRY (after the fade-out) PAUSE the mix — keep the sounds loaded
  // so the user can resume; the engine already faded + paused them, this syncs
  // the store's paused state. Manual cancel must NOT affect playback.
  const timer = createTimerStore(engine, {
    ...deps.timerDeps,
    onExpire: deps.timerDeps?.onExpire ?? (() => void sounds.pauseAll().catch(() => {}))
  });
  const subscription = createSubscriptionStore(subscriptionSvc);
  const ads = createAdsStore(adsSvc);

  // Playback duration metrics: accumulate per-sound and per-combination listening
  // time and emit it (sound_played / mix_played) when playback stops or flushes.
  const playbackMetrics = createPlaybackMetrics({
    track: (event, params) => void analytics.track(event, params).catch(() => {})
  });
  let metricActive: string[] = [];
  let metricPaused = false;
  const syncMetrics = () =>
    playbackMetrics.sync(metricActive, metricActive.length > 0 && !metricPaused);
  sounds.subscribe((m) => {
    metricActive = Object.keys(m);
    syncMetrics();
  });
  sounds.paused.subscribe((p) => {
    metricPaused = p;
    syncMetrics();
  });

  return {
    engine, sounds, mixes, timer, subscription, analytics, ads, soundCache, downloads,
    playbackMetrics
  };
}

export const RC_API_KEY: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_RC_API_KEY ?? '';

// TestHook mirrors AppDeps — include EVERY adapter createApp accepts (audio, purchases,
// preferences, analytics, admob) so the browser build never touches a real native plugin.
type TestHook = AppDeps;
const testDeps: TestHook =
  typeof window !== 'undefined' && (window as unknown as { __WISP_TEST__?: TestHook }).__WISP_TEST__
    ? (window as unknown as { __WISP_TEST__: TestHook }).__WISP_TEST__
    : {};

export const app = createApp(testDeps);
export type App = ReturnType<typeof createApp>;
