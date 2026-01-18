# EventBus Usage Guide

## Overview

The `EventBus` is a centralized event system for Android Studio Lite extension that enables decoupled communication between services, commands, and UI components. It's implemented as a singleton using Node.js `EventEmitter`.

## Current Usage

### Registration
- **Location**: `src/di/container.ts:115`
- **Status**: EventBus is registered in the dependency injection container but **not actively used** in the codebase yet
- **Access**: Available via DI container using `TYPES.EventBus` token

### Implementation
- **File**: `src/events/EventBus.ts`
- **Type**: Singleton class extending `EventEmitter`
- **Max Listeners**: 100 (prevents memory leak warnings)

## Available Event Types

The EventBus defines the following event categories:

### Device Events
- `DeviceConnected` - When a device connects
- `DeviceDisconnected` - When a device disconnects
- `DeviceSelected` - When a device is selected

### AVD Events
- `AVDCreated` - When an AVD is created
- `AVDDeleted` - When an AVD is deleted
- `AVDSelected` - When an AVD is selected
- `AVDStarted` - When an AVD/emulator starts
- `AVDStopped` - When an AVD/emulator stops

### Build Events
- `BuildStarted` - When a build starts
- `BuildCompleted` - When a build completes successfully
- `BuildFailed` - When a build fails
- `BuildVariantChanged` - When build variant changes

### App Lifecycle Events
- `AppInstalled` - When an app is installed
- `AppUninstalled` - When an app is uninstalled
- `AppStarted` - When an app starts
- `AppStopped` - When an app stops

### Logcat Events
- `LogcatStarted` - When logcat streaming starts
- `LogcatStopped` - When logcat streaming stops
- `LogcatPaused` - When logcat is paused
- `LogcatResumed` - When logcat resumes
- `LogcatCleared` - When logcat output is cleared
- `LogcatLevelChanged` - When log level filter changes

### Configuration Events
- `ConfigChanged` - When any config changes
- `SdkPathChanged` - When SDK path changes
- `AvdHomeChanged` - When AVD home path changes

### Service Events
- `ServiceInitialized` - When a service initializes
- `ServiceError` - When a service encounters an error

## Usage Patterns

### In Extension Host (Services, Commands)

#### Emitting Events

```typescript
import { EventBus, EventType } from '../events';
import { inject } from 'tsyringe';
import { TYPES } from '../di/types';

@injectable()
export class MyService {
    constructor(
        @inject(TYPES.EventBus) private readonly eventBus: EventBus
    ) {}

    async performAction() {
        // Emit event when action starts
        this.eventBus.emit(EventType.BuildStarted, {
            variant: 'debug',
            module: 'app'
        });

        try {
            // ... perform action ...

            // Emit success event
            this.eventBus.emit(EventType.BuildCompleted, {
                variant: 'debug',
                module: 'app',
                success: true
            });
        } catch (error) {
            // Emit failure event
            this.eventBus.emit(EventType.BuildFailed, {
                variant: 'debug',
                module: 'app',
                error: error
            });
        }
    }
}
```

#### Subscribing to Events

```typescript
import { EventBus, EventType, DeviceEventPayload } from '../events';
import { inject } from 'tsyringe';
import { TYPES } from '../di/types';
import { Disposable } from 'vscode';

@injectable()
export class MyService {
    private disposables: Disposable[] = [];

    constructor(
        @inject(TYPES.EventBus) private readonly eventBus: EventBus
    ) {
        // Subscribe to device events
        const subscription = this.eventBus.subscribe(
            EventType.DeviceConnected,
            (payload: DeviceEventPayload) => {
                console.log('Device connected:', payload.deviceId);
                this.handleDeviceConnected(payload);
            }
        );
        this.disposables.push(subscription);
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
```

### In Webviews (Lit Components)

Webviews run in a sandboxed environment and cannot directly access the EventBus. Instead, they communicate via IPC:

#### Extension Side (Provider)

```typescript
export class MyWebviewProvider implements WebviewProvider<State> {
    private disposables: Disposable[] = [];

    constructor(
        private readonly host: WebviewHost,
        @inject(TYPES.EventBus) private readonly eventBus: EventBus
    ) {
        // Subscribe to events and forward to webview
        const subscription = this.eventBus.subscribe(
            EventType.AVDSelected,
            async (payload: AVDEventPayload) => {
                await this.host.notify('avd-selected', payload);
            }
        );
        this.disposables.push(subscription);
    }

    async onMessageReceived(e: any): Promise<void> {
        if (e.type === 'select-avd') {
            const { avdName } = e.params || {};
            // Emit event when webview requests action
            this.eventBus.emit(EventType.AVDSelected, { avdName });
        }
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
```

#### Webview Side (Lit Component)

```typescript
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ASlElement } from '../shared/components/element.js';

@customElement('my-component')
export class MyComponent extends ASlElement {
    @state() private selectedAVD: string | null = null;

    override connectedCallback() {
        super.connectedCallback();

        // Listen for messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'avd-selected') {
                this.selectedAVD = message.payload.avdName;
                this.requestUpdate();
            }
        });
    }

    private async selectAVD(avdName: string) {
        // Send message to extension
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            type: 'select-avd',
            params: { avdName }
        });
    }

    override render() {
        return html`
            <button @click=${() => this.selectAVD('my-avd')}>
                Select AVD
            </button>
        `;
    }
}
```

## Recommended Usage Areas

### 1. Service Layer

#### AVDService (`src/service/AVDService.ts`)
**Current**: Uses custom listener pattern (`deviceStateListeners`)
**Recommended**: Replace with EventBus

```typescript
// Instead of:
this.deviceStateListeners.forEach(listener => listener({ selectedAVD, devices }));

// Use:
this.eventBus.emit(EventType.AVDSelected, { avdName: selectedAVD?.name });
this.eventBus.emit(EventType.DeviceConnected, { deviceId: device.id });
```

**Events to emit**:
- `AVDSelected` when `setSelectedAVD()` is called
- `AVDCreated` when `createAVD()` succeeds
- `AVDDeleted` when `deleteAVD()` succeeds
- `AVDStarted` when `launchEmulator()` succeeds
- `AVDStopped` when emulator stops
- `DeviceConnected` when device polling detects new device
- `DeviceDisconnected` when device polling detects device gone
- `DeviceSelected` when `selectDevice()` is called

#### LogcatService (`src/service/Logcat.ts`)
**Current**: Uses direct callbacks (`webviewMessageCallback`)
**Recommended**: Emit events for lifecycle

```typescript
// Emit when logcat starts
this.eventBus.emit(EventType.LogcatStarted, { deviceId: selectedDevice.id });

// Emit when logcat stops
this.eventBus.emit(EventType.LogcatStopped, { deviceId: selectedDevice.id });

// Emit when cleared
this.eventBus.emit(EventType.LogcatCleared, { deviceId: selectedDevice.id });
```

**Events to emit**:
- `LogcatStarted` in `start()` method
- `LogcatStopped` in `stop()` method
- `LogcatCleared` in `clear()` method
- `LogcatLevelChanged` in `setLogLevel()` method

#### GradleService (`src/service/GradleService.ts`)
**Current**: No event emission
**Recommended**: Emit build lifecycle events

```typescript
// Emit when build starts
this.eventBus.emit(EventType.BuildStarted, { variant: variantTask, module: 'app' });

// Emit on success
this.eventBus.emit(EventType.BuildCompleted, { variant: variantTask, success: true });

// Emit on failure
this.eventBus.emit(EventType.BuildFailed, { variant: variantTask, error });
```

**Events to emit**:
- `BuildStarted` when `installVariant()` starts
- `BuildCompleted` when build succeeds
- `BuildFailed` when build fails

#### BuildVariantService (`src/service/BuildVariantService.ts`)
**Current**: No event emission
**Recommended**: Emit variant change events

```typescript
// Emit when variant changes
this.eventBus.emit(EventType.BuildVariantChanged, { variant: variantName, module: moduleName });
```

**Events to emit**:
- `BuildVariantChanged` when `setSelectedVariant()` is called

### 2. Webview Providers

#### AVDSelectorProvider (`src/webviews/apps/avdSelector/avdSelectorProvider.ts`)
**Current**: Direct service calls, manual state management
**Recommended**: Subscribe to events for reactive updates

```typescript
constructor(
    private readonly host: WebviewHost,
    @inject(TYPES.EventBus) private readonly eventBus: EventBus,
    // ... other services
) {
    // Subscribe to AVD events
    this.disposables.push(
        this.eventBus.subscribe(EventType.AVDSelected, async (payload) => {
            await this.host.notify('avd-selected', payload);
        })
    );

    // Subscribe to device events
    this.disposables.push(
        this.eventBus.subscribe(EventType.DeviceConnected, async (payload) => {
            await this.sendAVDList(); // Refresh list
        })
    );

    // Subscribe to build events
    this.disposables.push(
        this.eventBus.subscribe(EventType.BuildStarted, async (payload) => {
            await this.host.notify('build-started', payload);
        })
    );
}
```

**Events to subscribe**:
- `AVDSelected`, `AVDCreated`, `AVDDeleted` - Update AVD list
- `DeviceConnected`, `DeviceDisconnected` - Refresh device status
- `BuildStarted`, `BuildCompleted`, `BuildFailed` - Update build UI
- `LogcatStarted`, `LogcatStopped` - Update logcat toggle state

#### LogcatWebviewProvider (`src/webviews/apps/logcat/logcatProvider.ts`)
**Current**: Direct service communication
**Recommended**: Subscribe to logcat events

```typescript
constructor(
    private readonly host: WebviewHost,
    @inject(TYPES.EventBus) private readonly eventBus: EventBus
) {
    // Subscribe to logcat lifecycle events
    this.disposables.push(
        this.eventBus.subscribe(EventType.LogcatStarted, async () => {
            await this.host.notify('logcat-started', {});
        })
    );

    this.disposables.push(
        this.eventBus.subscribe(EventType.LogcatStopped, async () => {
            await this.host.notify('logcat-stopped', {});
        })
    );
}
```

### 3. Tree Views

#### AVDTreeView (`src/ui/AVDTreeView.ts`)
**Current**: Manual refresh via commands
**Recommended**: Subscribe to AVD/device events for auto-refresh

```typescript
constructor(
    context: ExtensionContext,
    private readonly avdService: AVDService,
    @inject(TYPES.EventBus) private readonly eventBus: EventBus
) {
    // Subscribe to events for auto-refresh
    context.subscriptions.push(
        this.eventBus.subscribe(EventType.AVDCreated, () => {
            this.provider.refresh();
        })
    );

    context.subscriptions.push(
        this.eventBus.subscribe(EventType.AVDDeleted, () => {
            this.provider.refresh();
        })
    );

    context.subscriptions.push(
        this.eventBus.subscribe(EventType.DeviceConnected, () => {
            this.provider.refresh();
        })
    );
}
```

**Events to subscribe**:
- `AVDCreated`, `AVDDeleted` - Refresh AVD list
- `AVDSelected` - Highlight selected AVD
- `DeviceConnected`, `DeviceDisconnected` - Update device status icons

#### BuildVariantTreeView (`src/ui/BuildVariantTreeView.ts`)
**Current**: Manual refresh
**Recommended**: Subscribe to build variant events

```typescript
constructor(
    context: ExtensionContext,
    private readonly buildVariantService: BuildVariantService,
    @inject(TYPES.EventBus) private readonly eventBus: EventBus
) {
    context.subscriptions.push(
        this.eventBus.subscribe(EventType.BuildVariantChanged, () => {
            this.provider.refresh();
        })
    );
}
```

### 4. Commands

Commands can emit events when actions complete:

```typescript
// In CommandRegistry or individual command handlers
async executeCommand() {
    try {
        await this.service.performAction();
        // Event is emitted by service, but command can also emit if needed
        this.eventBus.emit(EventType.AppInstalled, { packageName: 'com.example.app' });
    } catch (error) {
        this.eventBus.emit(EventType.ServiceError, { serviceName: 'Command', error });
    }
}
```

## Benefits of Using EventBus

1. **Decoupling**: Services don't need direct references to UI components
2. **Reactivity**: UI automatically updates when state changes
3. **Extensibility**: New listeners can be added without modifying existing code
4. **Debugging**: Centralized event logging for troubleshooting
5. **Testing**: Easier to mock and test event-driven behavior
6. **Consistency**: Single pattern for cross-component communication

## Best Practices

1. **Always dispose subscriptions**: Use `Disposable` pattern to prevent memory leaks
2. **Type safety**: Use typed payloads (`DeviceEventPayload`, `AVDEventPayload`, etc.)
3. **Error handling**: Wrap event handlers in try-catch to prevent one failure from breaking others
4. **Async handlers**: Event listeners can be async, but handle errors appropriately
5. **Don't overuse**: Not every method call needs an event - use for significant state changes
6. **Document events**: Add JSDoc comments when adding new event types

## Migration Strategy

1. **Phase 1**: Add event emission to services (non-breaking)
2. **Phase 2**: Add event subscriptions to webview providers
3. **Phase 3**: Add event subscriptions to tree views
4. **Phase 4**: Remove direct callbacks/listeners in favor of EventBus
5. **Phase 5**: Add event logging/debugging utilities

## Example: Complete Integration

### Service (AVDService.ts)
```typescript
@injectable()
export class AVDService extends Service {
    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output,
        @inject(TYPES.EventBus) private readonly eventBus: EventBus,
        // ... other dependencies
    ) {
        super(cache, configService, output);
    }

    async setSelectedAVD(avdName: string): Promise<void> {
        // ... existing logic ...

        // Emit event
        this.eventBus.emit(EventType.AVDSelected, { avdName });
    }

    async launchEmulator(avdName: string): Promise<void> {
        // ... existing logic ...

        // Emit event
        this.eventBus.emit(EventType.AVDStarted, { avdName });
    }
}
```

### Webview Provider (AVDSelectorProvider.ts)
```typescript
export class AVDSelectorProvider implements WebviewProvider<State> {
    private disposables: Disposable[] = [];

    constructor(
        private readonly host: WebviewHost,
        @inject(TYPES.EventBus) private readonly eventBus: EventBus,
        // ... other services
    ) {
        // Subscribe to AVD selection events
        this.disposables.push(
            this.eventBus.subscribe(EventType.AVDSelected, async (payload) => {
                await this.host.notify('avd-selected', payload);
                await this.sendAVDList(); // Refresh UI
            })
        );
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
```

### Tree View (AVDTreeView.ts)
```typescript
export class AVDTreeView {
    constructor(
        context: ExtensionContext,
        private readonly avdService: AVDService,
        @inject(TYPES.EventBus) private readonly eventBus: EventBus
    ) {
        // Auto-refresh on AVD changes
        context.subscriptions.push(
            this.eventBus.subscribe(EventType.AVDCreated, () => {
                this.provider.refresh();
            })
        );

        context.subscriptions.push(
            this.eventBus.subscribe(EventType.AVDDeleted, () => {
                this.provider.refresh();
            })
        );
    }
}
```

## Summary

The EventBus is currently **underutilized** in the codebase. By adopting it more widely:

- **Services** can emit events instead of maintaining direct callbacks
- **Webview providers** can reactively update UI based on service events
- **Tree views** can auto-refresh when data changes
- **Commands** can coordinate multiple components without tight coupling

This will lead to a more maintainable, reactive, and extensible architecture.
