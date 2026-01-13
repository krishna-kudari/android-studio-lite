# Dependency Injection Module

This module provides Dependency Injection (DI) capabilities using tsyringe for the Android Studio Lite extension.

## 📁 Structure

```
src/di/
├── types.ts          # DI type symbols
├── container.ts      # Container setup and configuration
├── index.ts          # Module exports
├── USAGE_GUIDE.md   # Detailed usage guide
└── README.md        # This file
```

## 🚀 Quick Start

### 1. Initialize Container

```typescript
import 'reflect-metadata'; // Required at the top
import { setupContainer, resolve, TYPES } from './di';

export async function activate(context: vscode.ExtensionContext) {
    // Setup DI container
    const container = setupContainer(context);

    // Resolve dependencies
    const manager = resolve<Manager>(TYPES.Manager);
}
```

### 2. Resolve Dependencies

```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

const androidService = resolve<AndroidService>(TYPES.AndroidService);
await androidService.initCheck();
```

## ✨ Features

- ✅ **Type-Safe Resolution** - TypeScript ensures correct dependency types
- ✅ **Singleton Management** - Automatic singleton lifecycle
- ✅ **Factory Support** - Custom instantiation logic
- ✅ **Backward Compatible** - Works alongside existing singleton pattern
- ✅ **Test-Friendly** - Easy to mock dependencies

## 📚 Documentation

- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Comprehensive usage guide with examples
- See inline code documentation for API details

## 🔗 Integration

The DI container is initialized in `extension.ts`:

```typescript
import { setupContainer } from './di';

export async function activate(context: vscode.ExtensionContext) {
    setupContainer(context);
    // ... rest of activation
}
```

## 💡 Key Benefits

1. **Loose Coupling** - Services don't depend on concrete implementations
2. **Testability** - Easy to mock dependencies in unit tests
3. **Lifecycle Management** - Automatic singleton/transient handling
4. **Type Safety** - TypeScript ensures correct dependency resolution
5. **Maintainability** - Centralized dependency management

## 🔄 Migration

Existing code continues to work:

```typescript
// Old way (still works)
const manager = Manager.getInstance();

// New way (recommended for new code)
const manager = resolve<Manager>(TYPES.Manager);
```

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed migration examples.

## 📦 Dependencies

- `tsyringe` - Dependency injection container
- `reflect-metadata` - Required for decorator metadata

## 🎯 Available Types

All services are registered with symbols in `TYPES`:

- `TYPES.Manager` - Manager singleton
- `TYPES.ConfigService` - Configuration service
- `TYPES.Output` - Output channel
- `TYPES.Cache` - Cache utility
- `TYPES.AndroidService` - Android service
- `TYPES.AVDService` - AVD service
- `TYPES.BuildVariantService` - Build variant service
- `TYPES.GradleService` - Gradle service
- `TYPES.SdkInstallerService` - SDK installer service
- `TYPES.ExtensionContext` - VS Code extension context

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed examples.
