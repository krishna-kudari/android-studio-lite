# Change Log

All notable changes to the "Android Studio Lite" extension will be documented in this file.

## [0.0.3] - 2025-01-12

### Added
- Logcat toggle button in AVD selector webview for quick access to logcat output
- Toggle functionality to switch between Logcat and Android Studio Lite output channels
- Auto-device selection when starting logcat if no device is selected
- Improved logcat formatting matching Android Studio's output format
- Toggle button component with macOS-style design

### Fixed
- Fixed logcat commands not being registered in extension activation
- Fixed device selection requirement for logcat (now auto-selects first available device)
- Removed ANSI escape sequences from logcat output for cleaner display
- Improved logcat column alignment and formatting

### Changed
- Updated logcat output formatting to match Android Studio's exact format
- Improved logcat column spacing and alignment
- Enhanced logcat integration with better error handling

## [0.0.2] - 2025-01-11

### Fixed
- Fixed build variants not loading in published extension by including Gradle init script in package
- Fixed modules not appearing in webview dropdown due to missing Gradle script
- Improved error handling for Gradle script path resolution

### Changed
- Updated extension icon to use new transparent Android Studio logo
- Improved build process to include necessary script files

## [0.0.1] - 2025-01-11

### Added
- Initial release of Android Studio Lite
- Device management with real-time detection
- Build variant detection using Gradle init scripts
- App lifecycle controls (run, stop, uninstall, clear data)
- Live logcat integration with filtering
- AVD management and emulator support
- Webview-based AVD selector with module selection
- Multi-module project support
