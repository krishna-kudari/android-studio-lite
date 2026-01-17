import type { WebviewProvider, WebviewHost } from '../../webviewProvider.js';
import type { WebviewState } from '../../protocol.js';
import { Disposable } from 'vscode';
import { TYPES } from '../../../di';
import { resolve } from '../../../di/container';
import { LogcatService } from '../../../service/Logcat';

export class LogcatWebviewProvider implements WebviewProvider<WebviewState> {
    private logcatService: LogcatService | null = null;

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
    }
}
