import * as vscode from 'vscode';
import { DeviceService } from '../services/deviceService';
import { AdbService } from '../services/adbService';
import { getPackageName } from '../utils/manifestParser';
import { GradleService } from '../services/gradleService';

export async function uninstallAppCommand(
    deviceService: DeviceService,
    adbService: AdbService,
    gradleService: GradleService
): Promise<void> {
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

    // Show confirmation dialog
    const confirmed = await vscode.window.showWarningMessage(
        `Uninstall ${packageName} from ${selectedDevice.id}? This action cannot be undone.`,
        { modal: true },
        'Uninstall'
    );

    if (!confirmed) {
        return;
    }

    try {
        await adbService.executeCommand(
            `uninstall ${packageName}`,
            selectedDevice.id
        );
        vscode.window.showInformationMessage(`App uninstalled from ${selectedDevice.id}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to uninstall app: ${error.message}`);
    }
}

