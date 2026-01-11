import type { ViewColumn, WebviewOptions, WebviewPanelOptions } from 'vscode';

export interface WebviewPanelDescriptor {
    id: string;
    readonly fileName: string;
    readonly iconPath: string;
    readonly title: string;
    readonly contextKeyPrefix: string;
    readonly column?: ViewColumn;
    readonly webviewOptions?: WebviewOptions;
    readonly webviewHostOptions?: WebviewPanelOptions;
    readonly allowMultipleInstances?: boolean;
}

export interface WebviewViewDescriptor {
    id: string;
    readonly fileName: string;
    readonly title: string;
    readonly webviewOptions?: WebviewOptions;
    readonly webviewHostOptions?: {
        readonly retainContextWhenHidden?: boolean;
    };
    readonly allowMultipleInstances?: never;
}
