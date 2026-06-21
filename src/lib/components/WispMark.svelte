<script lang="ts">
  // Brand mark matching the app icon: dark night-sky rounded square with a
  // gradient crescent moon and a sparkle.
  let { size = 44 }: { size?: number } = $props();
  const uid = $derived(`wm-${Math.round(size)}`);
</script>

<div
  class="wisp-mark"
  style="width:{size}px;height:{size}px;border-radius:{size * 0.3}px"
  aria-hidden="true"
>
  <svg width={size} height={size} viewBox="0 0 48 48">
    <defs>
      <radialGradient id="{uid}-bg" cx="68%" cy="6%" r="120%">
        <stop offset="0" stop-color="#2a2f5e" />
        <stop offset="0.62" stop-color="#0c1226" />
        <stop offset="1" stop-color="#0a0e1c" />
      </radialGradient>
      <linearGradient id="{uid}-moon" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8b9af5" />
        <stop offset="1" stop-color="#b98cf0" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="14" fill="url(#{uid}-bg)" />
    <path d="M33 26 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4-3.2 -3.2-1.4 3.2-1.4z" fill="#b98cf0" />
    <g transform="translate(10,10) scale(1.16)">
      <path d="M19 12.5A7 7 0 1 1 11 4a5.4 5.4 0 0 0 8 8.5z" fill="url(#{uid}-moon)" />
    </g>
  </svg>
</div>

<style>
  .wisp-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(124, 140, 240, 0.35);
  }
  .wisp-mark svg {
    display: block;
  }
</style>
