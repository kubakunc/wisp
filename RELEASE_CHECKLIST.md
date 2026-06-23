# Wisp — Release Checklist

Status as of release prep. **Bundle:** `android/app/build/outputs/bundle/release/app-release.aab` (signed, ~15 MB).

## Build & sign (DONE)

- ✅ Release signing wired via `android/keystore.properties` (gitignored). Upload
  keystore at `android/wisp-upload.keystore` (gitignored).
  **⚠️ BACK UP the keystore + its password somewhere safe** — losing it means you
  can't ship updates (short of a Play App Signing upload-key reset).
- ✅ `versionCode 1`, `versionName "1.0.0"`.
- ✅ Portrait-locked, app icons generated 1:1 from the SVG, status bar handled.
- ✅ Sounds served from the GCS bucket as gapless Opus/OGG loops; 3 noise colors
  bundled. Premium gating, weekly free "Sound of the week", sleep-timer fade,
  download-state UI, locked-mix handling, play-duration analytics — all in.

### Build commands

```bash
npm run build && npx cap copy android
cd android && ./gradlew bundleRelease    # -> app/build/outputs/bundle/release/app-release.aab
# or an installable test APK:
./gradlew assembleRelease                # -> app/build/outputs/apk/release/app-release.apk
```
(Use JDK 21, e.g. Android Studio's JBR, and Node ≥ 22 for the Capacitor CLI.)

## BLOCKERS before public release

1. **RevenueCat key** — `.env` `VITE_RC_API_KEY` is still a **`test_` (Test Store)**
   key. The Test Store is dev-only: the SDK is unsuitable for / crashes in
   production and Play rejects it. Replace with the **`goog_` production** key
   before shipping (and re-`npm run build`).
2. **AdMob** — still using Google **test** IDs:
   - App ID in `android/app/src/main/AndroidManifest.xml`
     (`ca-app-pub-3940256099942544~3347511713`).
   - Banner unit `TEST_BANNER_AD_ID` in `src/lib/ads/config.ts`.
   Replace both with the real AdMob app ID + ad unit ID.
3. ✅ **Firebase / Analytics** — DONE. `android/app/google-services.json` added
   (project `wisp-47e62`, package `com.velologiclabs.wisp`); the Gradle plugin
   applies and the release AAB builds with it. Analytics (incl. the new
   `sound_played` / `mix_played` events) now flow to Firebase on device.
4. **Removed sounds** — `boat` (Creaking Boat) and `meadow` (Summer Meadow) had no
   uploaded audio, so they were removed from `src/lib/sounds/sounds.json` for the
   release. Re-add them (with bucket `.ogg` files) when their audio is ready.

## Store listing (todo on Play Console)

- Privacy Policy + Terms URLs (app links to `wisp.app/privacy` and `wisp.app/terms`
  — make sure those pages exist).
- Data safety form (analytics + ads collect data), content rating, screenshots,
  feature graphic, short/full description.
- Internal/closed testing track for the 14-day test window.
