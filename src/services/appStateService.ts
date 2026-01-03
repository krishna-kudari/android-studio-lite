import * as vscode from 'vscode';

export type AppState = 'idle' | 'installing' | 'running';

export class AppStateService {
    private state: AppState = 'idle';
    private stateChangeEmitter: vscode.EventEmitter<AppState> = new vscode.EventEmitter<AppState>();
    public readonly onStateChange: vscode.Event<AppState> = this.stateChangeEmitter.event;

    /**
     * Get current app state
     */
    public getState(): AppState {
        return this.state;
    }

    /**
     * Set app state
     */
    public setState(newState: AppState): void {
        if (this.state !== newState) {
            this.state = newState;
            this.stateChangeEmitter.fire(newState);
        }
    }

    /**
     * Check if app is installing
     */
    public isInstalling(): boolean {
        return this.state === 'installing';
    }

    /**
     * Check if app is running
     */
    public isRunning(): boolean {
        return this.state === 'running';
    }

    /**
     * Check if app is idle
     */
    public isIdle(): boolean {
        return this.state === 'idle';
    }
}

