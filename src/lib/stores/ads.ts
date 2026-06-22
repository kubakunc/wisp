import { writable } from 'svelte/store';
import type { AdsService } from '$lib/services/adsService';
import type { ConsentResult } from '$lib/adapters/admob';

export interface AdsState {
  consent: 'unknown' | ConsentResult;
  bannerVisible: boolean;
}

export function createAdsStore(svc: AdsService) {
  const { subscribe, update } = writable<AdsState>({
    consent: 'unknown',
    bannerVisible: false
  });

  return {
    subscribe,

    /** Initialize AdMob + consent flow and record the consent result. */
    async init(): Promise<void> {
      const consent = await svc.init();
      update((s) => ({ ...s, consent }));
    },

    /**
     * Sync banner visibility with the user's premium status.
     * `marginPx` optionally repositions the banner (e.g. above the nav vs at the
     * bottom of the full-screen player). Updates bannerVisible from the result.
     */
    async sync(isPremium: boolean, marginPx?: number): Promise<void> {
      const bannerVisible = await svc.showIfEligible(isPremium, marginPx);
      update((s) => ({ ...s, bannerVisible }));
    },

    /** Temporarily hide the banner and update store state. */
    async hide(): Promise<void> {
      await svc.hide();
      update((s) => ({ ...s, bannerVisible: false }));
    }
  };
}

export type AdsStore = ReturnType<typeof createAdsStore>;
