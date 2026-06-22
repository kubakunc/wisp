<script lang="ts">
  import type { Mix } from '$lib/types';
  import { getSound } from '$lib/sounds/registry';

  let { mix, playing, locked = false, lockedSoundCount = 0, onPlay, onDelete }: {
    mix: Mix;
    playing: boolean;
    /** Whole mix is beyond the free saved-mix limit → Premium-only. */
    locked?: boolean;
    /** Premium sounds in this (otherwise playable) mix that won't play on the
     *  free tier — they're excluded when launched. */
    lockedSoundCount?: number;
    onPlay: () => void;
    onDelete: () => void;
  } = $props();

  // Title is the sounds being mixed (not a generic "My Mix" name).
  const layerNames = $derived(
    mix.layers
      .map((l) => getSound(l.soundId)?.name ?? l.soundId)
      .join(', ')
  );
  const soundCount = $derived(mix.layers.length);
</script>

<div class="mix-card" class:playing class:locked>
  <div class="card-body">
    {#if locked}
      <div class="pro-header">
        <span class="pro-badge" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          PRO
        </span>
      </div>
    {:else if playing}
      <div class="playing-header">
        <span class="playing-label">PLAYING</span>
        <div class="equalizer" aria-hidden="true">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
        </div>
      </div>
    {/if}
    <span class="mix-name">{layerNames}</span>
    {#if locked}
      <span class="layer-names lock-note">Premium · upgrade to use this mix</span>
    {:else if lockedSoundCount > 0}
      <span class="layer-names lock-note">{soundCount} sound{soundCount === 1 ? '' : 's'} · {lockedSoundCount} Premium won’t play</span>
    {:else}
      <span class="layer-names">{soundCount} sound{soundCount === 1 ? '' : 's'}</span>
    {/if}
  </div>

  <div class="card-actions">
    {#if locked}
      <button class="play-btn lock-btn" aria-label="Unlock “{layerNames}” with Premium" onclick={onPlay}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </button>
    {:else}
    <button
      class="play-btn"
      aria-label={playing ? `Pause ${layerNames}` : `Play ${layerNames}`}
      aria-pressed={playing}
      onclick={onPlay}
    >
      {#if playing}
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      {:else}
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      {/if}
    </button>
    {/if}

    <button class="delete-btn" aria-label="Delete mix: {layerNames}" onclick={onDelete}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .mix-card {
    display: flex;
    align-items: center;
    gap: 0;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }

  .mix-card.playing {
    border-color: rgba(124, 140, 240, 0.4);
    background: linear-gradient(160deg, #23284a, #1a1f3c);
  }

  /* Over the free limit → Premium-only. Distinct purple tint so it's clearly a
     Pro item, and the action becomes an unlock (handled by the parent). */
  .mix-card.locked {
    border-color: rgba(185, 140, 240, 0.5);
    background: linear-gradient(160deg, rgba(154, 127, 196, 0.16), rgba(26, 31, 60, 0.6));
  }

  .pro-header {
    display: flex;
    margin-bottom: 2px;
  }
  .pro-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--on-accent);
    background: linear-gradient(135deg, var(--accent-2), var(--premium));
    padding: 2px 7px 2px 6px;
    border-radius: 6px;
  }
  .lock-note {
    color: var(--accent-2) !important;
  }
  .lock-btn {
    background: rgba(185, 140, 240, 0.16) !important;
    color: var(--accent-2) !important;
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 14px 16px;
    min-width: 0;
  }

  .playing-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .playing-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent-1);
    letter-spacing: 0.08em;
  }

  .equalizer {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
  }

  .bar {
    display: block;
    width: 2px;
    border-radius: 1px;
    background: var(--accent-1);
    transform-origin: bottom;
    animation: wispBar 0.8s ease-in-out infinite alternate;
  }

  .bar-1 { height: 8px; animation-delay: 0s; }
  .bar-2 { height: 12px; animation-delay: 0.18s; }
  .bar-3 { height: 6px; animation-delay: 0.36s; }

  .mix-name {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .layer-names {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .mix-card.playing .layer-names {
    color: var(--accent-1);
    opacity: 0.8;
  }

  .card-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }

  .play-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accent-grad);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--on-accent);
    margin: 10px 8px;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .play-btn:hover {
    opacity: 0.88;
  }

  .delete-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--muted-2);
    margin-right: 8px;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }

  .delete-btn:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.08);
  }
</style>
