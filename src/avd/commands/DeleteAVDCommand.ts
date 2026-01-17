import { Command } from '../../commands';
import { AVDService } from '../../service/AVDService';
import { AVDTreeDataProvider } from '../AVDTreeDataProvider';
import { AVDQuickPickItem } from '../AVDQuickPick';
import { showQuickPick, showYesNoQuickPick, showMsg, MsgType } from '../../module/ui';

/**
 * Command to delete an AVD.
 */
export class DeleteAVDCommand extends Command {
    readonly id = 'android-studio-lite.avd-delete';
    readonly title = 'Delete AVD';
    readonly description = 'Delete an Android Virtual Device';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(trash)';

    constructor(
        private readonly avdService: AVDService,
        private readonly treeDataProvider: AVDTreeDataProvider
    ) {
        super();
    }

    async execute(node?: any): Promise<void> {
        let name = node?.avd?.name ?? undefined;
        await this.deleteAVDDiag(name);
        this.treeDataProvider.refresh();
    }

    private async deleteAVDDiag(avdname: string | undefined) {
        let target = avdname ?? await this.askAVDName();

        const ans = await showYesNoQuickPick(`Are you sure to delete AVD ${target}?`);

        if (ans === 'Yes' && target) {
            await this.avdService.deleteAVD(target);
        }
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
