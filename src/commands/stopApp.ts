import * as vscode from 'vscode';
import { DeviceService } from '../services/deviceService';
import { AdbService } from '../services/adbService';
import { getPackageName } from '../utils/manifestParser';
import { GradleService } from '../services/gradleService';

export async function stopAppCommand(
    deviceService: DeviceService,
    adbService: AdbService,
    gradleService: GradleService
): Promise<void> {
    // If a build is in progress, cancel it
    if (gradleService.isBuildInProgress()) {
        gradleService.cancelBuild();
        vscode.window.showInformationMessage('Build cancelled');
        return;
    }

    const selectedDevice = deviceService.getSelectedDevice();
    if (!selectedDevice) {
        vscode.window.showWarningMessage('No device selected. Please select a device first.');
        return;
    }

    const workspaceRoot = gradleService.getWorkspaceRoot();
    const packageName = getPackageName(workspaceRoot);
    if (!packageName) {
        vscode.window.showErrorMessage('Could not find package name. Please ensure AndroidManifest.xml exists.');
        return;
    }

    try {
        await adbService.executeCommand(
            `shell am force-stop ${packageName}`,
            selectedDevice.id
        );
        vscode.window.showInformationMessage(`App stopped on ${selectedDevice.id}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to stop app: ${error.message}`);
    }
}

