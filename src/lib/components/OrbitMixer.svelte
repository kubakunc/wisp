<script lang="ts">
  import type { MixLayer } from '$lib/types';
  import OrbitNode from './OrbitNode.svelte';
  import VolumeSlider from './VolumeSlider.svelte';

  let { layers, onTapLayer, onVolume }: {
    layers: MixLayer[];
    onTapLayer: (soundId: string) => void;
    onVolume: (soundId: string, v: number) => void;
  } = $props();

  const CENTER = 160;
  const RADIUS = 110;

  function nodePosition(index: number, total: number): { x: number; y: number } {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle)
    };
  }

  let _selected = $state<string | null>(null);

  // When layers change and selected is no longer valid, fall back to first layer
  const selected = $derived(_selected !== null && layers.some((l) => l.soundId === _selected)
    ? _selected
    : (layers[0]?.soundId ?? null));

  const selectedLayer = $derived(layers.find((l) => l.soundId === selected) ?? null);

  function handleTap(soundId: string) {
    _selected = soundId;
    onTapLayer(soundId);
  }
</script>

<div class="orbit-mixer">
  <div class="orbit-stage" style="width:{CENTER * 2}px;height:{CENTER * 2}px">
    <!-- center pulse ring -->
    <div class="center-ring" aria-hidden="true"></div>

    {#each layers as layer, i}
      {@const pos = nodePosition(i, layers.length)}
      <OrbitNode
        {layer}
        x={pos.x}
        y={pos.y}
        size={layer.soundId === selected ? 64 : 52}
        onTap={() => handleTap(layer.soundId)}
      />
    {/each}
  </div>

  {#if selectedLayer}
    <div class="vol-row">
      <VolumeSlider
        volume={selectedLayer.volume}
        label="Volume for selected sound"
        onVolume={(v) => onVolume(selectedLayer.soundId, v)}
      />
    </div>
  {/if}
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
    flex-shrink: 0;
  }

  .center-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(124, 140, 240, 0.3);
    background: rgba(124, 140, 240, 0.08);
  }

  .vol-row {
    width: 100%;
    max-width: 280px;
    padding: 0 16px;
  }
</style>
