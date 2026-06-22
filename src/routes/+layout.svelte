<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { app, RC_API_KEY } from '$lib/app';
  import { BANNER_HEIGHT_PX, NAV_HEIGHT_PX } from '$lib/ads/config';
  import { getSound } from '$lib/sounds/registry';
  import { modalOpen } from '$lib/stores/ui';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import NowPlayingBar from '$lib/components/NowPlayingBar.svelte';

  const { children } = $props();

  const { sounds, timer, subscription, analytics, ads } = app;
  const { isPremium } = subscription;
  const soundsPaused = sounds.paused;

  const pathname = $derived($page.url.pathname);
  const isFullScreen = $derived(pathname === '/now-playing' || pathname === '/paywall');
  const onPaywall = $derived(pathname === '/paywall');

  const activeTab = $derived(
    (pathname.startsWith('/mixes')
      ? 'mixes'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'sounds') as 'sounds' | 'mixes' | 'settings'
  );

  // Ads show for free users on every route EXCEPT the paywall (including the
  // full-screen player), and are suppressed while a modal sheet is open.
  // Deterministic so the reserved space + framed slot stay in sync with what the
  // user sees (vs. the async $ads.bannerVisible store).
  const showAds = $derived(!$isPremium && !onPaywall && !$modalOpen);
  // Native banner margin: lifted above the bottom nav on normal routes; pinned
  // to the bottom on the full-screen player (which has no nav).
  const bannerMargin = $derived(isFullScreen ? 0 : NAV_HEIGHT_PX);

  // Persistent mini-player: shown on every normal route when something is
  // playing. Tapping a sound/mix just plays it; the full player opens only by
  // tapping this bar (so play never force-navigates).
  const npIds = $derived(Object.keys($sounds));
  const npCount = $derived(npIds.length);
  const npNames = $derived(npIds.map((id) => getSound(id)?.name ?? id).join(' · '));
  const npPlaying = $derived(npCount > 0 && !$soundsPaused);
  const showNowPlaying = $derived(npCount > 0 && !isFullScreen);

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
    const paywall = onPaywall;
    const margin = bannerMargin;
    const modal = $modalOpen;
    if (paywall || modal) {
      ads.hide().catch(() => {});
    } else {
      ads.sync(premium, margin).catch(() => {});
    }
  });

  // The sleep timer only counts down while a sound is actually playing: pause it
  // when playback pauses, resume it when playback resumes, and turn it OFF when
  // there are no active sounds (nothing to time).
  $effect(() => {
    const count = Object.keys($sounds).length;
    const paused = $soundsPaused;
    if (count === 0) timer.cancel();
    else if (paused) timer.pause();
    else timer.resume();
  });

  onMount(async () => {
    // Status bar: don't draw the WebView under it (Android WebView doesn't
    // populate env(safe-area-inset-top) reliably), so the system clock/icons
    // stay visible. Light icons on our dark background.
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0e1c' });
    } catch {
      // Not in Capacitor / running in browser
    }

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
  class:has-banner={showAds && !isFullScreen}
  class:full={isFullScreen}
  style="--nav-h:{NAV_HEIGHT_PX}px; --banner-h:{BANNER_HEIGHT_PX}px"
>
  {@render children()}
</div>

{#if showAds}
  <!-- Framed ad card: an "AD / Remove ads" header above the slot where the
       native AdMob banner is anchored (it overlays the slot's placeholder).
       --ad-bottom matches the native banner margin so the box sits over it.
       Vars are repeated here because this is a SIBLING of .shell (custom
       properties don't cross between siblings). -->
  <div class="ad-frame" style="--nav-h:{NAV_HEIGHT_PX}px; --banner-h:{BANNER_HEIGHT_PX}px; --ad-bottom:{bannerMargin}px">
    <div class="ad-head">
      <span class="ad-tag">AD</span>
      <a class="remove-ads" href="/paywall" aria-label="Remove ads — go Premium">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 7l4.5 4L12 5l4.5 6L21 7l-1.8 11H4.8z"/>
        </svg>
        Remove ads
      </a>
    </div>
    <!-- The native AdMob banner overlays this slot. -->
    <div class="ad-slot" aria-hidden="true"></div>
  </div>
{/if}

{#if showNowPlaying}
  <!-- Persistent mini-player, above the ad card + nav. Tap it to open the full
       player; the play/pause toggles in place. -->
  <div
    class="global-now-playing"
    style="--np-bottom: calc({NAV_HEIGHT_PX}px + {showAds ? 'var(--wisp-ad-box-h)' : '0px'} + env(safe-area-inset-bottom, 0px))"
  >
    <NowPlayingBar
      count={npCount}
      names={npNames}
      playing={npPlaying}
      onOpen={() => goto('/now-playing')}
      onTogglePlay={() => sounds.togglePlayback().catch(() => {})}
    />
  </div>
{/if}

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
    --content-bottom: calc(var(--nav-h) + var(--wisp-ad-box-h) + env(safe-area-inset-bottom, 0px));
  }
  /* Full-screen routes (now-playing, paywall) have no bottom nav/banner, so they
     must NOT reserve that space — otherwise the page gains phantom scroll height
     and its content can scroll up under the status bar. */
  .shell.full {
    --content-bottom: 0px;
  }

  /* Persistent mini-player, floating just above the ad card + nav on every
     normal route. */
  .global-now-playing {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(var(--np-bottom) + 8px);
    z-index: 95;
    border: 1px solid rgba(124, 140, 240, 0.28);
    border-radius: 18px;
    overflow: hidden;
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

  /* Framed ad card. --ad-bottom matches the native banner margin so the native
     overlay (which always renders above the WebView) sits inside the slot. */
  .ad-frame {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(var(--ad-bottom, 0px) + env(safe-area-inset-bottom, 0px));
    width: min(400px, 94%);
    height: var(--wisp-ad-box-h);
    z-index: 90;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid rgba(124, 140, 240, 0.18);
    border-radius: 16px;
    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }
  .ad-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .ad-tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--muted-2);
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 8px;
    border-radius: 6px;
  }
  .remove-ads {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-1);
    text-decoration: none;
  }
  .ad-slot {
    flex: 1;
  }
</style>
