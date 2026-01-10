import type { Disposable, Webview, WebviewPanel, WebviewView } from 'vscode';
import { Disposable as VSCodeDisposable, Uri, window, workspace } from 'vscode';
import type { WebviewProvider, WebviewHost } from './webviewProvider.js';
import type { WebviewPanelDescriptor, WebviewViewDescriptor } from './webviewDescriptors.js';
import type { WebviewState } from './protocol.js';

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function base64(str: string): string {
    return Buffer.from(str).toString('base64');
}

export class WebviewController implements WebviewHost, Disposable {
    private _ready: boolean = false;
    private _disposed: boolean = false;
    private disposable: Disposable | undefined;
    private provider!: WebviewProvider<any, any, any>;
    private _providerInitialized: Promise<void>;

    constructor(
        private readonly context: any,
        private readonly descriptor: WebviewPanelDescriptor | WebviewViewDescriptor,
        public readonly instanceId: string,
        public readonly parent: WebviewPanel | WebviewView,
        resolveProvider: (host: WebviewHost) => Promise<WebviewProvider<any, any, any>>,
    ) {
        this.id = descriptor.id;
        this.webview = parent.webview;
        this._originalTitle = descriptor.title;
        parent.title = descriptor.title;

        this._providerInitialized = resolveProvider(this).then(provider => {
            this.provider = provider;
            if (this._disposed) {
                provider.dispose();
                return;
            }

            this.disposable = VSCodeDisposable.from(
                parent.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
                parent.onDidDispose(this.onParentDisposed, this),
                ...(this.provider.registerCommands?.() ?? []),
                this.provider,
            );
        });
    }

    readonly id: string;
    private readonly webview: Webview;
    private _originalTitle: string;

    get originalTitle(): string {
        return this._originalTitle;
    }

    get title(): string {
        return this.parent.title ?? this._originalTitle;
    }

    set title(value: string) {
        this.parent.title = value;
    }

    get ready(): boolean {
        return this._ready;
    }

    get active(): boolean | undefined {
        if ('active' in this.parent) {
            return this._disposed ? false : this.parent.active;
        }
        return this._disposed ? false : undefined;
    }

    get visible(): boolean {
        return this._disposed ? false : this.parent.visible;
    }

    get baseWebviewState(): WebviewState {
        return {
            webviewId: this.id,
            webviewInstanceId: this.instanceId,
            timestamp: Date.now(),
        };
    }

    private readonly _cspNonce = getNonce();
    get cspNonce(): string {
        return this._cspNonce;
    }

    asWebviewUri(uri: Uri): Uri {
        return this.webview.asWebviewUri(uri);
    }

    getWebRoot(): string {
        return this.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'dist', 'webviews')).toString();
    }

    async notify(type: string, params: any, completionId?: string): Promise<boolean> {
        if (!this._ready) return false;
        return this.webview.postMessage({ id: `host:${Date.now()}`, type, params, completionId });
    }

    async respond(type: string, msg: any, params: any): Promise<boolean> {
        return this.notify(type, params, msg.completionId);
    }

    async refresh(force?: boolean): Promise<void> {
        await this._providerInitialized;
        this.provider?.onRefresh?.(force);
        const html = await this.getHtml(this.webview);
        this.webview.html = html;
    }

    async show(loading: boolean, options?: any, ...args: unknown[]): Promise<void> {
        await this._providerInitialized;
        if (loading) {
            this.webview.html = await this.getHtml(this.webview);
        }
    }

    dispose(): void {
        this._disposed = true;
        this.provider?.onFocusChanged?.(false);
        this.provider?.onVisibilityChanged?.(false);
        this._ready = false;
        this.disposable?.dispose();
    }

    private onParentDisposed() {
        this.dispose();
    }

    private async onMessageReceivedCore(e: any) {
        if (e == null) return;

        await this._providerInitialized;

        if (e.type === 'webview/ready') {
            this._ready = true;
            const bootstrap = this.provider?.includeBootstrap?.(false);
            if (bootstrap) {
                await this.respond('webview/ready', e, { state: bootstrap });
            }
            void this.provider?.onReady?.();
            return;
        }

        if (e.type === 'webview/focus/changed') {
            this.provider?.onFocusChanged?.(e.params?.focused ?? false);
            return;
        }

        if (e.type === 'command/execute') {
            const { command, args } = e.params || {};
            if (args) {
                void (window as any).executeCommand(command, ...args);
            } else {
                void (window as any).executeCommand(command);
            }
            return;
        }

        this.provider?.onMessageReceived?.(e);
    }

    private async getHtml(webview: Webview): Promise<string> {
        await this._providerInitialized;
        const webRootUri = Uri.joinPath(this.context.extensionUri, 'dist', 'webviews');
        const uri = Uri.joinPath(webRootUri, this.descriptor.fileName);

        const [bytes, bootstrap, head, body, endOfBody] = await Promise.all([
            workspace.fs.readFile(uri),
            this.provider?.includeBootstrap?.(true),
            this.provider?.includeHead?.(),
            this.provider?.includeBody?.(),
            this.provider?.includeEndOfBody?.(),
        ]);

        const htmlContent = Buffer.from(bytes).toString('utf8');
        const serialized = bootstrap != null ? base64(JSON.stringify(bootstrap)) : '';

        return replaceWebviewHtmlTokens(
            htmlContent,
            this.id,
            this.instanceId,
            webview.cspSource,
            this._cspNonce,
            this.asWebviewUri(this.context.extensionUri).toString(),
            this.getWebRoot(),
            serialized,
            head,
            body,
            endOfBody,
        );
    }
}

function replaceWebviewHtmlTokens(
    html: string,
    webviewId: string,
    webviewInstanceId: string | undefined,
    cspSource: string,
    cspNonce: string,
    root: string,
    webRoot: string,
    bootstrap?: string,
    head?: string,
    body?: string,
    endOfBody?: string,
): string {
    return html.replace(
        /#{(head|body|endOfBody|webviewId|webviewInstanceId|cspSource|cspNonce|root|webroot|state)}/g,
        (_substring: string, token: string) => {
            switch (token) {
                case 'head':
                    return head ?? '';
                case 'body':
                    return body ?? '';
                case 'state':
                    return bootstrap ?? '';
                case 'endOfBody':
                    return `${bootstrap != null
                        ? `<script type="text/javascript" nonce="${cspNonce}">window.bootstrap=${bootstrap};</script>`
                        : ''
                        }${endOfBody ?? ''}`;
                case 'webviewId':
                    return webviewId;
                case 'webviewInstanceId':
                    return webviewInstanceId ?? '';
                case 'cspSource':
                    return cspSource;
                case 'cspNonce':
                    return cspNonce;
                case 'root':
                    return root;
                case 'webroot':
                    return webRoot;
                default:
                    return '';
            }
        },
    );
}
