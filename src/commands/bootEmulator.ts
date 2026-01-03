import * as vscode from 'vscode';
import { EmulatorService } from '../services/emulatorService';
import { DeviceService } from '../services/deviceService';

export async function bootEmulatorCommand(
    emulatorService: EmulatorService,
    deviceService: DeviceService,
    avdName: string
): Promise<void> {
    // Start emulator with progress
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Starting emulator: ${avdName}`,
            cancellable: false
        },
        async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Launching emulator...' });

                await emulatorService.startAVD(avdName, (output) => {
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
                    const emulatorDevice = devices.find(d => 
                        d.id.startsWith('emulator-') && d.type === 'emulator'
                    );
                    if (emulatorDevice && emulatorDevice.status === 'device') {
                        deviceFound = true;
                        // Auto-select the emulator when it's ready
                        try {
                            await deviceService.selectDevice(emulatorDevice.id);
                        } catch {
                            // Ignore selection errors
                        }
                        break;
                    }
                    progress.report({ message: `Waiting for device... (${i + 1}/60)` });
                }

                if (deviceFound) {
                    progress.report({ increment: 100, message: 'Emulator ready!' });
                    vscode.window.showInformationMessage(`Emulator ${avdName} started and selected`);
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

