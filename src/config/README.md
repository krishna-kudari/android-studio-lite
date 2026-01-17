# Configuration Service Module

This module provides a centralized, type-safe configuration service for the Android Studio Lite extension.

## 📁 Structure

```
src/config/
├── ConfigKeys.ts           # Type-safe configuration keys
├── ConfigService.ts        # Main configuration service
├── index.ts                # Module exports
├── USAGE_GUIDE.md         # Detailed usage guide
└── README.md              # This file
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { ConfigService, ConfigKeys, ConfigScope } from './config';

// Create service instance
const config = new ConfigService();

// Get SDK path (with environment variable fallback)
const sdkPath = config.getSdkPath();

// Set configuration
await config.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);

// Get full configuration
const fullConfig = config.getConfig();
```

### Via Dependency Injection

```typescript
import { resolve, TYPES } from '../di';
import { ConfigService } from './config';

// Resolve from DI container
const config = resolve<ConfigService>(TYPES.ConfigService);

// Use same API
const sdkPath = config.getSdkPath();
await config.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);
```

## ✨ Features

- ✅ **Type-Safe Access** - Use `ConfigKeys` constants to prevent typos
- ✅ **Environment Variable Fallback** - Automatic handling of `ANDROID_SDK_ROOT`, `ANDROID_HOME`, etc.
- ✅ **Computed Paths** - Automatic path resolution based on SDK path
- ✅ **Validation** - Built-in validation for required configuration
- ✅ **Change Listeners** - React to configuration changes
- ✅ **Dependency Injection** - Integrated with DI container

## 📚 Documentation

- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Comprehensive usage guide with examples
- See inline code documentation for API details

## 🔗 Integration

The ConfigService is registered in the DI container:

```typescript
import { resolve, TYPES } from '../di';
import { ConfigService } from './config';

// Resolve from DI container
const config = resolve<ConfigService>(TYPES.ConfigService);
const sdkPath = config.getSdkPath();
```

## 💡 Key Benefits

1. **Centralized Logic** - All configuration logic in one place
2. **Type Safety** - TypeScript ensures correct key usage
3. **Environment Handling** - Automatic fallback to environment variables
4. **Easy Testing** - Can be mocked easily for unit tests
5. **Validation** - Built-in validation methods
6. **Dependency Injection** - Fully integrated with DI container

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed usage examples.
