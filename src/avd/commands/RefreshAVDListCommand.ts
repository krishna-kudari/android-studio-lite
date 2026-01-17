import { Command } from '../../commands';
import { AVDService } from '../../service/AVDService';
import { AVDTreeDataProvider } from '../AVDTreeDataProvider';

/**
 * Command to refresh the AVD list.
 */
export class RefreshAVDListCommand extends Command {
    readonly id = 'android-studio-lite.avdlist-refresh';
    readonly title = 'Refresh AVD List';
    readonly description = 'Refresh the list of Android Virtual Devices';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(refresh)';

    constructor(
        private readonly avdService: AVDService,
        private readonly treeDataProvider: AVDTreeDataProvider
    ) {
        super();
    }

    async execute(): Promise<void> {
        await this.avdService.getAVDList(true);
        this.treeDataProvider.refresh();
    }
}
