import * as nodePath from 'path';
import * as vscode from 'vscode';
import { Command } from '../../commands';

/**
 * Command to show AVD config file in editor.
 */
export class ShowAVDConfigFileCommand extends Command {
    readonly id = 'android-studio-lite.avd-showconfigfile';
    readonly title = 'Show AVD Config File';
    readonly description = 'Open AVD config.ini file in editor';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(file-code)';

    async execute(node?: any): Promise<void> {
        let { name, path } = node?.avd ?? {};
        if (path !== undefined) {
            let configPath = nodePath.join(path, 'config.ini');
            vscode.workspace.openTextDocument(configPath)
                .then(document => vscode.window.showTextDocument(document, { preserveFocus: true, preview: false }));
        }
    }
}
