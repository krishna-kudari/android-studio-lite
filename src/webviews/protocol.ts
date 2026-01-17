export interface WebviewState {
    webviewId: string;
    webviewInstanceId: string | undefined;
    timestamp: number;
}

export interface WebviewReadyParams {
    bootstrap?: boolean;
}

export interface WebviewReadyResponse {
    state?: unknown | Promise<unknown>;
}

export interface WebviewFocusChangedParams {
    focused: boolean;
    inputFocused: boolean;
}

export interface ExecuteCommandParams {
    command: string;
    args?: unknown[];
}

export interface OnboardingState extends WebviewState {
    hasSdk: boolean;
    sdkPath?: string;
    platform: 'darwin' | 'win32' | 'linux';
    sdkInfo?: {
        hasCommandLineTools: boolean;
        hasPlatformTools: boolean;
        hasBuildTools: boolean;
        hasEmulator: boolean;
    };
}
