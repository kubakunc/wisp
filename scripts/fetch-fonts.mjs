// scripts/fetch-fonts.mjs
// Run once (online) to vendor Sora & Plus Jakarta Sans woff2 into static/fonts/.
// Until run, the app falls back to the system-font stack declared in app.css.
//
// URLs are sourced from the Google Fonts gstatic CDN (latin subset, variable/regular):
//   - Sora v12 variable (wght 100-800, latin)
//   - Plus Jakarta Sans v12 regular (wght 400, latin) — used as the vendored subset
//
// After running, commit the woff2 files so the app works fully offline.
import { writeFile, mkdir } from 'node:fs/promises';
const FONTS = [
  ['Sora-Variable.woff2', 'https://fonts.gstatic.com/s/sora/v12/xMQOuFFYT72X5wkB_18qmnndmSdSnk-DKQJRBg.woff2'],
  ['PlusJakartaSans-Variable.woff2', 'https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2']
];
await mkdir('static/fonts', { recursive: true });
for (const [name, url] of FONTS) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  await writeFile(`static/fonts/${name}`, Buffer.from(await res.arrayBuffer()));
  console.log('wrote', name);
}
