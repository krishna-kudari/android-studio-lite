import * as vscode from 'vscode';
import { EmulatorService } from '../services/emulatorService';
import { DeviceService } from '../services/deviceService';

export async function startEmulatorCommand(
    emulatorService: EmulatorService,
    deviceService: DeviceService
): Promise<void> {
    // Check if emulator is available
    const isAvailable = await emulatorService.isAvailable();
    if (!isAvailable) {
        const errorMessage = emulatorService.getErrorMessage();
        const action = await vscode.window.showErrorMessage(
            'Android Emulator not found',
            'Show Help',
            'Open Settings'
        );
        
        if (action === 'Show Help') {
            vscode.window.showInformationMessage(errorMessage, { modal: true });
        } else if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'android-studio-lite');
        }
        return;
    }

    // List available AVDs
    let avds;
    try {
        avds = await emulatorService.listAVDs();
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to list AVDs: ${error.message}`);
        return;
    }

    if (avds.length === 0) {
        vscode.window.showWarningMessage(
            'No AVDs found. Please create an AVD using Android Studio or the command line.'
        );
        return;
    }

    // Show QuickPick to select AVD
    const items = avds.map(avd => ({
        label: avd.name,
        description: 'Android Virtual Device',
        avd: avd
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an emulator to start',
        canPickMany: false
    });

    if (!selected) {
        return;
    }

    // Start emulator with progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Starting emulator: ${selected.label}`,
            cancellable: false
        },
        async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Launching emulator...' });

                await emulatorService.startAVD(selected.label, (output) => {
                    // Show progress from emulator output
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
                    const devices = deviceService.getDevices();
                    const emulatorDevice = devices.find(d => d.id.startsWith('emulator-'));
                    if (emulatorDevice && emulatorDevice.status === 'device') {
                        deviceFound = true;
                        break;
                    }
                    progress.report({ message: `Waiting for device... (${i + 1}/60)` });
                }

                if (deviceFound) {
                    progress.report({ increment: 100, message: 'Emulator ready!' });
                    vscode.window.showInformationMessage(`Emulator ${selected.label} started successfully`);
                } else {
                    progress.report({ increment: 100, message: 'Emulator starting (may take longer)...' });
                    vscode.window.showWarningMessage(
                        'Emulator is starting but not yet ready. It will appear in the device list when ready.'
                    );
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to start emulator: ${error.message}`);
                throw error;
            }
        }
    );
}

