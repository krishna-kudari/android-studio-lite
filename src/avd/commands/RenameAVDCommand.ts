import * as vscode from 'vscode';
import { Command } from '../../commands';
import { AVDService } from '../../service/AVDService';
import { AVDTreeDataProvider } from '../AVDTreeDataProvider';
import { AVDQuickPickItem } from '../AVDQuickPick';
import { showQuickPick, showMsg, MsgType } from '../../module/ui';

/**
 * Command to rename an AVD.
 */
export class RenameAVDCommand extends Command {
    readonly id = 'android-studio-lite.avd-edit';
    readonly title = 'Rename AVD';
    readonly description = 'Rename an Android Virtual Device';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(edit)';

    constructor(
        private readonly avdService: AVDService,
        private readonly treeDataProvider: AVDTreeDataProvider
    ) {
        super();
    }

    async execute(node?: any): Promise<void> {
        let name = node?.avd?.name ?? undefined;
        await this.renameAVDDiag(name);
        this.treeDataProvider.refresh();
    }

    private async renameAVDDiag(avdname: string | undefined) {
        // Select AVD
        let target = avdname ?? await this.askAVDName();

        if (!target) {
            return;
        }

        // Get new name
        let avdlist = await this.avdService.getAVDList();
        const newAvdName = await vscode.window.showInputBox({
            title: `Rename AVD ${target}:`,
            placeHolder: 'Enter a new AVD name. (Must be unique)',
            validateInput: (name) => {
                if (name.match(/[^a-zA-Z0-9_]/)) {
                    return `${name} is invalid! Must be [a-zA-Z0-9_]`;
                } else if (name.trim() === '') {
                    return "Can't be blank!";
                } else if (avdlist && avdlist.filter((avd: any) => avd.name === name).length > 0) {
                    return `${name} already exits!`;
                } else {
                    return null;
                }
            },
        });
        if (!newAvdName) {
            showMsg(MsgType.info, 'The new AVD cannot be blank.');
            return;
        }

        await this.avdService.renameAVD(target, newAvdName);
        await this.avdService.getAVDList(true); // Reload cache
    }

    private async askAVDName() {
        const avds = await this.avdService.getAVDList();
        const items = avds ? avds.map((avd: any) => new AVDQuickPickItem(avd)) : undefined;
        const selected = await showQuickPick(
            Promise.resolve(items),
            {
                placeHolder: 'Select AVD name',
                canPickMany: false
            },
            'No AVD Found. Please create AVD first.',
            'No AVD selected'
        );
        return (selected as AVDQuickPickItem)?.avd?.name ?? false;
    }
}
