import * as vscode from 'vscode';
import { DeviceService } from '../services/deviceService';

export async function refreshDevicesCommand(deviceService: DeviceService): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing devices...',
            cancellable: false
        },
        async () => {
            await deviceService.refreshDevices();
            vscode.window.showInformationMessage('Devices refreshed');
        }
    );
}

