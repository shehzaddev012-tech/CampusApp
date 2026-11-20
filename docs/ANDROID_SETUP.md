# Android setup on Windows (what worked, and the gotchas)

## Tools (install once)
- Node.js 22+ (we used 26 LTS), JDK 17, Android SDK (Android Studio or command-line tools).
- Set user environment variables: `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`, `JAVA_HOME` = your JDK 17 folder.
- SDK packages needed (versions from `android/build.gradle`):
  `platform-tools`, `platforms;android-37.0`, `build-tools;37.0.0`, `cmake;3.22.1`, `ndk;27.1.12297006`.
  For an emulator also `emulator` and a system image, e.g. `system-images;android-35;google_apis;x86_64`.
- Emulator on Windows needs *Windows Hypervisor Platform* (check with `emulator -accel-check`).

## Run
```powershell
npm install
npm start                      # Metro, keep it running
cd android
.\gradlew.bat app:installDebug -PreactNativeArchitectures=x86_64   # emulator (use arm64-v8a for a phone)
adb reverse tcp:8081 tcp:8081  # lets the device reach Metro
adb reverse tcp:4000 tcp:4000  # lets the device reach the API (src/config/env.ts uses http://localhost:4000)
adb shell am start -n com.campushub/.MainActivity
```
`npm run android` may fail with "gradlew.bat is not recognized" on some Windows setups; call Gradle directly as above.

Physical phone: enable Developer options + USB debugging, set USB mode to File transfer, accept the "Allow USB debugging?" prompt. `adb devices` must show the phone as `device`.

## Gotchas we hit (already fixed in the repo)
| Problem | Cause | Fix |
|---|---|---|
| `react-native-safe-area-context` has no TypeScript types | v5.11.1 shipped without `.d.ts` files | use `5.11.0` (pinned in package.json) |
| `Unresolved reference 'uiImplementation'` | safe-area-context 5.6.x is incompatible with RN 0.88 | use `5.11.0` |
| Firebase Auth: "compiled with an incompatible version of Kotlin 2.4" | newest Firebase SDK ships Kotlin 2.4 metadata | `-Xskip-metadata-version-check` in `android/build.gradle` |
| AsyncStorage KSP error with Kotlin 2.4 | AsyncStorage v3 supports Kotlin <= 2.2.20 | keep `kotlinVersion = "2.2.0"` |
| Build only for x86_64 emulator fails to start on phone | `reactNativeArchitectures` | `arm64-v8a,x86_64` in `gradle.properties` |

## Native permissions used
`INTERNET`, `POST_NOTIFICATIONS` (Android 13+ prompt), `CAMERA` (gate scanner), `VIBRATE` (scan feedback). A missing permission shows up as a red-screen error, not a build error. The manifest also asks Google Play services to download the QR model at install time (`com.google.mlkit.vision.DEPENDENCIES`), otherwise the first scan waits for a download.

## UI gotchas (RN 0.88 / Android)
- Never build a new array/object inside a zustand selector (`useStore(s => s.list.filter(...))`). It returns a new value every render and causes "Maximum update depth exceeded". Select the raw array and filter with `useMemo`.
- `StyleSheet.absoluteFillObject` is gone. Use `StyleSheet.absoluteFill` or explicit `position/top/left/right/bottom`.
- Percentage-sized `react-native-svg` inside an absolute view can leave areas uncovered; `Gradient` measures its container instead.
- Changing the background colour of an existing rounded `View` can drop its corners; mount a new view (see `TabBar`).
- Multi-word button labels need `numberOfLines={1}` or Android may clip the second word.
- Adding a hook to a component while the app is running breaks Fast Refresh ("Rendered more hooks"). Restart the app.
