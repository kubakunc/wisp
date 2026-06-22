<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/app';
  import { getSound } from '$lib/sounds/registry';
  import { FREE_MIX_LIMIT } from '$lib/stores/savedMixes';
  import { modalOpen } from '$lib/stores/ui';
  import { WispEvent } from '$lib/analytics/events';
  import OrbitMixer from '$lib/components/OrbitMixer.svelte';
  import VolumeSlider from '$lib/components/VolumeSlider.svelte';
  import SoundIcon from '$lib/components/SoundIcon.svelte';
  import TimerSheet from '$lib/components/TimerSheet.svelte';

  const { sounds, mixes, timer, subscription, analytics } = app;
  const soundsPaused = sounds.paused;
  const { isPremium } = subscription;

  // Current layers — derived from the reactive store value so updates propagate
  const layers = $derived(
    Object.entries($sounds).map(([soundId, volume]) => ({ soundId, volume }))
  );
  const activeCount = $derived(layers.length);

  // Single-sound vs multi-sound variant
  const isSingle = $derived(activeCount === 1);
  const singleLayer = $derived(isSingle ? layers[0] : null);
  const singleSound = $derived(singleLayer ? getSound(singleLayer.soundId) : null);

  // Selected sound for orbit node highlight (default: first layer)
  let selectedId = $state<string | null>(null);
  const resolvedSelectedId = $derived(
    selectedId && layers.some((l) => l.soundId === selectedId)
      ? selectedId
      : layers[0]?.soundId ?? null
  );

  // Live clock tick while a timed sleep timer runs, so the orb label counts down
  // and the ring depletes. endsAt is in the performance.now() timebase (timer store).
  let nowMs = $state(performance.now());
  $effect(() => {
    if ($timer.mode !== 'preset' && $timer.mode !== 'custom') return;
    const id = setInterval(() => (nowMs = performance.now()), 500);
    return () => clearInterval(id);
  });

  // Remaining seconds: live from endsAt while running, or the frozen value while
  // PAUSED (playback paused → timer paused, see layout).
  const remainingSec = $derived(
    $timer.endsAt !== null ? Math.max(0, ($timer.endsAt - nowMs) / 1000)
      : $timer.remainingMs !== null ? $timer.remainingMs / 1000
      : 0
  );

  // A timed timer with a remaining value (running OR paused) shows a depleting
  // ring; anything else (off / until-stop) shows a full, pulsing ring.
  const hasTimedRemaining = $derived(
    ($timer.mode === 'preset' || $timer.mode === 'custom') &&
    ($timer.endsAt !== null || $timer.remainingMs !== null)
  );
  const ringProgress = $derived(
    hasTimedRemaining && $timer.durationSec
      ? Math.max(0, Math.min(1, remainingSec / $timer.durationSec))
      : 1
  );
  const ringPulse = $derived(!hasTimedRemaining);

  const timerLabel = $derived(
    $timer.mode === 'until-stop' ? '∞' :
    hasTimedRemaining ? formatMinSec(Math.ceil(remainingSec)) : ''
  );

  function formatMinSec(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const timerPillLabel = $derived(
    $timer.mode === 'off' ? 'Timer' :
    $timer.mode === 'until-stop' ? '∞ Until I stop' :
    timerLabel ? `${timerLabel} left` : 'Timer'
  );

  // Timer sheet state. Choosing an option starts the timer and closes the sheet
  // immediately — there's no separate "save/start" step.
  let sheetOpen = $state(false);

  // Suppress ads (DOM card + native banner) while the timer sheet is open.
  $effect(() => {
    modalOpen.set(sheetOpen);
    return () => modalOpen.set(false);
  });

  function handleTimerChoose(kind: 'preset' | 'custom' | 'until', minutes = 0) {
    if (kind === 'until') {
      timer.startUntilStop();
    } else if (kind === 'custom') {
      timer.startCustom(minutes);
    } else {
      timer.startPreset(minutes);
    }
    analytics.track(WispEvent.timerStart, { mode: kind }).catch(() => {});
    sheetOpen = false;
  }

  // Save mix. Free users may keep only FREE_MIX_LIMIT saved mixes; beyond that
  // the Save button locks and routes to the paywall instead of erroring.
  let saveError = $state('');
  let saved = $state(false);
  const saveLocked = $derived(!$isPremium && $mixes.length >= FREE_MIX_LIMIT);

  function goPaywallForSave() {
    analytics.track(WispEvent.paywallView, { source: 'save_lock' }).catch(() => {});
    goto('/paywall');
  }

  function handleSave() {
    // Name the mix after the sounds it layers, not a generic "My Mix".
    const names = sounds.currentLayers().map((l) => getSound(l.soundId)?.name ?? l.soundId);
    const mixName = names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '');
    mixes.save(mixName || 'Mix', sounds.currentLayers(), $isPremium)
      .then(() => {
        analytics.track(WispEvent.mixSave).catch(() => {});
        saveError = '';
        saved = true;
        setTimeout(() => (saved = false), 1600);
      })
      .catch((e: Error) => {
        if (e.message === 'FREE_MIX_LIMIT') saveError = 'FREE_MIX_LIMIT';
      });
  }

  function handleVolumeChange(soundId: string, vol: number) {
    sounds.setVolume(soundId, vol).catch(() => {});
  }

  // Remove a single sound from the mix. If it was the last one, return home.
  async function removeSound(soundId: string) {
    menuOpen = false;
    try {
      await sounds.toggle(soundId);
    } catch {
      /* ignore */
    }
    if (sounds.currentLayers().length === 0) goto('/');
  }

  // Overflow (⋯) menu
  let menuOpen = $state(false);

  async function stopAll() {
    menuOpen = false;
    try {
      await sounds.stopAll();
    } catch {
      /* ignore */
    }
    goto('/');
  }

  function cancelTimer() {
    timer.cancel();
    sheetOpen = false;
  }

  const isPlaying = $derived(activeCount > 0 && !$soundsPaused);

  // Free users see the ad box at the bottom of the player too; reserve space so
  // it never covers the Timer/Save actions.
  const showAd = $derived(!$isPremium);

  // Dismiss with a downward "collapse" animation, then navigate home.
  let dismissing = $state(false);
  function minimize() {
    if (dismissing) return;
    dismissing = true;
    setTimeout(() => goto('/'), 240);
  }
</script>

<div class="now-playing" class:single={isSingle} class:collapsing={dismissing} class:has-ad={showAd}>
  <!-- Header -->
  <header class="np-header">
    <button class="icon-btn" aria-label="Minimize" onclick={minimize}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    <div class="np-title-wrap">
      <span class="np-super">Now playing</span>
      <span class="np-title">{isSingle && singleSound ? singleSound.name : 'Your mix'}</span>
    </div>
    <div class="more-wrap">
      <button class="icon-btn" aria-label="More options" aria-haspopup="menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
        </svg>
      </button>
      {#if menuOpen}
        <div class="more-menu" role="menu">
          <button class="menu-item" role="menuitem" onclick={stopAll}>Stop all sounds</button>
        </div>
      {/if}
    </div>
  </header>
  {#if menuOpen}
    <button class="menu-scrim" aria-label="Close menu" onclick={() => (menuOpen = false)}></button>
  {/if}

  {#if isSingle && singleLayer && singleSound}
    <!-- Single-sound variant -->
    <div class="single-body">
      <div class="single-name">{singleSound.name}</div>
      <div class="single-sub">Loops seamlessly</div>

      <div class="single-orb-wrap">
        <div class="orb-glow" class:playing={isPlaying} aria-hidden="true"></div>
        <svg class="orb-ring-svg" width="216" height="216" viewBox="0 0 216 216" aria-hidden="true">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--accent-1)"/>
              <stop offset="100%" stop-color="var(--accent-2)"/>
            </linearGradient>
          </defs>
          <circle cx="108" cy="108" r="100" fill="none" stroke="var(--track)" stroke-width="6"/>
          <circle class="ring-arc" class:pulse={ringPulse} cx="108" cy="108" r="100" fill="none" stroke="url(#sg)" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="628" stroke-dashoffset={628 * (1 - ringProgress)}
            transform="rotate(-90 108 108)"/>
        </svg>
        <button class="single-orb" aria-label={isPlaying ? 'Pause' : 'Play'} onclick={() => sounds.togglePlayback().catch(() => {})}>
          {#if isPlaying}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--on-accent)" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.4"/><rect x="14" y="4" width="4" height="16" rx="1.4"/>
            </svg>
          {:else}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--on-accent)" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          {/if}
          {#if timerLabel}
            <span class="single-timer-label">{timerLabel}</span>
            <span class="single-timer-sub">timer</span>
          {/if}
        </button>
      </div>

      <div class="vol-row">
        <span class="vol-row-icon"><SoundIcon id={singleLayer.soundId} size={20} /></span>
        <div class="vol-row-main">
          <div class="vol-row-head">
            <span class="vol-row-name">{singleSound.name}</span>
            <span class="vol-row-pct">{Math.round(singleLayer.volume * 100)}%</span>
          </div>
          <VolumeSlider volume={singleLayer.volume} label="Volume for {singleSound.name}" onVolume={(v) => handleVolumeChange(singleLayer.soundId, v)} />
        </div>
        <button class="vol-row-remove" aria-label="Remove {singleSound.name} from mix" onclick={() => removeSound(singleLayer.soundId)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      <button class="add-sound-dashed" onclick={() => goto('/')} aria-label="Add another sound">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>
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
        progress={ringProgress}
        pulse={ringPulse}
        onSelect={(id) => { selectedId = id; }}
        onTogglePlay={() => sounds.togglePlayback().catch(() => {})}
        onAdd={() => goto('/')}
      />

      <!-- All sounds in the mix, each with its own volume + remove -->
      <div class="vol-list" aria-label="Mix volumes">
        {#each layers as layer (layer.soundId)}
          {@const s = getSound(layer.soundId)}
          <div class="vol-row">
            <span class="vol-row-icon"><SoundIcon id={layer.soundId} size={20} /></span>
            <div class="vol-row-main">
              <div class="vol-row-head">
                <span class="vol-row-name">{s?.name ?? layer.soundId}</span>
                <span class="vol-row-pct">{Math.round(layer.volume * 100)}%</span>
              </div>
              <VolumeSlider volume={layer.volume} label="Volume for {s?.name ?? layer.soundId}" onVolume={(v) => handleVolumeChange(layer.soundId, v)} />
            </div>
            <button class="vol-row-remove" aria-label="Remove {s?.name ?? layer.soundId} from mix" onclick={() => removeSound(layer.soundId)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        {/each}
      </div>

      <button class="add-sound-dashed" onclick={() => goto('/')} aria-label="Add another sound">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>
        Add another sound
      </button>
    </div>
  {/if}

  <!-- Bottom actions: Timer + Save -->
  <div class="bottom-actions">
    <button class="pill pill-accent" onclick={() => (sheetOpen = true)} aria-label="Set sleep timer">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>
      </svg>
      {timerPillLabel}
    </button>

    {#if saved}
      <!-- Confirmation wins for its brief window, even if saving just hit the
           free limit (otherwise the button would jump straight to locked). -->
      <button class="pill pill-ghost" aria-label="Mix saved">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Saved ✓
      </button>
    {:else if saveLocked}
      <button class="pill pill-ghost" onclick={goPaywallForSave} aria-label="Save mix — Premium required">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Save
      </button>
    {:else}
      <button class="pill pill-ghost" onclick={handleSave} aria-label="Save mix">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        Save
      </button>
    {/if}
  </div>

  {#if saveError === 'FREE_MIX_LIMIT'}
    <div class="save-error" role="alert">
      Upgrade to save more mixes — <a href="/paywall" class="save-error-link">Go Premium</a>
    </div>
  {/if}

  <TimerSheet
    open={sheetOpen}
    active={$timer.mode !== 'off'}
    onChoose={handleTimerChoose}
    onCancel={cancelTimer}
    onClose={() => (sheetOpen = false)}
  />
</div>

<style>
  .now-playing {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: radial-gradient(90% 48% at 50% 36%, #191e44 0%, #0a0e1c 62%);
    padding-bottom: 110px;
    position: relative;
    /* Sheet-like rise when opened; slides back down on dismiss (.collapsing). */
    animation: npRise 0.34s cubic-bezier(0.22, 0.61, 0.36, 1);
    transition: transform 0.24s ease-in, opacity 0.24s ease-in;
    will-change: transform;
  }
  .now-playing.collapsing {
    transform: translateY(100%);
    opacity: 0.35;
  }
  @keyframes npRise {
    from { transform: translateY(7%); opacity: 0.5; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .now-playing { animation: none; transition: none; }
    .now-playing.collapsing { transform: none; opacity: 1; }
  }
  /* Reserve room for the bottom ad box (free users) so it never covers actions. */
  .now-playing.has-ad {
    padding-bottom: calc(110px + var(--wisp-ad-box-h) + env(safe-area-inset-bottom, 0px));
  }

  .np-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 24px 8px;
  }

  .icon-btn {
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

  .np-title-wrap { text-align: center; }
  .np-super { display: block; font-size: 12px; color: var(--muted); font-weight: 500; }
  .np-title { display: block; font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--text); }

  /* Overflow menu */
  .more-wrap { position: relative; }
  .more-menu {
    position: absolute;
    right: 0;
    top: 46px;
    z-index: 30;
    min-width: 190px;
    background: var(--surface-hi-a);
    border: 1px solid rgba(124, 140, 240, 0.25);
    border-radius: 14px;
    padding: 6px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
  }
  .menu-item {
    text-align: left;
    padding: 11px 12px;
    border-radius: 9px;
    font-size: 14px;
    color: var(--text);
    background: none;
    border: none;
    cursor: pointer;
  }
  .menu-item:hover { background: rgba(124, 140, 240, 0.14); }
  .menu-scrim {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: transparent;
    border: none;
    cursor: default;
  }

  /* Single-sound variant */
  .single-body { display: flex; flex-direction: column; align-items: center; padding: 0 24px; }
  .single-name { font-family: var(--font-display); font-size: 28px; font-weight: 600; letter-spacing: -0.5px; color: var(--text); text-align: center; margin-top: 14px; }
  .single-sub { font-size: 13px; color: var(--muted); margin-top: 5px; }
  .single-orb-wrap { position: relative; width: 216px; height: 216px; margin: 22px 0 18px; flex-shrink: 0; }
  .orb-glow { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, rgba(124, 140, 240, 0.35), transparent 68%); filter: blur(20px); }
  .orb-glow.playing { animation: wispBreathe 6s ease-in-out infinite; }
  .orb-ring-svg { position: absolute; inset: 0; }
  .ring-arc { transition: stroke-dashoffset 0.5s linear; }
  .ring-arc.pulse { animation: wispPulse 2.4s ease-in-out infinite; }
  .single-orb {
    position: absolute; inset: 34px; border-radius: 50%; background: var(--accent-grad);
    border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; box-shadow: 0 14px 56px rgba(124, 140, 240, 0.55); transition: opacity 0.15s, transform 0.15s; padding: 0;
  }
  .single-orb:hover { opacity: 0.88; transform: scale(1.04); }
  .single-timer-label { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--on-accent); }
  .single-timer-sub { font-size: 11px; font-weight: 600; color: rgba(12, 18, 38, 0.6); }

  /* Orbit variant */
  .orbit-body { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 0 24px; margin-top: 8px; }

  /* Volume list / row */
  .vol-list { width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .vol-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 18px;
    background: #12172e;
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-top: 4px;
  }
  .vol-row-icon {
    width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
    background: rgba(124, 140, 240, 0.16); color: #bcc6ff;
    display: flex; align-items: center; justify-content: center;
  }
  .vol-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .vol-row-head { display: flex; justify-content: space-between; align-items: center; }
  .vol-row-name { font-size: 14px; font-weight: 600; color: var(--text-dim); }
  .vol-row-pct { font-size: 12px; color: var(--muted); }
  .vol-row-remove {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: rgba(255, 255, 255, 0.04); border: none; color: var(--muted);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .vol-row-remove:hover { background: rgba(255, 107, 107, 0.16); color: #ff9b9b; }

  .add-sound-dashed {
    width: 100%; margin-top: 14px; border: 1.5px dashed rgba(124, 140, 240, 0.4); border-radius: 18px;
    padding: 14px; display: flex; align-items: center; justify-content: center; gap: 9px;
    color: #9aa6f5; font-size: 14px; font-weight: 600; cursor: pointer; background: transparent;
    transition: border-color 0.15s, background 0.15s;
  }
  .add-sound-dashed:hover { border-color: var(--accent-1); background: rgba(124, 140, 240, 0.06); }

  /* Bottom actions */
  .bottom-actions {
    position: fixed; bottom: calc(env(safe-area-inset-bottom, 0px) + 30px); left: 0; right: 0;
    display: flex; align-items: center; justify-content: center; gap: 14px; z-index: 10;
  }
  /* Lift the actions above the ad box when it's shown. */
  .now-playing.has-ad .bottom-actions {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 30px + var(--wisp-ad-box-h));
  }
  .pill { padding: 13px 22px; border-radius: var(--r-pill); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none; transition: opacity 0.15s; }
  .pill:hover { opacity: 0.85; }
  .pill-accent { background: var(--surface); border: 1px solid rgba(124, 140, 240, 0.3); color: #9aa6f5; }
  .pill-ghost { background: var(--surface); border: 1px solid rgba(255, 255, 255, 0.06); color: var(--text-dim); }

  .save-error { text-align: center; font-size: 13px; color: var(--muted); padding: 0 24px; margin-top: 8px; }
  .save-error-link { color: var(--accent-1); font-weight: 600; text-decoration: underline; }
</style>
