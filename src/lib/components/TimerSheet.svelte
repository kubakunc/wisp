<script lang="ts">
  let { open, mode = 'off', onChoose, onClose }: {
    open: boolean;
    /** Current sleep-timer mode — drives which option reads as selected. */
    mode?: 'off' | 'until-stop' | 'preset' | 'custom';
    /** Start the chosen timer and close the sheet (no separate confirm step). */
    onChoose: (kind: 'preset' | 'custom' | 'until', minutes?: number) => void;
    onClose: () => void;
  } = $props();

  // "No timer" — playing until manually stopped — is a single state: both the
  // default (off) and an explicit until-stop choice mean the same thing. So the
  // "Until I stop it" row IS the off control; tapping it also clears a running
  // timed timer. No separate "Turn off timer" button (it was the same action).
  const noTimer = $derived(mode === 'off' || mode === 'until-stop');

  const PRESETS = [15, 30, 45, 60, 90] as const;
  const CUSTOM_DEFAULT = 20;
  const CUSTOM_MIN = 1;
  const CUSTOM_MAX = 600;

  // Custom needs a number, so it reveals a stepper + a single confirm. Presets
  // and "until" apply on tap.
  let showCustom = $state(false);
  let customMinutes = $state(CUSTOM_DEFAULT);

  function clampCustom(v: number): number {
    return Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Math.round(v)));
  }
  function handleCustomInput(e: Event) {
    const raw = (e.target as HTMLInputElement).valueAsNumber;
    if (!Number.isFinite(raw)) return;
    customMinutes = clampCustom(raw);
  }
  function stepCustom(delta: number) {
    customMinutes = clampCustom(customMinutes + delta);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="scrim"
    onclick={onClose}
    aria-hidden="true"
  ></div>

  <div
    class="sheet"
    role="dialog"
    aria-label="Sleep timer"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="handle" aria-hidden="true"></div>

    <h2 class="sheet-title">Sleep timer</h2>
    <p class="explainer">Sound fades out gently over the last 10 seconds, then pauses — you won't wake to silence cutting off.</p>

    <div class="preset-grid">
      {#each PRESETS as preset}
        <button
          class="chip"
          aria-label="{preset} min"
          onclick={() => onChoose('preset', preset)}
        >
          {preset}
        </button>
      {/each}
      <button
        class="chip"
        class:chip-selected={showCustom}
        aria-pressed={showCustom}
        aria-label="Custom"
        onclick={() => (showCustom = true)}
      >
        Custom
      </button>
    </div>

    {#if showCustom}
      <div class="custom-stepper" role="group" aria-label="Custom duration">
        <button
          class="step-btn"
          aria-label="Decrease by 5 minutes"
          onclick={() => stepCustom(-5)}
        >−</button>
        <input
          class="custom-input"
          type="number"
          min={CUSTOM_MIN}
          max={CUSTOM_MAX}
          value={customMinutes}
          aria-label="Custom timer duration in minutes"
          oninput={handleCustomInput}
        />
        <span class="custom-unit">min</span>
        <button
          class="step-btn"
          aria-label="Increase by 5 minutes"
          onclick={() => stepCustom(5)}
        >+</button>
      </div>
      <button class="cta" onclick={() => onChoose('custom', customMinutes)}>
        Start timer · {customMinutes} min
      </button>
    {/if}

    <button
      class="until-row"
      class:until-selected={noTimer}
      aria-pressed={noTimer}
      onclick={() => onChoose('until')}
    >
      <span class="until-icon" aria-hidden="true">∞</span>
      <span class="until-text">
        Until I stop it
        <span class="until-sub">No timer — plays until you stop it{noTimer ? '' : ' (turns the timer off)'}</span>
      </span>
      {#if noTimer}
        <svg class="until-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      {/if}
    </button>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 20, 0.6);
    z-index: 10;
  }

  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 11;
    background: linear-gradient(180deg, #161c38, #10142a);
    border-radius: 32px 32px 0 0;
    padding: 12px 20px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.15);
    margin-bottom: 4px;
  }

  .sheet-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  .explainer {
    font-size: 13px;
    color: var(--muted);
    text-align: center;
    line-height: 1.5;
    margin: 0;
    max-width: 320px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
  }

  .chip {
    padding: 14px 8px;
    border-radius: var(--r-row);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    font-family: var(--font-body);
  }

  .chip-selected {
    background: var(--accent-grad);
    border-color: transparent;
    color: var(--on-accent);
  }

  .until-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--r-row);
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.07);
    color: var(--text-dim);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
    font-family: var(--font-body);
  }

  .until-selected {
    background: var(--accent-grad);
    border-color: transparent;
    color: var(--on-accent);
  }

  .until-icon {
    font-size: 18px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .until-selected .until-icon { color: var(--on-accent); }

  .until-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .until-sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }
  .until-selected .until-sub { color: rgba(12, 18, 38, 0.7); }
  .until-check { flex-shrink: 0; color: var(--on-accent); }

  .cta {
    width: 100%;
    padding: 16px;
    border-radius: var(--r-pill);
    background: var(--accent-1);
    border: none;
    color: var(--on-accent);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    font-family: var(--font-body);
  }

  .cta:hover {
    opacity: 0.88;
  }

  /* Custom duration stepper */
  .custom-stepper {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--r-row);
    background: rgba(124, 140, 240, 0.1);
    border: 1px solid rgba(124, 140, 240, 0.35);
  }

  .step-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text);
    font-size: 20px;
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
    font-family: var(--font-body);
  }

  .step-btn:hover {
    background: rgba(124, 140, 240, 0.2);
  }

  .custom-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 22px;
    font-weight: 700;
    font-family: var(--font-display);
    text-align: center;
    outline: none;
    appearance: textfield;
    -moz-appearance: textfield;
    min-width: 0;
  }

  .custom-input::-webkit-outer-spin-button,
  .custom-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .custom-unit {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    flex-shrink: 0;
  }
</style>
