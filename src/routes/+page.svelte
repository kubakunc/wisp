<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { SOUNDS, getSound, playableLayers } from '$lib/sounds/registry';
  import { phraseForDate } from '$lib/phrases';
  import { WispEvent } from '$lib/analytics/events';
  import SoundRow from '$lib/components/SoundRow.svelte';
  import type { Mix } from '$lib/types';

  const { sounds, mixes, subscription, analytics, downloads } = app;
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
    // Never play premium sounds on the free tier — route to the paywall instead
    // if the favourite mix is entirely premium; otherwise play the allowed subset.
    const allowed = playableLayers(heroMix.layers, $isPremium);
    if (allowed.length === 0) {
      analytics.track(WispEvent.paywallView, { source: 'hero_mix' }).catch(() => {});
      goto('/paywall');
      return;
    }
    sounds.applyMix({ ...heroMix, layers: allowed }).then(() => {
      analytics.track(WispEvent.mixPlay, { mix_id: heroMix.id }).catch(() => {});
    }).catch(() => {});
  }

  // Search
  let searchOpen = $state(false);
  let query = $state('');

  // Sound list: filter by search, then float active sounds to the top
  const activeSoundIds = $derived(Object.keys($sounds));
  const filteredSounds = $derived(
    query.trim()
      ? SOUNDS.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
      : SOUNDS
  );
  const sortedSounds = $derived([
    ...filteredSounds.filter((s) => activeSoundIds.includes(s.id)),
    ...filteredSounds.filter((s) => !activeSoundIds.includes(s.id))
  ]);

  function toggleSearch() {
    searchOpen = !searchOpen;
    if (!searchOpen) query = '';
  }

  function handleSoundTap(soundId: string, tier: 'free' | 'premium') {
    const wasActive = activeSoundIds.includes(soundId);
    // Active sounds can always be turned off; only ACTIVATING a premium sound is gated.
    const locked = tier === 'premium' && !$isPremium && !wasActive;
    if (locked) {
      analytics.track(WispEvent.paywallView, { source: 'sound_lock' }).catch(() => {});
      goto('/paywall');
      return;
    }
    sounds.toggle(soundId).then(() => {
      if (!wasActive) {
        analytics.track(WispEvent.soundPlay, { sound_id: soundId }).catch(() => {});
      }
    }).catch(() => {});
  }


  // Header: a calming bedtime phrase (rotates daily) over a live time-of-day
  // greeting, instead of a static "Sounds" title.
  const now = new Date();
  const dailyPhrase = phraseForDate(now);
  const greeting = (() => {
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const h = now.getHours();
    const part = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
    return `${weekday} ${part}`;
  })();
</script>

<div class="home">
  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <span class="eyebrow">{greeting}</span>
      <h1 class="page-title">{dailyPhrase}</h1>
    </div>
    <button class="search-btn" class:active={searchOpen} aria-label="Search sounds" aria-pressed={searchOpen} onclick={toggleSearch}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="M20 20l-3-3"/>
      </svg>
    </button>
  </header>

  {#if searchOpen}
    <div class="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/>
      </svg>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="search-input"
        type="search"
        placeholder="Search sounds"
        aria-label="Search sounds"
        bind:value={query}
        autofocus
      />
      {#if query}
        <button class="search-clear" aria-label="Clear search" onclick={() => (query = '')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      {/if}
    </div>
  {/if}

  <!-- Hero mix card (hidden while searching) -->
  {#if !searchOpen}
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
  {/if}

  <!-- Sound list -->
  <section class="sound-list" aria-label="Sound library">
    {#each sortedSounds as sound (sound.id)}
      <SoundRow
        {sound}
        active={activeSoundIds.includes(sound.id)}
        volume={$sounds[sound.id] ?? 0}
        locked={sound.tier === 'premium' && !$isPremium && !activeSoundIds.includes(sound.id)}
        downloading={$downloads[sound.id]?.status === 'downloading'}
        progress={$downloads[sound.id]?.progress ?? 0}
        onPrimary={() => handleSoundTap(sound.id, sound.tier)}
      />
    {:else}
      <p class="empty-results">No sounds match “{query}”.</p>
    {/each}
  </section>
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
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 24px 8px;
  }

  .search-btn.active {
    background: var(--accent-grad);
    color: var(--on-accent);
    border-color: transparent;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 24px 4px;
    padding: 12px 16px;
    border-radius: var(--r-pill);
    background: var(--surface);
    border: 1px solid rgba(124, 140, 240, 0.25);
  }
  .search-input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font: inherit;
    font-size: 15px;
  }
  .search-input::placeholder { color: var(--muted); }
  .search-clear {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .empty-results {
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    padding: 28px 0;
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
    padding: 12px 16px 0;
  }
</style>
