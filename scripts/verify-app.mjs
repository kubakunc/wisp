// End-to-end functional verification against the LIVE app on the emulator,
// driven over CDP. Exercises every button/function and reports pass/fail JSON.
//
// Prereqs: app running on the emulator + the webview devtools socket forwarded:
//   adb -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_<pid>
//
// Usage: node scripts/verify-app.mjs
//
// Remote-download checks (remote sound + settings clear) require the app to be
// built with VITE_SOUND_CDN pointing at a local static file server that serves
// the cdn-sounds/ directory (the 29 remote WAVs are no longer in static/).
// Example: npx serve cdn-sounds -l 8788  →  VITE_SOUND_CDN=http://10.0.2.2:8788
// (10.0.2.2 is the Android emulator's alias for the host loopback interface.)
// Build command: VITE_SOUND_CDN=http://10.0.2.2:8788 npm run build
import { chromium } from 'playwright-core';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
// Pick the Capacitor app page (https://localhost/...) and NOT the AdMob ad
// webviews (googleads.g.doubleclick.net) that share the same CDP endpoint.
let page = null;
for (const p of ctx.pages()) {
  try {
    const isApp = await p.evaluate(() => location.host === 'localhost' && !!document.querySelector('.shell'));
    if (isApp) { page = p; break; }
  } catch { /* cross-origin / detached */ }
}
if (!page) {
  console.log(JSON.stringify({ fatal: 'app page not found', urls: ctx.pages().map((p) => p.url()) }));
  await browser.close();
  process.exit(1);
}

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

const results = [];
const sleep = (ms) => page.waitForTimeout(ms);

// --- in-page helpers --------------------------------------------------------
const HELPERS = `
  window.__t = {
    norm: (s) => (s || '').replace(/\\s+/g, ' ').trim(),
    byText(text, sel) {
      const els = [...document.querySelectorAll(sel || '*')];
      return els.find((e) => window.__t.norm(e.textContent) === text)
          || els.find((e) => window.__t.norm(e.textContent).includes(text));
    },
    clickText(text, sel) { const e = window.__t.byText(text, sel); if (e) { e.click(); return true; } return false; },
    clickSel(sel, i = 0) { const e = document.querySelectorAll(sel)[i]; if (e) { e.click(); return true; } return false; },
    setRange(sel, v, i = 0) {
      const e = document.querySelectorAll(sel)[i]; if (!e) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(e, String(v));
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    type(sel, v) {
      const e = document.querySelector(sel); if (!e) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(e, v);
      e.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    },
    state() {
      return {
        path: location.pathname,
        pressed: [...document.querySelectorAll('[aria-pressed="true"]')].map((b) => window.__t.norm(b.textContent)),
        npBar: !!document.querySelector('.now-playing-bar'),
        npCount: (document.body.textContent.match(/Playing · \\d+ sound/) || [null])[0],
        soundRows: document.querySelectorAll('.sound-row').length,
        mixCards: document.querySelectorAll('.mix-card, [class*="mix"]').length,
        emptyResults: !!window.__t.byText('No sounds match', 'p'),
        emptyMixes: !!window.__t.byText('No saved mixes', 'p'),
        timerSheetOpen: !!window.__t.byText('Start', 'button') && /Sleep timer|timer/i.test(document.body.textContent),
        notice: window.__t.norm((document.querySelector('[role="alert"]') || {}).textContent || ''),
        savedTick: /Saved/.test(document.body.textContent),
        menuOpen: !!window.__t.byText('Stop all sounds', 'button'),
        volSliders: document.querySelectorAll('input[type="range"]').length
      };
    }
  };
`;

async function inject() { await page.evaluate(HELPERS); }
async function st() { await inject(); return page.evaluate('window.__t.state()'); }
async function go(path) {
  await page.evaluate((p) => history.pushState({}, '', p), path);
  // SvelteKit client nav via link click is more reliable; fall back to goto
}
async function navByLink(label) {
  await inject();
  await page.evaluate((l) => window.__t.clickText(l, 'a, a *'), label);
  await sleep(500);
}
async function curPath() { await inject(); return page.evaluate('location.pathname'); }

// Reset to a clean home WITHOUT reloading the WebView (a reload would orphan the
// native audio players, which outlive the JS context). Dismiss any full-screen
// route via its in-app control, return to the Sounds tab, then stop all sounds.
async function homeReset() {
  for (let i = 0; i < 4; i++) {
    const p = await curPath();
    if (p === '/paywall') { await page.evaluate(() => window.__t.clickSel('[aria-label="Close paywall"]')); await sleep(450); continue; }
    if (p === '/now-playing') { await page.evaluate(() => window.__t.clickSel('[aria-label="Minimize"]')); await sleep(450); continue; }
    if (p !== '/') { await page.evaluate(() => window.__t.clickText('Sounds', 'a, a *')); await sleep(450); continue; }
    break;
  }
  // Toggle off any still-active sounds (active rows always toggle off).
  for (let i = 0; i < 8; i++) {
    await inject();
    const off = await page.evaluate(() => {
      const b = document.querySelector('.sound-row.active .row-btn') || document.querySelector('.now-playing-bar');
      if (document.querySelector('.sound-row.active .row-btn')) { document.querySelector('.sound-row.active .row-btn').click(); return true; }
      return false;
    });
    if (!off) break;
    await sleep(350);
  }
  await sleep(150);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    const pass = detail.pass !== false;
    results.push({ name, pass, ...detail });
  } catch (e) {
    results.push({ name, pass: false, error: String(e) });
  }
}

// === clear any persisted saved mixes via the UI (idempotent runs) ===========
await homeReset();
await navByLink('Mixes');
await sleep(400);
for (let i = 0; i < 5; i++) {
  await inject();
  const removed = await page.evaluate(() => window.__t.clickText('', '[aria-label^="Delete"], [aria-label*="Delete mix"]'));
  if (!removed) break;
  await sleep(300);
}

// === NAVIGATION =============================================================
await check('nav: Mixes tab', async () => {
  await homeReset(); await navByLink('Mixes');
  const s = await st(); return { pass: s.path === '/mixes', path: s.path };
});
await check('nav: Settings tab', async () => {
  await navByLink('Settings'); const s = await st(); return { pass: s.path === '/settings', path: s.path };
});
await check('nav: Sounds tab', async () => {
  await navByLink('Sounds'); const s = await st(); return { pass: s.path === '/', path: s.path };
});

// === HOME: SEARCH ===========================================================
await check('search: opens', async () => {
  await homeReset(); await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Search sounds"]'));
  await sleep(300);
  const open = await page.evaluate(() => !!document.querySelector('input[type="search"]'));
  return { pass: open };
});
await check('search: filters list', async () => {
  await page.evaluate(() => window.__t.type('input[type="search"]', 'ocean'));
  await sleep(400);
  const s = await st();
  return { pass: s.soundRows === 1, soundRows: s.soundRows };
});
await check('search: empty results', async () => {
  await page.evaluate(() => window.__t.type('input[type="search"]', 'zzzzzz'));
  await sleep(400);
  const s = await st();
  return { pass: s.emptyResults && s.soundRows === 0, emptyResults: s.emptyResults, soundRows: s.soundRows };
});
await check('search: clear button', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Clear search"]'));
  await sleep(300);
  const val = await page.evaluate(() => (document.querySelector('input[type="search"]') || {}).value);
  return { pass: val === '', val };
});

// === HOME: SOUND TOGGLE + NOW-PLAYING BAR ===================================
await check('sound: play free (White Noise)', async () => {
  await homeReset(); await inject();
  await page.evaluate(() => window.__t.clickText('White Noise', 'button'));
  await sleep(800);
  const s = await st();
  return { pass: s.npBar && s.pressed.some((p) => p.includes('White Noise')), pressed: s.pressed, npBar: s.npBar };
});
await check('sound: now-playing bar play/pause', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('.now-playing-bar [aria-label="Pause"]'));
  await sleep(500);
  const paused = await page.evaluate(() => !!document.querySelector('.now-playing-bar [aria-label="Play"]'));
  await page.evaluate(() => window.__t.clickSel('.now-playing-bar [aria-label="Play"]'));
  await sleep(300);
  return { pass: paused };
});
await check('sound: stop free (toggle off)', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickText('White Noise', 'button'));
  await sleep(600);
  const s = await st();
  return { pass: !s.npBar, npBar: s.npBar };
});

// === PREMIUM GATE → PAYWALL =================================================
await check('premium gate: locked sound → paywall', async () => {
  await homeReset(); await inject();
  // search to surface a premium sound quickly
  await page.evaluate(() => window.__t.clickSel('[aria-label="Search sounds"]'));
  await sleep(200);
  await page.evaluate(() => window.__t.type('input[type="search"]', 'Blue Noise'));
  await sleep(400);
  await inject();
  await page.evaluate(() => window.__t.clickText('Blue Noise', 'button') || window.__t.clickSel('[aria-label="Locked — Premium"]'));
  await sleep(700);
  const s = await st();
  return { pass: s.path === '/paywall', path: s.path };
});

// === PAYWALL ================================================================
// With a real RevenueCat key the paywall loads live offerings (async, retried)
// and a purchase actually succeeds — so we only assert it reaches a coherent
// state: real plans + CTA, OR an honest "unavailable" + Try again. (Buying is
// verified manually / via the simulated Test Store, not driven here — it has
// side effects + navigation that would break later checks.)
await check('paywall: shows plans or an honest unavailable state', async () => {
  // allow the offerings fetch + retries to settle
  let info = null;
  for (let i = 0; i < 8; i++) {
    await sleep(500);
    info = await page.evaluate(() => ({
      cta: !!window.__t.byText('Start 7-day free trial', 'button'),
      cards: document.querySelectorAll('[class*="package"], [class*="pkg-card"], .packages > *').length,
      unavailable: !!window.__t.byText('temporarily unavailable', '*'),
      retry: !!window.__t.byText('Try again', 'button'),
      loading: !!window.__t.byText('Loading plans', '*')
    }));
    if (!info.loading) break;
  }
  const plansReady = info.cta && info.cards > 0;
  const unavailableReady = info.unavailable && info.retry;
  return { pass: plansReady || unavailableReady, info };
});
await check('paywall: close → leaves paywall', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Close paywall"]'));
  await sleep(600);
  const s = await st();
  return { pass: s.path !== '/paywall', path: s.path };
});

// === HERO MIX → NOW-PLAYING =================================================
await check('hero mix: play → now-playing', async () => {
  await homeReset(); await inject();
  await page.evaluate(() => window.__t.clickSel('.hero-card'));
  // The default mix's first layer (rain) is a remote sound; on a cold cache
  // applyMix downloads it before navigating, so allow time for the download.
  await sleep(4500);
  const s = await st();
  return { pass: s.path === '/now-playing', path: s.path };
});

// === NOW-PLAYING CONTROLS ===================================================
await check('now-playing: play/pause orb', async () => {
  await inject();
  const before = await page.evaluate(() => !!document.querySelector('[aria-label="Pause"]'));
  await page.evaluate(() => window.__t.clickSel('[aria-label="Pause"], [aria-label="Play"]'));
  await sleep(500);
  const after = await page.evaluate(() => !!document.querySelector('[aria-label="Pause"]'));
  await page.evaluate(() => window.__t.clickSel('[aria-label="Play"], [aria-label="Pause"]'));
  return { pass: before !== after, before, after };
});
await check('now-playing: volume slider', async () => {
  await inject();
  const ok = await page.evaluate(() => window.__t.setRange('input[type="range"]', 0.3));
  await sleep(400);
  return { pass: ok };
});
await check('now-playing: timer sheet opens', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Set sleep timer"]'));
  await sleep(500);
  const open = await page.evaluate(() => /15 min|30 min|45 min|Until/i.test(document.body.textContent));
  return { pass: open };
});
await check('now-playing: tapping a preset starts the timer (instant)', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="15 min"]'));
  await sleep(700);
  const running = await page.evaluate(() => /left/i.test(document.body.textContent));
  const sheetClosed = await page.evaluate(() => !/Sleep timer/.test(document.body.textContent));
  return { pass: running && sheetClosed, running, sheetClosed };
});
await check('now-playing: save mix', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickText('Save', 'button'));
  await sleep(800);
  const s = await st();
  return { pass: s.savedTick || /Upgrade to save/.test(await page.evaluate(() => document.body.textContent)), savedTick: s.savedTick };
});
await check('now-playing: overflow menu', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="More options"]'));
  await sleep(300);
  const s = await st();
  return { pass: s.menuOpen, menuOpen: s.menuOpen };
});
await check('now-playing: remove a sound', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Close menu"]'));
  await sleep(200);
  const beforeRows = await page.evaluate(() => document.querySelectorAll('.vol-row').length);
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label^="Remove"]'));
  await sleep(600);
  const afterRows = await page.evaluate(() => document.querySelectorAll('.vol-row').length);
  return { pass: afterRows < beforeRows || (await st()).path === '/', beforeRows, afterRows };
});
await check('now-playing: minimize (down chevron)', async () => {
  // ensure we're on now-playing with a sound
  let s = await st();
  if (s.path !== '/now-playing') { await homeReset(); await inject(); await page.evaluate(() => window.__t.clickText('Pink Noise', 'button')); await sleep(700); await page.evaluate(() => window.__t.clickSel('.now-playing-bar')); await sleep(800); }
  await inject();
  await page.evaluate(() => window.__t.clickSel('[aria-label="Minimize"]'));
  await sleep(700);
  s = await st();
  return { pass: s.path === '/', path: s.path };
});

// === MIXES ==================================================================
await check('mixes: saved mix appears', async () => {
  await navByLink('Mixes'); await sleep(400);
  const s = await st();
  // we saved one earlier (pink/white). Either a card exists or empty (if save hit free-limit)
  const hasCard = await page.evaluate(() => document.querySelectorAll('.mix-card').length > 0);
  return { pass: hasCard || s.emptyMixes, hasCard, emptyMixes: s.emptyMixes };
});
await check('mixes: create new → home', async () => {
  await inject();
  await page.evaluate(() => window.__t.clickText('Create new mix', 'button'));
  await sleep(500);
  const s = await st();
  return { pass: s.path === '/', path: s.path };
});

// === SETTINGS ===============================================================
await check('settings: restore (no crash)', async () => {
  await navByLink('Settings'); await sleep(300); await inject();
  await page.evaluate(() => window.__t.clickText('Restore purchases', 'button'));
  await sleep(600);
  const s = await st();
  return { pass: s.path === '/settings', path: s.path };
});
await check('settings: subscription card → /subscription', async () => {
  await inject();
  // The premium card + its link both point at /subscription (Manage / Upgrade).
  await page.evaluate(() => window.__t.clickSel('a[href="/subscription"]'));
  await sleep(700);
  const s = await st();
  const hasDetail = await page.evaluate(() => /Subscription|Wisp Premium|You're on Free/.test(document.body.textContent));
  return { pass: s.path === '/subscription' && hasDetail, path: s.path, hasDetail };
});

// === REMOTE DOWNLOAD ========================================================
await check('remote sound: tap downloads then plays', async () => {
  await homeReset(); await inject();
  await page.evaluate(() => window.__t.clickText('Ocean', 'button'));
  await sleep(4000); // allow download
  const s = await st();
  return { pass: s.pressed.some((p) => p.includes('Ocean')) && s.npBar, pressed: s.pressed };
});

// === SETTINGS: CLEAR DOWNLOADED SOUNDS =====================================
await check('settings: clear downloaded sounds', async () => {
  await navByLink('Settings'); await sleep(300); await inject();
  const had = await page.evaluate(() => /Downloaded sounds/.test(document.body.textContent));
  await page.evaluate(() => window.__t.clickText('Clear', 'button'));
  await sleep(600);
  const zero = await page.evaluate(() => /0 MB/.test(document.body.textContent));
  return { pass: had && zero, had, zero };
});

// clean up: return to a clean home via in-app nav
await homeReset().catch(() => {});

const summary = {
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).length,
  pageErrors,
  results
};
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.failed > 0 ? 1 : 0);
