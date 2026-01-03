import * as vscode from 'vscode';
import { DeviceService } from '../services/deviceService';
import { EmulatorService } from '../services/emulatorService';

export interface DeviceSelectionItem {
    label: string;
    description: string;
    detail?: string;
    deviceId?: string;
    avdName?: string;
    isEmulator: boolean;
    isBooted: boolean;
}

export async function selectDeviceCommand(
    deviceService: DeviceService,
    emulatorService?: EmulatorService
): Promise<void> {
    const devices = deviceService.getDevices();
    const onlineDevices = devices.filter(d => d.status === 'device');
    const selectedDevice = deviceService.getSelectedDevice();

    const items: DeviceSelectionItem[] = [];

    // Get list of all AVDs first (to match against booted devices)
    let allAVDs: string[] = [];
    if (emulatorService) {
        try {
            console.log('[selectDeviceCommand] Attempting to list AVDs...');
            const avds = await emulatorService.listAVDs();
            allAVDs = avds.map(a => a.name);
            console.log(`[selectDeviceCommand] Found ${allAVDs.length} AVDs:`, allAVDs.join(', '));
        } catch (error: any) {
            console.warn(`[selectDeviceCommand] Failed to list AVDs:`, error.message);
        }
    }

    // Track which AVDs are already booted
    const bootedAVDNames = new Set<string>();
    const bootedEmulatorDeviceIds = new Set<string>();

    // Add currently booted devices
    onlineDevices.forEach(device => {
        // For emulators, use AVD name if available, otherwise try to match from AVD list
        let displayName = device.name || device.id;
        if (device.type === 'emulator') {
            if (device.avdName) {
                displayName = device.avdName;
                bootedAVDNames.add(device.avdName);
            } else if (device.name && allAVDs.includes(device.name)) {
                // Device name matches an AVD name
                displayName = device.name;
                bootedAVDNames.add(device.name);
            } else {
                // Try to find matching AVD by checking if any AVD name is similar
                const matchingAVD = allAVDs.find(avd => 
                    device.name?.toLowerCase().includes(avd.toLowerCase()) ||
                    avd.toLowerCase().includes(device.name?.toLowerCase() || '')
                );
                if (matchingAVD) {
                    displayName = matchingAVD;
                    bootedAVDNames.add(matchingAVD);
                }
            }
            bootedEmulatorDeviceIds.add(device.id);
        }
        
        const deviceLabel = displayName.includes('API') 
            ? displayName 
            : `${displayName} (API ${device.androidVersion || '?'})`;
        
        items.push({
            label: deviceLabel,
            description: device.type === 'emulator' ? 'Emulator • Online' : 'Physical Device • Online',
            detail: device.androidVersion ? `API ${device.androidVersion}` : undefined,
            deviceId: device.id,
            avdName: device.type === 'emulator' ? (device.avdName || displayName) : undefined,
            isEmulator: device.type === 'emulator',
            isBooted: true
        });
    });

    // Add available emulators that aren't booted
    if (emulatorService && allAVDs.length > 0) {
        allAVDs.forEach(avdName => {
            // Only add if not already booted
            if (!bootedAVDNames.has(avdName)) {
                items.push({
                    label: avdName,
                    description: 'Emulator • Not Booted',
                    detail: 'Click to boot and select',
                    avdName: avdName,
                    isEmulator: true,
                    isBooted: false
                });
            }
        });
    }

    if (items.length === 0) {
        vscode.window.showWarningMessage('No devices or emulators available. Please connect a device or create an emulator.');
        return;
    }

    // Mark selected device or last selected emulator
    const lastSelectedEmulator = deviceService.getLastSelectedEmulator();
    const itemsWithSelection = items.map(item => {
        const isSelected = selectedDevice 
            ? (item.deviceId === selectedDevice.id)
            : (lastSelectedEmulator && item.avdName === lastSelectedEmulator);
        return {
            ...item,
            picked: isSelected ? true : undefined
        };
    });

    const selected = await vscode.window.showQuickPick(itemsWithSelection, {
        placeHolder: 'Select a device or emulator',
        canPickMany: false
    });

    if (!selected) {
        return;
    }

    try {
        // If it's an emulator that needs to be booted
        if (selected.avdName && !selected.isBooted && emulatorService && !selected.deviceId) {
            // Boot the emulator first
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Booting emulator: ${selected.avdName}`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ increment: 0, message: 'Starting emulator...' });
                    
                    await emulatorService.startAVD(selected.avdName!, (output) => {
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
                            d.type === 'emulator' && d.status === 'device'
                        );
                        if (emulatorDevice) {
                            deviceFound = true;
                            await deviceService.selectDevice(emulatorDevice.id);
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
            
            vscode.window.showInformationMessage(`Emulator ${selected.avdName} booted and selected`);
            // Save as last selected emulator
            deviceService.setLastSelectedEmulator(selected.avdName);
        } else if (selected.deviceId) {
            // Select existing device
            await deviceService.selectDevice(selected.deviceId);
            vscode.window.showInformationMessage(`Selected device: ${selected.label}`);
            // If it's an emulator, save as last selected (use AVD name if available)
            if (selected.isEmulator) {
                const device = deviceService.getDevices().find(d => d.id === selected.deviceId);
                if (device && device.type === 'emulator') {
                    // Prefer AVD name, then device name, then extract from label
                    const emulatorName = device.avdName || selected.avdName || device.name || selected.label.split(' ')[0];
                    deviceService.setLastSelectedEmulator(emulatorName);
                }
            }
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to select device: ${error.message}`);
        throw error;
    }
}

