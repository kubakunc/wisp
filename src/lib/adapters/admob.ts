// Real adapter: native-plugin wrapper, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
// Targets @capacitor-community/admob@^8.0.0.
// .d.ts: node_modules/@capacitor-community/admob/dist/esm/definitions.d.ts
//        node_modules/@capacitor-community/admob/dist/esm/consent/consent-definition.interface.d.ts
//        node_modules/@capacitor-community/admob/dist/esm/consent/consent-status.enum.d.ts
//        node_modules/@capacitor-community/admob/dist/esm/banner/banner-definitions.interface.d.ts
//        node_modules/@capacitor-community/admob/dist/esm/banner/banner-ad-options.interface.d.ts
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  AdmobConsentStatus
} from '@capacitor-community/admob';

export type ConsentResult = 'obtained' | 'not_required' | 'unavailable';

export interface AdMobAdapter {
  initialize(): Promise<void>;
  requestConsent(): Promise<ConsentResult>;
  showBanner(opts: { adId: string; marginBottomPx: number }): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;
}

/**
 * Maps the installed AdmobConsentStatus enum to our domain's ConsentResult.
 *
 * OBTAINED  → 'obtained'  (user gave consent)
 * NOT_REQUIRED → 'not_required' (no consent needed, e.g. outside EEA)
 * REQUIRED / UNKNOWN → 'unavailable' (we couldn't obtain consent)
 */
function mapConsentStatus(status: AdmobConsentStatus): ConsentResult {
  if (status === AdmobConsentStatus.OBTAINED) return 'obtained';
  if (status === AdmobConsentStatus.NOT_REQUIRED) return 'not_required';
  return 'unavailable';
}

export const admobAdapter: AdMobAdapter = {
  async initialize() {
    await AdMob.initialize();
  },

  async requestConsent(): Promise<ConsentResult> {
    // Step 1: request consent info to learn current status.
    const info = await AdMob.requestConsentInfo();

    // If consent form is available and needed, show it so user can choose.
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
      const afterForm = await AdMob.showConsentForm();
      return mapConsentStatus(afterForm.status);
    }

    return mapConsentStatus(info.status);
  },

  async showBanner(opts) {
    await AdMob.showBanner({
      adId: opts.adId,
      position: BannerAdPosition.BOTTOM_CENTER,
      // margin is typed as number | undefined in AdOptions — our narrowed number is safe.
      // The patched plugin adds (margin * density) to the bottom system inset on
      // Android 15+, so the banner floats this many dp above the bottom menu.
      margin: opts.marginBottomPx,
      // Fixed 320x50 banner → predictable height so the nav can clear it reliably.
      adSize: BannerAdSize.BANNER
    });
  },

  async hideBanner() {
    await AdMob.hideBanner();
  },

  async removeBanner() {
    await AdMob.removeBanner();
  }
};
