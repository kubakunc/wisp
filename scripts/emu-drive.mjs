// Drives the live app WebView on the emulator via Chrome DevTools (CDP).
// Usage: node scripts/emu-drive.mjs '<action>'  where action is one of:
//   state | tap:<SoundName> | goto:<path> | text
// Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
import { chromium } from 'playwright-core';

const action = process.argv[2] ?? 'state';
const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes('localhost'));
if (!page) {
  console.log(JSON.stringify({ error: 'app page not found', urls: ctx.pages().map((p) => p.url()) }));
  await browser.close();
  process.exit(1);
}

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

async function snapshot() {
  return await page.evaluate(() => {
    const txt = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;
    const pressed = [...document.querySelectorAll('[aria-pressed="true"]')].map(
      (b) => b.textContent.replace(/\s+/g, ' ').trim()
    );
    return {
      url: location.pathname,
      pressedRows: pressed,
      nowPlaying: document.body.textContent.includes('Playing ·')
        ? (document.body.textContent.match(/Playing · [^A-Z]*/) || [null])[0]
        : null
    };
  });
}

try {
  if (action === 'state' || action === 'text') {
    console.log(JSON.stringify(await snapshot()));
  } else if (action.startsWith('tap:')) {
    const name = action.slice(4);
    await page.getByRole('button', { name: new RegExp(name, 'i') }).first().click({ timeout: 4000 });
    await page.waitForTimeout(1500);
    console.log(JSON.stringify({ tapped: name, after: await snapshot(), errors }));
  } else if (action.startsWith('goto:')) {
    await page.evaluate((p) => history.pushState({}, '', p), action.slice(5));
    await page.waitForTimeout(800);
    console.log(JSON.stringify(await snapshot()));
  }
} catch (e) {
  console.log(JSON.stringify({ error: String(e), errors }));
}
await browser.close();
