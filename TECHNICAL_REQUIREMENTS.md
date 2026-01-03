# Technical Requirements - Android Studio Lite Extension

Based on PRD: [Android studio lite](https://workindia-tech.atlassian.net/wiki/spaces/~7120203eae2b13ec5b4cf0900c048048f3fd20/pages/2330591248/Android+studio+lite)

## Overview

**Product**: Android Dev Companion for Cursor  
**Version**: v1.0 (Initial Release)  
**Platform**: Cursor / VS Code Extension

---

## Core Technical Requirements

### 1. ADB Integration

#### Requirements:
- Execute `adb devices` command to detect connected devices
- Parse ADB output to extract device information:
  - Device name / ID
  - Device type (Emulator / Physical)
  - Android version
  - Connection status (Online / Offline)
- Execute `adb logcat` for log streaming
- Execute ADB commands for app lifecycle management:
  - `adb shell am force-stop <package>`
  - `adb shell pm clear <package>`
  - `adb uninstall <package>`
  - `adb install <apk>`
  - `adb shell am start <intent>`

#### Implementation Notes:
- Use Node.js child_process or spawn to execute ADB commands
- Handle ADB path detection (check common locations or PATH)
- Parse ADB output reliably (handle different output formats)
- Handle device disconnection/reconnection events

---

### 2. Gradle Integration

#### Requirements:
- Detect Gradle wrapper (`./gradlew`) in project root
- Execute Gradle tasks:
  - `./gradlew install<BuildVariant>` (e.g., `installDebug`, `installRelease`)
  - `./gradlew assemble<BuildVariant>`
- Parse Gradle build output for:
  - Build progress
  - Error messages
  - APK location
- Detect build variants from `build.gradle` or `build.gradle.kts`:
  - Build types (debug, release, etc.)
  - Product flavors
  - Variant combinations

#### Implementation Notes:
- Parse Gradle files (build.gradle/build.gradle.kts) to extract variants
- Support both Groovy and Kotlin DSL
- Handle multi-module projects (detect app module)
- Stream Gradle output in real-time
- Handle Gradle daemon and build cache

---

### 3. VS Code Extension API Integration

#### Requirements:

**Tree View Provider:**
- Create custom TreeView for Android Panel sidebar
- Display device list with refresh capability
- Display build variant selector
- Display app lifecycle controls

**Output Channel:**
- Create Logcat output channel in bottom panel
- Support color-coded log levels
- Support pause/resume functionality
- Support clear logs action

**Status Bar:**
- Display active build variant indicator
- Update on variant change

**Commands:**
- Register VS Code commands:
  - `android-studio-lite.selectDevice`
  - `android-studio-lite.runApp`
  - `android-studio-lite.stopApp`
  - `android-studio-lite.clearData`
  - `android-studio-lite.uninstallApp`
  - `android-studio-lite.selectBuildVariant`
  - `android-studio-lite.refreshDevices`

**Workspace Detection:**
- Detect Android project (presence of `build.gradle` or `build.gradle.kts`)
- Detect app module and package name
- Parse `AndroidManifest.xml` for package name

#### Implementation Notes:
- Use `vscode.TreeDataProvider` for device list
- Use `vscode.window.createOutputChannel` for Logcat
- Use `vscode.window.createStatusBarItem` for variant indicator
- Use `vscode.workspace.workspaceFolders` for project detection

---

### 4. Logcat Viewer (B1)

#### Requirements:
- Stream logs using `adb logcat` with filters:
  - Package filter: `adb logcat --pid=$(adb shell pidof -s <package>)`
  - Log level filter: `*:E`, `*:W`, `*:I`, `*:D`, `*:V`
  - Tag filter: `adb logcat -s <tag>`
- Parse logcat output format:
  ```
  <timestamp> <pid> <tid> <level> <tag>: <message>
  ```
- Color-code by log level:
  - Error: Red
  - Warning: Yellow/Orange
  - Info: Blue/White
  - Debug: Gray
  - Verbose: Light Gray
- Support pause/resume log streaming
- Support clear logs (clear output channel)
- Auto-filter by selected app package

#### Implementation Notes:
- Use `child_process.spawn` for streaming logcat
- Parse logcat lines with regex
- Use ANSI color codes or VS Code decoration API
- Handle logcat process lifecycle (start/stop/restart)

---

### 5. Device Manager (A1)

#### Requirements:
- Poll `adb devices` every 2-3 seconds (or on user refresh)
- Parse device list from ADB output:
  ```
  List of devices attached
  emulator-5554    device
  R58M123456       device
  ```
- Extract device details:
  - Query `adb -s <device> shell getprop ro.product.model` for device name
  - Query `adb -s <device> shell getprop ro.build.version.release` for Android version
  - Detect emulator vs physical (check `ro.kernel.qemu` or device ID pattern)
- Persist selected device in VS Code workspace state
- Update UI when device list changes

#### Implementation Notes:
- Use `vscode.Memento` for persistence
- Implement device polling with `setInterval` or event-driven updates
- Handle ADB connection errors gracefully
- Show device status (online/offline/unauthorized)

---

### 6. App Run/Install (A2)

#### Requirements:
- Detect selected device
- Detect selected build variant
- Execute: `./gradlew install<BuildVariant>`
- Parse Gradle output for:
  - Build progress
  - APK location
  - Installation success/failure
- After successful install, launch app:
  - Extract package name from `AndroidManifest.xml` or `build.gradle`
  - Execute: `adb -s <device> shell am start -n <package>/<main_activity>`
- Show progress in VS Code progress notification
- Display errors in readable format

#### Implementation Notes:
- Use `vscode.window.withProgress` for build progress
- Parse Gradle output for APK path
- Extract main activity from manifest or use default launcher
- Handle build failures with clear error messages

---

### 7. App Lifecycle Controls (A3)

#### Requirements:
- Stop app: `adb -s <device> shell am force-stop <package>`
- Clear data: `adb -s <device> shell pm clear <package>`
- Uninstall: `adb -s <device> uninstall <package>`
- Use selected device and detected package name
- Show confirmation dialogs for destructive actions (clear/uninstall)
- Show success/error notifications

#### Implementation Notes:
- Use `vscode.window.showWarningMessage` for confirmations
- Handle permission errors gracefully
- Provide clear feedback for each action

---

### 8. Build Variant Selector (C1)

#### Requirements:
- Parse `build.gradle` or `build.gradle.kts` to detect:
  - `buildTypes` block (debug, release, etc.)
  - `productFlavors` block (dev, prod, etc.)
  - Generate all valid variant combinations
- Display variant list in TreeView or QuickPick
- Persist selected variant in workspace state
- Update status bar indicator
- Apply variant to subsequent Gradle commands

#### Implementation Notes:
- Parse Gradle files (may need AST parsing or regex)
- Handle both Groovy and Kotlin DSL
- Support multi-module projects (find app module)
- Generate variant names: `<flavor><BuildType>` (e.g., `devDebug`, `prodRelease`)

---

## Technical Architecture Requirements

### 1. Project Structure
```
src/
  ├── extension.ts              # Main entry point
  ├── services/
  │   ├── adbService.ts         # ADB command execution
  │   ├── gradleService.ts     # Gradle integration
  │   └── deviceService.ts    # Device management
  ├── providers/
  │   ├── deviceTreeProvider.ts # Device list TreeView
  │   └── logcatProvider.ts    # Logcat output provider
  ├── commands/
  │   ├── runApp.ts
  │   ├── selectDevice.ts
  │   └── ...
  └── utils/
      ├── gradleParser.ts      # Parse build.gradle
      ├── manifestParser.ts    # Parse AndroidManifest.xml
      └── adbParser.ts         # Parse ADB output
```

### 2. Dependencies

#### Required npm packages:
- `@types/vscode` - VS Code API types
- `@types/node` - Node.js types
- `typescript` - TypeScript compiler

#### Optional but recommended:
- `vscode-extension-telemetry` - For analytics (if needed)
- `which` - For finding ADB in PATH
- `fs-extra` - Enhanced file system operations

### 3. Configuration

#### VS Code Settings (contributes.configuration):
- `android-studio-lite.adbPath` - Custom ADB path
- `android-studio-lite.logcatBufferSize` - Logcat buffer size
- `android-studio-lite.devicePollInterval` - Device refresh interval
- `android-studio-lite.autoSelectDevice` - Auto-select first device

### 4. Error Handling

#### Requirements:
- Handle ADB not found errors
- Handle device disconnection during operations
- Handle Gradle build failures
- Handle invalid build variants
- Provide clear, actionable error messages
- Log errors for debugging

### 5. Performance Requirements

#### Targets:
- Device detection: < 2 seconds
- Device list refresh: < 2 seconds
- Logcat startup: < 500ms
- Logcat latency: < 500ms
- App lifecycle actions: 1-2 seconds
- Build variant switch: < 1 second (no restart required)

### 6. Testing Requirements

#### Unit Tests:
- ADB output parsing
- Gradle file parsing
- Device list parsing
- Logcat parsing

#### Integration Tests:
- ADB command execution (with mock)
- Gradle command execution (with mock)
- VS Code API integration

---

## Implementation Phases

### Phase 1: Foundation
1. Set up extension structure
2. Implement ADB service (basic commands)
3. Implement device detection
4. Create device TreeView

### Phase 2: Core Features
1. Implement Gradle service
2. Implement build variant detection
3. Implement app run/install
4. Add status bar indicator

### Phase 3: Logcat
1. Implement logcat streaming
2. Add log filtering
3. Add color coding
4. Add pause/resume

### Phase 4: Lifecycle Controls
1. Implement stop/clear/uninstall
2. Add confirmation dialogs
3. Add error handling

### Phase 5: Polish
1. Add configuration options
2. Improve error messages
3. Add progress indicators
4. Performance optimization

---

## Non-Technical Requirements (Out of Scope)

- Debugger integration
- Compose preview
- Code refactoring tools
- Write access to Gradle/Manifest files
- Lint/static analysis

---

## Success Criteria

- ✅ Device detection accuracy: 100%
- ✅ App run success rate: >95%
- ✅ Logcat usability: Positive feedback
- ✅ Android Studio avoidance: ≥50% dev sessions

