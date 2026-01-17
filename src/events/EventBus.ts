import { EventEmitter } from 'events';
import type { Disposable } from 'vscode';

/**
 * Event types for the extension.
 * Add new event types here as needed.
 */
export enum EventType {
    // Device events
    DeviceConnected = 'device:connected',
    DeviceDisconnected = 'device:disconnected',
    DeviceSelected = 'device:selected',

    // AVD events
    AVDCreated = 'avd:created',
    AVDDeleted = 'avd:deleted',
    AVDSelected = 'avd:selected',
    AVDStarted = 'avd:started',
    AVDStopped = 'avd:stopped',

    // Build events
    BuildStarted = 'build:started',
    BuildCompleted = 'build:completed',
    BuildFailed = 'build:failed',
    BuildVariantChanged = 'build:variant-changed',

    // App lifecycle events
    AppInstalled = 'app:installed',
    AppUninstalled = 'app:uninstalled',
    AppStarted = 'app:started',
    AppStopped = 'app:stopped',

    // Logcat events
    LogcatStarted = 'logcat:started',
    LogcatStopped = 'logcat:stopped',
    LogcatPaused = 'logcat:paused',
    LogcatResumed = 'logcat:resumed',
    LogcatCleared = 'logcat:cleared',
    LogcatLevelChanged = 'logcat:level-changed',

    // Configuration events
    ConfigChanged = 'config:changed',
    SdkPathChanged = 'config:sdk-path-changed',
    AvdHomeChanged = 'config:avd-home-changed',

    // Service events
    ServiceInitialized = 'service:initialized',
    ServiceError = 'service:error',
}

/**
 * Event payload types.
 */
export interface DeviceEventPayload {
    deviceId: string;
    deviceName?: string;
    status?: string;
}

export interface AVDEventPayload {
    avdName: string;
    avdPath?: string;
}

export interface BuildEventPayload {
    variant?: string;
    module?: string;
    success?: boolean;
    error?: Error;
}

export interface AppEventPayload {
    packageName: string;
    deviceId?: string;
}

export interface LogcatEventPayload {
    level?: string;
    deviceId?: string;
}

export interface ConfigEventPayload {
    key: string;
    value: any;
    scope?: 'global' | 'workspace' | 'folder';
}

export interface ServiceEventPayload {
    serviceName: string;
    error?: Error;
}

/**
 * Type-safe event listener function.
 */
export type EventListener<T = any> = (payload: T) => void | Promise<void>;

/**
 * Centralized event bus for the extension.
 *
 * This provides a single point for event communication between services,
 * commands, and UI components. Uses Node.js EventEmitter for implementation.
 *
 * @example
 * ```typescript
 * // Emit an event
 * EventBus.getInstance().emit(EventType.DeviceConnected, { deviceId: 'emulator-5554' });
 *
 * // Listen to an event
 * EventBus.getInstance().on(EventType.DeviceConnected, (payload) => {
 *   console.log('Device connected:', payload.deviceId);
 * });
 * ```
 */
export class EventBus extends EventEmitter implements Disposable {
    private static instance: EventBus;

    private constructor() {
        super();
        // Set max listeners to prevent memory leaks warning
        this.setMaxListeners(100);
    }

    /**
     * Get the singleton instance of EventBus.
     */
    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Emit a typed event.
     *
     * @param event Event type
     * @param payload Event payload
     */
    emit<T = any>(event: EventType, payload: T): boolean {
        return super.emit(event, payload);
    }

    /**
     * Subscribe to a typed event.
     *
     * @param event Event type
     * @param listener Event listener function
     * @returns Disposable for unsubscribing
     */
    subscribe<T = any>(event: EventType, listener: EventListener<T>): Disposable {
        super.on(event, listener);
        return {
            dispose: () => this.off(event, listener),
        };
    }

    /**
     * Subscribe to a typed event (one-time).
     *
     * @param event Event type
     * @param listener Event listener function
     * @returns Disposable for unsubscribing
     */
    subscribeOnce<T = any>(event: EventType, listener: EventListener<T>): Disposable {
        super.once(event, listener);
        return {
            dispose: () => this.off(event, listener),
        };
    }

    /**
     * Subscribe to a typed event (alias for subscribe, maintains EventEmitter compatibility).
     *
     * @param event Event type
     * @param listener Event listener function
     * @returns this for chaining
     */
    on<T = any>(event: EventType, listener: EventListener<T>): this {
        super.on(event, listener);
        return this;
    }

    /**
     * Subscribe to a typed event one-time (alias for subscribeOnce, maintains EventEmitter compatibility).
     *
     * @param event Event type
     * @param listener Event listener function
     * @returns this for chaining
     */
    once<T = any>(event: EventType, listener: EventListener<T>): this {
        super.once(event, listener);
        return this;
    }

    /**
     * Unsubscribe from an event.
     *
     * @param event Event type
     * @param listener Event listener function
     */
    off<T = any>(event: EventType, listener: EventListener<T>): this {
        return super.off(event, listener);
    }

    /**
     * Remove all listeners for an event.
     *
     * @param event Event type (optional, removes all if not specified)
     */
    removeAllListeners(event?: EventType): this {
        return super.removeAllListeners(event);
    }

    /**
     * Dispose the event bus and remove all listeners.
     */
    dispose(): void {
        this.removeAllListeners();
    }
}
