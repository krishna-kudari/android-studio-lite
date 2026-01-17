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
import { Device } from "../utils/adbParser";

@injectable()
export class LogcatService extends Service {
    private logcatProcess: ChildProcess | null = null;
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
        const adbPath = configService.getAdbPath();
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
        await this.avdService.refreshDevices(true);

        // Try to get selected AVD first (preferred)
        const selectedAVD = this.avdService.getSelectedAVD();
        let selectedDevice: Device | null = null;

        if (selectedAVD) {
            // Use deviceId from unified model
            if (selectedAVD.deviceId) {
                selectedDevice = this.avdService.getSelectedDevice();
            }

            // If deviceId is null but AVD is selected, try to find the running device
            // This handles the case where device mapping wasn't updated yet
            if (!selectedDevice) {
                selectedDevice = await this.avdService.getSelectedEmulatorDevice();
            }

            if (!selectedDevice) {
                vscode.window.showWarningMessage(
                    `AVD ${selectedAVD.name} is not running. Please start the emulator first.`
                );
                return;
            }
        } else {
            // Fallback to existing device selection logic (for physical devices or legacy)
            selectedDevice = this.avdService.getSelectedDevice();
            if (!selectedDevice) {
                const onlineDevices = this.avdService.getOnlineDevices();
                if (onlineDevices.length > 0) {
                    await this.avdService.selectDevice(onlineDevices[0].id);
                    selectedDevice = onlineDevices[0];
                }
            }
        }

        if (!selectedDevice) {
            vscode.window.showWarningMessage('No device selected. Please select a device first.');
            return;
        }

        // Validate module is selected
        const selectedModule = this.buildVariantService.getSelectedModule();
        if (!selectedModule) {
            console.log('no selected module, showing warning');
            vscode.window.showWarningMessage('No module selected. Please select a module first.');
            return;
        }

        // Get applicationId
        const applicationId = this.buildVariantService.getSelectedModuleApplicationId();
        if (!applicationId) {
            console.log('no applicationId found for module, showing warning');
            vscode.window.showWarningMessage(`No applicationId found for module ${selectedModule}.`);
            return;
        }

        console.log('applicationId found', applicationId);

        // Stop existing process if any
        this.stop();
        console.log('logcat process stopped');

        // Clear output channel (fallback)
        this.outputChannel.clear();
        console.log('output channel cleared');
        // Clear webview if callback is registered
        if (this.webviewMessageCallback) {
            this.webviewMessageCallback('clear');
        }

        try {
            const deviceId = selectedDevice.id;

            // Get command from ADBExecutable
            const commandProp = this.adbExecutable.getCommand(Command.logcat);

            // Build command string using ADBExecutable
            const command = this.adbExecutable.getCmd(commandProp, deviceId, applicationId, '-T 1 *:V');

            console.log('command', command);

            // Spawn process directly (we need to keep it running, so we can't use exec which waits for completion)
            this.logcatProcess = spawn(command, {
                shell: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Handle stdout
            if (this.logcatProcess.stdout) {
                this.logcatProcess.stdout.on('data', (data: Buffer) => {
                        const text = data.toString();
                        // Send to webview if callback is registered, otherwise fallback to output channel
                        if (this.webviewMessageCallback) {
                            this.webviewMessageCallback(text);
                        } else {
                        this.outputChannel.append(text);
                    }
                });
            }

            // Handle stderr (some logcat output goes to stderr)
            if (this.logcatProcess.stderr) {
                this.logcatProcess.stderr.on('data', (data: Buffer) => {
                    const text = data.toString();
                    // Filter out error messages, process as logs
                    if (!text.includes('error') && !text.includes('Error') && !text.includes('ERROR')) {
                            // Send to webview if callback is registered, otherwise fallback to output channel
                            if (this.webviewMessageCallback) {
                                this.webviewMessageCallback(text);
                            } else {
                            this.outputChannel.append(text);
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
        if (!this.logcatProcess) return;
        this.logcatProcess.kill();
        this.logcatProcess = null;
        this.output.show();
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
