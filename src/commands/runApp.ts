import * as vscode from 'vscode';
import { DeviceService } from '../services/deviceService';
import { GradleService } from '../services/gradleService';
import { BuildVariantService } from '../services/buildVariantService';
import { AdbService } from '../services/adbService';
import { EmulatorService } from '../services/emulatorService';
import { getPackageName, findManifest, parseManifest } from '../utils/manifestParser';

export async function runAppCommand(
    deviceService: DeviceService,
    gradleService: GradleService,
    buildVariantService: BuildVariantService,
    adbService: AdbService,
    emulatorService?: EmulatorService
): Promise<void> {
    // Check prerequisites
    let selectedDevice = deviceService.getSelectedDevice();
    
    // If no device selected, try to use last selected emulator
    if (!selectedDevice) {
        const lastEmulator = deviceService.getLastSelectedEmulator();
        if (lastEmulator && emulatorService) {
            // Check if emulator is already booted
            await deviceService.refreshDevices();
            const devices = deviceService.getDevices();
            const emulatorDevice = devices.find(d => 
                d.type === 'emulator' && d.status === 'device'
            );
            
            if (emulatorDevice) {
                // Emulator is already booted, select it
                await deviceService.selectDevice(emulatorDevice.id);
                selectedDevice = emulatorDevice;
            } else {
                // Boot the emulator
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Booting emulator: ${lastEmulator}`,
                        cancellable: false
                    },
                    async (progress) => {
                        progress.report({ increment: 0, message: 'Starting emulator...' });
                        
                        await emulatorService.startAVD(lastEmulator, (output) => {
                            if (output.includes('emulator:') || output.includes('qemu:')) {
                                const lines = output.split('\n').filter(l => l.trim());
                                const lastLine = lines[lines.length - 1];
                                if (lastLine && lastLine.length < 100) {
                                    progress.report({ message: lastLine });
                                }
                            }
                        });

                        progress.report({ increment: 50, message: 'Waiting for device to be ready...' });

                        // Wait for device to appear (poll for up to 60 seconds)
                        let deviceFound = false;
                        for (let i = 0; i < 60; i++) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await deviceService.refreshDevices();
                            const refreshedDevices = deviceService.getDevices();
                            const emulatorDevice = refreshedDevices.find(d => 
                                d.type === 'emulator' && d.status === 'device'
                            );
                            if (emulatorDevice) {
                                deviceFound = true;
                                await deviceService.selectDevice(emulatorDevice.id);
                                selectedDevice = emulatorDevice;
                                break;
                            }
                            progress.report({ 
                                increment: 50 + (i / 60) * 50, 
                                message: `Waiting for device... (${i + 1}/60)` 
                            });
                        }

                        if (!deviceFound) {
                            throw new Error('Emulator started but device not detected. Please check if emulator is running.');
                        }

                        progress.report({ increment: 100, message: 'Done!' });
                    }
                );
            }
        } else {
            vscode.window.showWarningMessage('No device selected. Please select a device first.');
            return;
        }
    }
    
    // Final check - ensure device is online
    if (!selectedDevice || selectedDevice.status !== 'device') {
        vscode.window.showWarningMessage('Selected device is not online. Please wait for device to be ready or select another device.');
        return;
    }

    const selectedVariant = buildVariantService.getSelectedVariant();
    if (!selectedVariant) {
        vscode.window.showWarningMessage('No build variant selected. Please select a build variant first.');
        return;
    }

    if (!gradleService.isAvailable()) {
        vscode.window.showErrorMessage('Gradle wrapper not found. Please ensure you are in an Android project root.');
        return;
    }

    // Get package name
    const workspaceRoot = gradleService.getWorkspaceRoot();
    const packageName = getPackageName(workspaceRoot);
    if (!packageName) {
        vscode.window.showErrorMessage('Could not find package name. Please ensure AndroidManifest.xml exists.');
        return;
    }

    // Ensure selectedDevice is not null (TypeScript guard)
    if (!selectedDevice) {
        vscode.window.showErrorMessage('No device available. Please select a device first.');
        return;
    }

    // Check if a build is already in progress
    if (gradleService.isBuildInProgress()) {
        vscode.window.showWarningMessage('A build is already in progress. Please wait for it to complete or stop it first.');
        return;
    }

    // Capture device for use in callback (TypeScript guard)
    const targetDevice = selectedDevice;

    // Create or get terminal for build output
    const terminalName = 'Android Build';
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
        terminal = vscode.window.createTerminal({
            name: terminalName,
            hideFromUser: false
        });
    }
    terminal.show(true);

    // Create output channel for build logs (better than terminal for streaming)
    const buildOutputChannel = vscode.window.createOutputChannel('Android Build');
    buildOutputChannel.show(true);
    buildOutputChannel.appendLine('========================================');
    buildOutputChannel.appendLine(`Building and installing ${selectedVariant.name}`);
    buildOutputChannel.appendLine(`Device: ${targetDevice.id}`);
    buildOutputChannel.appendLine('========================================');
    buildOutputChannel.appendLine('');

    // Run with progress and output channel
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Installing and running ${selectedVariant.name} on ${targetDevice.id}`,
            cancellable: false
        },
        async (progress) => {
            try {
                // Step 1: Install app
                progress.report({ increment: 0, message: 'Building and installing app...' });
                
                await gradleService.installVariant(selectedVariant.name, (output) => {
                    // Stream to output channel
                    buildOutputChannel.append(output);
                    
                    // Show progress from Gradle output
                    const lines = output.split('\n').filter(l => l.trim());
                    const lastLine = lines[lines.length - 1];
                    if (lastLine && lastLine.length < 100) {
                        progress.report({ message: lastLine });
                    }
                });

                progress.report({ increment: 50, message: 'Launching app...' });
                buildOutputChannel.appendLine('');
                buildOutputChannel.appendLine('========================================');
                buildOutputChannel.appendLine('Launching app...');
                buildOutputChannel.appendLine('========================================');
                buildOutputChannel.appendLine('');

                // Step 2: Launch app
                // Try to get main activity from manifest
                const manifestPath = findManifest(workspaceRoot, selectedVariant.name);
                let mainActivity: string | undefined;
                
                if (manifestPath) {
                    try {
                        const manifest = parseManifest(manifestPath);
                        mainActivity = manifest.mainActivity;
                        console.log(`[RunApp] Found main activity: ${mainActivity}`);
                    } catch (error: any) {
                        console.log(`[RunApp] Error parsing manifest: ${error.message}`);
                    }
                } else {
                    console.log(`[RunApp] Manifest not found at: ${manifestPath}`);
                }

                // Launch app (targetDevice is guaranteed to be non-null here)
                if (mainActivity && !mainActivity.includes('intent.category')) {
                    // Validate that mainActivity looks like a class name, not a category
                    const activityClass = mainActivity.includes('.') ? mainActivity : `${packageName}.${mainActivity}`;
                    console.log(`[RunApp] Launching with activity: ${activityClass}`);
                    await adbService.executeCommand(
                        `shell am start -n ${packageName}/${activityClass}`,
                        targetDevice.id
                    );
                } else {
                    // Use default launcher activity (monkey command)
                    console.log(`[RunApp] Using default launcher (monkey command)`);
                    await adbService.executeCommand(
                        `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`,
                        targetDevice.id
                    );
                }

                progress.report({ increment: 100, message: 'Done!' });
                buildOutputChannel.appendLine('========================================');
                buildOutputChannel.appendLine('✓ App installed and launched successfully!');
                buildOutputChannel.appendLine('========================================');
                vscode.window.showInformationMessage(`App installed and launched on ${targetDevice.id}`);
            } catch (error: any) {
                buildOutputChannel.appendLine('');
                buildOutputChannel.appendLine('========================================');
                const errorMessage = error.message === 'Build was cancelled' 
                    ? 'Build was cancelled by user'
                    : `Error: ${error.message}`;
                buildOutputChannel.appendLine(`✗ ${errorMessage}`);
                buildOutputChannel.appendLine('========================================');
                if (error.message !== 'Build was cancelled') {
                    vscode.window.showErrorMessage(`Failed to run app: ${error.message}`);
                } else {
                    vscode.window.showInformationMessage('Build was cancelled');
                }
                throw error;
            }
        }
    );
}

