import type { AdMobAdapter, ConsentResult } from '$lib/adapters/admob';

export interface FakeAdMobState {
  initialized: boolean;
  consentRequested: boolean;
  bannerShown: boolean;
  lastMargin: number | null;
}

export interface FakeAdMobOpts {
  consent?: ConsentResult;
}

export function createFakeAdMob(opts?: FakeAdMobOpts): { adapter: AdMobAdapter; state: FakeAdMobState } {
  const consent: ConsentResult = opts?.consent ?? 'obtained';

  const state: FakeAdMobState = {
    initialized: false,
    consentRequested: false,
    bannerShown: false,
    lastMargin: null
  };

  const adapter: AdMobAdapter = {
    async initialize() {
      state.initialized = true;
    },

    async requestConsent(): Promise<ConsentResult> {
      state.consentRequested = true;
      return consent;
    },

    async showBanner(opts) {
      state.bannerShown = true;
      state.lastMargin = opts.marginBottomPx;
    },

    async hideBanner() {
      state.bannerShown = false;
    },

    async removeBanner() {
      state.bannerShown = false;
    }
  };

  return { adapter, state };
}
