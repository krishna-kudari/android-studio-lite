# Android Studio Lite

You ain't going back to android studio for a while.

<p align="center">
  <img src="assets/Extension_1.png" width="180" alt="Screenshot 1"/>
  <img src="assets/Extension_2.png" width="180" alt="Screenshot 2"/>
  <img src="assets/Extension_3.png" width="180" alt="Screenshot 3"/>
  <img src="assets/Extension_4.png" width="180" alt="Screenshot 4"/>
  <img src="assets/Extension_5.png" width="180" alt="Screenshot 5"/>
  <img src="assets/Extension_6.png" width="180" alt="Screenshot 6"/>
  <img src="assets/Extension_7.png" width="180" alt="Screenshot 7"/>
</p>

---

## Get started in 2 minutes

1. **Install** the extension (Extensions view → search "Android Studio Lite" → Install).
2. **Set Android SDK path**
  - Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to your SDK root, **or**
  - Settings → search `android-studio-lite.sdkPath` → set the path.
  - Restart the editor after changing env vars.
3. **Open an Android project** (folder with `gradlew`).
4. Open the **Android Studio Lite** view in the sidebar (Android icon in the activity bar).
5. **Select an AVD** in the dropdown (or start an emulator from the AVD view).
6. **Select a module** (e.g. `app`) in the dropdown.
7. Click **Run**. The extension builds, installs, and launches the app on the device.
8. Turn **Logcat** on to see logs for that app in the Logcat output channel.

---

## Prerequisites

- **Editor:** VS Code or Cursor v1.74.0+
- **Android SDK** with Platform Tools (ADB). If you use Android Studio, the SDK is usually at:
  - macOS: `~/Library/Android/sdk`
  - Windows: `%LOCALAPPDATA%\Android\Sdk`
- **Android project:** Workspace folder must contain a Gradle wrapper (`gradlew` / `gradlew.bat`).

---

## Configuration


| What                | How                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| SDK path (required) | Set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, or set `android-studio-lite.sdkPath` in Settings.                    |
| AVD / Emulator      | Auto-detected from SDK. Override with `android-studio-lite.emulator`, `android-studio-lite.avdHome` if needed. |
| ADB                 | Auto-detected from SDK `platform-tools`. Override with `android-studio-lite.adbPath` if needed.                |


After changing environment variables, restart the editor.

---

## Running your app

1. Open the **Android Studio Lite** sidebar view.
2. **Device:** Choose an AVD from the dropdown. If the emulator is not running, the extension can start it when you Run.
3. **Module:** Choose the app module (e.g. `app`). Variants are loaded from Gradle; pick the one you want (e.g. debug).
4. Click **Run**.
  - Extension builds and installs the app (Gradle), then launches it on the selected device.
  - The first run may take longer (Gradle, booting emulator).

---

## Logcat (app logs only)

- **Turn Logcat on** via the Logcat toggle in the Android Studio Lite sidebar.
- Logcat shows **only the app you last ran** (filtered by PID).
- Logs stream in the **Logcat** output channel (Output panel → channel dropdown → "Logcat").
- **Before first use:** Run your app once from the sidebar so the extension knows which app/device to attach to.
- **Commands:** Start/Stop/Clear via Command Palette (`Android Studio Lite: Start Logcat`, etc.).

---

## Build variants & devices

- **Build variant:** Use the Build Variant view in the sidebar or Command Palette: `Android Studio Lite: Select Build Variant`. Variants (e.g. debug, release, flavors) are loaded from your Gradle project.
- **Devices:** Device list and emulator start are in the AVD section of the sidebar. Command Palette: `Android Studio Lite: Start Emulator`, `Android Studio Lite: Select Device`.

---

## Commands reference

**Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`):


| Command                                   | Purpose                     |
| ----------------------------------------- | --------------------------- |
| Update SDK Root Path                      | Set Android SDK path.       |
| Update Emulator Path / AVD Manager Path   | Override paths if needed.   |
| Start Emulator / Select Device            | Launch or choose device.    |
| Select Build Variant                      | Choose build configuration. |
| Run App                                   | Build, install, launch.     |
| Start Logcat / Stop Logcat / Clear Logcat | Control log stream.         |
| Stop App / Uninstall / Clear Data         | App lifecycle on device.    |


---

## Troubleshooting


| Issue                            | What to do                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| No devices                       | Run `adb devices`. Ensure USB debugging authorized or emulator running. Check `android-studio-lite.sdkPath` (or `ANDROID_HOME`). |
| Build variants empty             | Open an Android project root (with `gradlew`). Make sure Gradle wrapper is executable.                                           |
| Logcat shows “Run the app first” | Run the app once from the sidebar so the extension can attach Logcat to that app.                                                |
| Emulator not found               | Install SDK Platform Tools & Emulator (e.g. via Android Studio SDK Manager). Set SDK path.                                       |


---

