<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { WispEvent } from '$lib/analytics/events';
  import MixCard from '$lib/components/MixCard.svelte';
  import { playableLayers } from '$lib/sounds/registry';
  import type { Mix } from '$lib/types';

  const { sounds, mixes, subscription, analytics } = app;
  const { isPremium } = subscription;
  const soundsPaused = sounds.paused;

  onMount(() => {
    mixes.load().catch(() => {});
  });

  // A mix is the "active" set when the currently-loaded sounds match its layers
  // (regardless of paused state).
  function activeMatches(mix: Mix): boolean {
    const active = $sounds;
    const entries = Object.entries(active);
    if (entries.length !== mix.layers.length) return false;
    return mix.layers.every((l) => Math.abs((active[l.soundId] ?? -1) - l.volume) < 0.01);
  }

  // "Playing" = it's the active mix AND playback isn't paused. So pausing flips
  // the card back to a play state instead of falsely showing "Playing".
  function isPlaying(mix: Mix): boolean {
    return activeMatches(mix) && !$soundsPaused;
  }

  function handlePlay(mix: Mix) {
    // If this mix is already loaded, the button toggles pause/resume in place
    // (no navigation) so its play/pause icon actually controls playback.
    if (activeMatches(mix)) {
      sounds.togglePlayback().catch(() => {});
      return;
    }
    // Otherwise load it. Free users can't play premium sounds — play the allowed
    // subset, or route to the paywall if the mix is entirely premium.
    const allowed = playableLayers(mix.layers, $isPremium);
    if (allowed.length === 0) {
      analytics.track(WispEvent.paywallView, { source: 'mix_premium' }).catch(() => {});
      goto('/paywall');
      return;
    }
    // Play in place — the persistent now-playing bar (layout) appears; the full
    // player opens only when the user taps that bar, not on every play.
    sounds.applyMix({ ...mix, layers: allowed }).then(() => {
      analytics.track(WispEvent.mixPlay, { mix_id: mix.id }).catch(() => {});
    }).catch(() => {});
  }

  function handleDelete(id: string) {
    mixes.remove(id).catch(() => {});
  }

  const mixCount = $derived($mixes.length);
</script>

<div class="mixes-page">
  <header class="header">
    <h1 class="page-title">Your mixes</h1>
    <p class="subtitle">{mixCount} saved · tap to launch</p>
  </header>

  <section class="mix-list" aria-label="Saved mixes">
    {#each $mixes as mix (mix.id)}
      <MixCard
        {mix}
        playing={isPlaying(mix)}
        onPlay={() => handlePlay(mix)}
        onDelete={() => handleDelete(mix.id)}
      />
    {:else}
      <p class="empty-mixes">No saved mixes yet. Layer some sounds and tap <strong>Save</strong>.</p>
    {/each}
  </section>

  <!-- Create new mix -->
  <button class="create-mix-btn" onclick={() => goto('/')} aria-label="Create a new mix">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5v14"/>
    </svg>
    Create new mix
  </button>
</div>

<style>
  .mixes-page {
    display: flex;
    flex-direction: column;
    padding-bottom: 24px;
  }

  .header {
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 24px 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: 25px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 0;
    color: var(--text);
  }

  .subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
  }

  .mix-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 22px 0;
  }

  .empty-mixes {
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
    padding: 28px 12px;
  }

  .create-mix-btn {
    margin: 20px 22px 0;
    border: 1.5px dashed rgba(124, 140, 240, 0.35);
    border-radius: var(--r-card);
    padding: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #9aa6f5;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    transition: border-color 0.15s, background 0.15s;
  }

  .create-mix-btn:hover {
    border-color: var(--accent-1);
    background: rgba(124, 140, 240, 0.05);
  }
</style>
