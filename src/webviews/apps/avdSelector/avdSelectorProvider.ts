import type { Disposable, ExtensionContext } from 'vscode';
import { Disposable as VSCodeDisposable, window, commands, ProgressLocation, CancellationTokenSource } from 'vscode';
import type { WebviewProvider, WebviewHost } from '@webviews/webviewProvider';
import type { WebviewState } from '@webviews/protocol';
import type { AVD } from '@src/cmd/AVDManager';
import type { MuduleBuildVariant } from '@src/service/BuildVariantService';
import { AVDService } from '@src/service/AVDService';
import { BuildVariantService } from '@src/service/BuildVariantService';
import { GradleService } from '@src/service/GradleService';
import { Output } from '@src/module/output';
import { ConfigService } from '@src/config';

export interface AVDSelectorWebviewState extends WebviewState {
    avds?: AVD[];
    selectedAVD?: string;
    modules?: MuduleBuildVariant[];
    selectedModule?: string;
}

export class AVDSelectorProvider implements WebviewProvider<AVDSelectorWebviewState> {
    private readonly disposables: Disposable[] = [];
    private readonly avdService: AVDService;
    private readonly buildVariantService: BuildVariantService;
    private readonly gradleService: GradleService;
    private readonly output: Output;
    private readonly configService: ConfigService;
    private buildCancellationTokens = new Map<string, CancellationTokenSource>();
    private logcatActive: boolean = false;

    constructor(
        private readonly host: WebviewHost,
        private readonly context: ExtensionContext,
        avdService: AVDService,
        buildVariantService: BuildVariantService,
        gradleService: GradleService,
        output: Output,
        configService: ConfigService
    ) {
        this.avdService = avdService;
        this.buildVariantService = buildVariantService;
        this.gradleService = gradleService;
        this.output = output;
        this.configService = configService;
    }

    getTelemetryContext(): Record<string, string | number | boolean | undefined> {
        return {
            'webview.id': this.host.id,
            'webview.instanceId': this.host.instanceId,
        };
    }

    async includeBootstrap(): Promise<AVDSelectorWebviewState> {
        const avds = await this.avdService.getAVDList();
        const avdList = avds || [];
        let selectedAVD = this.avdService.getSelectedAVDName() || undefined;
        if (!selectedAVD && avdList.length > 0) {
            await this.avdService.setSelectedAVDName(avdList[0].name);
            selectedAVD = avdList[0].name;
        }

        // Get modules and filter for application type
        let modules: MuduleBuildVariant[] = [];
        try {
            const allModules = await this.buildVariantService.getModuleBuildVariants(this.context);
            modules = allModules.filter(m => m.type === 'application');
        } catch (error) {
            console.error('[AVDSelectorProvider] Error loading modules:', error);
        }

        // Get selected module from BuildVariantService
        let selectedModule = this.buildVariantService.getSelectedModule() || undefined;
        // If no module selected, default to first module
        if (!selectedModule && modules.length > 0) {
            selectedModule = modules[0].module;
            await this.buildVariantService.setSelectedModule(selectedModule);
        }

        // Check current logcat state
        try {
            // Try to check if logcat is running by checking if Logcat output channel exists and is visible
            // This is a best-effort check since we don't have direct access to LogcatService here
            this.logcatActive = false; // Default to false, will be updated when user toggles
        } catch (error) {
            console.error('[AVDSelectorProvider] Error checking logcat state:', error);
        }

        return {
            ...this.host.baseWebviewState,
            avds: avdList,
            selectedAVD,
            modules,
            selectedModule,
        };
    }

    async onReady(): Promise<void> {
        console.log('[AVDSelector] Ready');
        // Send initial AVD list and modules
        await this.sendAVDList();
        await this.sendModules();
        // Send initial logcat state
        await this.host.notify('logcat-state-changed', { active: this.logcatActive });
    }

    async onMessageReceived?(e: any): Promise<void> {
        if (e.type === 'refresh-avds') {
            void this.sendAVDList();
        } else if (e.type === 'refresh-modules') {
            void this.sendModules();
        } else if (e.type === 'select-avd') {
            const { avdName } = e.params || {};
            if (avdName) {
                void this.avdService.setSelectedAVDName(avdName);
                void this.host.notify('avd-selected', { avdName });
            }
        } else if (e.type === 'select-module') {
            const { moduleName } = e.params || {};
            if (moduleName) {
                await this.buildVariantService.setSelectedModule(moduleName);
                void this.host.notify('module-selected', { moduleName });
                // Update modules to reflect selected module
                await this.sendModules();
            }
        } else if (e.type === 'run-app') {
            void this.handleRunApp(e.params);
        } else if (e.type === 'cancel-build') {
            void this.handleCancelBuild(e.params);
        } else if (e.type === 'toggle-logcat') {
            void this.handleToggleLogcat(e.params);
        }
    }

    private async handleRunApp(params: any): Promise<void> {
        const { avdName, moduleName, cancellationToken } = params || {};
        if (!avdName || !moduleName) {
            await this.host.notify('build-failed', { error: 'AVD and Module must be selected' });
            return;
        }

        // Create cancellation token
        const cancelToken = new CancellationTokenSource();
        if (cancellationToken) {
            this.buildCancellationTokens.set(cancellationToken, cancelToken);
        }

        try {
            await this.host.notify('build-started', { cancellationToken });

            // Check if AVD is running, boot if not
            await this.ensureAVDRunning(avdName, cancelToken.token);

            if (cancelToken.token.isCancellationRequested) {
                await this.host.notify('build-cancelled', {});
                return;
            }

            // Get selected build variant for the module
            const modules = await this.buildVariantService.getModuleBuildVariants(this.context);
            const module = modules.find(m => m.module === moduleName && m.type === 'application');
            if (!module || !module.variants || module.variants.length === 0) {
                await this.host.notify('build-failed', { error: 'No build variants found for module' });
                return;
            }

            // Get selected variant (use first one as default)
            const selectedVariants = this.context.workspaceState.get<Record<string, string>>(
                this.buildVariantService.STORAGE_KEY_MODULE_VARIANT,
                {}
            );
            const variantName = selectedVariants[moduleName] || module.variants[0].name;
            const variant = module.variants.find(v => v.name === variantName) || module.variants[0];

            // Get install task (e.g., installDebug, installProductionDebug)
            if (!variant.tasks.install) {
                await this.host.notify('build-failed', { error: `No install task found for variant ${variantName}` });
                return;
            }

            const installTask = variant.tasks.install;

            // Build and install using GradleService
            await window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: `Building and installing ${variantName}`,
                    cancellable: true,
                },
                async (progress, token) => {
                    // Link cancellation tokens
                    token.onCancellationRequested(() => {
                        cancelToken.cancel();
                        this.gradleService.cancelBuild();
                    });

                    try {
                        progress.report({ increment: 0, message: `Installing ${installTask}...` });
                        console.log(`[AVDSelectorProvider] Starting gradle install task: ${installTask}`);

                        // Install variant (this will build and install)
                        await this.gradleService.installVariant(
                            installTask,
                            (output) => {
                                // Show progress from Gradle output
                                const lines = output.split('\n').filter(l => l.trim());
                                const lastLine = lines[lines.length - 1];
                                if (lastLine && lastLine.length < 100) {
                                    progress.report({ message: lastLine });
                                }
                            },
                            cancelToken.token
                        );

                        console.log(`[AVDSelectorProvider] Gradle install task completed successfully: ${installTask}`);

                        progress.report({ increment: 90, message: 'Installation completed! Launching app...' });

                        // Launch the app after installation
                        try {
                            const applicationId = variant.applicationId;
                            if (!applicationId) {
                                throw new Error(`No applicationId found for variant ${variantName}. Please ensure the gradle script includes applicationId for application modules.`);
                            }
                            await this.launchApp(applicationId);
                            progress.report({ increment: 100, message: 'App launched successfully!' });
                            window.showInformationMessage(`App installed and launched on ${avdName}`);
                        } catch (launchError: any) {
                            console.error('[AVDSelectorProvider] Error launching app:', launchError);
                            // Don't fail the whole process if launch fails
                            progress.report({ increment: 100, message: 'Installation completed (launch failed)' });
                            window.showWarningMessage(`App installed but failed to launch: ${launchError.message || String(launchError)}`);
                        }

                        await this.host.notify('build-completed', {});
                    } catch (error: any) {
                        if (cancelToken.token.isCancellationRequested || token.isCancellationRequested) {
                            throw new Error('Build was cancelled');
                        }
                        throw error;
                    }
                }
            );
        } catch (error: any) {
            console.error('[AVDSelectorProvider] Error in handleRunApp:', error);
            if (error.name === 'CancellationError' || cancelToken.token.isCancellationRequested || error.message === 'Build was cancelled') {
                await this.host.notify('build-cancelled', {});
                window.showInformationMessage('Build was cancelled');
            } else {
                // Extract error message more reliably
                let errorMessage = this.extractBuildErrorMessage(error);

                console.error('[AVDSelectorProvider] Build failed with error:', errorMessage);
                console.error('[AVDSelectorProvider] Full error object:', error);
                await this.host.notify('build-failed', { error: errorMessage });
                window.showErrorMessage(`Build failed: ${errorMessage}`);
            }
        } finally {
            if (cancellationToken) {
                this.buildCancellationTokens.delete(cancellationToken);
            }
            cancelToken.dispose();
        }
    }

    private async handleCancelBuild(params: any): Promise<void> {
        const { cancellationToken } = params || {};
        if (cancellationToken) {
            const cancelToken = this.buildCancellationTokens.get(cancellationToken);
            if (cancelToken) {
                cancelToken.cancel();
                this.gradleService.cancelBuild();
                this.buildCancellationTokens.delete(cancellationToken);
                await this.host.notify('build-cancelled', {});
            }
        }
    }

    private async handleToggleLogcat(params: any): Promise<void> {
        const { active } = params || {};
        this.logcatActive = active;

        try {
            if (active) {
                // Start logcat and show logcat output channel
                await commands.executeCommand('android-studio-lite.startLogcat');
                // Hide Android Studio Lite output channel
                this.output.hide();
            } else {
                // Stop logcat and show Android Studio Lite output channel
                await commands.executeCommand('android-studio-lite.stopLogcat');
                // Show Android Studio Lite output channel
                this.output.show();
            }
            // Notify webview of state change
            await this.host.notify('logcat-state-changed', { active: this.logcatActive });
        } catch (error: any) {
            console.error('[AVDSelectorProvider] Error toggling logcat:', error);
            // Revert state on error
            this.logcatActive = !active;
            await this.host.notify('logcat-state-changed', { active: this.logcatActive });
            window.showErrorMessage(`Failed to ${active ? 'start' : 'stop'} logcat: ${error.message || String(error)}`);
        }
    }

    private async ensureAVDRunning(avdName: string, cancellationToken: any): Promise<void> {
        // Check if AVD is already running by checking ADB devices
        const isRunning = await this.checkIfAVDRunning(avdName);

        if (isRunning) {
            console.log(`[AVDSelectorProvider] AVD ${avdName} is already running, skipping launch`);
            // Ensure device ID is set even if AVD is already running
            await this.avdService.refreshDevices(true);
            const selectedDeviceId = this.avdService.getSelectedDeviceId();
            if (!selectedDeviceId) {
                // Try to find device by AVD name and select it
                const devices = this.avdService.getOnlineDevices();
                const matchingDevice = devices.find(d => d.avdName === avdName);
                if (matchingDevice) {
                    await this.avdService.selectDevice(matchingDevice.id);
                } else if (devices.length > 0) {
                    // Fallback: select first online device
                    await this.avdService.selectDevice(devices[0].id);
                }
            }
            return;
        }

        console.log(`[AVDSelectorProvider] AVD ${avdName} is not running, launching emulator...`);

        // Launch the emulator with progress notification
        try {
            await window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: `Booting emulator: ${avdName}`,
                    cancellable: false,
                },
                async (progress) => {
                    try {
                        progress.report({ increment: 0, message: 'Starting emulator...' });
                        // Launch emulator (this spawns and returns immediately)
                        await this.avdService.launchEmulator(avdName);

                        // Wait for device to be ready (poll for up to 60 seconds)
                        progress.report({ increment: 30, message: 'Waiting for device...' });
                        let deviceFound = false;
                        for (let i = 0; i < 60; i++) {
                            if (cancellationToken.isCancellationRequested) {
                                throw new Error('Build was cancelled');
                            }

                            await new Promise(resolve => setTimeout(resolve, 1000));
                            const running = await this.checkIfAVDRunning(avdName);
                            if (running) {
                                deviceFound = true;
                                break;
                            }
                            progress.report({
                                increment: 30 + (i / 60) * 40,
                                message: `Waiting for device... (${i + 1}/60)`,
                            });
                        }

                        if (!deviceFound) {
                            throw new Error('Emulator started but device not detected. Please check if emulator is running.');
                        }
                        progress.report({ increment: 100, message: 'Device ready!' });

                        // Refresh devices and ensure device ID is set for the AVD
                        await this.avdService.refreshDevices(true);
                        const selectedDeviceId = this.avdService.getSelectedDeviceId();
                        if (!selectedDeviceId) {
                            // Try to find device by AVD name and select it
                            const devices = this.avdService.getOnlineDevices();
                            const matchingDevice = devices.find(d => d.avdName === avdName);
                            if (matchingDevice) {
                                await this.avdService.selectDevice(matchingDevice.id);
                            } else if (devices.length > 0) {
                                // Fallback: select first online device
                                await this.avdService.selectDevice(devices[0].id);
                            }
                        }

                        // Small delay to ensure notification closes properly
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error: any) {
                        // Re-throw to be caught by outer try-catch
                        throw error;
                    }
                }
            );
        } catch (error: any) {
            console.error('[AVDSelectorProvider] Error launching emulator:', error);
            // Check if error is because emulator is already running
            const errorMessage = error?.message || error?.toString() || String(error);
            if (errorMessage.includes('Running multiple emulators') || errorMessage.includes('already running')) {
                console.log('[AVDSelectorProvider] Emulator appears to be already running, checking again...');
                // Wait a moment and check again
                await new Promise(resolve => setTimeout(resolve, 2000));
                const isRunningNow = await this.checkIfAVDRunning(avdName);
                if (isRunningNow) {
                    console.log('[AVDSelectorProvider] Emulator is now detected as running');
                    return; // Success - emulator is running
                }
            }
            throw error;
        }
    }

    private async launchApp(applicationId: string): Promise<void> {
        // Get the first available emulator device
        const config = this.configService.getConfig();
        const sdkPath = config.sdkPath;
        if (!sdkPath) {
            throw new Error('SDK path not configured');
        }

        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');

        const platformToolsPath = path.join(sdkPath, 'platform-tools');
        const adbPath = path.join(platformToolsPath, process.platform === 'win32' ? 'adb.exe' : 'adb');

        console.log(`[AVDSelectorProvider] Launching app with applicationId: ${applicationId}`);

        // Launch app using monkey command (simpler and more reliable)
        // This will launch the main activity
        const launchCommand = `"${adbPath}" shell monkey -p ${applicationId} -c android.intent.category.LAUNCHER 1`;
        try {
            const result = await execAsync(launchCommand);
            console.log(`[AVDSelectorProvider] App launch command output: ${result.stdout}`);
        } catch (error: any) {
            // Check if it's just a warning about monkey
            if (error.stdout && !error.stdout.includes('Error')) {
                console.log(`[AVDSelectorProvider] App launched (monkey output): ${error.stdout}`);
                return;
            }
            throw new Error(`Failed to launch app: ${error.message || String(error)}`);
        }
    }

    private extractBuildErrorMessage(error: any): string {
        // Extract error message more reliably
        let errorMessage = 'Unknown error';
        if (error?.message) {
            errorMessage = error.message;
        } else if (error?.toString && typeof error.toString === 'function') {
            errorMessage = error.toString();
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = JSON.stringify(error);
        }

        // Try to extract the most relevant error from Gradle output
        // Common patterns:
        // 1. "What went wrong:" followed by error description
        // 2. "FAILURE: Build failed with an exception."
        // 3. Task-specific errors like "Execution failed for task"

        const lines = errorMessage.split('\n');
        const relevantLines: string[] = [];

        // Look for key error indicators
        let captureNext = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Capture "What went wrong:" section
            if (line.includes('What went wrong:') || line.includes('FAILURE:')) {
                captureNext = true;
                if (line.includes('FAILURE:')) {
                    relevantLines.push(line);
                }
                continue;
            }

            // Capture "Execution failed for task" lines
            if (line.includes('Execution failed for task')) {
                relevantLines.push(line);
                captureNext = true;
                continue;
            }

            // Capture lines after "What went wrong:" (usually the actual error)
            if (captureNext && line && !line.startsWith('*') && !line.startsWith('>') && !line.includes('Try:') && !line.includes('Run with')) {
                if (line.length > 0 && !line.match(/^\s*$/)) {
                    relevantLines.push(line);
                    // Stop capturing after we get a meaningful error line
                    if (line.length > 20 && !line.includes('Get more help')) {
                        captureNext = false;
                    }
                }
            }

            // Stop capturing on certain markers
            if (line.includes('Try:') || line.includes('Run with') || line.includes('Get more help')) {
                captureNext = false;
            }
        }

        // If we found relevant lines, use them; otherwise use the original message
        if (relevantLines.length > 0) {
            // Join relevant lines, but limit to first 3-4 most important ones
            const extracted = relevantLines.slice(0, 4).join(' ').trim();
            if (extracted.length > 0) {
                return extracted;
            }
        }

        // Fallback: try to find the first meaningful error line
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed &&
                trimmed.length > 20 &&
                !trimmed.includes('BUILD FAILED') &&
                !trimmed.includes('FAILURE:') &&
                !trimmed.includes('Try:') &&
                !trimmed.includes('Run with') &&
                (trimmed.includes('failed') || trimmed.includes('error') || trimmed.includes('Error'))) {
                return trimmed;
            }
        }

        return errorMessage;
    }

    private async checkIfAVDRunning(avdName: string): Promise<boolean> {
        try {
            // Use ADB to check if device is online
            // Get platform tools path from ConfigService
            const config = this.configService.getConfig();
            const sdkPath = config.sdkPath;

            if (!sdkPath) {
                console.log('[AVDSelectorProvider] No SDK path configured, assuming AVD is not running');
                return false;
            }

            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            const path = await import('path');

            // ADB is in platform-tools directory
            const platformToolsPath = path.join(sdkPath, 'platform-tools');
            const adbPath = path.join(platformToolsPath, process.platform === 'win32' ? 'adb.exe' : 'adb');

            const result = await execAsync(`"${adbPath}" devices`);
            const output = result.stdout;

            // Check if any emulator device is online
            // If any emulator is online, we assume the AVD is running
            // (We can't directly match AVD name to device ID without additional ADB commands)
            const lines = output.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed && !trimmed.startsWith('List of devices');
            });

            for (const line of lines) {
                // Check if line contains an emulator device that's online
                // Format: "emulator-5554    device" or "emulator-5554	device"
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2 && parts[0].startsWith('emulator-') && parts[1] === 'device') {
                    console.log(`[AVDSelectorProvider] Found running emulator device: ${parts[0]}`);
                    return true;
                }
            }
            console.log('[AVDSelectorProvider] No running emulator devices found');
            return false;
        } catch (error) {
            console.error('[AVDSelectorProvider] Error checking device status:', error);
            // If we can't check, assume it's not running to be safe
            return false;
        }
    }

    async onRefresh?(force?: boolean): Promise<void> {
        if (force) {
            await this.avdService.getAVDList(true);
            this.buildVariantService.clearCache();
        }
        await this.sendAVDList();
        await this.sendModules();
    }

    private async sendAVDList(): Promise<void> {
        const avds = await this.avdService.getAVDList();
        const avdList = avds || [];
        const selectedAVD = this.avdService.getSelectedAVDName();
        await this.host.notify('update-avds', { avds: avdList, selectedAVD });
    }

    private async sendModules(): Promise<void> {
        try {
            const allModules = await this.buildVariantService.getModuleBuildVariants(this.context);
            const modules = allModules.filter(m => m.type === 'application');
            const selectedModule = this.buildVariantService.getSelectedModule() || undefined;
            await this.host.notify('update-modules', { modules, selectedModule });
        } catch (error) {
            console.error('[AVDSelectorProvider] Error sending modules:', error);
            await this.host.notify('update-modules', { modules: [], selectedModule: undefined });
        }
    }

    registerCommands(): Disposable[] {
        return [];
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
