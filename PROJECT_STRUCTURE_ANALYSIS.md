# Android Studio Lite - Project Structure Analysis & Improvement Recommendations

## 📋 Current Project Structure

### Overview
The project follows a **hybrid architecture** combining:
- **Singleton Pattern** (Manager) for core services
- **Service Layer** for business logic
- **Command Pattern** (partially implemented)
- **Webview Architecture** using Lit Elements
- **TreeView Providers** for VS Code UI

### Current Directory Structure

```
src/
├── extension.ts              # Entry point, command registration
├── core.ts                  # Manager singleton
├── cmd/                     # Command abstractions (AVDManager, Emulator, etc.)
├── service/                 # Business logic services
│   ├── AndroidService.ts
│   ├── AVDService.ts
│   ├── BuildVariantService.ts
│   ├── GradleService.ts
│   └── Service.ts (base)
├── ui/                      # VS Code UI components
│   ├── AVDTreeView.ts
│   ├── BuildVariantTreeView.ts
│   └── QuickPick components
├── webviews/                # Webview architecture
│   ├── apps/               # Webview applications
│   │   ├── avdSelector/
│   │   └── shared/         # Shared components
│   ├── webviewsController.ts
│   └── webviewProvider.ts
├── module/                  # Utility modules
│   ├── cache.ts
│   ├── cmd.ts
│   ├── platform.ts
│   └── ui.ts
└── utils/                   # Helper utilities
```

---

## ✅ Current Strengths

1. **Modern Webview Architecture**
   - Clean separation with WebviewsController
   - Lit Elements for web components
   - Good provider pattern implementation

2. **Service Layer Separation**
   - Clear service boundaries
   - Base Service class for common functionality

3. **TypeScript Usage**
   - Type-safe codebase
   - Good use of interfaces and types

4. **Build System**
   - Separate webpack config for webviews
   - Good separation of extension vs webview builds

---

## ⚠️ Current Issues & Areas for Improvement

### 1. **Command Registration Inconsistency**

**Problem:**
- Commands registered directly in `extension.ts` (inline)
- Some commands require'd from compiled output (`out/commands/`)
- No centralized command registry
- Mixed TypeScript/CommonJS (`require()` statements)

**Current Code:**
```typescript
// extension.ts - Mixed approach
const logcatCommands = require('../out/commands/logcatCommands'); // ❌ CommonJS
vscode.commands.registerCommand('android-studio-lite.setup-wizard', async () => { // ❌ Inline
    await manager.android.initCheck();
}),
```

**Impact:**
- Hard to discover all commands
- Difficult to test commands in isolation
- Type safety issues with require()
- No command metadata/grouping

---

### 2. **Tight Coupling via Singleton**

**Problem:**
- `Manager` singleton creates tight coupling
- Services depend directly on Manager instance
- Hard to test (can't easily mock dependencies)
- Circular dependencies possible

**Current Code:**
```typescript
// core.ts
export class Manager {
    private static instance: Manager;
    readonly android: AndroidService;
    readonly avd: AVDService;
    // Services created in constructor
}

// AndroidService.ts
constructor(protected manager: Manager) {
    super(manager);
}
```

**Impact:**
- Difficult to unit test services
- Hard to swap implementations
- Global state management issues

---

### 3. **No Dependency Injection**

**Problem:**
- Manual dependency wiring
- Services instantiated in Manager constructor
- No IoC container

**Impact:**
- Hard to manage dependencies
- Difficult to test
- No lifecycle management

---

### 4. **Configuration Management**

**Problem:**
- Configuration logic mixed in Manager
- No configuration validation layer
- Environment variables handled inline

**Current Code:**
```typescript
public getConfig(): IConfig {
    let config = workspace.getConfiguration('android-studio-lite');
    let sysSdkRoot = process.env.ANDROID_SDK_ROOT ?? ""; // ❌ Inline env handling
    // ... complex logic
}
```

**Impact:**
- Hard to test configuration
- No configuration schema validation
- Difficult to add new config options

---

### 5. **Error Handling Inconsistency**

**Problem:**
- Mixed error handling patterns
- Some async operations not properly awaited
- Inconsistent error messages

**Impact:**
- Hard to debug issues
- Poor user experience on errors

---

### 6. **No Testing Infrastructure**

**Problem:**
- No test files visible
- No test utilities
- No mocking framework setup

**Impact:**
- Code quality concerns
- Regression risks
- Difficult refactoring

---

### 7. **Webview Component Organization**

**Problem:**
- Components in `shared/` but could be better organized
- No component library/documentation
- Limited reusability patterns

---

## 🚀 Recommended Improvements

### 1. **Command Registry Pattern**

**Proposed Structure:**
```
src/
├── commands/
│   ├── index.ts                    # Command registry
│   ├── setup/
│   │   ├── setupWizard.ts
│   │   ├── setupSdkPath.ts
│   │   └── index.ts
│   ├── logcat/
│   │   ├── startLogcat.ts
│   │   ├── stopLogcat.ts
│   │   └── index.ts
│   ├── avd/
│   │   ├── avdList.ts
│   │   ├── avdCreate.ts
│   │   └── index.ts
│   └── base/
│       └── Command.ts              # Base command class
```

**Implementation:**
```typescript
// commands/base/Command.ts
export interface ICommandMetadata {
    id: string;
    title: string;
    category?: string;
    icon?: string;
}

export abstract class Command implements ICommandMetadata {
    abstract readonly id: string;
    abstract readonly title: string;
    readonly category?: string;
    readonly icon?: string;

    abstract execute(...args: any[]): Promise<void> | void;
}

// commands/setup/setupWizard.ts
export class SetupWizardCommand extends Command {
    readonly id = 'android-studio-lite.setup-wizard';
    readonly title = 'Run Setup Wizard';
    readonly category = 'Android Studio Lite';
    readonly icon = '$(wrench)';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.initCheck();
    }
}

// commands/index.ts
export class CommandRegistry {
    private commands = new Map<string, Command>();

    register(command: Command): void {
        this.commands.set(command.id, command);
    }

    registerAll(commands: Command[]): void {
        commands.forEach(cmd => this.register(cmd));
    }

    async execute(id: string, ...args: any[]): Promise<void> {
        const command = this.commands.get(id);
        if (!command) {
            throw new Error(`Command ${id} not found`);
        }
        return command.execute(...args);
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }
}
```

**Benefits:**
- ✅ Centralized command management
- ✅ Type-safe command execution
- ✅ Easy to discover and test commands
- ✅ Command metadata in one place

---

### 2. **Dependency Injection Container**

**Recommended Library: `inversify` or `tsyringe`**

**Proposed Structure:**
```
src/
├── di/
│   ├── container.ts              # DI container setup
│   ├── types.ts                  # Symbol definitions
│   └── modules/
│       ├── serviceModule.ts
│       ├── commandModule.ts
│       └── uiModule.ts
```

**Implementation with `tsyringe`:**
```typescript
// di/types.ts
export const TYPES = {
    AndroidService: Symbol.for('AndroidService'),
    AVDService: Symbol.for('AVDService'),
    BuildVariantService: Symbol.for('BuildVariantService'),
    GradleService: Symbol.for('GradleService'),
    CommandRegistry: Symbol.for('CommandRegistry'),
};

// di/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';
import { TYPES } from './types';
import { AndroidService } from '../service/AndroidService';
import { AVDService } from '../service/AVDService';
// ... other services

export function setupContainer(context: vscode.ExtensionContext) {
    // Register services
    container.register<AndroidService>(TYPES.AndroidService, {
        useFactory: () => new AndroidService(/* dependencies */)
    });

    // ... other registrations

    return container;
}

// Usage in extension.ts
const container = setupContainer(context);
const androidService = container.resolve<AndroidService>(TYPES.AndroidService);
```

**Benefits:**
- ✅ Loose coupling
- ✅ Easy testing (mock dependencies)
- ✅ Lifecycle management
- ✅ Better organization

---

### 3. **Configuration Service**

**Proposed Structure:**
```
src/
├── config/
│   ├── ConfigService.ts          # Configuration service
│   ├── ConfigSchema.ts            # Configuration schema/validation
│   └── ConfigKeys.ts              # Type-safe config keys
```

**Implementation:**
```typescript
// config/ConfigKeys.ts
export const ConfigKeys = {
    SDK_PATH: 'android-studio-lite.sdkPath',
    AVD_HOME: 'android-studio-lite.avdHome',
    ADB_PATH: 'android-studio-lite.adbPath',
    // ... other keys
} as const;

// config/ConfigService.ts
@injectable()
export class ConfigService {
    constructor(
        @inject(TYPES.VSCodeWorkspace) private workspace: vscode.WorkspaceConfiguration
    ) {}

    get<T>(key: string, defaultValue?: T): T {
        return this.workspace.get(key, defaultValue) as T;
    }

    async set(key: string, value: any, scope: vscode.ConfigurationTarget): Promise<void> {
        await this.workspace.update(key, value, scope);
    }

    getSdkPath(): string {
        const envPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '';
        return this.get(ConfigKeys.SDK_PATH, envPath);
    }

    // ... other typed getters
}
```

**Benefits:**
- ✅ Type-safe configuration access
- ✅ Centralized config logic
- ✅ Easy to test
- ✅ Environment variable handling in one place

---

### 4. **Error Handling Strategy**

**Proposed Structure:**
```
src/
├── errors/
│   ├── AppError.ts               # Base error class
│   ├── ConfigError.ts
│   ├── ServiceError.ts
│   └── ErrorHandler.ts           # Global error handler
```

**Implementation:**
```typescript
// errors/AppError.ts
export abstract class AppError extends Error {
    abstract readonly code: string;
    abstract readonly severity: 'error' | 'warning' | 'info';

    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = this.constructor.name;
    }
}

// errors/ConfigError.ts
export class ConfigError extends AppError {
    readonly code = 'CONFIG_ERROR';
    readonly severity = 'error' as const;
}

// errors/ErrorHandler.ts
export class ErrorHandler {
    static handle(error: Error, context?: string): void {
        if (error instanceof AppError) {
            vscode.window.showErrorMessage(
                `${context ? `[${context}] ` : ''}${error.message}`,
                'Show Details'
            ).then(selection => {
                if (selection === 'Show Details') {
                    // Show detailed error info
                }
            });
        } else {
            // Handle unknown errors
            console.error('Unhandled error:', error);
        }
    }
}
```

---

### 5. **Testing Infrastructure**

**Recommended: `@vscode/test-electron` + `vitest` or `jest`**

**Proposed Structure:**
```
src/
├── __tests__/
│   ├── unit/
│   │   ├── service/
│   │   ├── commands/
│   │   └── utils/
│   ├── integration/
│   └── fixtures/
├── test/
│   ├── setup.ts
│   ├── mocks/
│   └── helpers/
```

**Setup:**
```typescript
// test/setup.ts
import { beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

// Mock VS Code API
vi.mock('vscode', () => ({
    // ... mock implementations
}));
```

---

### 6. **Improved Webview Component Library**

**Proposed Structure:**
```
src/webviews/apps/shared/
├── components/
│   ├── base/
│   │   ├── Element.ts
│   │   └── Component.ts
│   ├── forms/
│   │   ├── Input.ts
│   │   ├── Select.ts
│   │   └── Button.ts
│   ├── layout/
│   │   ├── Container.ts
│   │   ├── Grid.ts
│   │   └── Stack.ts
│   └── feedback/
│       ├── Toast.ts
│       └── Loading.ts
├── hooks/                      # Composition utilities
│   ├── useVSCodeTheme.ts
│   └── useWebviewState.ts
└── styles/
    ├── tokens.ts               # Design tokens
    └── themes.ts
```

**Design Tokens:**
```typescript
// styles/tokens.ts
export const designTokens = {
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },
    colors: {
        primary: 'var(--vscode-button-background)',
        // ... other tokens
    },
} as const;
```

---

### 7. **State Management for Webviews**

**Consider: `zustand` or `nanostores` (lightweight)**

**Implementation:**
```typescript
// webviews/apps/shared/store/avdStore.ts
import { create } from 'zustand';

interface AVDState {
    avds: AVD[];
    selectedAVD: AVD | null;
    isLoading: boolean;
    setAVDs: (avds: AVD[]) => void;
    selectAVD: (avd: AVD) => void;
}

export const useAVDStore = create<AVDState>((set) => ({
    avds: [],
    selectedAVD: null,
    isLoading: false,
    setAVDs: (avds) => set({ avds }),
    selectAVD: (avd) => set({ selectedAVD: avd }),
}));
```

---

### 8. **Event System**

**Proposed: EventEmitter pattern or RxJS**

**Implementation:**
```typescript
// events/EventBus.ts
import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
    private static instance: EventBus;

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
}

// Usage
EventBus.getInstance().emit('device:connected', device);
EventBus.getInstance().on('device:connected', (device) => {
    // Handle event
});
```

---

## 📐 Recommended Final Structure

```
android-studio-lite/
├── src/
│   ├── extension.ts                    # Entry point (minimal)
│   ├── di/
│   │   ├── container.ts
│   │   ├── types.ts
│   │   └── modules/
│   ├── commands/                       # ✅ NEW: Command registry
│   │   ├── index.ts
│   │   ├── base/
│   │   ├── setup/
│   │   ├── logcat/
│   │   ├── avd/
│   │   └── buildvariant/
│   ├── service/                        # ✅ IMPROVED: Services with DI
│   │   ├── AndroidService.ts
│   │   ├── AVDService.ts
│   │   └── ...
│   ├── config/                         # ✅ NEW: Configuration service
│   │   ├── ConfigService.ts
│   │   ├── ConfigSchema.ts
│   │   └── ConfigKeys.ts
│   ├── errors/                         # ✅ NEW: Error handling
│   │   ├── AppError.ts
│   │   └── ErrorHandler.ts
│   ├── events/                         # ✅ NEW: Event system
│   │   └── EventBus.ts
│   ├── ui/                             # ✅ IMPROVED: UI components
│   │   ├── tree/
│   │   ├── quickpick/
│   │   └── webview/
│   ├── webviews/
│   │   ├── apps/
│   │   │   ├── avdSelector/
│   │   │   └── shared/
│   │   │       ├── components/         # ✅ IMPROVED: Better organization
│   │   │       ├── hooks/
│   │   │       ├── store/
│   │   │       └── styles/
│   │   └── ...
│   ├── utils/
│   └── types/                          # ✅ NEW: Shared types
│       └── index.ts
├── test/                               # ✅ NEW: Test infrastructure
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── package.json
```

---

## 🛠️ Recommended Libraries & Frameworks

### Core Dependencies

1. **Dependency Injection**
   - `tsyringe` (recommended) - Simple, decorator-based
   - `inversify` - More features, steeper learning curve

2. **State Management (Webviews)**
   - `zustand` - Lightweight, simple API
   - `nanostores` - Ultra-lightweight, framework-agnostic

3. **Event System**
   - `eventemitter3` - Fast EventEmitter
   - Or built-in Node.js `events`

4. **Validation**
   - `zod` - Schema validation for config
   - `joi` - Alternative validation library

### Development Dependencies

1. **Testing**
   - `vitest` - Fast, Vite-based test runner
   - `@vscode/test-electron` - VS Code extension testing
   - `@testing-library/dom` - For webview component testing

2. **Code Quality**
   - `eslint` - Linting
   - `prettier` - Code formatting
   - `husky` - Git hooks
   - `lint-staged` - Pre-commit linting

3. **Build Tools**
   - Keep current webpack setup (it's good)
   - Consider `vite` for faster webview dev builds (optional)

---

## 🎯 Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. ✅ Set up DI container
2. ✅ Create Command Registry
3. ✅ Migrate commands to registry
4. ✅ Set up testing infrastructure

### Phase 2: Refactoring (Week 3-4)
1. ✅ Extract ConfigService
2. ✅ Implement Error Handling
3. ✅ Refactor services to use DI
4. ✅ Add event system

### Phase 3: Enhancement (Week 5-6)
1. ✅ Improve webview component library
2. ✅ Add state management
3. ✅ Enhance error handling
4. ✅ Add comprehensive tests

### Phase 4: Polish (Week 7-8)
1. ✅ Documentation
2. ✅ Performance optimization
3. ✅ User experience improvements

---

## 📊 Benefits Summary

| Aspect                   | Current  | Improved    |
| ------------------------ | -------- | ----------- |
| **Testability**          | ❌ Low    | ✅ High      |
| **Maintainability**      | ⚠️ Medium | ✅ High      |
| **Scalability**          | ⚠️ Medium | ✅ High      |
| **Type Safety**          | ✅ Good   | ✅ Excellent |
| **Code Organization**    | ⚠️ Medium | ✅ Excellent |
| **Developer Experience** | ⚠️ Medium | ✅ Excellent |

---

## 🔗 References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Lit Elements Documentation](https://lit.dev/)
- [tsyringe Documentation](https://github.com/microsoft/tsyringe)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extensions)

---

## 💡 Quick Wins (Can implement immediately)

1. **Extract commands to separate files** - Low effort, high impact
2. **Create ConfigService** - Centralize config logic
3. **Add error classes** - Better error handling
4. **Set up basic testing** - Start with unit tests for utilities
5. **Organize webview components** - Better folder structure

---

*This analysis provides a roadmap for improving the project structure while maintaining backward compatibility and minimizing breaking changes.*
