<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { SOUNDS, getSound } from '$lib/sounds/registry';
  import { WispEvent } from '$lib/analytics/events';
  import SoundRow from '$lib/components/SoundRow.svelte';
  import NowPlayingBar from '$lib/components/NowPlayingBar.svelte';
  import type { Mix } from '$lib/types';

  const { sounds, mixes, subscription, analytics } = app;
  const { isPremium } = subscription;

  // Load mixes on mount
  onMount(() => {
    mixes.load().catch(() => {});
  });

  // Hero favorite mix — first saved mix or default
  const DEFAULT_MIX: Mix = {
    id: '__default__',
    name: 'Thunderstorm Cabin',
    layers: [
      { soundId: 'rain', volume: 0.8 },
      { soundId: 'thunder', volume: 0.5 }
    ]
  };

  const heroMix = $derived($mixes[0] ?? DEFAULT_MIX);
  const heroLayerNames = $derived(
    heroMix.layers
      .map((l) => getSound(l.soundId)?.name ?? l.soundId)
      .slice(0, 3)
      .join(' · ')
  );

  function playHeroMix() {
    sounds.applyMix(heroMix).then(() => {
      analytics.track(WispEvent.mixPlay, { mix_id: heroMix.id }).catch(() => {});
      goto('/now-playing');
    }).catch(() => {});
  }

  // Sound list: active floated to top
  const activeSoundIds = $derived(Object.keys($sounds));
  const sortedSounds = $derived([
    ...SOUNDS.filter((s) => activeSoundIds.includes(s.id)),
    ...SOUNDS.filter((s) => !activeSoundIds.includes(s.id))
  ]);

  function handleSoundTap(soundId: string, tier: 'free' | 'premium') {
    const locked = tier === 'premium' && !$isPremium;
    if (locked) {
      analytics.track(WispEvent.paywallView, { source: 'sound_lock' }).catch(() => {});
      goto('/paywall');
      return;
    }
    const wasActive = activeSoundIds.includes(soundId);
    sounds.toggle(soundId).then(() => {
      if (!wasActive) {
        analytics.track(WispEvent.soundPlay, { sound_id: soundId }).catch(() => {});
      }
    }).catch(() => {});
  }

  // NowPlayingBar
  const activeCount = $derived(activeSoundIds.length);
  const activeNames = $derived(
    activeSoundIds
      .map((id) => getSound(id)?.name ?? id)
      .join(' · ')
  );
  const isPlaying = $derived(activeCount > 0);
</script>

<div class="home">
  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <span class="eyebrow">Wednesday night</span>
      <h1 class="page-title">Sounds</h1>
    </div>
    <button class="search-btn" aria-label="Search sounds">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="M20 20l-3-3"/>
      </svg>
    </button>
  </header>

  <!-- Hero mix card -->
  <button class="hero-card" onclick={playHeroMix} aria-label="Play {heroMix.name}">
    <div class="hero-overlay" aria-hidden="true"></div>
    <div class="hero-content">
      <span class="hero-eyebrow">FAVORITE MIX</span>
      <span class="hero-title">{heroMix.name}</span>
      <span class="hero-layers">{heroLayerNames}</span>
      <span class="hero-pill">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Play mix
      </span>
    </div>
  </button>

  <!-- Sound list -->
  <section class="sound-list" aria-label="Sound library">
    {#each sortedSounds as sound (sound.id)}
      <SoundRow
        {sound}
        active={activeSoundIds.includes(sound.id)}
        volume={$sounds[sound.id] ?? 0}
        locked={sound.tier === 'premium' && !$isPremium}
        onPrimary={() => handleSoundTap(sound.id, sound.tier)}
      />
    {/each}
  </section>

  <!-- NowPlayingBar -->
  {#if activeCount > 0}
    <div class="now-playing-wrap">
      <NowPlayingBar
        count={activeCount}
        names={activeNames}
        playing={isPlaying}
        onOpen={() => goto('/now-playing')}
        onTogglePlay={() => sounds.stopAll().catch(() => {})}
      />
    </div>
  {/if}
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-bottom: 16px;
    position: relative;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 56px 24px 8px;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .eyebrow {
    font-size: 13px;
    color: var(--muted);
    font-weight: 500;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: 25px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 0;
    color: var(--text);
  }

  .search-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
  }

  .hero-card {
    margin: 14px 24px 4px;
    border-radius: 24px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    background: var(--accent-grad);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    cursor: pointer;
    border: none;
    text-align: left;
    width: calc(100% - 48px);
    transition: opacity 0.15s;
  }

  .hero-card:hover {
    opacity: 0.92;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 80% at 80% 120%, rgba(10, 14, 28, 0.35), transparent);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hero-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(12, 18, 38, 0.6);
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--on-accent);
    margin-top: 4px;
    letter-spacing: -0.3px;
  }

  .hero-layers {
    font-size: 13px;
    color: rgba(12, 18, 38, 0.7);
    font-weight: 500;
  }

  .hero-pill {
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: var(--r-pill);
    background: var(--on-accent);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
  }

  .sound-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 18px 0;
  }

  .now-playing-wrap {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 84px;
    z-index: 50;
    border: 1px solid rgba(124, 140, 240, 0.28);
    border-radius: 18px;
    overflow: hidden;
  }
</style>
