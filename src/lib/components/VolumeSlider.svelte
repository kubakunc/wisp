<script lang="ts">
  import { formatPercent } from '$lib/theme';

  let { volume, onVolume, label = 'Volume' }: {
    volume: number;
    onVolume: (v: number) => void;
    label?: string;
  } = $props();

  const pct = $derived(formatPercent(volume));
</script>

<div class="volume-slider">
  <div class="track-wrap" aria-hidden="true">
    <div class="track-fill" style="width:{Math.round(volume * 100)}%"></div>
  </div>
  <input
    type="range"
    class="range-input"
    min="0"
    max="1"
    step="0.01"
    value={volume}
    aria-label={label}
    aria-valuetext={pct}
    oninput={(e) => onVolume(parseFloat((e.target as HTMLInputElement).value))}
  />
  <span class="vol-label" aria-hidden="true">{pct}</span>
</div>

<style>
  .volume-slider {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .track-wrap {
    position: relative;
    flex: 1;
    height: 6px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .track-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--accent-grad);
    border-radius: var(--r-pill);
    transition: width 0.05s;
  }

  .range-input {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: calc(100% - 42px);
    height: 6px;
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }

  .vol-label {
    font-size: 12px;
    color: var(--muted);
    min-width: 36px;
    text-align: right;
    flex-shrink: 0;
  }
</style>
