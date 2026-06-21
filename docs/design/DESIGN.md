# Wisp — Design System & Screen Spec

Source: Claude Design project `99bbc0e9-ff96-4427-a650-4aec3b8b6245` ("Wisp: Sleep Sounds App").
Raw reference: `docs/design/Wisp.app.reference.html` (app screens). Marketing/brand kit: file `Wisp Marketing.dc.html` in the design project (pull via DesignSync `get_file` when building store assets).

Implementers: this doc is the authority for visual tokens and layout. For pixel-exact markup of a specific screen, read the matching section of `Wisp.app.reference.html` (sections are delimited by `<!-- ====== N. NAME ====== -->`).

## Fonts
- **Sora** — headings/display (weights 400–800). `font-family:'Sora'`.
- **Plus Jakarta Sans** — body/UI (weights 400–700). Default body font.
- Offline-first requirement: **bundle these as local `woff2`** under `static/fonts/` and `@font-face` them. Do NOT rely on the Google Fonts CDN (app must work with no network). System-font fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## Color tokens
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0c1226` → `#0a0e1c` (gradient) | app background |
| `--bg-radial` | `radial-gradient(90% 48% at 50% 36%, #191e44 0%, #0a0e1c 62%)` | mixer/now-playing bg |
| `--surface` | `#141A30` | cards, rows (idle) |
| `--surface-hi` | `#23284A` (often `linear-gradient(160deg,#23284a,#1a1f3c)`) | active row, raised card |
| `--track` | `#1C2240` | slider track, ring track |
| `--accent-1` | `#7C8CF0` (periwinkle) | accent |
| `--accent-2` | `#B98CF0` (violet) | accent |
| `--accent-grad` | `linear-gradient(135deg,#7C8CF0,#B98CF0)` | play orb, primary CTA, hero |
| `--text` | `#EEF1FF` | primary text |
| `--text-dim` | `#DFE3F7` | secondary text |
| `--muted` | `#8D96BD` | captions/meta |
| `--muted-2` | `#6B739A` | faint labels |
| `--locked` | `#5B6488` | disabled toggle knob |
| `--premium` | `#9A7FC4` / `#B98CF0` | premium label / lock |
| on-accent text | `#0C1226` | text/icons on accent surfaces |

## Type scale
- Display: Sora 25/600 (page titles e.g. "Sounds", "Your mixes", "Settings")
- Big display: Sora 27–28/700 (paywall title, single-sound name)
- Title: Sora 18/600 (section/card titles)
- Body: Jakarta 16/600 (sound name)
- Caption: Jakarta 12/500 `--muted`

## Radius & spacing
- Row/control radius **12px**; card radius **18px**; sheet/large card **24px**; pill **30px**; phone frame **42px**.
- Spacing scale: **4 · 8 · 16 · 24**.

## Iconography
- 24×24 grid, **1.6px** stroke, round caps/joins, 2px safe padding. Active tint `#BCC6FF`.
- Each sound has a bespoke line icon (see "Sound icon library" in the marketing file). Sound→icon SVG mapping should live in the sound registry or an `icons` module so tiles render the right glyph.
- Wisp brand mark: `<path d="M3 12c3 0 3-4 6-4s3 8 6 8 3-4 6-4"/>` (a wisp/wave), on `--accent-grad` rounded-square.

## Component states (from the design-system panel)
**Sound row** (list item, full-width):
- *Idle/off*: bg `--surface`, 1px `rgba(255,255,255,.04)` border, icon tile `rgba(255,255,255,.04)` w/ `--muted` icon, toggle off (track `#262b46`, knob `#5b6488` left).
- *Active/on*: bg `linear-gradient(160deg,#23284a,#1a1f3c)`, border `rgba(124,140,240,.45)`, icon tile `rgba(124,140,240,.18)` w/ `#bcc6ff` icon, subtitle "On · NN%" in `--accent-1`, toggle on (track `#7c8cf0`, knob `#0c1226` right).
- *Premium/locked*: like idle but name `#aeb4cf`, subtitle "Premium" in `--premium`, trailing lock chip (circle `rgba(185,140,240,.14)`, `#b98cf0` padlock) instead of toggle.
- *Disabled*: opacity .4, muted everything.

**Volume slider**: 6px track `--track`; fill `--accent-grad`; knob 16px `--text` with glow `0 2px 8px rgba(124,140,240,.6)`; dragging knob 20px + halo `0 0 0 6px rgba(124,140,240,.25)`; muted = knob only at 0%.

**Toggle**: 42×26 (lists) / 46×28 (home) pill, 20–22px knob.

## Screens

### 1 · Home / Sound library  (route `/`)
- Status row (mock), header: small "Wednesday night" eyebrow + Sora 25 "Sounds", round search button.
- **Hero "Favorite mix" card**: `--accent-grad`, eyebrow "FAVORITE MIX", Sora title, sounds subtitle, dark "▶ Play mix" pill. (Tapping plays the user's favorite/most-recent mix.)
- **Sound list**: vertical sound rows (states above). Active sounds float to top.
- **Now-playing mini-bar** (when ≥1 playing): floating above nav, blur bg `rgba(35,40,74,.9)`, play/pause, "Playing · N sounds", source names, animated 3-bar equalizer (`wispBar` keyframes). Tapping opens the mixer.
- **Bottom nav** (3 tabs): Sounds (grid icon) · Mixes (collection icon) · Settings (gear). Active tab `#b6bdf0`, inactive `#5b6488`. NOTE: design's bottom nav is **3 tabs**; "Now playing"/Mixer is reached via the mini-bar or a sound row, not a nav tab.

### 2 · Now-playing / Mixer — "orbit"  (route `/now-playing`)
- Header: back chevron, centered "Now playing / Your mix", overflow dots.
- **Orbit**: central play orb (`--accent-grad`, play/pause glyph + timer "30:00") wrapped by a progress ring (`--track` base + `--accent-grad` arc). Active sounds are small circular nodes positioned around the orb (top/right/left/bottom), each showing its icon + volume %, border brightness ∝ volume. A dashed "+" node adds another sound.
- **Selected-sound volume bar** below the orbit ("Rain volume … 80%").
- Bottom: "⏱ 30 min" timer pill (opens timer sheet) + "🔖 Save" pill.
- *2b · single-sound variant*: when exactly one sound is active — large centered sound name + big play orb + full-width volume slider + dashed "Add another sound" + timer/save. This is the **most common** state; implement both (single vs multi) from the same route.

### 3 · Saved mixes  (route `/mixes`)
- Sora 25 "Your mixes" + "N saved · tap to launch".
- Mix cards: playing card highlighted (`--surface-hi`, accent border, "PLAYING" w/ equalizer, big round play btn); others `--surface` with circular ▶. Each shows mix name (Sora 18) + layer names subtitle.
- Dashed "＋ Create new mix" CTA near bottom.

### 4 · Sleep-timer sheet  (modal bottom sheet over mixer)
- Scrim `rgba(6,9,20,.6)`, sheet bg `linear-gradient(180deg,#161c38,#10142a)`, radius 32 top, grab handle.
- Title "Sleep timer" + explainer: "Sound fades out gently over the last 30 seconds — you won't wake to silence cutting off."
- 3×2 grid of duration chips: **15 / 30 / 45 / 60 / 90 / Custom** (selected chip uses `--accent-grad`).
- "Until I stop it" full-width row.
- Primary CTA "Start timer · NN min" (`--accent-1`, dark text).

### 5 · Paywall  (route `/paywall`)
- Close ✕ top-left. Centered brand mark, Sora 27 "Wisp Premium", subtitle "Everything you need for a perfect night. Less than half what Calm or Headspace charge."
- Benefit list (check chips): "Full library — **60+ premium sounds**", "Unlimited saved mixes", "High-quality offline playback".
- **Annual card** (selected, accent border, badge "BEST VALUE · SAVE 60%"): "7-day free trial, then $39.99/yr" · "$3.33/month".
- **Monthly card**: "Cancel anytime" · "$6.99/month".
- CTA "Start 7-day free trial" (`--accent-1`). Footer links: Restore purchases · Terms · Privacy.
- NOTE: prices/packages come from RevenueCat offerings at runtime; the design strings ($39.99, $3.33, $6.99, SAVE 60%) are the intended copy/layout. Render price from the package, keep the layout/badges.

### 6 · Settings  (route `/settings`)
- Sora 25 "Settings". **Premium status card** (`--accent-grad`) showing plan state. Rows for: Restore purchases, battery-optimization hint (Xiaomi/Samsung), Privacy Policy, Terms. (Read remaining rows from reference if needed.)

## Marketing / store assets (`Wisp Marketing.dc.html`)
Brand & asset kit, not an app screen:
- **App icon**: primary (rounded-square `linear-gradient(150deg,#8b9af5,#7c8cf0,#b98cf0)` + wisp mark, scattered star dots), night variant, adaptive round, sizes 64/44/30 + monochrome. 512×512 Play icon.
- **Sound icon library**: the per-sound 24px glyph set (Rain, Ocean, Fire, Fan, Forest, Thunder, Stream, Wind, White/Pink/Brown noise, Night).
- **Feature graphic** 1024×500: "Sleep sounds, beautifully simple." + phone peek + "Free to start" + ★4.9.
- **Store screenshots** (3, 360×720-ish): "Drift off in seconds", "Mix your perfect night", "Premium for half the price ($39.99/yr)".
