import * as vscode from 'vscode';
import { BuildVariantService } from '../service/BuildVariantService';
import { subscribe } from '../module';
import { BuildVariantTreeDataProvider } from './BuildVariantTreeDataProvider';
import { EventBus, EventType } from '../events';
import { resolve, TYPES } from '../di';

export class BuildVariantTreeView {
    readonly provider: BuildVariantTreeDataProvider;
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor(context: vscode.ExtensionContext, private buildVariantService: BuildVariantService) {
        this.provider = new BuildVariantTreeDataProvider(this.buildVariantService, context);

        const view = vscode.window.createTreeView('android-studio-lite-build-variant', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        });

        // Setup file watcher for build.gradle files
        this.setupFileWatcher(context);

        const subscriptions: vscode.Disposable[] = [view];

        // Add file watcher to subscriptions if it exists
        if (this.fileWatcher) {
            subscriptions.push(this.fileWatcher);
        }

        subscribe(context, subscriptions);

        // Subscribe to EventBus events for auto-refresh
        this.setupEventSubscriptions(context);
    }

    private setupEventSubscriptions(context: vscode.ExtensionContext): void {
        try {
            const eventBus = resolve<EventBus>(TYPES.EventBus);

            // Subscribe to build variant change events for auto-refresh
            context.subscriptions.push(
                eventBus.subscribe(EventType.BuildVariantChanged, () => {
                    this.provider.refresh();
                })
            );
        } catch (error) {
            console.error('[BuildVariantTreeView] Failed to setup EventBus subscriptions:', error);
        }
    }

    private setupFileWatcher(context: vscode.ExtensionContext) {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            return;
        }

        // Watch for build.gradle and build.gradle.kts files
        const pattern = new vscode.RelativePattern(
            workspacePath,
            '**/{build.gradle,build.gradle.kts}'
        );

        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.fileWatcher.onDidChange(() => {
            console.log('[BuildVariantTreeView] build.gradle file changed, clearing cache');
            this.buildVariantService.clearCache();
            this.provider.refresh();
        });

        this.fileWatcher.onDidCreate(() => {
            console.log('[BuildVariantTreeView] build.gradle file created, clearing cache');
            this.buildVariantService.clearCache();
            this.provider.refresh();
        });

        this.fileWatcher.onDidDelete(() => {
            console.log('[BuildVariantTreeView] build.gradle file deleted, clearing cache');
            this.buildVariantService.clearCache();
            this.provider.refresh();
        });
    }

    getSelectedBuildVariant(context: vscode.ExtensionContext, moduleName: string): string | undefined {
        const selectedVariants = context.workspaceState.get<Record<string, string>>(
            this.buildVariantService.STORAGE_KEY_MODULE_VARIANT,
            {}
        );
        return selectedVariants[moduleName];
    }
}




