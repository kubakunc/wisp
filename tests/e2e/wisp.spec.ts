import { test, expect } from '@playwright/test';

// Inject browser fakes before the SPA bootstraps so no native plugin is touched.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tracks = new Map<string, { playing: boolean; volume: number }>();
    (window as any).__WISP_TEST__ = {
      audio: {
        async preload(o: any) { tracks.set(o.audioId, { playing: false, volume: 1 }); },
        async play(id: string) { const t = tracks.get(id); if (t) t.playing = true; },
        async pause(id: string) { const t = tracks.get(id); if (t) t.playing = false; },
        async stop(id: string) { const t = tracks.get(id); if (t) t.playing = false; },
        async destroy(id: string) { tracks.delete(id); },
        async setVolume(id: string, v: number) { const t = tracks.get(id); if (t) t.volume = v; }
      },
      preferences: {
        async get(k: string) { return localStorage.getItem(k); },
        async set(k: string, v: string) { localStorage.setItem(k, v); },
        async remove(k: string) { localStorage.removeItem(k); }
      },
      purchases: {
        async configure() {},
        async getCustomerInfo() { return { entitlements: [] }; },
        async getOfferings() { return { packages: [
          { identifier: '$rc_annual', productId: 'a', priceString: '$39.99', packageType: 'ANNUAL' },
          { identifier: '$rc_monthly', productId: 'm', priceString: '$6.99', packageType: 'MONTHLY' }
        ] }; },
        async purchasePackage() { return { entitlements: ['premium'] }; },
        async restorePurchases() { return { entitlements: [] }; }
      },
      // analytics + admob fakes — required because the layout calls app.analytics.* and app.ads.*
      analytics: {
        async logEvent() {}, async setScreen() {}, async setEnabled() {}
      },
      admob: {
        async initialize() {},
        async requestConsent() { return 'not_required'; },
        async showBanner() {}, async hideBanner() {}, async removeBanner() {}
      }
    };
  });
});

test('layer two sounds, save a mix, then hit the free-tier cap', async ({ page }) => {
  await page.goto('/');
  // SoundRow row-btn accessible name = sound name (+ " Premium" suffix when locked).
  // Use exact:true to avoid partial matches (e.g. "Rain" vs "Heavy Rain", "Rain on Tent").
  await page.getByRole('button', { name: 'Rain', exact: true }).click();
  await page.getByRole('button', { name: 'Ocean', exact: true }).click();

  // Navigate to /now-playing via the NowPlayingBar "open" button (SPA route — keeps in-memory store).
  await page.getByRole('button', { name: /now playing|open/i }).click();
  await expect(page).toHaveURL(/now-playing/);
  await page.getByRole('button', { name: /Save/ }).click();

  // Back to home (SPA) — /now-playing is fullscreen so there's no bottom nav there.
  await page.getByRole('button', { name: /Back/i }).click();
  await expect(page).toHaveURL('/');

  // Navigate to /mixes via the bottom nav link (SPA route — preserves store state).
  await page.getByRole('link', { name: 'Mixes' }).click();
  await expect(page).toHaveURL(/mixes/);
  // a saved mix card is now present — check the mix-name text (the play/delete buttons
  // both carry "My Mix" in their aria-labels, so use text rather than role to avoid strict-mode failure)
  await expect(page.getByText('My Mix', { exact: true })).toBeVisible();

  // Navigate back to home via nav, then re-open /now-playing via the NowPlayingBar.
  await page.getByRole('link', { name: 'Sounds' }).click();
  await expect(page).toHaveURL('/');
  await page.getByRole('button', { name: /now playing|open/i }).click();
  await expect(page).toHaveURL(/now-playing/);

  // free tier is capped at one saved mix → a second save surfaces the upgrade hint
  await page.getByRole('button', { name: /Save/ }).click();
  await expect(page.getByText(/Upgrade to save more mixes/i)).toBeVisible();
});

test('locked premium sound routes to the paywall', async ({ page }) => {
  await page.goto('/');
  // Locked premium SoundRow button accessible name = "Thunderstorm Premium" (name + subtitle).
  // Use exact:true to avoid the hero card "Play Thunderstorm Cabin".
  await page.getByRole('button', { name: 'Thunderstorm Premium', exact: true }).click();
  await expect(page).toHaveURL(/paywall/);
  await expect(page.getByText('$39.99')).toBeVisible();
});
