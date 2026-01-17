import { inject, injectable } from "tsyringe";
import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { ConfigService } from "../config";
import { TYPES } from "../di";
import { Output } from "../module/output";
import { Service } from "./Service";
import { Cache } from "../module/cache";
import { AVDService } from "./AVDService";
import { BuildVariantService } from "./BuildVariantService";
import { ADBExecutable, Command } from "../cmd/ADB";

@injectable()
export class LogcatService extends Service {
    private logcatProcess: ChildProcess | null = null;
    private _isPaused: boolean = false;
    private outputChannel: vscode.OutputChannel;
    private readonly adbExecutable: ADBExecutable;
    private webviewMessageCallback: ((message: string) => void) | null = null;

    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output,
        @inject(TYPES.AVDService) private readonly avdService: AVDService,
        @inject(TYPES.BuildVariantService) private readonly buildVariantService: BuildVariantService
    ) {
        super(cache, configService, output);
        this.outputChannel = vscode.window.createOutputChannel('Logcat');
        // Get ADB path from config, fallback to 'adb' if not configured
        const adbPath = configService.getAdbPath() || 'adb';
        this.adbExecutable = new ADBExecutable(output, adbPath);
    }

    /**
     * Register a callback to send messages to the webview
     */
    setWebviewMessageCallback(callback: (message: string) => void): void {
        this.webviewMessageCallback = callback;
    }

    /**
     * Unregister the webview message callback
     */
    clearWebviewMessageCallback(): void {
        this.webviewMessageCallback = null;
    }

    /**
     * Start logcat streaming
     */
    async start(): Promise<void> {
        // Refresh devices to ensure we have the latest device list
        await this.avdService.refreshDevices(true);

        // Check if we have a selected device ID
        let selectedDeviceId = this.avdService.getSelectedDeviceId();

        // If no device ID but we have an AVD name, try to auto-select based on AVD name
        if (!selectedDeviceId) {
            const selectedAVDName = this.avdService.getSelectedAVDName();
            if (selectedAVDName) {
                // Refresh again to trigger auto-selection logic
                await this.avdService.refreshDevices(true);
                selectedDeviceId = this.avdService.getSelectedDeviceId();
            }
        }

        // If still no device ID, try to select the first online device
        if (!selectedDeviceId) {
            const onlineDevices = this.avdService.getOnlineDevices();
            if (onlineDevices.length > 0) {
                // Auto-select first online device
                await this.avdService.selectDevice(onlineDevices[0].id);
                selectedDeviceId = onlineDevices[0].id;
            }
        }

        // Validate device is selected
        if (!selectedDeviceId) {
            vscode.window.showWarningMessage('No device selected. Please select a device first.');
            return;
        }

        // Get the selected device
        const selectedDevice = this.avdService.getSelectedDevice();
        if (!selectedDevice) {
            vscode.window.showWarningMessage(`Selected device ${selectedDeviceId} is not online or not found. Please ensure the device is connected and try again.`);
            return;
        }

        // Validate module is selected
        const selectedModule = this.buildVariantService.getSelectedModule();
        if (!selectedModule) {
            vscode.window.showWarningMessage('No module selected. Please select a module first.');
            return;
        }

        // Get applicationId
        const applicationId = this.buildVariantService.getSelectedModuleApplicationId();
        if (!applicationId) {
            vscode.window.showWarningMessage(`No applicationId found for module ${selectedModule}.`);
            return;
        }

        // Stop existing process if any
        this.stop();

        // Clear output channel (fallback)
        this.outputChannel.clear();
        // Clear webview if callback is registered
        if (this.webviewMessageCallback) {
            this.webviewMessageCallback('clear');
        }
        this._isPaused = false;

        try {
            const deviceId = selectedDevice.id;

            // Get command from ADBExecutable
            const commandProp = this.adbExecutable.getCommand(Command.logcat);
            if (!commandProp || !commandProp.command) {
                throw new Error('Logcat command not found in ADBExecutable');
            }

            // Build command string using ADBExecutable
            const command = this.adbExecutable.getCmd(commandProp, deviceId, applicationId, '*:V');

            // Spawn process directly (we need to keep it running, so we can't use exec which waits for completion)
            this.logcatProcess = spawn(command, {
                shell: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Handle stdout
            if (this.logcatProcess.stdout) {
                this.logcatProcess.stdout.on('data', (data: Buffer) => {
                    if (!this._isPaused) {
                        const text = data.toString();
                        // Send to webview if callback is registered, otherwise fallback to output channel
                        if (this.webviewMessageCallback) {
                            this.webviewMessageCallback(text);
                        } else {
                            this.outputChannel.append(text);
                        }
                    }
                });
            }

            // Handle stderr (some logcat output goes to stderr)
            if (this.logcatProcess.stderr) {
                this.logcatProcess.stderr.on('data', (data: Buffer) => {
                    const text = data.toString();
                    // Filter out error messages, process as logs
                    if (!text.includes('error') && !text.includes('Error') && !text.includes('ERROR')) {
                        if (!this._isPaused) {
                            // Send to webview if callback is registered, otherwise fallback to output channel
                            if (this.webviewMessageCallback) {
                                this.webviewMessageCallback(text);
                            } else {
                                this.outputChannel.append(text);
                            }
                        }
                    } else {
                        console.error(`[Logcat] stderr: ${text}`);
                    }
                });
            }

            // Handle process errors
            this.logcatProcess.on('error', (error) => {
                console.error('[Logcat] Process error:', error);
                vscode.window.showErrorMessage(`Logcat error: ${error.message}`);
                this.logcatProcess = null;
            });

            // Handle process exit
            this.logcatProcess.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.log(`[Logcat] Process exited with code ${code}`);
                }
                this.logcatProcess = null;
            });

            // Show output channel only if webview callback is not registered (fallback)
            if (!this.webviewMessageCallback) {
                this.outputChannel.show(true);
            }
            vscode.window.showInformationMessage('Logcat started');
        } catch (error: any) {
            console.error('[Logcat] Error starting logcat:', error);
            vscode.window.showErrorMessage(`Failed to start logcat: ${error.message || String(error)}`);
            this.logcatProcess = null;
            throw error;
        }
    }

    /**
     * Stop logcat streaming
     */
    stop(): void {
        if (this.logcatProcess) {
            this.logcatProcess.kill();
            this.logcatProcess = null;
        }
        this._isPaused = false;
    }

    /**
     * Pause logcat streaming
     */
    pause(): void {
        this._isPaused = true;
    }

    /**
     * Resume logcat streaming
     */
    resume(): void {
        this._isPaused = false;
    }

    /**
     * Clear output channel
     */
    clear(): void {
        this.outputChannel.clear();
        // Clear webview if callback is registered
        if (this.webviewMessageCallback) {
            this.webviewMessageCallback('clear');
        }
    }

    /**
     * Check if logcat is running
     */
    isRunning(): boolean {
        return this.logcatProcess !== null;
    }

    /**
     * Check if logcat is paused
     */
    isPaused(): boolean {
        return this._isPaused;
    }

    /**
     * Get output channel
     */
    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }

    /**
     * Set log level (placeholder for future filtering)
     */
    setLogLevel(_level: string): void {
        // No-op for now
    }
}
