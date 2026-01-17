import { Command } from '../../commands';
import { AVDService } from '../../service/AVDService';
import { AVDTreeDataProvider } from '../AVDTreeDataProvider';
import { AVDQuickPickItem } from '../AVDQuickPick';
import { showQuickPick, showMsg, MsgType } from '../../module/ui';

/**
 * Command to launch an AVD emulator.
 */
export class LaunchAVDCommand extends Command {
    readonly id = 'android-studio-lite.avd-launch';
    readonly title = 'Launch AVD';
    readonly description = 'Launch an Android Virtual Device emulator';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(play)';

    constructor(
        private readonly avdService: AVDService,
        private readonly treeDataProvider: AVDTreeDataProvider
    ) {
        super();
    }

    async execute(node?: any): Promise<void> {
        let name = node?.avd?.name ?? undefined;
        await this.launchAVDDiag(name);
        this.avdService.setSelectedAVD(name);
        this.treeDataProvider.refresh();
    }

    private async launchAVDDiag(avdname: string | undefined) {
        let target = avdname ?? await this.askAVDName();
        if (target) {
            await this.avdService.launchEmulator(target);
        }
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
