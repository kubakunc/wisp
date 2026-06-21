#!/usr/bin/env node
/**
 * render-store-assets.mjs
 * Rasterizes all SVG store assets to PNG at the sizes required by Google Play Console.
 *
 * Auto-detects available rasterizer (resvg → rsvg-convert → inkscape).
 * Falls back to documenting commands if none are found.
 *
 * Usage:
 *   node scripts/render-store-assets.mjs
 *   node scripts/render-store-assets.mjs --tool resvg
 *   node scripts/render-store-assets.mjs --dry-run
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Assets manifest ────────────────────────────────────────────────────────
const ASSETS = [
  // App icons
  { src: 'store-assets/icon/icon-master.svg',     out: 'store-assets/icon/icon-master.png',     w: 512,  h: 512  },
  { src: 'store-assets/icon/icon-mono.svg',        out: 'store-assets/icon/icon-mono.png',        w: 512,  h: 512  },
  { src: 'store-assets/icon/icon-night.svg',       out: 'store-assets/icon/icon-night.png',       w: 512,  h: 512  },
  // Android adaptive layers (108 dp × 4 = 432 px xxxhdpi)
  { src: 'store-assets/icon/icon-foreground.svg',  out: 'store-assets/icon/icon-foreground.png',  w: 432,  h: 432  },
  { src: 'store-assets/icon/icon-background.svg',  out: 'store-assets/icon/icon-background.png',  w: 432,  h: 432  },
  // Feature graphic — exact Play Console requirement
  { src: 'store-assets/feature-graphic.svg',       out: 'store-assets/feature-graphic.png',       w: 1024, h: 500  },
  // Screenshots — 1080×2160 (3× from 360×720 SVG source)
  { src: 'store-assets/screenshots/01-drift-off.svg', out: 'store-assets/screenshots/01-drift-off.png', w: 1080, h: 2160 },
  { src: 'store-assets/screenshots/02-mix.svg',       out: 'store-assets/screenshots/02-mix.png',       w: 1080, h: 2160 },
  { src: 'store-assets/screenshots/03-pricing.svg',   out: 'store-assets/screenshots/03-pricing.png',   w: 1080, h: 2160 },
];

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TOOL_OVERRIDE = (() => {
  const idx = args.indexOf('--tool');
  return idx !== -1 ? args[idx + 1] : null;
})();

// ── Tool detection ───────────────────────────────────────────────────────────
function which(cmd) {
  const r = spawnSync('which', [cmd], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function detectTool() {
  if (TOOL_OVERRIDE) return TOOL_OVERRIDE;
  if (which('resvg')) return 'resvg';
  if (which('rsvg-convert')) return 'rsvg-convert';
  if (which('inkscape')) return 'inkscape';
  return null;
}

// ── Command builders ─────────────────────────────────────────────────────────
function buildCmd(tool, src, out, w, h) {
  switch (tool) {
    case 'resvg':
      return `resvg -w ${w} -h ${h} "${src}" "${out}"`;
    case 'rsvg-convert':
      return `rsvg-convert -w ${w} -h ${h} "${src}" -o "${out}"`;
    case 'inkscape':
      return `inkscape --export-type=png --export-width=${w} --export-height=${h} "${src}" -o "${out}"`;
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const tool = detectTool();

if (!tool) {
  console.error('\n⚠️  No SVG rasterizer found. Install one of:');
  console.error('  • resvg:         cargo install resvg  (or: brew install resvg)');
  console.error('  • rsvg-convert:  brew install librsvg  (or: apt install librsvg2-bin)');
  console.error('  • inkscape:      brew install --cask inkscape\n');
  console.error('Then re-run: node scripts/render-store-assets.mjs\n');
  console.error('Manual commands (resvg example):');
  for (const a of ASSETS) {
    console.error(`  resvg -w ${a.w} -h ${a.h} "${a.src}" "${a.out}"`);
  }
  process.exit(1);
}

console.log(`\n🎨  Rendering ${ASSETS.length} store assets using ${tool}${DRY_RUN ? ' [dry-run]' : ''}...\n`);

let ok = 0, fail = 0;

for (const asset of ASSETS) {
  const src = resolve(ROOT, asset.src);
  const out = resolve(ROOT, asset.out);

  if (!existsSync(src)) {
    console.error(`  ✗ MISSING  ${asset.src}`);
    fail++;
    continue;
  }

  // Ensure output directory exists
  mkdirSync(dirname(out), { recursive: true });

  const cmd = buildCmd(tool, src, out, asset.w, asset.h);
  console.log(`  → ${asset.out} (${asset.w}×${asset.h})`);

  if (!DRY_RUN) {
    try {
      execSync(cmd, { stdio: 'pipe' });
      ok++;
    } catch (err) {
      console.error(`    ✗ FAILED: ${err.message}`);
      fail++;
    }
  } else {
    console.log(`    cmd: ${cmd}`);
    ok++;
  }
}

console.log(`\n✅  Done: ${ok} rendered, ${fail} failed.\n`);

if (!DRY_RUN && ok > 0) {
  console.log('Play Console upload checklist:');
  console.log('  store-assets/icon/icon-master.png     → Main store listing → App icon (512×512)');
  console.log('  store-assets/icon/icon-foreground.png → Adaptive icon foreground (432×432)');
  console.log('  store-assets/icon/icon-background.png → Adaptive icon background (432×432)');
  console.log('  store-assets/feature-graphic.png      → Main store listing → Feature graphic (1024×500)');
  console.log('  store-assets/screenshots/01-03.png    → Main store listing → Phone screenshots (1080×2160)');
}
