<script lang="ts">
  import type { Mix } from '$lib/types';
  import { getSound } from '$lib/sounds/registry';
  import SoundIcon from './SoundIcon.svelte';

  let { mix, playing, onPlay, onDelete }: {
    mix: Mix;
    playing: boolean;
    onPlay: () => void;
    onDelete: () => void;
  } = $props();

  const previewLayers = $derived(mix.layers.slice(0, 3));
  const layerNames = $derived(
    mix.layers
      .map((l) => getSound(l.soundId)?.name ?? l.soundId)
      .join(', ')
  );
</script>

<div class="mix-card" class:playing>
  <div class="card-body">
    {#if playing}
      <div class="playing-header">
        <span class="playing-label">PLAYING</span>
        <div class="equalizer" aria-hidden="true">
          <span class="bar" style="animation-delay:0s"></span>
          <span class="bar" style="animation-delay:0.2s"></span>
          <span class="bar" style="animation-delay:0.4s"></span>
        </div>
      </div>
    {/if}
    <span class="mix-name">{mix.name}</span>
    <span class="layer-names">{layerNames}</span>
  </div>

  <div class="card-actions">
    <button
      class="play-btn"
      aria-label={playing ? `Pause ${mix.name}` : `Play ${mix.name}`}
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

    <button class="delete-btn" aria-label="Delete {mix.name}" onclick={onDelete}>
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
    height: 12px;
    border-radius: 1px;
    background: var(--accent-1);
    transform-origin: bottom;
    animation: wispBar 0.8s ease-in-out infinite;
  }

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
