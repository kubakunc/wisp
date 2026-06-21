<script lang="ts">
  import OrbitNode from './OrbitNode.svelte';

  let { layers, selectedId, timerLabel, playing, onSelect, onTogglePlay, onAdd }: {
    layers: { soundId: string; volume: number }[];
    selectedId: string | null;
    timerLabel: string;
    playing: boolean;
    onSelect: (id: string) => void;
    onTogglePlay: () => void;
    onAdd: () => void;
  } = $props();

  function angleForIndex(i: number, total: number): number {
    return (i / total) * 360;
  }
</script>

<div class="orbit-mixer">
  <div class="orbit-stage">
    <!-- breathing glow -->
    <div class="orb-glow" class:active={playing} aria-hidden="true"></div>

    <!-- central play/timer orb -->
    <button
      class="orb"
      class:playing
      aria-label={playing ? 'Pause' : 'Play'}
      onclick={onTogglePlay}
    >
      {#if playing}
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      {:else}
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" fill="var(--on-accent)" stroke="none"/>
        </svg>
      {/if}
      {#if timerLabel}
        <span class="timer-label">{timerLabel}</span>
      {/if}
    </button>

    <!-- orbit nodes -->
    {#each layers as layer, i}
      <OrbitNode
        id={layer.soundId}
        volume={layer.volume}
        selected={selectedId === layer.soundId}
        angleDeg={angleForIndex(i, layers.length)}
        onSelect={() => onSelect(layer.soundId)}
      />
    {/each}

    <!-- add node -->
    {#if layers.length < 8}
      <button
        class="add-node"
        style="
          left:{160 + 110 * Math.cos((angleForIndex(layers.length, layers.length + 1) - 90) * Math.PI / 180)}px;
          top:{160 + 110 * Math.sin((angleForIndex(layers.length, layers.length + 1) - 90) * Math.PI / 180)}px;
        "
        aria-label="Add a sound"
        onclick={onAdd}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .orbit-mixer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .orbit-stage {
    position: relative;
    width: 320px;
    height: 320px;
    flex-shrink: 0;
  }

  .orb-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: rgba(124, 140, 240, 0.2);
    pointer-events: none;
  }

  .orb-glow.active {
    animation: wispBreathe 3s ease-in-out infinite;
  }

  .orb {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--accent-grad);
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--on-accent);
    z-index: 1;
    box-shadow: 0 4px 24px rgba(124, 140, 240, 0.4);
    transition: box-shadow 0.2s, transform 0.15s;
  }

  .orb:hover {
    box-shadow: 0 6px 32px rgba(124, 140, 240, 0.6);
    transform: translate(-50%, -50%) scale(1.05);
  }

  .timer-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--on-accent);
    opacity: 0.85;
    line-height: 1;
  }

  .add-node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: transparent;
    border: 1.5px dashed rgba(124, 140, 240, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--muted);
    padding: 0;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .add-node:hover {
    border-color: var(--accent-1);
    color: var(--accent-1);
    background: rgba(124, 140, 240, 0.08);
  }
</style>
