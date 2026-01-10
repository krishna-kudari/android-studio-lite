# 🤖 Android Studio Lite

<div align="center">

**Android Dev Companion for VS Code & Cursor**

*Streamline your Android development workflow without leaving your editor*

[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.74.0+-blue.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## ✨ Features

### 📱 Device Management
- **Real-time device detection** - Automatically detects connected Android devices and emulators
- **Device selection** - Quick device switching with visual indicators
- **Device status** - See online/offline status at a glance
- **Emulator support** - Full support for Android Virtual Devices (AVDs)

### 🏗️ Build Variants
- **Automatic detection** - Uses Gradle init scripts to detect all build variants
- **Multi-module support** - Works with complex multi-module projects
- **Variant selection** - Easy switching between debug/release and flavor combinations
- **Cached results** - Fast variant loading with intelligent caching

### 🚀 App Lifecycle
- **Run App** - Build and install your app with one click
- **Stop App** - Force stop running applications
- **Uninstall** - Remove apps from devices quickly
- **Clear Data** - Clear app data without uninstalling

### 📊 Logcat Integration
- **Live logs** - Real-time log streaming from your device
- **Log filtering** - Filter by log level (Verbose, Debug, Info, Warn, Error)
- **Pause/Resume** - Control log streaming on the fly
- **Clear logs** - Clear logcat buffer when needed

### ⚙️ Smart Configuration
- **Auto-detect tools** - Automatically finds ADB and emulator executables
- **Custom paths** - Override paths via settings if needed
- **Workspace-aware** - Settings per workspace/project

---

## 🎯 Quick Start

### Prerequisites

- **VS Code** or **Cursor** (v1.74.0 or higher)
- **Android SDK** with Platform Tools installed
- **ADB** (Android Debug Bridge) accessible in PATH or configured
- **Gradle** wrapper in your Android project

### Installation

1. Open VS Code/Cursor
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Android Studio Lite"
4. Click **Install**

## ⚙️ Setup

### For Users with Android Studio Installed

If you already have Android Studio installed, minimal setup is required! 🎉

#### Minimal Setup Steps

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
   - Enter your SDK root path:
     - **macOS**: `~/Library/Android/sdk`
     - **Windows**: `C:\Users\<username>\AppData\Local\Android\Sdk`
     - **Linux**: `~/Android/Sdk`

2. **Restart VS Code/Cursor**

   After setting the environment variable, restart your editor to apply changes.

3. **Done!** ✨

   The extension will automatically detect:
   - ✅ SDK Root Path
   - ✅ Platform Tools (ADB)
   - ✅ Build Tools
   - ✅ Emulator (if installed)
   - ✅ AVD Manager (if installed)
   - ✅ AVD Home (defaults to `~/.android/avd`)

#### What Gets Auto-Detected?

Once the SDK path is configured, the extension automatically finds:
- **ADB**: `{sdkPath}/platform-tools/adb`
- **Emulator**: `{sdkPath}/emulator/emulator`
- **AVD Manager**: `{sdkPath}/cmdline-tools/latest/bin/avdmanager`
- **AVD Home**: Uses system default (`~/.android/avd` on macOS/Linux, `%USERPROFILE%\.android\avd` on Windows)

#### If Something Isn't Detected

If the extension prompts you during startup:
- **SDK Root Path**: Click "Update SDK Root Path" and select your SDK directory
- **AVD Manager**: Usually auto-detected, but you can manually set `android-studio-lite.executable`
- **Emulator**: Usually auto-detected, but you can manually set `android-studio-lite.emulatorPath`

### For Users Without Android Studio

If you don't have Android Studio installed, you'll need to set up the Android SDK manually:

#### Requirements
- JDK 8 or higher (Oracle JDK or OpenJDK)

#### Setup Steps

1. **Download Android SDK Command Line Tools**
   - Visit: https://developer.android.com/studio#command-line-tools-only
   - Download the command-line tools for your platform

2. **Extract and Set Up SDK**
   ```bash
   # Create SDK directory
   mkdir -p ~/android-sdk/cmdline-tools

   # Extract downloaded tools
   # Rename extracted folder to "latest"
   # Move to ~/android-sdk/cmdline-tools/latest
   ```

3. **Install SDK Components**
   ```bash
   export ANDROID_HOME=$HOME/android-sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

   # Accept licenses
   yes | sdkmanager --licenses

   # Install essential components
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" "emulator"
   ```

4. **Configure Extension**
   - Set `ANDROID_HOME` environment variable, or
   - Configure `android-studio-lite.sdkPath` in VS Code settings

### First Time Setup (After Installation)

1. **Open an Android Project**:
   - Open a folder containing an Android project
   - The extension will automatically detect build variants

2. **Verify Setup**:
   - Check the Output panel for "Android Studio Lite" to see configuration status
   - All paths should show "check OK 👍" if properly configured

---

## 📖 Usage Guide

### Device Management

#### Viewing Devices
- Open the **Android Studio Lite** sidebar (click the Android icon in the activity bar)
- Devices appear in the **Device** section
- Green indicator = Online, Gray = Offline

#### Selecting a Device
- Click on the device selector in the sidebar
- Or use Command Palette: `Android Studio Lite: Select Device`
- Select from the list of available devices

#### Starting an Emulator
- Use Command Palette: `Android Studio Lite: Start Emulator`
- Select an AVD from the list
- Wait for the emulator to boot (progress shown in notification)

### Build Variants

#### Selecting a Variant
- Click on the build variant selector in the sidebar
- Or use Command Palette: `Android Studio Lite: Select Build Variant`
- Choose from detected variants (e.g., `debug`, `release`, `productionDebug`)

#### Variant Detection
- Variants are automatically detected using Gradle init scripts
- Detection happens once during extension activation
- Results are cached for 5 minutes
- Use `Select Build Variant` command to force refresh

### Running Your App

1. **Select a device** (must be online)
2. **Select a build variant**
3. **Click "Run App"** in the sidebar or use Command Palette
4. The extension will:
   - Build the APK using Gradle
   - Install it on the selected device
   - Launch the app
   - Show progress in notifications

### Logcat

#### Starting Logcat
- Click "Open Logcat" in the sidebar
- Or use Command Palette: `Android Studio Lite: Start Logcat`
- Logs appear in the Output panel

#### Controlling Logcat
- **Pause**: Temporarily stop receiving logs
- **Resume**: Continue receiving logs
- **Clear**: Clear the log buffer
- **Set Log Level**: Filter by severity (V/D/I/W/E)

---

## ⌨️ Commands

All commands are accessible via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### Setup Commands

| Command                                        | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `Android Studio Lite: Update SDK Root Path`    | Configure Android SDK Root Path       |
| `Android Studio Lite: Update AVD Manager Path` | Configure AVD Manager executable path |
| `Android Studio Lite: Update Emulator Path`    | Configure Emulator executable path    |

### Device & Emulator Commands

| Command                                | Description                  |
| -------------------------------------- | ---------------------------- |
| `Android Studio Lite: Select Device`   | Choose target device         |
| `Android Studio Lite: Refresh Devices` | Manually refresh device list |
| `Android Studio Lite: Start Emulator`  | Launch an emulator           |
| `Android Studio Lite: Select Emulator` | Select an emulator to use    |

### Build & App Commands

| Command                                     | Description                |
| ------------------------------------------- | -------------------------- |
| `Android Studio Lite: Select Build Variant` | Choose build configuration |
| `Android Studio Lite: Run App`              | Build and launch app       |
| `Android Studio Lite: Stop App`             | Force stop running app     |
| `Android Studio Lite: Uninstall`            | Remove app from device     |
| `Android Studio Lite: Clear Data`           | Clear app data             |

### Logcat Commands

| Command                              | Description          |
| ------------------------------------ | -------------------- |
| `Android Studio Lite: Start Logcat`  | Begin log streaming  |
| `Android Studio Lite: Stop Logcat`   | Stop log streaming   |
| `Android Studio Lite: Pause Logcat`  | Pause log streaming  |
| `Android Studio Lite: Resume Logcat` | Resume log streaming |
| `Android Studio Lite: Clear Logcat`  | Clear log buffer     |
| `Android Studio Lite: Set Log Level` | Filter logs by level |

---

## ⚙️ Configuration

### Settings

Access via `File > Preferences > Settings` (or `Cmd+,` / `Ctrl+,`):

#### Required Settings

| Setting                       | Type   | Default | Description                                                                                     |
| ----------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------- |
| `android-studio-lite.sdkPath` | string | `""`    | Android SDK Root Path. If blank, uses `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable |

#### Optional Settings

| Setting                                  | Type    | Default        | Description                                                                                                                      |
| ---------------------------------------- | ------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `android-studio-lite.avdHome`            | string  | `""`           | Android AVD Home Path. If blank, uses `ANDROID_AVD_HOME` or system default (`~/.android/avd`)                                    |
| `android-studio-lite.adbPath`            | string  | `""`           | Custom ADB executable path. Auto-detected from SDK if not set                                                                    |
| `android-studio-lite.emulatorPath`       | string  | `""`           | Custom emulator executable path. Auto-detected from SDK if not set                                                               |
| `android-studio-lite.executable`         | string  | `"avdmanager"` | AVD Manager executable path. Auto-detected from SDK if not set                                                                   |
| `android-studio-lite.sdkManager`         | string  | `"sdkmanager"` | SDK Manager executable path. Auto-detected from SDK if not set                                                                   |
| `android-studio-lite.cmdVersion`         | string  | `"latest"`     | Android SDK Command-Line Tools version                                                                                           |
| `android-studio-lite.emulatorOpt`        | string  | `""`           | Additional emulator options (see [emulator command-line options](https://developer.android.com/studio/run/emulator-commandline)) |
| `android-studio-lite.autoSelectDevice`   | boolean | `false`        | Auto-select first online device                                                                                                  |
| `android-studio-lite.devicePollInterval` | number  | `3000`         | Device refresh interval (ms)                                                                                                     |
| `android-studio-lite.logcatBufferSize`   | number  | `10000`        | Max log lines in buffer                                                                                                          |

### Environment Variables

The extension automatically checks these environment variables (in order of priority):

1. `ANDROID_HOME` - Android SDK location (takes precedence)
2. `ANDROID_SDK_ROOT` - Alternative SDK location
3. `ANDROID_AVD_HOME` - AVD Home location (optional, defaults to `~/.android/avd`)

**Note:** After updating the SDK Path, the extension will auto-detect all executable paths from the SDK.

---

## 🏗️ Architecture

### How It Works

**Device Detection:**
- Uses ADB (`adb devices`) to detect connected devices
- Polls every 3 seconds (configurable)
- Enriches device info with model, Android version, and AVD name

**Build Variant Detection:**
- Injects a temporary Gradle init script
- Executes `gradlew printAndroidVariants` with the init script
- Parses JSON output to extract variant information
- Caches results for performance

**Zero Project Pollution:**
- Init scripts are temporary (deleted after use)
- No modifications to your project files
- Safe to use in any Android project

---

## 🐛 Troubleshooting

### No Devices Detected

**Problem:** Extension shows "No devices detected"

**Solutions:**
1. Ensure ADB is installed and accessible
2. Check ADB path in settings
3. Run `adb devices` in terminal to verify devices are connected
4. Try "Refresh Devices" command
5. Check that devices are authorized (unlock device and accept USB debugging)

### Build Variants Not Detected

**Problem:** Only default variants shown

**Solutions:**
1. Ensure you're in an Android project root
2. Check that `gradlew` exists in project root
3. Verify Gradle wrapper is executable
4. Try "Select Build Variant" command to force refresh
5. Check Output panel for Gradle errors

### Emulator Not Found

**Problem:** "Emulator not found" error

**Solutions:**
1. Install Android SDK Emulator via Android Studio SDK Manager
2. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable
3. Configure custom emulator path in settings
4. Verify emulator exists: `emulator -list-avds`

### ADB Not Found

**Problem:** "ADB not found" warning

**Solutions:**
1. Install Android SDK Platform Tools
2. Add platform-tools to PATH, or
3. Set custom ADB path in settings: `android-studio-lite.adbPath`

---

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd android-studio-lite

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch
```

### Running in Development

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. A new window opens with the extension loaded
4. Open an Android project in the new window

### Project Structure

```
src/
├── extension.ts              # Main entry point
├── commands/                 # Command handlers
│   ├── selectDevice.ts
│   ├── runApp.ts
│   ├── logcatCommands.ts
│   └── ...
├── services/                 # Core services
│   ├── adbService.ts         # ADB command execution
│   ├── deviceService.ts      # Device management
│   ├── gradleService.ts      # Gradle operations
│   ├── buildVariantService.ts # Variant management
│   └── emulatorService.ts    # Emulator operations
├── providers/                # VS Code providers
│   ├── androidTreeProvider.ts # Sidebar tree view
│   └── logcatProvider.ts     # Logcat output
└── utils/                    # Utilities
    ├── adbParser.ts          # ADB output parsing
    ├── gradleParser.ts       # Gradle parsing
    └── manifestParser.ts     # Manifest parsing
```

---

## 📝 Release Notes

### Version 0.0.1

**Initial Release**

- ✅ Device detection and management
- ✅ Build variant detection using Gradle init scripts
- ✅ App lifecycle controls (run, stop, uninstall)
- ✅ Live logcat integration
- ✅ Emulator support
- ✅ Multi-module project support
- ✅ Workspace-aware configuration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for the VS Code and Cursor community
- Inspired by Android Studio's device management features
- Uses Gradle init scripts for zero-intrusion variant detection

---

<div align="center">

**Made with ❤️ for Android developers**

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues) · [Documentation](https://github.com/your-repo/wiki)

</div>
