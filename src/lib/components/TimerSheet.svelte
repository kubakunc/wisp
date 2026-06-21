<script lang="ts">
  import type { TimerState, TimerPreset } from '$lib/types';

  let { timerState, onSetPreset, onClear }: {
    timerState: TimerState;
    onSetPreset: (minutes: TimerPreset) => void;
    onClear: () => void;
  } = $props();

  const PRESETS: TimerPreset[] = [15, 30, 45, 60, 90];

  const activePreset = $derived(
    timerState.mode === 'preset' && timerState.durationSec !== null
      ? (timerState.durationSec / 60) as TimerPreset
      : null
  );

  const remaining = $derived(() => {
    if (timerState.endsAt === null) return null;
    const secs = Math.max(0, Math.round((timerState.endsAt - Date.now()) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });
</script>

<div class="timer-sheet" role="dialog" aria-label="Sleep timer">
  <div class="handle" aria-hidden="true"></div>

  <h2 class="sheet-title">Sleep Timer</h2>

  {#if timerState.endsAt !== null}
    <p class="countdown" aria-live="polite">{remaining()}</p>
  {/if}

  <div class="preset-grid">
    {#each PRESETS as preset}
      <button
        class="preset-btn"
        class:active={activePreset === preset}
        aria-pressed={activePreset === preset}
        onclick={() => onSetPreset(preset)}
      >
        {preset}m
      </button>
    {/each}
  </div>

  {#if timerState.mode !== 'off'}
    <button class="clear-btn" onclick={onClear}>
      Cancel Timer
    </button>
  {/if}
</div>

<style>
  .timer-sheet {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 16px 20px 32px;
    background: var(--surface);
    border-radius: var(--r-sheet) var(--r-sheet) 0 0;
  }

  .handle {
    width: 36px;
    height: 4px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.15);
    margin-bottom: 4px;
  }

  .sheet-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .countdown {
    font-size: 42px;
    font-weight: 700;
    color: var(--accent-1);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .preset-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .preset-btn {
    flex: 1;
    min-width: 60px;
    padding: 12px 8px;
    border-radius: var(--r-row);
    background: var(--surface-hi-b);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .preset-btn.active {
    background: rgba(124, 140, 240, 0.2);
    border-color: rgba(124, 140, 240, 0.5);
    color: var(--accent-1);
  }

  .clear-btn {
    padding: 12px 24px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.06);
    border: none;
    color: var(--muted);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
