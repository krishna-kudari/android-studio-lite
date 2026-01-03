import * as vscode from 'vscode';
import { LogcatService, LogcatFilter } from '../services/logcatService';
import { LogcatLine, formatLogcatLine, LogLevel } from '../utils/logcatParser';
import { DeviceService } from '../services/deviceService';
import { getPackageName } from '../utils/manifestParser';
import { GradleService } from '../services/gradleService';

export class LogcatProvider {
    private outputChannel: vscode.OutputChannel;
    private logcatService: LogcatService;
    private currentFilter: LogcatFilter = {};
    private isStreaming: boolean = false;
    private onStateChange?: () => void;

    constructor(
        private deviceService: DeviceService,
        private adbService: any,
        private gradleService: GradleService
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Logcat');
        // Configure output channel to preserve focus and allow horizontal scrolling
        this.logcatService = new LogcatService(adbService);
    }

    /**
     * Set callback for state changes
     */
    public setStateChangeCallback(callback: () => void): void {
        this.onStateChange = callback;
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    /**
     * Start logcat streaming
     */
    public async start(): Promise<void> {
        const selectedDevice = this.deviceService.getSelectedDevice();
        if (!selectedDevice) {
            vscode.window.showWarningMessage('No device selected. Please select a device first.');
            return;
        }

        // Get package name for filtering
        try {
            const workspaceRoot = this.gradleService.getWorkspaceRoot();
            const packageName = getPackageName(workspaceRoot);
            if (packageName) {
                this.currentFilter.packageName = packageName;
            }
        } catch {
            // Ignore errors, continue without package filter
        }

        // Clear previous logs
        this.outputChannel.clear();
        this.logcatService.clearBuffer();

        try {
            await this.logcatService.start(
                selectedDevice.id,
                this.currentFilter,
                (logLine) => {
                    this.appendLog(logLine);
                }
            );

            this.isStreaming = true;
            this.outputChannel.show(true); // Show and preserve focus
            this.notifyStateChange();
            vscode.window.showInformationMessage('Logcat started');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to start logcat: ${error.message}`);
            this.isStreaming = false;
            this.notifyStateChange();
        }
    }

    /**
     * Stop logcat streaming
     */
    public stop(): void {
        this.logcatService.stop();
        this.isStreaming = false;
        this.notifyStateChange();
        vscode.window.showInformationMessage('Logcat stopped');
    }

    /**
     * Pause logcat streaming
     */
    public pause(): void {
        this.logcatService.pause();
        this.notifyStateChange();
        vscode.window.showInformationMessage('Logcat paused');
    }

    /**
     * Resume logcat streaming
     */
    public resume(): void {
        this.logcatService.resume();
        this.notifyStateChange();
        vscode.window.showInformationMessage('Logcat resumed');
    }

    /**
     * Clear logcat output
     */
    public clear(): void {
        this.outputChannel.clear();
        this.logcatService.clearBuffer();
    }

    /**
     * Set log level filter
     */
    public setLogLevel(level: LogLevel): void {
        this.currentFilter.level = level;
        // Restart with new filter
        if (this.isStreaming) {
            this.stop();
            this.start();
        }
    }

    /**
     * Set tag filter
     */
    public setTagFilter(tag: string): void {
        this.currentFilter.tag = tag;
        // Restart with new filter
        if (this.isStreaming) {
            this.stop();
            this.start();
        }
    }

    /**
     * Append log line to output channel
     */
    private appendLog(logLine: LogcatLine): void {
        // Format in Android Studio style with colors (VS Code supports ANSI codes)
        const formatted = formatLogcatLine(logLine, true, true, true);
        this.outputChannel.appendLine(formatted);
    }

    /**
     * Get output channel
     */
    public getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }

    /**
     * Check if streaming
     */
    public isStreamingActive(): boolean {
        return this.isStreaming && this.logcatService.isRunning();
    }

    /**
     * Check if paused
     */
    public isPaused(): boolean {
        return this.logcatService.getPaused();
    }
}

