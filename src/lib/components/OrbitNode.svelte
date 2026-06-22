<script lang="ts">
  import { getSound } from '$lib/sounds/registry';
  import SoundIcon from './SoundIcon.svelte';

  let { id, volume, selected, angleDeg, onSelect }: {
    id: string;
    volume: number;
    selected: boolean;
    angleDeg: number;
    onSelect: () => void;
  } = $props();

  const sound = $derived(getSound(id));
  const label = $derived(sound ? sound.name : id);

  // Orbit radius as a fraction of the (square, responsive) stage so nodes stay
  // on the ring at any width. 110/320 ≈ 0.34375 → 34.375% from centre.
  const RADIUS_PCT = 34.375;

  const rad = $derived((angleDeg - 90) * (Math.PI / 180));
  const cxPct = $derived(50 + RADIUS_PCT * Math.cos(rad));
  const cyPct = $derived(50 + RADIUS_PCT * Math.sin(rad));

  // Border brightness ∝ volume
  const borderAlpha = $derived(0.2 + volume * 0.6);
</script>

<button
  class="orbit-node"
  class:selected
  style="
    left:{cxPct}%;
    top:{cyPct}%;
    --border-alpha:{borderAlpha};
  "
  aria-label={label}
  onclick={onSelect}
>
  {#if sound}
    <SoundIcon id={sound.id} size={22} />
  {:else}
    <span class="fallback-id" aria-hidden="true">{id.slice(0, 2).toUpperCase()}</span>
  {/if}
</button>

<style>
  .orbit-node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--surface-hi-a, #23284a);
    border: 1.5px solid rgba(124, 140, 240, var(--border-alpha, 0.4));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--accent-1);
    padding: 0;
    transition: border-color 0.2s, background 0.15s, transform 0.15s;
  }

  .orbit-node.selected {
    border: 2px solid var(--accent-1);
    background: rgba(124, 140, 240, 0.2);
    box-shadow: 0 0 0 3px rgba(124, 140, 240, 0.18);
    transform: translate(-50%, -50%) scale(1.1);
  }

  .orbit-node:hover {
    background: rgba(124, 140, 240, 0.18);
  }

  .fallback-id {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
</style>
