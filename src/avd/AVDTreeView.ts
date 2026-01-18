import * as vscode from 'vscode';
import { AVDService } from '../service/AVDService';
import { subscribe } from '../module';
import { AVDTreeDataProvider } from './AVDTreeDataProvider';
import { EventBus, EventType } from '../events';
import { resolve, TYPES } from '../di';

export class AVDTreeView {
    readonly provider: AVDTreeDataProvider;

    constructor(context: vscode.ExtensionContext, private avdService: AVDService) {
        this.provider = new AVDTreeDataProvider(this.avdService);

        const view = vscode.window.createTreeView('android-studio-lite-avd', { treeDataProvider: this.provider, showCollapseAll: true });

        subscribe(context, [view]);

        // Subscribe to EventBus events for auto-refresh
        this.setupEventSubscriptions(context);
    }

    private setupEventSubscriptions(context: vscode.ExtensionContext): void {
        try {
            const eventBus = resolve<EventBus>(TYPES.EventBus);

            // Subscribe to AVD events for auto-refresh
            context.subscriptions.push(
                eventBus.subscribe(EventType.AVDCreated, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.AVDDeleted, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.AVDSelected, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.AVDStarted, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.AVDStopped, () => {
                    this.provider.refresh();
                })
            );

            // Subscribe to device events for auto-refresh
            context.subscriptions.push(
                eventBus.subscribe(EventType.DeviceConnected, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.DeviceDisconnected, () => {
                    this.provider.refresh();
                })
            );

            context.subscriptions.push(
                eventBus.subscribe(EventType.DeviceSelected, () => {
                    this.provider.refresh();
                })
            );
        } catch (error) {
            console.error('[AVDTreeView] Failed to setup EventBus subscriptions:', error);
        }
    }
}

