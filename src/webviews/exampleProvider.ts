import type { Disposable } from 'vscode';
import { Disposable as VSCodeDisposable } from 'vscode';
import type { WebviewProvider, WebviewHost } from './webviewProvider.js';
import type { WebviewState } from './protocol.js';
import { Manager } from '../core';
import type { AVD } from '../cmd/AVDManager';

export interface ExampleWebviewState extends WebviewState {
    avds?: AVD[];
    selectedAVD?: string;
}

export class ExampleWebviewProvider implements WebviewProvider<ExampleWebviewState> {
    private readonly disposables: Disposable[] = [];
    private readonly manager: Manager;

    constructor(private readonly host: WebviewHost) {
        this.manager = Manager.getInstance();
    }

    getTelemetryContext(): Record<string, string | number | boolean | undefined> {
        return {
            'webview.id': this.host.id,
            'webview.instanceId': this.host.instanceId,
        };
    }

    async includeBootstrap(): Promise<ExampleWebviewState> {
        const avds = await this.manager.avd.getAVDList();
        const avdList = avds || [];
        const selectedAVD = avdList.length > 0 ? avdList[0].name : undefined;

        return {
            ...this.host.baseWebviewState,
            avds: avdList,
            selectedAVD,
        };
    }

    async onReady(): Promise<void> {
        console.log('[ExampleWebview] Ready');
        // Send initial AVD list
        await this.sendAVDList();
    }

    onMessageReceived?(e: any): void {
        if (e.type === 'refresh-avds') {
            void this.sendAVDList();
        } else if (e.type === 'select-avd') {
            const { avdName } = e.params || {};
            if (avdName) {
                void this.host.notify('avd-selected', { avdName });
            }
        }
    }

    async onRefresh?(force?: boolean): Promise<void> {
        if (force) {
            await this.manager.avd.getAVDList(true);
        }
        await this.sendAVDList();
    }

    private async sendAVDList(): Promise<void> {
        const avds = await this.manager.avd.getAVDList();
        const avdList = avds || [];
        await this.host.notify('update-avds', { avds: avdList });
    }

    registerCommands(): Disposable[] {
        return [];
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
