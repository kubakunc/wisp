# Wisp — Marketing Landing Page

Standalone static marketing site for the Wisp sleep sounds app.
Independent from the Capacitor app build — no framework, no bundler.

## Preview locally

```bash
# Option A: open directly in browser (file:// — fonts from ../static/fonts will load)
open marketing/index.html

# Option B: serve over HTTP so relative paths resolve perfectly
npx serve marketing
# then open http://localhost:3000
```

## Assets

- `marketing/index.html` — single-file responsive landing page
- `marketing/styles.css` — full visual system (design tokens from docs/design/DESIGN.md)
- `marketing/assets/` — reserved for future images/OG images
- Fonts referenced as `../static/fonts/*.woff2` (Sora + Plus Jakarta Sans variable fonts)
  If deploying independently, copy `static/fonts/` into `marketing/assets/fonts/` and
  update the `@font-face` src paths in `styles.css` accordingly.

## Deployment

The page is a self-contained static site. Deploy to any static host:

```bash
# Netlify drop (drag & drop the marketing/ folder)
# or
netlify deploy --dir marketing

# Firebase Hosting
firebase deploy --only hosting

# GitHub Pages / any CDN — just serve marketing/ as the web root
```

**Important**: if hosting separately from the app repo, copy the font files:
```bash
cp -r static/fonts marketing/assets/fonts
```
Then update `styles.css` `@font-face` src to `assets/fonts/Sora-Variable.woff2` etc.

## E2E smoke test

```bash
npx playwright test tests/e2e/marketing.spec.ts
```

The test loads `marketing/index.html` via a `file://` URL and asserts:
- Hero heading "Sleep sounds, beautifully simple" is visible
- "Free to start" CTA is present
- "$39.99" annual price is present
- "60+ premium sounds" copy is present
