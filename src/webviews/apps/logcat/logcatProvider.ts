import { Disposable } from 'vscode';
import { TYPES } from '../../../di';
import { resolve } from '../../../di/container';
import { EventBus, EventType, LogcatEventPayload } from '../../../events';
import { LogcatService } from '../../../service/Logcat';
import type { WebviewState } from '../../protocol.js';
import type { WebviewHost, WebviewProvider } from '../../webviewProvider.js';

export class LogcatWebviewProvider implements WebviewProvider<WebviewState> {
    private logcatService: LogcatService | null = null;
    private readonly disposables: Disposable[] = [];
    private eventBus: EventBus | null = null;

    constructor(private readonly host: WebviewHost) {
        // Get LogcatService from DI container
        try {
            this.logcatService = resolve<LogcatService>(TYPES.LogcatService);
            // Register webview callback with LogcatService
            this.logcatService.setWebviewMessageCallback((message: string) => {
                this.sendLogcatMessage(message);
            });
        } catch (error) {
            console.error('[LogcatWebviewProvider] Failed to resolve LogcatService:', error);
        }

        // Get EventBus from DI container and subscribe to events
        try {
            this.eventBus = resolve<EventBus>(TYPES.EventBus);
            this.setupEventSubscriptions();
        } catch (error) {
            console.error('[LogcatWebviewProvider] Failed to resolve EventBus:', error);
        }
    }

    private setupEventSubscriptions(): void {
        if (!this.eventBus) return;

        // Subscribe to logcat lifecycle events
        this.disposables.push(
            this.eventBus.subscribe(EventType.LogcatStarted, async (payload: LogcatEventPayload) => {
                await this.host.notify('logcat-started', payload);
            })
        );

        this.disposables.push(
            this.eventBus.subscribe(EventType.LogcatStopped, async (payload: LogcatEventPayload) => {
                await this.host.notify('logcat-stopped', payload);
            })
        );

        this.disposables.push(
            this.eventBus.subscribe(EventType.LogcatCleared, async (payload: LogcatEventPayload) => {
                await this.host.notify('logcat-cleared', payload);
            })
        );

        this.disposables.push(
            this.eventBus.subscribe(EventType.LogcatLevelChanged, async (payload: LogcatEventPayload) => {
                await this.host.notify('logcat-level-changed', payload);
            })
        );
    }

    getTelemetryContext() {
        return { 'webview.id': this.host.id };
    }

    includeBootstrap(): WebviewState {
        return this.host.baseWebviewState;
    }

    onReady(): void {
        console.log('Logcat webview ready');
    }

    private async sendLogcatMessage(message: string): Promise<void> {
        if (this.host.ready) {
            await this.host.notify('logcat-data', { message });
        }
    }

    dispose(): void {
        // Unregister callback when webview is disposed
        if (this.logcatService) {
            this.logcatService.clearWebviewMessageCallback();
        }
        // Dispose event subscriptions
        this.disposables.forEach(d => d.dispose());
    }
}
