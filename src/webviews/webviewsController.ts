import type { Disposable, WebviewPanel, WebviewView } from 'vscode';
import * as vscode from 'vscode';
import { Disposable as VSCodeDisposable, Uri, ViewColumn, window } from 'vscode';

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
import type { WebviewPanelDescriptor, WebviewViewDescriptor } from './webviewDescriptors.js';
import { WebviewController } from './webviewController.js';
import type { WebviewProvider, WebviewHost } from './webviewProvider.js';

export class WebviewsController implements Disposable {
    private readonly disposables: Disposable[] = [];
    private readonly _panels = new Map<string, Map<string | undefined, WebviewController>>();

    constructor(private readonly context: vscode.ExtensionContext) { }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }

    registerWebviewPanel<State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
        descriptor: WebviewPanelDescriptor,
        resolveProvider: (host: WebviewHost) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>,
    ): any {
        const disposables: Disposable[] = [];
        const context = this.context;

        const show = async (options?: { column?: ViewColumn; preserveFocus?: boolean }, ...args: unknown[]) => {
            const column = options?.column ?? descriptor.column ?? ViewColumn.Beside;

            let panel: WebviewPanel | undefined;
            let controller: WebviewController | undefined;

            // Check for existing panel
            const existingControllers = this._panels.get(descriptor.id);
            if (existingControllers && existingControllers.size > 0) {
                controller = Array.from(existingControllers.values())[0];
                panel = controller.parent as WebviewPanel;
            }

            if (!panel) {
                panel = window.createWebviewPanel(
                    descriptor.id,
                    descriptor.title,
                    { viewColumn: column, preserveFocus: options?.preserveFocus ?? false },
                    {
                        enableCommandUris: true,
                        enableScripts: true,
                        localResourceRoots: [Uri.file(this.context.extensionPath)],
                        ...descriptor.webviewOptions,
                        ...descriptor.webviewHostOptions,
                    },
                );

                panel.iconPath = Uri.file(this.context.asAbsolutePath(descriptor.iconPath));

                const instanceId = uuid();
                controller = new WebviewController(
                    this.context,
                    descriptor,
                    instanceId,
                    panel,
                    resolveProvider,
                );

                if (!this._panels.has(descriptor.id)) {
                    this._panels.set(descriptor.id, new Map());
                }
                this._panels.get(descriptor.id)!.set(controller.instanceId, controller);

                disposables.push(
                    controller.parent.onDidDispose(() => {
                        this._panels.get(descriptor.id)?.delete(controller!.instanceId);
                    }),
                    controller,
                );
            }

            if (controller) {
                await controller.show(true, options, ...args);
            }
        };

        const disposable = VSCodeDisposable.from(
            ...disposables,
            window.registerWebviewPanelSerializer(descriptor.id, {
                async deserializeWebviewPanel(panel: WebviewPanel, state: SerializedState) {
                    const instanceId = uuid();
                    const controller = new WebviewController(
                        context,
                        descriptor,
                        instanceId,
                        panel,
                        resolveProvider,
                    );
                    await controller.show(true, { column: panel.viewColumn, preserveFocus: true }, { state });
                },
            }),
        );

        this.disposables.push(disposable);
        const result = {
            show,
            dispose: () => disposable.dispose(),
        } as any;
        return result;
    }
}
