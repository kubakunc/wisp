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

## 6. Final AndroidManifest reference

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
