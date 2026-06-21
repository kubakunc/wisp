// Dev tool: drive the live app WebView on the emulator via CDP.
// Usage: node scripts/emu-drive.mjs '<action>'  (state | tap:<name>)
// Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
import { chromium } from 'playwright-core';

const action = process.argv[2] ?? 'state';
const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().includes('localhost'));
if (!page) {
  console.log(JSON.stringify({ error: 'app page not found', urls: ctx.pages().map((p) => p.url()) }));
  await browser.close();
  process.exit(1);
}
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function snapshot() {
  return page.evaluate(() => ({
    url: location.pathname,
    pressedRows: [...document.querySelectorAll('[aria-pressed="true"]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
    nowPlaying: (document.body.textContent.match(/Playing · [^A-Z]*/) || [null])[0]
  }));
}

try {
  if (action === 'state') {
    console.log(JSON.stringify(await snapshot()));
  } else if (action.startsWith('tap:')) {
    await page.getByRole('button', { name: new RegExp(action.slice(4), 'i') }).first().click({ timeout: 4000 });
    await page.waitForTimeout(1200);
    console.log(JSON.stringify({ tapped: action.slice(4), after: await snapshot(), errors }));
  }
} catch (e) {
  console.log(JSON.stringify({ error: String(e), errors }));
}
await browser.close();
