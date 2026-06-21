<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { app, RC_API_KEY } from '$lib/app';
  import { BANNER_HEIGHT_PX } from '$lib/ads/config';
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

  const NAV_HEIGHT = 72;
  const contentPaddingBottom = $derived(
    isFullScreen
      ? 0
      : $isPremium
        ? NAV_HEIGHT
        : NAV_HEIGHT + BANNER_HEIGHT_PX
  );

  // Analytics: fire screen() on route change
  $effect(() => {
    const name = pathname === '/' ? 'home' : pathname.slice(1).replace(/\//g, '_') || 'home';
    analytics.screen(name).catch(() => {});
  });

  // AdMob: sync banner when isPremium changes
  $effect(() => {
    const premium = $isPremium;
    ads.sync(premium).catch(() => {});
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

<div class="shell" style="padding-bottom:{contentPaddingBottom}px">
  {@render children()}
</div>

{#if !isFullScreen}
  <div class="nav-bar">
    <BottomNav active={activeTab} />
  </div>
{/if}

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .nav-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
  }
</style>
