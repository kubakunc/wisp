import type { AdMobAdapter, ConsentResult } from '$lib/adapters/admob';
import { TEST_BANNER_AD_ID } from '$lib/ads/config';

export interface AdsServiceOpts {
  adId?: string;
  marginBottomPx?: number;
}

export function createAdsService(adapter: AdMobAdapter, opts?: AdsServiceOpts) {
  const adId = opts?.adId ?? TEST_BANNER_AD_ID;
  // Bottom margin (px) the banner is lifted above the bottom edge so it floats
  // above the bottom menu. The patched AdMob plugin honors this on Android 15+.
  const marginBottomPx = opts?.marginBottomPx ?? 0;

  let lastConsent: ConsentResult | null = null;
  // The native plugin only applies the bottom margin when CREATING the banner
  // view, so to move it (e.g. nav routes vs the full-screen player) we must
  // remove and re-show it. Track the margin currently applied.
  let shownMargin: number | null = null;

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
     * `marginOverride` repositions the banner (defaults to the configured margin);
     * a changed margin forces a remove+recreate so the new position takes effect.
     * Returns true when the banner is now visible, false when it was removed/hidden.
     */
    async showIfEligible(isPremium: boolean, marginOverride?: number): Promise<boolean> {
      const margin = marginOverride ?? marginBottomPx;
      const canShow =
        !isPremium &&
        (lastConsent === 'obtained' || lastConsent === 'not_required');

      if (canShow) {
        if (shownMargin !== null && shownMargin !== margin) {
          await adapter.removeBanner();
          shownMargin = null;
        }
        await adapter.showBanner({ adId, marginBottomPx: margin });
        shownMargin = margin;
      } else {
        await adapter.removeBanner();
        shownMargin = null;
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
