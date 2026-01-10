import type { Disposable } from 'vscode';
import type { WebviewState } from './protocol.js';

export type WebviewShowingArgs<T extends unknown[], SerializedState> = T | [{ state: Partial<SerializedState> }] | [];

export interface WebviewProvider<
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[],
> extends Disposable {
    /**
     * Determines whether the webview instance can be reused
     */
    canReuseInstance?(...args: WebviewShowingArgs<ShowingArgs, SerializedState>): boolean | undefined;

    getTelemetryContext(): Record<string, string | number | boolean | undefined>;

    onShowing?(
        loading: boolean,
        ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
    ): [boolean] | Promise<[boolean]>;

    registerCommands?(): Disposable[];

    includeBootstrap?(deferrable?: boolean): SerializedState | Promise<SerializedState>;
    includeHead?(): string | Promise<string>;
    includeBody?(): string | Promise<string>;
    includeEndOfBody?(): string | Promise<string>;

    onReady?(): void | Promise<void>;
    onRefresh?(force?: boolean): void;
    onReloaded?(): void;
    onMessageReceived?(e: any): void;
    onActiveChanged?(active: boolean): void;
    onFocusChanged?(focused: boolean): void;
    onVisibilityChanged?(visible: boolean): void;
    onWindowFocusChanged?(focused: boolean): void;
}

export interface WebviewHost {
    readonly id: string;
    readonly instanceId: string;
    readonly originalTitle: string;
    title: string;
    readonly active: boolean | undefined;
    readonly ready: boolean;
    readonly visible: boolean;
    readonly baseWebviewState: WebviewState;
    readonly cspNonce: string;

    getWebRoot(): string;
    asWebviewUri(uri: any): any;

    notify(type: string, params: any, completionId?: string): Promise<boolean>;
    refresh(force?: boolean): Promise<void>;
    respond(type: string, msg: any, params: any): Promise<boolean>;
    show(loading: boolean, options?: any, ...args: unknown[]): Promise<void>;
}
