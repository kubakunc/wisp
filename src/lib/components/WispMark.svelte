<script lang="ts">
  // In-app brand mark — pixel-for-pixel the app icon (store-assets/wisp-icon.svg):
  // night-sky radial tile + sparkle + star dots + gradient crescent moon.
  let { size = 44 }: { size?: number } = $props();
  const uid = $derived(`wm-${Math.round(size)}`);
</script>

<div
  class="wisp-mark"
  style="width:{size}px;height:{size}px;border-radius:{size * 0.225}px"
  aria-hidden="true"
>
  <svg width={size} height={size} viewBox="0 0 512 512">
    <defs>
      <radialGradient id="{uid}-bg" cx="70%" cy="0%" r="115%">
        <stop offset="0%" stop-color="#2a2f5e" />
        <stop offset="65%" stop-color="#0a0e1c" />
        <stop offset="100%" stop-color="#070a16" />
      </radialGradient>
      <linearGradient id="{uid}-moon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b9af5" />
        <stop offset="100%" stop-color="#c6a6f5" />
      </linearGradient>
      <clipPath id="{uid}-tile">
        <rect x="0" y="0" width="512" height="512" rx="115" ry="115" />
      </clipPath>
    </defs>
    <g clip-path="url(#{uid}-tile)">
      <rect x="0" y="0" width="512" height="512" fill="url(#{uid}-bg)" />
      <path d="M325,134.4 Q325,161 351.6,161 Q325,161 325,187.6 Q325,161 298.4,161 Q325,161 325,134.4 Z" fill="#b98cf0" opacity="0.95" />
      <circle cx="146" cy="166" r="6.7" fill="#b98cf0" opacity="0.85" />
      <circle cx="376" cy="269" r="6.7" fill="#7c8cf0" opacity="0.9" />
      <circle cx="154" cy="353" r="6.1" fill="#9aa6f5" opacity="0.8" />
      <circle cx="294" cy="371" r="5.6" fill="#7c8cf0" opacity="0.75" />
      <g transform="translate(233,261) scale(10.7) translate(-12,-12)">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="url(#{uid}-moon)" />
      </g>
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
