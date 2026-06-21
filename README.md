# Wisp — Sleep Sounds

Wisp is a white-noise and sleep-sounds Android app built for reliable all-night background playback. It blends up to four simultaneous audio layers (noise colors, nature sounds, ambient soundscapes), lets you save named mixes, and sets a sleep timer that fades audio out gently. The business model is freemium: eight sounds plus all core features are free forever; the full library of 30+ sounds unlocks with a premium subscription via in-app purchase.

---

## Architecture

The codebase is a SvelteKit static SPA compiled by Vite and packaged for Android with Capacitor 8. Layers are separated by responsibility:

```
UI routes (SvelteKit pages)
    └─ Svelte stores (activeSounds, timer, subscription, ads, savedMixes)
        └─ Services (audioEngine, adsService, subscriptionService, analyticsService, storageService)
            └─ Plugin adapters (nativeAudio, admob, purchases, analytics, preferences)
                └─ Native Capacitor plugins / platform APIs
```

The adapter seam is the testability boundary. Every service depends on an injected adapter interface; tests swap in fakes (under `src/lib/adapters/fakes/`) so the entire service and store layer runs headlessly in Vitest. The only playback engine is `@mediagrid/capacitor-native-audio`, which runs a foreground `mediaPlayback` service — this is why audio survives screen-off.

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | **20+** | Web dev, Vitest, Playwright |
| Node.js | **22+ required** | Capacitor 8 CLI (`cap sync`, `cap open android`) — the CLI will warn or refuse on Node 20 |
| npm | 10+ (ships with Node 22) | Package management |
| Android Studio | Latest stable | Android SDK, emulator, device builds |
| JDK | 17 | Required by the Android Gradle toolchain |
| Physical Android device | Android 8+ | In-app purchases and background audio require a real device |

---

## Install & run (web / dev)

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`. Capacitor plugins are stubbed — the app loads and all UI flows work in the browser. Audio playback and IAP require the native build.

---

## Tests

### Unit + component (Vitest)

```bash
npm test
```

Runs all 248 tests across 30 test files with V8 coverage. Coverage gate is ≥ 90% on `src/lib/**`.

**Current status:** all 248 tests pass; coverage is:
- Statements: 99.86 %
- Branches: 91.63 %
- Functions: 97.95 %
- Lines: 99.86 %

### End-to-end (Playwright)

```bash
npm run test:e2e
```

Runs `tests/e2e/wisp.spec.ts` (SPA flows: sound layering, mix save, free-tier cap, premium lock → paywall) and `tests/e2e/marketing.spec.ts` (marketing landing page). All 3 tests pass.

---

## Build the Android app

> **Node 22+ is required for this step.**

```bash
npm run cap:sync        # builds the SPA then syncs web assets into android/
npx cap open android    # opens the project in Android Studio
```

In Android Studio: select a connected physical device and press Run. The app installs and launches.

Before you can build, complete the one-time native configuration described in [docs/android-native-setup.md](docs/android-native-setup.md). That document covers the `AndroidManifest.xml` patches, the background audio service declaration, the AdMob application-ID meta-data, the Firebase Google Services Gradle plugin, and the adaptive launcher icon.

---

## Where to drop sound files

The sound registry at `src/lib/sounds/registry.ts` defines every sound and its asset path as `sounds/<id>.mp3`. The native-audio plugin reads files from the Android app's web assets directory, so files must be placed at:

```
android/app/src/main/assets/public/sounds/<id>.mp3
```

After `cap sync` the build directory is copied there automatically, so you can also place files in:

```
static/sounds/<id>.mp3        ← committed source location
```

and they will be included in every subsequent `cap sync`.

**Naming:** filenames must match the `id` field in the registry exactly (e.g. `rain.mp3`, `white-noise.mp3`, `rain-on-tent.mp3`).

**Noise colors** (`white-noise`, `pink-noise`, `brown-noise`, `blue-noise`, `grey-noise`) must be pre-rendered offline from a noise generator — they cannot be recorded. Use a tool such as Audacity, SoX, or a Python script with `numpy`/`soundfile`.

**Nature sounds** must be:
- CC0 / royalty-free licensed (sources: Freesound.org CC0 filter, BBC Sound Effects, Zapsplat free tier)
- Loudness-normalized to −14 LUFS (use `ffmpeg-normalize` or Audacity's Normalize effect)
- Loop-verified: the tail must crossfade seamlessly back to the head (edit in Audacity with zero-crossing snapping)
- Encoded at 128–192 kbps MP3, mono or stereo as appropriate

The registry currently uses placeholder asset paths — the files are not committed to the repo. The app will display all sound tiles; tapping a tile without a corresponding file will produce a native-audio error in logcat, which you can diagnose with `adb logcat`.

---

## RevenueCat setup checklist

1. Create a [RevenueCat](https://app.revenuecat.com) project named **Wisp**.
2. Add a **Google Play** app with package name `com.velologiclabs.wisp`.
3. Create an entitlement with identifier `premium`.
4. Create two products in Google Play Console (see Play Console checklist below), then mirror them in RevenueCat:
   - `wisp_premium_annual` — annual subscription, 7-day free trial
   - `wisp_premium_monthly` — monthly subscription, no trial
5. Create one **offering** (identifier `default`) containing one **package** for each product.
6. Copy the **public SDK key** (starts with `appl_` for Apple, `goog_` for Google — use the Google one) to your `.env` file:
   ```
   VITE_RC_API_KEY=goog_xxxxxxxxxxxxxxxxxxxx
   ```
7. The key is embedded into the web bundle at build time via `import.meta.env.VITE_RC_API_KEY`. It is a public key — safe to ship in the client bundle.

---

## Firebase analytics setup

1. Create a [Firebase](https://console.firebase.google.com) project.
2. Add an **Android app** with package name `com.velologiclabs.wisp` and SHA-1 fingerprint from your signing keystore.
3. Download `google-services.json` and copy it to `android/app/google-services.json`.
4. Add `android/app/google-services.json` to `.gitignore` — do **not** commit this file.
5. Apply the Google Services Gradle plugin as documented in [docs/android-native-setup.md](docs/android-native-setup.md) (sections 3b and 3c).

Without a real `google-services.json` the Firebase plugin no-ops gracefully and the app runs normally — analytics events are simply discarded. This means CI and web-dev mode work without any Firebase configuration.

---

## AdMob setup

1. Create an [AdMob](https://admob.google.com) account and add an Android app with package name `com.velologiclabs.wisp`.
2. Note the **AdMob app ID** (format `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`).
3. In `android/app/src/main/AndroidManifest.xml`, replace the placeholder value in the `com.google.android.gms.ads.APPLICATION_ID` meta-data element with your real app ID (see `docs/android-native-setup.md` section 2d).
4. Create a **banner ad unit** and copy its ID into `src/lib/ads/config.ts`, replacing the `TEST_BANNER_AD_ID` constant. During development keep using Google's test ID (`ca-app-pub-3940256099942544/6300978111`) — real ad unit IDs must only be used in production builds.
5. The **UMP (User Messaging Platform) consent** flow runs automatically on first launch via the AdMob SDK. No additional code is needed.
6. Ads are shown only to free-tier users. Premium subscribers see no banner.

---

## Play Console checklist

1. Create the app in [Google Play Console](https://play.google.com/console) with package name `com.velologiclabs.wisp`.
2. Set up an **Internal testing** track and add your test account(s) to the testers list.
3. Create the in-app billing products:
   - Subscription group: **Wisp Premium**
   - Product ID `wisp_premium_annual`: annual, price your choice, 7-day free trial, grace period 3 days
   - Product ID `wisp_premium_monthly`: monthly, no trial, grace period 3 days
4. Complete the **Data Safety** form: declare that the app collects analytics data (app interactions, crash logs via Firebase) and serves ads (AdMob), with no data shared to third parties for tracking.
5. Add a **Privacy Policy URL** in the store listing. A minimal hosted policy page is sufficient.
6. Rasterize store assets from `store-assets/` per the instructions in [store-assets/README.md](store-assets/README.md) and upload them to the Play Console store listing.

---

## Marketing site

`marketing/` is a standalone static landing page — no build step required. Preview locally:

```bash
open marketing/index.html
# or, to serve over HTTP:
npx serve marketing
```

Deploy and font-handling instructions are in [marketing/README.md](marketing/README.md).

---

## Important: physical device for IAP and background audio

In-app purchases do **not** work reliably on Android emulators. Testing the subscription flow (purchase, restore, entitlement unlock) requires a physical device signed into a Google account that is on the internal testing track.

True background playback (audio continues with the screen off) also requires a physical device — emulators do not faithfully replicate the Android foreground service lifecycle.

---

## Battery optimization

On **Xiaomi**, **Samsung**, and some other heavily-customized Android skins, aggressive battery optimization can kill background services even when a foreground notification is present. If audio stops after the screen turns off:

1. Open **Settings → Apps → Wisp → Battery**.
2. Set to **Unrestricted** (Xiaomi: "No restrictions"; Samsung: "Unrestricted").

Wisp's foreground audio service keeps a wake lock, but manufacturer-specific battery managers can override this.

---

## Security note

`npm audit` reports two known advisories:

1. **`cookie` < 0.7.0** — reachable via `@sveltejs/kit` SSR. Wisp uses `@sveltejs/adapter-static`, which produces a fully pre-rendered static site with no server runtime. The `cookie` module is never executed in the shipped Android bundle. Fixing this would require a breaking SvelteKit downgrade.

2. **`esbuild` ≤ 0.24.2** — the esbuild dev server can be queried by external origins. This only affects `npm run dev` on a developer machine. The vulnerability has no surface area in the production build.

Both advisories are dev-only and are not present in the Capacitor bundle delivered to Android users.
