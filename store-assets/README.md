# Wisp — Play Store Assets

SVG source files for the Google Play Store listing. Rasterize to PNG before uploading.

## File inventory

| File | Canvas | Purpose |
|------|--------|---------|
| `icon/icon-master.svg` | 512×512 | Primary Play Store app icon (high-res) |
| `icon/icon-mono.svg` | 512×512 | Monochrome variant (dark bg, white mark) |
| `icon/icon-night.svg` | 512×512 | Night/dark radial variant |
| `icon/icon-foreground.svg` | 108×108 dp | Android Adaptive icon — foreground layer |
| `icon/icon-background.svg` | 108×108 dp | Android Adaptive icon — background layer |
| `feature-graphic.svg` | 1024×500 | Play Store feature graphic |
| `screenshots/01-drift-off.svg` | 360×720 | Screenshot 1 — "Drift off in seconds" |
| `screenshots/02-mix.svg` | 360×720 | Screenshot 2 — "Mix your perfect night" |
| `screenshots/03-pricing.svg` | 360×720 | Screenshot 3 — "Premium for half the price" |

---

## Rasterization commands

### Option A — `resvg` (recommended, fast, accurate)

```bash
# Install: cargo install resvg  OR  brew install resvg
RESVG=resvg

# App icon — 512×512
$RESVG -w 512 -h 512 store-assets/icon/icon-master.svg store-assets/icon/icon-master.png

# Mono & night variants
$RESVG -w 512 -h 512 store-assets/icon/icon-mono.svg  store-assets/icon/icon-mono.png
$RESVG -w 512 -h 512 store-assets/icon/icon-night.svg store-assets/icon/icon-night.png

# Android Adaptive — foreground + background at 108 dp × 4 = 432 px (xxxhdpi)
# Play Console needs 432×432 px for each adaptive layer
$RESVG -w 432 -h 432 store-assets/icon/icon-foreground.svg store-assets/icon/icon-foreground.png
$RESVG -w 432 -h 432 store-assets/icon/icon-background.svg store-assets/icon/icon-background.png

# Feature graphic — 1024×500 (exact Play Console requirement)
$RESVG -w 1024 -h 500 store-assets/feature-graphic.svg store-assets/feature-graphic.png

# Screenshots — 1080×2160 (3× scale from 360×720 source)
$RESVG -w 1080 -h 2160 store-assets/screenshots/01-drift-off.svg store-assets/screenshots/01-drift-off.png
$RESVG -w 1080 -h 2160 store-assets/screenshots/02-mix.svg       store-assets/screenshots/02-mix.png
$RESVG -w 1080 -h 2160 store-assets/screenshots/03-pricing.svg   store-assets/screenshots/03-pricing.png
```

### Option B — `rsvg-convert` (librsvg)

```bash
# Install: brew install librsvg  OR  apt install librsvg2-bin

# App icon
rsvg-convert -w 512 -h 512 store-assets/icon/icon-master.svg -o store-assets/icon/icon-master.png

# Adaptive layers
rsvg-convert -w 432 -h 432 store-assets/icon/icon-foreground.svg -o store-assets/icon/icon-foreground.png
rsvg-convert -w 432 -h 432 store-assets/icon/icon-background.svg -o store-assets/icon/icon-background.png

# Feature graphic
rsvg-convert -w 1024 -h 500 store-assets/feature-graphic.svg -o store-assets/feature-graphic.png

# Screenshots
rsvg-convert -w 1080 -h 2160 store-assets/screenshots/01-drift-off.svg -o store-assets/screenshots/01-drift-off.png
rsvg-convert -w 1080 -h 2160 store-assets/screenshots/02-mix.svg       -o store-assets/screenshots/02-mix.png
rsvg-convert -w 1080 -h 2160 store-assets/screenshots/03-pricing.svg   -o store-assets/screenshots/03-pricing.png
```

### Option C — Inkscape (highest fidelity for complex SVG)

```bash
# Install: brew install inkscape  OR  https://inkscape.org/

# App icon
inkscape --export-type=png --export-width=512 --export-height=512 \
  store-assets/icon/icon-master.svg -o store-assets/icon/icon-master.png

# Feature graphic
inkscape --export-type=png --export-width=1024 --export-height=500 \
  store-assets/feature-graphic.svg -o store-assets/feature-graphic.png

# Screenshots
for f in 01-drift-off 02-mix 03-pricing; do
  inkscape --export-type=png --export-width=1080 --export-height=2160 \
    "store-assets/screenshots/$f.svg" -o "store-assets/screenshots/$f.png"
done
```

### Option D — Node.js automation script

See `scripts/render-store-assets.mjs` which auto-detects `resvg`/`rsvg-convert` and renders all assets.

```bash
node scripts/render-store-assets.mjs
```

---

## Play Console upload locations

| Asset | Location in Play Console | Requirements |
|-------|--------------------------|--------------|
| `icon-master.png` (512×512) | **Main store listing → App icon** | PNG, 512×512, max 1 MB |
| `icon-foreground.png` + `icon-background.png` | **Main store listing → Adaptive icon** (optional, overrides above) | PNG, 432×432 each |
| `feature-graphic.png` (1024×500) | **Main store listing → Feature graphic** | PNG/JPG, exactly 1024×500 |
| `screenshots/01–03.png` (1080×2160) | **Main store listing → Phone screenshots** | PNG/JPG, min 320px, max 3840px per side, 2:1 max ratio; at least 2 required |

> **Tip:** Play Console accepts the adaptive icon layers directly as PNG files at 432×432. They are composited at runtime per device launcher.

---

## Font note

SVGs reference `'Sora'` and `'Plus Jakarta Sans'`. These fonts are **not embedded** in the SVG — they rely on system fallback (`system-ui, sans-serif`) during browser preview.

For pixel-perfect rasterization, ensure the fonts are installed on the rasterization machine:
- **macOS:** `brew install --cask font-sora font-plus-jakarta-sans`
- **Linux:** Download from [Google Fonts](https://fonts.google.com/) and install to `~/.local/share/fonts/`

Or use `scripts/render-store-assets.mjs` which can embed font data via `sharp`/`@resvg/resvg-js` if the woff2 files are present under `static/fonts/`.
