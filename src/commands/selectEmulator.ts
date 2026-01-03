import * as vscode from 'vscode';
import { EmulatorService, AVD } from '../services/emulatorService';

export async function selectEmulatorCommand(emulatorService: EmulatorService): Promise<void> {
    // Try to list AVDs directly - if this works, emulator is available
    // This is more reliable than checking isAvailable() first
    let avds: AVD[];
    try {
        avds = await emulatorService.listAVDs();
    } catch (error: any) {
        // If listing fails, check if emulator is available and show helpful message
        const isAvailable = await emulatorService.isAvailable();
        if (!isAvailable) {
            const errorMessage = emulatorService.getErrorMessage();
            vscode.window.showWarningMessage(`Emulator not available: ${errorMessage}`);
        } else {
            vscode.window.showErrorMessage(`Failed to list AVDs: ${error.message}`);
        }
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
        placeHolder: `Select an emulator (${avds.length} available)`,
        canPickMany: false
    });

    if (selected) {
        // The selected emulator name is available, but we don't return it
        // The command is just for selection display
    }
}

