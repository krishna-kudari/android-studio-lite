# Dependency Injection Usage Guide

This guide explains how to use Dependency Injection (DI) with tsyringe in Android Studio Lite.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Basic Usage](#basic-usage)
4. [Service Registration](#service-registration)
5. [Dependency Resolution](#dependency-resolution)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Testing with DI](#testing-with-di)

---

## Overview

Dependency Injection (DI) provides:
- **Loose Coupling**: Services don't depend on concrete implementations
- **Testability**: Easy to mock dependencies in tests
- **Lifecycle Management**: Automatic singleton/transient management
- **Type Safety**: TypeScript ensures correct dependency resolution

We use **tsyringe** for DI, which is a lightweight, decorator-based DI container.

---

## Quick Start

### 1. Initialize Container

In `extension.ts`:

```typescript
import 'reflect-metadata'; // Required at the top
import { setupContainer, resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

export async function activate(context: vscode.ExtensionContext) {
    // Setup DI container
    const container = setupContainer(context);

    // Resolve dependencies
    const androidService = resolve<AndroidService>(TYPES.AndroidService);
    await androidService.initCheck();
}
```

### 2. Use Dependencies

```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

// Resolve a service
const androidService = resolve<AndroidService>(TYPES.AndroidService);
await androidService.initCheck();
```

---

## Basic Usage

### Resolving Dependencies

```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';
import { ConfigService } from './config';

// Resolve singleton services
const config = resolve<ConfigService>(TYPES.ConfigService);
const androidService = resolve<AndroidService>(TYPES.AndroidService);
```

### Available Types

All available types are defined in `TYPES`:

```typescript
TYPES.ConfigService        // Configuration service
TYPES.Output              // Output channel
TYPES.Cache               // Cache utility
TYPES.AndroidService      // Android service
TYPES.AVDService          // AVD service
TYPES.BuildVariantService // Build variant service
TYPES.GradleService       // Gradle service
TYPES.SdkInstallerService // SDK installer service
TYPES.ExtensionContext    // VS Code extension context
```

---

## Service Registration

### Current Registration

Services are registered in `di/container.ts`:

```typescript
// Singleton registration
container.registerSingleton<ConfigService>(TYPES.ConfigService, ConfigService);

// Factory registration (for services with dependencies)
container.register<AndroidService>(TYPES.AndroidService, {
    useFactory: (dependencyContainer) => {
        const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
        const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
        const output = dependencyContainer.resolve<Output>(TYPES.Output);
        const sdkInstaller = dependencyContainer.resolve<SdkInstallerService>(TYPES.SdkInstallerService);
        return new AndroidService(cache, configService, output, sdkInstaller);
    },
});
```

### Adding New Services

1. **Add type symbol** in `di/types.ts`:

```typescript
export const TYPES = {
    // ... existing types
    MyNewService: Symbol.for('MyNewService'),
} as const;
```

2. **Register service** in `di/container.ts`:

```typescript
import { MyNewService } from '../service/MyNewService';

container.register<MyNewService>(TYPES.MyNewService, {
    useFactory: (dependencyContainer) => {
        const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
        const output = dependencyContainer.resolve<Output>(TYPES.Output);
        return new MyNewService(configService, output);
    },
});
```

3. **Use the service**:

```typescript
import { resolve, TYPES } from './di';
const myService = resolve<MyNewService>(TYPES.MyNewService);
```

---

## Dependency Resolution

### Manual Resolution

```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

const androidService = resolve<AndroidService>(TYPES.AndroidService);
```

### Using Container Directly

```typescript
import { getContainer, TYPES } from './di';
import { ConfigService } from './config';

const container = getContainer();
const config = container.resolve<ConfigService>(TYPES.ConfigService);
```

### Factory Pattern

For services that need custom instantiation:

```typescript
container.register<MyService>(TYPES.MyService, {
    useFactory: (dependencyContainer) => {
        const config = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
        const context = dependencyContainer.resolve<vscode.ExtensionContext>(TYPES.ExtensionContext);
        return new MyService(config, context);
    },
});
```

---

## Migration Guide

### From Singleton Pattern

**Before:**
```typescript
// Old singleton pattern (no longer exists)
const manager = Manager.getInstance();
const androidService = manager.android;
```

**After (Use DI):**
```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

const androidService = resolve<AndroidService>(TYPES.AndroidService);
```

### From Direct Instantiation

**Before:**
```typescript
const config = new ConfigService();
const androidService = new AndroidService(manager);
```

**After:**
```typescript
import { resolve, TYPES } from './di';
const config = resolve<ConfigService>(TYPES.ConfigService);
const androidService = resolve<AndroidService>(TYPES.AndroidService);
```

### In Command Handlers

**Before:**
```typescript
// Old singleton pattern (no longer exists)
vscode.commands.registerCommand('my.command', async () => {
    const manager = Manager.getInstance();
    await manager.android.initCheck();
});
```

**After:**
```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

vscode.commands.registerCommand('my.command', async () => {
    const androidService = resolve<AndroidService>(TYPES.AndroidService);
    await androidService.initCheck();
});
```

---

## Best Practices

### 1. Initialize Container Early

```typescript
export async function activate(context: vscode.ExtensionContext) {
    // Setup DI first
    setupContainer(context);

    // Then resolve dependencies
    const androidService = resolve<AndroidService>(TYPES.AndroidService);
    await androidService.initCheck();
}
```

### 2. Use Type-Safe Resolution

```typescript
// ✅ Good: Type-safe
const androidService = resolve<AndroidService>(TYPES.AndroidService);

// ❌ Bad: No type safety
const androidService = resolve(TYPES.AndroidService) as AndroidService;
```

### 3. Resolve at Usage Point

```typescript
// ✅ Good: Resolve when needed
async function executeCommand() {
    const service = resolve<MyService>(TYPES.MyService);
    await service.doSomething();
}

// ❌ Bad: Resolve at module level (can cause issues)
const service = resolve<MyService>(TYPES.MyService);
```

### 4. Don't Store Container Globally

```typescript
// ✅ Good: Use resolve() helper
import { resolve, TYPES } from './di';
const service = resolve<MyService>(TYPES.MyService);

// ❌ Bad: Store container globally
let globalContainer: DependencyContainer;
```

### 5. Use Dependency Injection in New Code

For new services, use DI instead of direct instantiation:

```typescript
// ✅ Good: Use DI
export class MyNewService {
    constructor(
        private config: ConfigService,
        private output: Output
    ) {}
}

// Register in container.ts
container.register<MyNewService>(TYPES.MyNewService, {
    useFactory: (c) => {
        return new MyNewService(
            c.resolve<ConfigService>(TYPES.ConfigService),
            c.resolve<Output>(TYPES.Output)
        );
    },
});
```

---

## Testing with DI

### Mocking Dependencies

```typescript
import { container } from 'tsyringe';
import { TYPES } from '../di/types';
import { ConfigService } from '../config';

describe('MyService', () => {
    beforeEach(() => {
        // Clear container
        container.clearInstances();

        // Register mock
        const mockConfig = {
            getSdkPath: jest.fn().mockReturnValue('/mock/path'),
        } as unknown as ConfigService;

        container.registerInstance<ConfigService>(TYPES.ConfigService, mockConfig);
    });

    it('should use mocked config', () => {
        const service = container.resolve<MyService>(TYPES.MyService);
        // Test service with mocked dependencies
    });
});
```

### Testing with Real Dependencies

```typescript
import { setupContainer } from '../di/container';
import { TYPES } from '../di/types';

describe('Integration Test', () => {
    it('should work with real dependencies', async () => {
        const mockContext = {} as vscode.ExtensionContext;
        const container = setupContainer(mockContext);

        const service = container.resolve<MyService>(TYPES.MyService);
        // Test with real dependencies
    });
});
```

---

## Advanced Patterns

### Conditional Registration

```typescript
if (process.env.NODE_ENV === 'test') {
    container.registerInstance<ConfigService>(TYPES.ConfigService, mockConfig);
} else {
    container.registerSingleton<ConfigService>(TYPES.ConfigService, ConfigService);
}
```

### Scoped Services

```typescript
// Transient (new instance each time)
container.register<MyService>(TYPES.MyService, MyService);

// Singleton (shared instance)
container.registerSingleton<MyService>(TYPES.MyService, MyService);
```

### Circular Dependencies

If you have circular dependencies, use lazy resolution:

```typescript
container.register<ServiceA>(TYPES.ServiceA, {
    useFactory: (c) => {
        return new ServiceA(() => c.resolve<ServiceB>(TYPES.ServiceB));
    },
});
```

---

## Troubleshooting

### Error: "No matching bindings found"

**Problem:** Service not registered in container.

**Solution:** Ensure service is registered in `di/container.ts`.

### Error: "Cannot resolve dependency"

**Problem:** Dependency not available or circular dependency.

**Solution:** Check dependency chain and ensure all dependencies are registered.

### Error: "reflect-metadata not imported"

**Problem:** Missing `reflect-metadata` import.

**Solution:** Add `import 'reflect-metadata';` at the top of files using DI.

---

## Examples

### Example 1: Command Handler with DI

```typescript
import { resolve, TYPES } from './di';
import { AndroidService } from './service/AndroidService';

vscode.commands.registerCommand('android-studio-lite.setup-wizard', async () => {
    const androidService = resolve<AndroidService>(TYPES.AndroidService);
    await androidService.initCheck();
});
```

### Example 2: Service with Dependencies

```typescript
import { injectable } from 'tsyringe';
import { ConfigService } from '../config';
import { Output } from '../module/ui';

@injectable()
export class MyService {
    constructor(
        private config: ConfigService,
        private output: Output
    ) {}

    public doSomething() {
        const sdkPath = this.config.getSdkPath();
        this.output.append(`SDK Path: ${sdkPath}`);
    }
}
```

### Example 3: Factory Registration

```typescript
container.register<MyService>(TYPES.MyService, {
    useFactory: (c) => {
        return new MyService(
            c.resolve<ConfigService>(TYPES.ConfigService),
            c.resolve<Output>(TYPES.Output)
        );
    },
});
```

---

For more information, see:
- [tsyringe Documentation](https://github.com/microsoft/tsyringe)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
