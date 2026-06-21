import type { AdMobAdapter, ConsentResult } from '$lib/adapters/admob';
import { TEST_BANNER_AD_ID } from '$lib/ads/config';

export interface AdsServiceOpts {
  adId?: string;
  marginBottomPx?: number;
}

export function createAdsService(adapter: AdMobAdapter, opts?: AdsServiceOpts) {
  const adId = opts?.adId ?? TEST_BANNER_AD_ID;
  // Banner anchors to the bottom edge (margin 0). On Android 15+ the plugin forces
  // this regardless; the web layout lifts the bottom nav above the banner.
  const marginBottomPx = opts?.marginBottomPx ?? 0;

  let lastConsent: ConsentResult | null = null;

  return {
    /** Initialize AdMob and run the UMP consent flow. Returns the resolved consent result. */
    async init(): Promise<ConsentResult> {
      await adapter.initialize();
      lastConsent = await adapter.requestConsent();
      return lastConsent;
    },

    /**
     * Show the banner ONLY when the user is not premium AND consent was obtained/not_required.
     * Premium users or unavailable consent → banner is removed (never shown or actively removed).
     * Returns true when the banner is now visible, false when it was removed/hidden.
     */
    async showIfEligible(isPremium: boolean): Promise<boolean> {
      const canShow =
        !isPremium &&
        (lastConsent === 'obtained' || lastConsent === 'not_required');

      if (canShow) {
        await adapter.showBanner({ adId, marginBottomPx });
      } else {
        await adapter.removeBanner();
      }

      return canShow;
    },

    /** Temporarily hide the banner (can be resumed). */
    async hide(): Promise<void> {
      await adapter.hideBanner();
    },

    /** Permanently remove the banner from the screen. */
    async remove(): Promise<void> {
      await adapter.removeBanner();
    }
  };
}

export type AdsService = ReturnType<typeof createAdsService>;
