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
    private readonly _views = new Map<string, WebviewController>();

    constructor(private readonly context: vscode.ExtensionContext) { }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }

    registerWebviewView<State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
        descriptor: WebviewViewDescriptor,
        resolveProvider: (host: WebviewHost) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>,
    ): Disposable {
        const context = this.context;
        const views = this._views;

        const disposable = VSCodeDisposable.from(
            window.registerWebviewViewProvider(
                descriptor.id,
                {
                    async resolveWebviewView(
                        webviewView: WebviewView,
                        _context: vscode.WebviewViewResolveContext,
                        _token: vscode.CancellationToken,
                    ) {
                        // Set webview options before creating controller
                        webviewView.webview.options = {
                            enableCommandUris: true,
                            enableScripts: true,
                            localResourceRoots: [Uri.file(context.extensionPath)],
                            ...descriptor.webviewOptions,
                        };

                        webviewView.title = descriptor.title;

                        const instanceId = uuid();
                        const controller = new WebviewController(
                            context,
                            descriptor,
                            instanceId,
                            webviewView,
                            resolveProvider,
                        );

                        try {
                            await controller.show(true);
                            // Store controller for later access if needed
                            if (!views.has(descriptor.id)) {
                                views.set(descriptor.id, controller);
                            }
                        } catch (error) {
                            console.error(`[WebviewsController] Error showing webview view ${descriptor.id}:`, error);
                            throw error;
                        }
                    },
                },
                descriptor.webviewHostOptions != null ? { webviewOptions: descriptor.webviewHostOptions } : undefined,
            ),
        );

        this.disposables.push(disposable);
        return disposable;
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
