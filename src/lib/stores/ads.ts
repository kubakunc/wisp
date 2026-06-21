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
     * Calls showIfEligible and updates bannerVisible accordingly.
     */
    async sync(isPremium: boolean): Promise<void> {
      await svc.showIfEligible(isPremium);
      // Banner is visible only when not premium and consent allows ads
      update((s) => ({
        ...s,
        bannerVisible:
          !isPremium && (s.consent === 'obtained' || s.consent === 'not_required')
      }));
    },

    /** Temporarily hide the banner and update store state. */
    async hide(): Promise<void> {
      await svc.hide();
      update((s) => ({ ...s, bannerVisible: false }));
    }
  };
}

export type AdsStore = ReturnType<typeof createAdsStore>;
