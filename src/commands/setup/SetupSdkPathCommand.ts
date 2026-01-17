import { Command } from '../base/Command';
import type { AndroidService } from '../../service/AndroidService';
import { ConfigKeys } from '../../config';

/**
 * Command to set up Android SDK path.
 */
export class SetupSdkPathCommand extends Command {
    readonly id = 'android-studio-lite.setup-sdkpath';
    readonly title = 'Setup SDK Path';
    readonly category = 'Android Studio Lite: Setup';
    readonly icon = '$(folder)';
    readonly description = 'Select the Android SDK root path';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.updatePathDiag(
            'dir',
            ConfigKeys.SDK_PATH,
            'Please select the Android SDK Root Path',
            'Android SDK Root path updated!',
            'Android SDK path not specified!'
        );
    }
}
