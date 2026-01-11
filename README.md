# Android Studio Lite

Android Dev Companion for VS Code & Cursor - Streamline your Android development workflow without leaving your editor.

## Features

### 📱 Device Management
- Real-time device detection for connected Android devices and emulators
- Quick device switching with visual indicators
- Device status monitoring (online/offline)
- Full support for Android Virtual Devices (AVDs)

### 🏗️ Build Variants
- Automatic detection using Gradle init scripts
- Multi-module project support
- Easy switching between debug/release and flavor combinations
- Fast variant loading with intelligent caching

### 🚀 App Lifecycle Controls
- **Run App** - Build and install your app with one click
- **Stop App** - Force stop running applications
- **Uninstall** - Remove apps from devices quickly
- **Clear Data** - Clear app data without uninstalling

### 📊 Logcat Integration
- Live log streaming from your device
- Filter by log level (Verbose, Debug, Info, Warn, Error)
- Pause/Resume control
- Clear log buffer when needed

## Setup

### Prerequisites
- VS Code or Cursor (v1.74.0 or higher)
- Android SDK with Platform Tools installed
- ADB (Android Debug Bridge) accessible in PATH or configured
- Gradle wrapper in your Android project

### Installation
1. Open VS Code/Cursor
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Android Studio Lite"
4. Click **Install**

### Configuration

#### For Users with Android Studio Installed

If you already have Android Studio installed, minimal setup is required!

1. **Set Android SDK Path** (Required)

   The extension will automatically detect your SDK if you have `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variables set. If not, configure it:

   **Option A: Set Environment Variable** (Recommended)

   **macOS/Linux:**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export ANDROID_HOME=$HOME/Library/Android/sdk
   # or
   export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
   ```

   **Windows:**
   - Open System Properties → Environment Variables
   - Add new variable: `ANDROID_HOME` = `C:\Users\<username>\AppData\Local\Android\Sdk`

   **Option B: Configure in VS Code Settings**
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search for `android-studio-lite.sdkPath`
   - Enter your SDK root path

2. **Restart VS Code/Cursor**

   After setting the environment variable, restart your editor to apply changes.

The extension will automatically detect:
- ✅ SDK Root Path
- ✅ Platform Tools (ADB)
- ✅ Build Tools
- ✅ Emulator (if installed)
- ✅ AVD Manager (if installed)
- ✅ AVD Home (defaults to `~/.android/avd`)

## Usage

### Device Management
- Open the **Android Studio Lite** sidebar (click the Android icon in the activity bar)
- Devices appear in the sidebar with online/offline status
- Click on the device selector to switch devices
- Use Command Palette: `Android Studio Lite: Start Emulator` to launch an emulator

### Build Variants
- Click on the build variant selector in the sidebar
- Or use Command Palette: `Android Studio Lite: Select Build Variant`
- Choose from detected variants (e.g., `debug`, `release`, `productionDebug`)

### Running Your App
1. Select a device (must be online)
2. Select a build variant
3. Click "Run App" in the sidebar or use Command Palette
4. The extension will build the APK, install it, and launch the app

### Logcat
- Click "Start Logcat" in the sidebar or use Command Palette: `Android Studio Lite: Start Logcat`
- Logs appear in the Output panel
- Use pause/resume/clear controls as needed
- Filter by log level using `Android Studio Lite: Set Log Level`

## Commands

All commands are accessible via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### Setup Commands
- `Android Studio Lite: Update SDK Root Path` - Configure Android SDK Root Path
- `Android Studio Lite: Update AVD Manager Path` - Configure AVD Manager executable path
- `Android Studio Lite: Update Emulator Path` - Configure Emulator executable path

### Device & Emulator Commands
- `Android Studio Lite: Select Device` - Choose target device
- `Android Studio Lite: Start Emulator` - Launch an emulator
- `Android Studio Lite: Select Emulator` - Select an emulator to use

### Build & App Commands
- `Android Studio Lite: Select Build Variant` - Choose build configuration
- `Android Studio Lite: Run App` - Build and launch app
- `Android Studio Lite: Stop App` - Force stop running app
- `Android Studio Lite: Uninstall` - Remove app from device
- `Android Studio Lite: Clear Data` - Clear app data

### Logcat Commands
- `Android Studio Lite: Start Logcat` - Begin log streaming
- `Android Studio Lite: Stop Logcat` - Stop log streaming
- `Android Studio Lite: Pause Logcat` - Pause log streaming
- `Android Studio Lite: Resume Logcat` - Resume log streaming
- `Android Studio Lite: Clear Logcat` - Clear log buffer
- `Android Studio Lite: Set Log Level` - Filter logs by level

## Configuration

Access via `File > Preferences > Settings` (or `Cmd+,` / `Ctrl+,`):

### Required Settings
- `android-studio-lite.sdkPath` - Android SDK Root Path (or set `ANDROID_HOME`/`ANDROID_SDK_ROOT` environment variable)

### Optional Settings
- `android-studio-lite.avdHome` - Android AVD Home Path
- `android-studio-lite.adbPath` - Custom ADB executable path
- `android-studio-lite.emulatorPath` - Custom emulator executable path
- `android-studio-lite.executable` - AVD Manager executable path
- `android-studio-lite.autoSelectDevice` - Auto-select first online device
- `android-studio-lite.devicePollInterval` - Device refresh interval (ms, default: 3000)
- `android-studio-lite.logcatBufferSize` - Max log lines in buffer (default: 10000)

## Troubleshooting

### No Devices Detected
1. Ensure ADB is installed and accessible
2. Check ADB path in settings
3. Run `adb devices` in terminal to verify devices are connected
4. Ensure devices are authorized (unlock device and accept USB debugging)

### Build Variants Not Detected
1. Ensure you're in an Android project root
2. Check that `gradlew` exists in project root
3. Verify Gradle wrapper is executable
4. Check Output panel for Gradle errors

### Emulator Not Found
1. Install Android SDK Emulator via Android Studio SDK Manager
2. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable
3. Configure custom emulator path in settings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
