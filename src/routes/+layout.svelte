<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { app, RC_API_KEY } from '$lib/app';
  import { BANNER_HEIGHT_PX, NAV_HEIGHT_PX } from '$lib/ads/config';
  import BottomNav from '$lib/components/BottomNav.svelte';

  const { children } = $props();

  const { sounds, timer, subscription, analytics, ads } = app;
  const { isPremium } = subscription;

  const pathname = $derived($page.url.pathname);
  const isFullScreen = $derived(pathname === '/now-playing' || pathname === '/paywall');

  const activeTab = $derived(
    (pathname.startsWith('/mixes')
      ? 'mixes'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'sounds') as 'sounds' | 'mixes' | 'settings'
  );

  // The native AdMob banner anchors to the bottom edge (and on Android 15+ the plugin
  // forces it there). So the bottom nav is lifted ABOVE the banner, and content is
  // padded for nav + banner (+ the device's bottom safe-area inset).
  const bannerVisible = $derived(!isFullScreen && $ads.bannerVisible);

  // Analytics: fire screen() on route change
  $effect(() => {
    const name = pathname === '/' ? 'home' : pathname.slice(1).replace(/\//g, '_') || 'home';
    analytics.screen(name).catch(() => {});
  });

  // AdMob: the banner is a native overlay, so it must be actively hidden on
  // full-screen routes (now-playing, paywall) or it covers their controls.
  // Re-syncs on route change and entitlement change.
  $effect(() => {
    const premium = $isPremium;
    const full = isFullScreen;
    if (full) {
      ads.hide().catch(() => {});
    } else {
      ads.sync(premium).catch(() => {});
    }
  });

  // Timer: clear sounds when timer resets to 'off' after firing
  let prevMode = $state<string>('off');
  $effect(() => {
    const t = $timer;
    if (prevMode !== 'off' && t.mode === 'off') {
      sounds.stopAll().catch(() => {});
    }
    prevMode = t.mode;
  });

  onMount(async () => {
    await subscription.init(RC_API_KEY).catch(() => {});
    await ads.init().catch(() => {});
    await ads.sync($isPremium).catch(() => {});

    // Capacitor App resume: refresh entitlement
    try {
      const { App: CapApp } = await import('@capacitor/app');
      CapApp.addListener('resume', () => {
        subscription.refresh().catch(() => {});
      });
    } catch {
      // Not in Capacitor / running in browser
    }
  });
</script>

<div
  class="shell"
  class:has-banner={bannerVisible}
  style="--nav-h:{NAV_HEIGHT_PX}px; --banner-h:{BANNER_HEIGHT_PX}px"
>
  {@render children()}
</div>

{#if !isFullScreen}
  <div class="nav-bar">
    <BottomNav active={activeTab} />
  </div>
{/if}

<style>
  .shell {
    /* content reserves space for the nav at the very bottom (+ device safe-area),
       plus the banner strip that sits directly above the nav when present.
       --content-bottom is also read by floating UI like the now-playing bar. */
    --content-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding-bottom: var(--content-bottom);
  }
  .shell.has-banner {
    --content-bottom: calc(var(--nav-h) + var(--banner-h) + env(safe-area-inset-bottom, 0px));
  }

  /* Menu sits at the very bottom; the native banner is anchored one nav-height up,
     so it floats directly ABOVE this bar. */
  .nav-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--bg-bot);
    /* BottomNav owns its own safe-area inset padding; don't double it here. */
  }
</style>
