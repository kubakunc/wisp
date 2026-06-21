<script lang="ts">
  import type { MixLayer } from '$lib/types';
  import { getSound } from '$lib/sounds/registry';
  import SoundIcon from './SoundIcon.svelte';

  let { layer, x, y, size = 56, onTap }: {
    layer: MixLayer;
    x: number;
    y: number;
    size?: number;
    onTap: () => void;
  } = $props();

  const sound = $derived(getSound(layer.soundId));
  const alpha = $derived(0.3 + layer.volume * 0.7);
</script>

<button
  class="orbit-node"
  style="
    left:{x}px;
    top:{y}px;
    width:{size}px;
    height:{size}px;
    opacity:{alpha};
  "
  aria-label={sound ? sound.name : layer.soundId}
  onclick={onTap}
>
  {#if sound}
    <SoundIcon id={sound.id} size={size * 0.45} />
  {:else}
    <span class="fallback-id">{layer.soundId.slice(0, 2)}</span>
  {/if}
</button>

<style>
  .orbit-node {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--surface-hi-a);
    border: 1.5px solid rgba(124, 140, 240, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--accent-1);
    padding: 0;
    transition: opacity 0.15s, background 0.15s;
  }

  .orbit-node:hover {
    background: rgba(124, 140, 240, 0.18);
  }

  .fallback-id {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
  }
</style>
