<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { getSound } from '$lib/sounds/registry';
  import { WispEvent } from '$lib/analytics/events';
  import OrbitMixer from '$lib/components/OrbitMixer.svelte';
  import VolumeSlider from '$lib/components/VolumeSlider.svelte';
  import TimerSheet from '$lib/components/TimerSheet.svelte';

  const { sounds, mixes, timer, subscription, analytics } = app;
  const { isPremium } = subscription;

  // Current layers
  const layers = $derived(sounds.currentLayers());
  const activeCount = $derived(layers.length);

  // Single-sound vs multi-sound variant
  const isSingle = $derived(activeCount === 1);
  const singleLayer = $derived(isSingle ? layers[0] : null);
  const singleSound = $derived(singleLayer ? getSound(singleLayer.soundId) : null);

  // Selected sound for orbit (default: first layer)
  let selectedId = $state<string | null>(null);
  const resolvedSelectedId = $derived(
    selectedId && layers.some((l) => l.soundId === selectedId)
      ? selectedId
      : layers[0]?.soundId ?? null
  );

  const selectedLayer = $derived(layers.find((l) => l.soundId === resolvedSelectedId) ?? null);
  const selectedSound = $derived(resolvedSelectedId ? getSound(resolvedSelectedId) : null);

  // Timer display
  const timerLabel = $derived(
    $timer.mode === 'off' ? '' :
    $timer.mode === 'until-stop' ? '∞' :
    $timer.durationSec !== null ? formatMinSec($timer.durationSec) : ''
  );

  function formatMinSec(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const timerPillLabel = $derived(
    $timer.mode === 'off' ? 'Timer' :
    $timer.mode === 'until-stop' ? '∞ Stop' :
    $timer.durationSec !== null ? `${Math.floor($timer.durationSec / 60)} min` : 'Timer'
  );

  // Timer sheet state
  let sheetOpen = $state(false);
  let sheetSelected = $state<number | 'custom' | 'until' | null>(null);

  function handleTimerPick(v: number | 'custom' | 'until') {
    sheetSelected = v;
  }

  function handleTimerStart() {
    if (sheetSelected === null) return;
    if (sheetSelected === 'until') {
      timer.startUntilStop();
    } else if (sheetSelected === 'custom') {
      timer.startCustom(30);
    } else {
      timer.startPreset(sheetSelected);
    }
    analytics.track(WispEvent.timerStart, {
      mode: typeof sheetSelected === 'number' ? 'preset' : sheetSelected
    }).catch(() => {});
    sheetOpen = false;
  }

  // Save mix
  let saveError = $state('');

  function handleSave() {
    const currentLayers = sounds.currentLayers();
    mixes.save('My Mix', currentLayers, $isPremium)
      .then(() => {
        analytics.track(WispEvent.mixSave).catch(() => {});
        saveError = '';
      })
      .catch((e: Error) => {
        if (e.message === 'FREE_MIX_LIMIT') {
          saveError = 'FREE_MIX_LIMIT';
        }
      });
  }

  function handleVolumeChange(soundId: string, vol: number) {
    sounds.setVolume(soundId, vol).catch(() => {});
  }

  const isPlaying = $derived(activeCount > 0);
</script>

<div class="now-playing" class:single={isSingle}>
  <!-- Header -->
  <header class="np-header">
    <button class="back-btn" aria-label="Back" onclick={() => goto('/')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <div class="np-title-wrap">
      <span class="np-super">Now playing</span>
      <span class="np-title">{isSingle && singleSound ? singleSound.name : 'Your mix'}</span>
    </div>
    <button class="more-btn" aria-label="More options">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
      </svg>
    </button>
  </header>

  {#if isSingle && singleLayer && singleSound}
    <!-- Single-sound variant -->
    <div class="single-body">
      <div class="single-name">{singleSound.name}</div>
      <div class="single-sub">Gentle · loops seamlessly</div>

      <!-- Big play orb -->
      <div class="single-orb-wrap" aria-label="Sound playing">
        <div class="orb-glow" aria-hidden="true"></div>
        <svg class="orb-ring" width="216" height="216" viewBox="0 0 216 216" aria-hidden="true">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--accent-1)"/>
              <stop offset="100%" stop-color="var(--accent-2)"/>
            </linearGradient>
          </defs>
          <circle cx="108" cy="108" r="100" fill="none" stroke="var(--track)" stroke-width="6"/>
          <circle cx="108" cy="108" r="100" fill="none" stroke="url(#sg)" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="628" stroke-dashoffset="209"
            transform="rotate(-90 108 108)"/>
        </svg>
        <div class="single-orb">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--on-accent)" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.4"/>
            <rect x="14" y="4" width="4" height="16" rx="1.4"/>
          </svg>
          {#if timerLabel}
            <span class="single-timer-label">{timerLabel}</span>
            <span class="single-timer-sub">timer</span>
          {/if}
        </div>
      </div>

      <!-- Volume slider -->
      <div class="volume-card">
        <div class="volume-label-row">
          <span class="volume-label-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-1)" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
              <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/>
            </svg>
            Volume
          </span>
          <span class="volume-pct">{Math.round(singleLayer.volume * 100)}%</span>
        </div>
        <VolumeSlider
          volume={singleLayer.volume}
          label="Volume for {singleSound.name}"
          onVolume={(v) => handleVolumeChange(singleLayer.soundId, v)}
        />
      </div>

      <!-- Add another sound -->
      <button class="add-sound-dashed" onclick={() => goto('/')} aria-label="Add another sound">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5v14"/>
        </svg>
        Add another sound
      </button>
    </div>
  {:else}
    <!-- Orbit multi-sound variant -->
    <div class="orbit-body">
      <OrbitMixer
        {layers}
        selectedId={resolvedSelectedId}
        {timerLabel}
        playing={isPlaying}
        onSelect={(id) => { selectedId = id; }}
        onTogglePlay={() => {
          if (isPlaying) sounds.stopAll().catch(() => {});
        }}
        onAdd={() => goto('/')}
      />

      <!-- Selected sound volume -->
      {#if selectedLayer && selectedSound}
        <div class="volume-card">
          <div class="volume-label-row">
            <span class="volume-label-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-1)" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
                <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7"/>
              </svg>
              {selectedSound.name} volume
            </span>
            <span class="volume-pct">{Math.round(selectedLayer.volume * 100)}%</span>
          </div>
          <VolumeSlider
            volume={selectedLayer.volume}
            label="Volume for {selectedSound.name}"
            onVolume={(v) => handleVolumeChange(selectedLayer.soundId, v)}
          />
        </div>
      {/if}
    </div>
  {/if}

  <!-- Bottom actions: Timer + Save -->
  <div class="bottom-actions">
    <button class="pill pill-accent" onclick={() => sheetOpen = true} aria-label="Set sleep timer">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8"/>
        <path d="M12 9v4l2.5 2M9 2h6"/>
      </svg>
      {timerPillLabel}
    </button>

    <button class="pill pill-ghost" onclick={handleSave} aria-label="Save mix">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      Save
    </button>
  </div>

  {#if saveError === 'FREE_MIX_LIMIT'}
    <div class="save-error" role="alert">
      Upgrade to save more mixes —
      <a href="/paywall" class="save-error-link">Go Premium</a>
    </div>
  {/if}

  <!-- Timer sheet -->
  <TimerSheet
    open={sheetOpen}
    selected={sheetSelected}
    onPick={handleTimerPick}
    onStart={handleTimerStart}
    onClose={() => sheetOpen = false}
  />
</div>

<style>
  .now-playing {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: radial-gradient(90% 48% at 50% 36%, #191e44 0%, #0a0e1c 62%);
    padding-bottom: 100px;
    position: relative;
  }

  .np-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 54px 24px 8px;
  }

  .back-btn,
  .more-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
  }

  .np-title-wrap {
    text-align: center;
  }

  .np-super {
    display: block;
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }

  .np-title {
    display: block;
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }

  /* Single-sound variant */
  .single-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 0 24px;
  }

  .single-name {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text);
    text-align: center;
    margin-top: 18px;
  }

  .single-sub {
    font-size: 13px;
    color: var(--muted);
    margin-top: 5px;
    text-align: center;
  }

  .single-orb-wrap {
    position: relative;
    width: 216px;
    height: 216px;
    margin: 24px 0 20px;
    flex-shrink: 0;
  }

  .orb-glow {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(124, 140, 240, 0.35), transparent 68%);
    filter: blur(20px);
    animation: wispBreathe 6s ease-in-out infinite;
  }

  .orb-ring {
    position: absolute;
    inset: 0;
  }

  .single-orb {
    position: absolute;
    inset: 34px;
    border-radius: 50%;
    background: var(--accent-grad);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 14px 56px rgba(124, 140, 240, 0.55);
  }

  .single-timer-label {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--on-accent);
  }

  .single-timer-sub {
    font-size: 11px;
    font-weight: 600;
    color: rgba(12, 18, 38, 0.6);
  }

  /* Orbit variant */
  .orbit-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    margin-top: 8px;
  }

  /* Shared volume card */
  .volume-card {
    width: 100%;
    padding: 14px 18px;
    border-radius: 20px;
    background: #12172e;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
  }

  .volume-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .volume-label-text {
    font-size: 13px;
    font-weight: 600;
    color: #bcc6ff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .volume-pct {
    font-size: 12px;
    color: var(--muted);
  }

  /* Add sound dashed */
  .add-sound-dashed {
    width: 100%;
    margin-top: 14px;
    border: 1.5px dashed rgba(124, 140, 240, 0.4);
    border-radius: 18px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    color: #9aa6f5;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    transition: border-color 0.15s, background 0.15s;
  }

  .add-sound-dashed:hover {
    border-color: var(--accent-1);
    background: rgba(124, 140, 240, 0.06);
  }

  /* Bottom action pills */
  .bottom-actions {
    position: fixed;
    bottom: 34px;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    z-index: 10;
  }

  .pill {
    padding: 13px 22px;
    border-radius: var(--r-pill);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s;
  }

  .pill:hover {
    opacity: 0.85;
  }

  .pill-accent {
    background: var(--surface);
    border: 1px solid rgba(124, 140, 240, 0.3);
    color: #9aa6f5;
  }

  .pill-ghost {
    background: var(--surface);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-dim);
  }

  .save-error {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    padding: 0 24px;
    margin-top: 8px;
  }

  .save-error-link {
    color: var(--accent-1);
    font-weight: 600;
    text-decoration: underline;
  }
</style>
