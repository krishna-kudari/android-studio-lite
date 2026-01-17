import { Command } from '../base/Command';
import type { AndroidService } from '../../service/AndroidService';
import { ConfigKeys } from '../../config';

/**
 * Command to set up AVD Manager path.
 */
export class SetupAvdManagerCommand extends Command {
    readonly id = 'android-studio-lite.setup-avdmanager';
    readonly title = 'Setup AVD Manager Path';
    readonly category = 'Android Studio Lite: Setup';
    readonly icon = '$(file)';
    readonly description = 'Select the AVD Manager executable path';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.updatePathDiag(
            'file',
            ConfigKeys.EXECUTABLE,
            'Please select the AVDManager Path',
            'AVDManager updated!',
            'AVDManager path not specified!'
        );
    }
}
