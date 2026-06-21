# Android Native Setup

Apply these steps on a machine running **Node ≥22** with Android Studio installed.
All edits below are exact, copy-pasteable patches.

---

## 1. Add the Android platform

```bash
npm run build
npx cap add android
```

---

## 2. Patch `android/app/src/main/AndroidManifest.xml`

### 2a. Permissions — inside `<manifest>`, above `<application>`

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### 2b. Main activity — add `launchMode` to the existing `<activity>` tag

```xml
android:launchMode="singleTop"
```

The opening tag should look like:

```xml
<activity
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:exported="true"
    android:hardwareAccelerated="true"
    android:launchMode="singleTop"
    android:name=".MainActivity"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:windowSoftInputMode="adjustResize">
```

### 2c. Service declaration — inside `<application>`

Add the `@mediagrid/capacitor-native-audio` background audio service:

```xml
<service
    android:name="us.mediagrid.capacitorjs.plugins.nativeaudio.AudioPlayerService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />
```

### 2d. AdMob application ID — inside `<application>`

**Placeholder value** — replace `ca-app-pub-3940256099942544~3347511713` with your real AdMob app ID from the AdMob console before publishing to the Play Store.

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713" />
```

---

## 3. Firebase — Google Services Gradle plugin

### 3a. Place `google-services.json`

Copy the `google-services.json` file downloaded from the Firebase console to:

```
android/app/google-services.json
```

Do **not** commit this file — add `android/app/google-services.json` to `.gitignore`.

### 3b. `android/build.gradle` — add the classpath inside `dependencies {}`

```groovy
dependencies {
    classpath 'com.google.gms:google-services:4.4.2'
    // ... existing classpath entries
}
```

### 3c. `android/app/build.gradle` — apply the plugin at the bottom of the file

```groovy
apply plugin: 'com.google.gms.google-services'
```

> Source: verified against `@capacitor-firebase/analytics` v8 README and the
> [capawesome firebase-setup guide](https://github.com/capawesome-team/capacitor-firebase/blob/main/docs/firebase-setup.md#android).

---

## 4. Sync

```bash
npx cap sync android
```

---

## 5. iOS — Background Audio Mode

Open the iOS project in Xcode (`npx cap open ios`), go to the **Signing & Capabilities** tab for the `App` target, click **+ Capability**, add **Background Modes**, and check **Audio, AirPlay, and Picture in Picture**.

Alternatively, add the key directly to `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

---

## 6. Adaptive launcher icon

Wire the Wisp adaptive icon so every modern Android launcher shows the correct foreground graphic over the deep-space gradient background. The source SVGs live in `store-assets/icon/`.

### 6a. Rasterize the SVG layers

The `108 dp` canvas used by adaptive icons maps to the following pixel sizes across density buckets:

| Density | dp → px factor | Required size |
|---------|---------------|---------------|
| mdpi    | ×1            | 108 × 108 px  |
| hdpi    | ×1.5          | 162 × 162 px  |
| xhdpi   | ×2            | 216 × 216 px  |
| xxhdpi  | ×3            | 324 × 324 px  |
| xxxhdpi | ×4            | 432 × 432 px  |

Use `resvg` (fast, accurate) or `rsvg-convert` (librsvg):

```bash
# resvg — install: cargo install resvg  OR  brew install resvg
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  case $density in
    mdpi)    PX=108 ;;
    hdpi)    PX=162 ;;
    xhdpi)   PX=216 ;;
    xxhdpi)  PX=324 ;;
    xxxhdpi) PX=432 ;;
  esac
  DIR="android/app/src/main/res/mipmap-$density"
  mkdir -p "$DIR"
  resvg -w $PX -h $PX store-assets/icon/icon-foreground.svg "$DIR/ic_launcher_foreground.png"
  resvg -w $PX -h $PX store-assets/icon/icon-background.svg "$DIR/ic_launcher_background.png"
  # Legacy square icon (no adaptive support)
  resvg -w $PX -h $PX store-assets/icon/icon-master.svg     "$DIR/ic_launcher.png"
  # Round icon variant used by some launchers
  resvg -w $PX -h $PX store-assets/icon/icon-master.svg     "$DIR/ic_launcher_round.png"
done
```

Equivalent `rsvg-convert` (librsvg) commands:

```bash
# rsvg-convert — install: brew install librsvg  OR  apt install librsvg2-bin
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  case $density in
    mdpi)    PX=108 ;;
    hdpi)    PX=162 ;;
    xhdpi)   PX=216 ;;
    xxhdpi)  PX=324 ;;
    xxxhdpi) PX=432 ;;
  esac
  DIR="android/app/src/main/res/mipmap-$density"
  mkdir -p "$DIR"
  rsvg-convert -w $PX -h $PX store-assets/icon/icon-foreground.svg -o "$DIR/ic_launcher_foreground.png"
  rsvg-convert -w $PX -h $PX store-assets/icon/icon-background.svg -o "$DIR/ic_launcher_background.png"
  rsvg-convert -w $PX -h $PX store-assets/icon/icon-master.svg     -o "$DIR/ic_launcher.png"
  rsvg-convert -w $PX -h $PX store-assets/icon/icon-master.svg     -o "$DIR/ic_launcher_round.png"
done
```

Alternatively, use **Android Studio Image Asset Studio**: right-click `android/app/src/main/res` → **New → Image Asset**, choose **Launcher Icons (Adaptive and Legacy)**, select **Source Asset → Image**, point the Foreground layer at `icon-foreground.svg` and the Background layer at `icon-background.svg`, and let Studio generate all densities automatically.

### 6b. Create the adaptive icon XML

Create the directory `android/app/src/main/res/mipmap-anydpi-v26/` and add the following two files:

**`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
```

**`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
```

### 6c. Background color note

`icon-background.svg` uses the Wisp deep-space gradient (`#0c1226` → `#0a0e1c` with a radial highlight). Rasterizing it into per-density PNGs is correct; alternatively you can replace the `<background>` drawable reference with a solid color value:

```xml
<background android:drawable="@color/ic_launcher_background" />
```

and add to `android/app/src/main/res/values/colors.xml`:

```xml
<color name="ic_launcher_background">#0C1226</color>
```

Using a solid color is slightly smaller on disk and renders crisply at any scale, but loses the gradient. Use the PNG approach (`icon-background.svg` rasterized) to preserve the gradient.

### 6d. Verify in Android Studio

After placing all files, open the project in Android Studio and select **Build → Clean Project**, then **Build → Rebuild Project**. In the Project view, navigate to `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` and click the preview icon — you should see the Wisp wave mark centred on the dark gradient background.

---

## 7. Final AndroidManifest reference

Complete `android/app/src/main/AndroidManifest.xml` after all patches (structure only — Capacitor fills in the rest):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Background audio + wake lock -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Capacitor-generated permissions (internet, network state, etc.) are added here by cap sync -->

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:hardwareAccelerated="true"
            android:launchMode="singleTop"
            android:name=".MainActivity"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <!-- @mediagrid/capacitor-native-audio background service -->
        <service
            android:name="us.mediagrid.capacitorjs.plugins.nativeaudio.AudioPlayerService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="false" />

        <!-- AdMob: replace placeholder with real app ID before Play Store release -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713" />

    </application>

</manifest>
```
