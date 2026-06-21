<script lang="ts">
  import type { Mix } from '$lib/types';
  import { getSound } from '$lib/sounds/registry';
  import SoundIcon from './SoundIcon.svelte';

  let { mix, active, onPlay, onDelete }: {
    mix: Mix;
    active: boolean;
    onPlay: () => void;
    onDelete?: () => void;
  } = $props();

  const previewLayers = $derived(mix.layers.slice(0, 3));
</script>

<div class="mix-card" class:active>
  <button class="card-body" aria-pressed={active} onclick={onPlay}>
    <div class="icons-row">
      {#each previewLayers as layer}
        {@const sound = getSound(layer.soundId)}
        {#if sound}
          <div class="icon-bubble">
            <SoundIcon id={sound.id} size={20} />
          </div>
        {/if}
      {/each}
      {#if mix.layers.length > 3}
        <div class="icon-bubble more">+{mix.layers.length - 3}</div>
      {/if}
    </div>
    <span class="mix-name">{mix.name}</span>
    <span class="layer-count">{mix.layers.length} sound{mix.layers.length !== 1 ? 's' : ''}</span>
  </button>

  {#if onDelete}
    <button class="delete-btn" aria-label="Delete {mix.name}" onclick={onDelete}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .mix-card {
    display: flex;
    align-items: stretch;
    gap: 0;
    border-radius: var(--r-card);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .mix-card.active {
    border-color: rgba(124, 140, 240, 0.4);
    background: linear-gradient(160deg, #23284a, #1a1f3c);
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 14px 16px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text);
    text-align: left;
  }

  .icons-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .icon-bubble {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }

  .mix-card.active .icon-bubble {
    background: rgba(124, 140, 240, 0.15);
    color: var(--accent-1);
  }

  .more {
    color: var(--muted);
  }

  .mix-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .layer-count {
    font-size: 12px;
    color: var(--muted);
  }

  .mix-card.active .layer-count {
    color: var(--accent-1);
  }

  .delete-btn {
    padding: 0 14px;
    background: none;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    color: var(--muted-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
  }

  .delete-btn:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.08);
  }
</style>
