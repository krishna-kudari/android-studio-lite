# Change Log

All notable changes to the "Android Studio Lite" extension will be documented in this file.

## [0.0.5] - 2025-03-05

### Fixed
- "Command not found" when clicking Refresh in Build Variant or AVD view without an Android project: all contributed commands now have stub handlers that show a helpful message instead of error
- Android project detection improved: folder is now recognized if it contains `gradlew`, `settings.gradle`, or `settings.gradle.kts` (not only gradlew)

### Changed
- Welcome view copy updated to mention `settings.gradle` as well as `gradlew`

## [0.0.4] - 2025-03-05

### Added
- Kotlin import folding: `editor.foldingImportsByDefault` now works for `.kt` files via a custom `FoldingRangeProvider` (fwcd kotlin-language-server does not return `FoldingRangeKind.Imports`)
- Activation on Kotlin files (`onLanguage:kotlin`) so the folding provider is available when opening `.kt` files

### Fixed
- Module config (Gradle `loadModuleConfig`) no longer fetched twice when opening the activity bar: concurrent calls now share a single in-flight request in `BuildVariantService`
- Module config no longer reloads when switching between activity bar items (e.g. File Explorer, Git, back to Android Studio Lite): AVD selector webview now uses `retainContextWhenHidden: true` so the webview is not re-created when the view is hidden

### Changed
- Build variant module list load is coalesced so multiple consumers (AVD dropdown bootstrap, refresh-modules, Build Variant tree) trigger only one Gradle run

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
