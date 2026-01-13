# Configuration Service Usage Guide

This guide explains how to use the Configuration Service in Android Studio Lite.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Usage](#basic-usage)
3. [Type-Safe Configuration Access](#type-safe-configuration-access)
4. [Environment Variable Handling](#environment-variable-handling)
5. [Computed Paths](#computed-paths)
6. [Configuration Updates](#configuration-updates)
7. [Migration Guide](#migration-guide)

---

## Quick Start

### 1. Access ConfigService

```typescript
import { Manager } from '../core';

// Via Manager (recommended for backward compatibility)
const manager = Manager.getInstance();
const config = manager.config;

// Or create directly
import { ConfigService } from './config';
const config = new ConfigService();
```

### 2. Get Configuration Values

```typescript
// Get SDK path (with environment variable fallback)
const sdkPath = config.getSdkPath();

// Get full configuration object
const fullConfig = config.getConfig();

// Get specific value
const adbPath = config.getAdbPath();
```

### 3. Set Configuration Values

```typescript
import { ConfigKeys, ConfigScope } from './config';

await config.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);
```

---

## Basic Usage

### Getting Configuration Values

```typescript
const config = new ConfigService();

// Type-safe getters
const sdkPath = config.getSdkPath();              // string
const avdHome = config.getAvdHome();              // string
const cmdVersion = config.getCmdVersion();        // string
const autoSelect = config.getAutoSelectDevice();  // boolean
const pollInterval = config.getDevicePollInterval(); // number

// Generic getter (use ConfigKeys for type safety)
const customValue = config.get<string>(ConfigKeys.SDK_PATH, 'default');
```

### Setting Configuration Values

```typescript
import { ConfigKeys, ConfigScope } from './config';

// Set SDK path globally
await config.set(ConfigKeys.SDK_PATH, '/Users/me/android-sdk', ConfigScope.Global);

// Set workspace-specific value
await config.set(ConfigKeys.AVD_HOME, '/custom/avd/path', ConfigScope.Workspace);

// Set folder-specific value
await config.set(ConfigKeys.CMD_VERSION, '12.0', ConfigScope.Folder);
```

### Configuration Scopes

```typescript
enum ConfigScope {
    Global = 1,              // User settings (global)
    Workspace = 2,          // Workspace settings
    Folder = 3,             // Folder settings
    GlobalAndWorkspace = 4, // Both global and workspace
    GlobalAndFolder = 5,    // Both global and folder
}
```

---

## Type-Safe Configuration Access

### Using ConfigKeys

```typescript
import { ConfigKeys } from './config';

// ✅ Good: Type-safe, prevents typos
const sdkPath = config.get<string>(ConfigKeys.SDK_PATH);

// ❌ Bad: String literal, no type safety
const sdkPath = config.get<string>('android-studio-lite.sdkPath');
```

### Available ConfigKeys

```typescript
ConfigKeys.SDK_PATH              // 'android-studio-lite.sdkPath'
ConfigKeys.AVD_HOME              // 'android-studio-lite.avdHome'
ConfigKeys.ADB_PATH              // 'android-studio-lite.adbPath'
ConfigKeys.EMULATOR_PATH         // 'android-studio-lite.emulatorPath'
ConfigKeys.EXECUTABLE             // 'android-studio-lite.executable'
ConfigKeys.SDK_MANAGER            // 'android-studio-lite.sdkManager'
ConfigKeys.EMULATOR_OPT           // 'android-studio-lite.emulatorOpt'
ConfigKeys.CMD_VERSION            // 'android-studio-lite.cmdVersion'
ConfigKeys.AUTO_SELECT_DEVICE     // 'android-studio-lite.autoSelectDevice'
ConfigKeys.DEVICE_POLL_INTERVAL   // 'android-studio-lite.devicePollInterval'
ConfigKeys.LOGCAT_BUFFER_SIZE     // 'android-studio-lite.logcatBufferSize'
```

---

## Environment Variable Handling

The ConfigService automatically handles environment variable fallbacks:

### SDK Path Resolution

```typescript
// Priority order:
// 1. Configuration value (android-studio-lite.sdkPath)
// 2. ANDROID_HOME environment variable
// 3. ANDROID_SDK_ROOT environment variable
// 4. Empty string

const sdkPath = config.getSdkPath();
```

### AVD Home Resolution

```typescript
// Priority order:
// 1. Configuration value (android-studio-lite.avdHome)
// 2. ANDROID_AVD_HOME environment variable
// 3. Empty string

const avdHome = config.getAvdHome();
```

### ADB Path Auto-Detection

```typescript
// Priority order:
// 1. Custom path (android-studio-lite.adbPath)
// 2. Auto-detected from SDK path: {sdkPath}/platform-tools/adb[.exe]

const adbPath = config.getAdbPath();
```

---

## Computed Paths

The ConfigService computes paths based on SDK path:

```typescript
const config = new ConfigService();
const sdkPath = config.getSdkPath();

// Computed paths (empty if SDK path not set)
const cmdPath = config.getCmdPath();              // {sdkPath}/cmdline-tools/{version}/bin
const buildToolPath = config.getBuildToolPath();  // {sdkPath}/build-tools
const platformToolsPath = config.getPlatformToolsPath(); // {sdkPath}/platform-tools
const emuPath = config.getEmuPath();              // {sdkPath}/emulator
```

### Example

```typescript
const config = new ConfigService();
config.set(ConfigKeys.SDK_PATH, '/Users/me/android-sdk', ConfigScope.Global);

// These will be computed automatically:
// cmdPath: '/Users/me/android-sdk/cmdline-tools/latest/bin'
// buildToolPath: '/Users/me/android-sdk/build-tools'
// platformToolsPath: '/Users/me/android-sdk/platform-tools'
// emuPath: '/Users/me/android-sdk/emulator'
```

---

## Configuration Updates

### Listening to Configuration Changes

```typescript
const config = new ConfigService();

const disposable = config.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(ConfigKeys.SDK_PATH)) {
        console.log('SDK path changed!');
        const newSdkPath = config.getSdkPath();
        // Update dependent services
    }
});

// Don't forget to dispose
disposable.dispose();
```

### Validation

```typescript
import { ConfigError } from '../errors';

try {
    // Validate required configuration
    config.validateRequired();
} catch (error) {
    if (error instanceof ConfigError) {
        // Handle configuration error
        console.error(error.getUserMessage());
    }
}

// Check if SDK path exists
const isValid = await config.validateSdkPath();
if (!isValid) {
    throw new ConfigError('SDK path does not exist', ConfigKeys.SDK_PATH);
}
```

---

## Migration Guide

### From Manager.getConfig()

**Before:**
```typescript
const manager = Manager.getInstance();
const config = manager.getConfig();
const sdkPath = config.sdkPath;
```

**After:**
```typescript
const manager = Manager.getInstance();
const config = manager.config;
const sdkPath = config.getSdkPath(); // Better: handles env vars
// OR
const fullConfig = config.getConfig(); // Same as before
const sdkPath = fullConfig.sdkPath;
```

### From Manager.setConfig()

**Before:**
```typescript
await manager.setConfig(ConfigItem.sdkPath, '/path/to/sdk', ConfigScope.global);
```

**After:**
```typescript
import { ConfigKeys, ConfigScope } from './config';

await manager.config.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);
// OR (backward compatible)
await manager.setConfig(ConfigItem.sdkPath, '/path/to/sdk', ConfigScope.global);
```

### Direct ConfigService Usage

**New Pattern (Recommended):**
```typescript
import { ConfigService, ConfigKeys, ConfigScope } from './config';

const config = new ConfigService();

// Get values
const sdkPath = config.getSdkPath();
const adbPath = config.getAdbPath();

// Set values
await config.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);
```

---

## Examples

### Example 1: Service Initialization

```typescript
import { ConfigService, ConfigKeys, ConfigError } from './config';

export class AndroidService {
    private config: ConfigService;

    constructor() {
        this.config = new ConfigService();
        this.validateConfiguration();
    }

    private validateConfiguration(): void {
        try {
            this.config.validateRequired();
        } catch (error) {
            if (error instanceof ConfigError) {
                throw new Error(`Configuration error: ${error.message}`);
            }
        }
    }

    public getSdkPath(): string {
        return this.config.getSdkPath();
    }
}
```

### Example 2: Configuration Update Handler

```typescript
import { ConfigService, ConfigKeys } from './config';
import { ErrorHandler } from '../errors';

export async function updateSdkPath(newPath: string): Promise<void> {
    const config = new ConfigService();

    try {
        // Validate path exists
        const fs = await import('fs');
        if (!fs.existsSync(newPath)) {
            throw new ConfigError('SDK path does not exist', ConfigKeys.SDK_PATH);
        }

        // Update configuration
        await config.set(ConfigKeys.SDK_PATH, newPath, ConfigScope.Global);

        // Verify update
        const updatedPath = config.getSdkPath();
        if (updatedPath !== newPath) {
            throw new ConfigError('Failed to update SDK path', ConfigKeys.SDK_PATH);
        }
    } catch (error) {
        await ErrorHandler.handle(error, 'ConfigService');
        throw error;
    }
}
```

### Example 3: Listening to Configuration Changes

```typescript
import { ConfigService, ConfigKeys } from './config';
import { Disposable } from 'vscode';

export class ConfigWatcher {
    private config: ConfigService;
    private disposables: Disposable[] = [];

    constructor() {
        this.config = new ConfigService();
        this.setupWatchers();
    }

    private setupWatchers(): void {
        const disposable = this.config.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ConfigKeys.SDK_PATH)) {
                this.onSdkPathChanged();
            }
            if (e.affectsConfiguration(ConfigKeys.AVD_HOME)) {
                this.onAvdHomeChanged();
            }
        });
        this.disposables.push(disposable);
    }

    private onSdkPathChanged(): void {
        const newPath = this.config.getSdkPath();
        console.log(`SDK path changed to: ${newPath}`);
        // Update dependent services
    }

    private onAvdHomeChanged(): void {
        const newPath = this.config.getAvdHome();
        console.log(`AVD Home changed to: ${newPath}`);
        // Update AVD service
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
```

---

## Best Practices

1. **Use ConfigKeys constants** - Prevents typos and provides type safety
2. **Use specific getters** - `getSdkPath()` handles env vars automatically
3. **Validate before use** - Use `validateRequired()` or `validateSdkPath()`
4. **Handle errors** - Wrap config operations in try-catch
5. **Listen to changes** - Use `onDidChangeConfiguration()` for reactive updates
6. **Use appropriate scopes** - Global for user settings, Workspace for project settings

---

## API Reference

### ConfigService Methods

| Method                               | Return Type        | Description                            |
| ------------------------------------ | ------------------ | -------------------------------------- |
| `get<T>(key, defaultValue?)`         | `T`                | Get configuration value                |
| `set(key, value, scope)`             | `Promise<void>`    | Set configuration value                |
| `getSdkPath()`                       | `string`           | Get SDK path with env fallback         |
| `getAvdHome()`                       | `string`           | Get AVD home with env fallback         |
| `getAdbPath()`                       | `string`           | Get ADB path with auto-detection       |
| `getEmulatorPath()`                  | `string`           | Get emulator path with auto-detection  |
| `getCmdPath()`                       | `string`           | Get command-line tools path (computed) |
| `getBuildToolPath()`                 | `string`           | Get build tools path (computed)        |
| `getPlatformToolsPath()`             | `string`           | Get platform tools path (computed)     |
| `getEmuPath()`                       | `string`           | Get emulator path (computed)           |
| `getConfig()`                        | `IConfig`          | Get full configuration object          |
| `validateRequired()`                 | `void`             | Validate required configuration        |
| `validateSdkPath()`                  | `Promise<boolean>` | Validate SDK path exists               |
| `onDidChangeConfiguration(callback)` | `Disposable`       | Listen to config changes               |

---

For more information, see the inline documentation in `ConfigService.ts`.
