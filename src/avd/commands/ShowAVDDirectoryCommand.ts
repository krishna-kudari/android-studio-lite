import * as vscode from 'vscode';
import { Command } from '../../commands';

/**
 * Command to show AVD directory in file explorer.
 */
export class ShowAVDDirectoryCommand extends Command {
    readonly id = 'android-studio-lite.avd-showdir';
    readonly title = 'Show AVD Directory';
    readonly description = 'Reveal AVD directory in file explorer';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(folder-opened)';

    async execute(node?: any): Promise<void> {
        let { name, path } = node?.avd ?? {};
        if (path !== undefined) {
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(path));
        }
    }
}
