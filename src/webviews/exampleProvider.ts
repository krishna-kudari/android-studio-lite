import type { Disposable } from 'vscode';
import { Disposable as VSCodeDisposable } from 'vscode';
import type { WebviewProvider, WebviewHost } from './webviewProvider.js';
import type { WebviewState } from './protocol.js';

export class ExampleWebviewProvider implements WebviewProvider<WebviewState> {
    private readonly disposables: Disposable[] = [];

    constructor(private readonly host: WebviewHost) { }

    getTelemetryContext(): Record<string, string | number | boolean | undefined> {
        return {
            'webview.id': this.host.id,
            'webview.instanceId': this.host.instanceId,
        };
    }

    includeBootstrap(): WebviewState {
        return this.host.baseWebviewState;
    }

    onReady(): void {
        console.log('[ExampleWebview] Ready');
    }

    registerCommands(): Disposable[] {
        return [];
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
