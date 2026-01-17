import { Command } from '../base/Command';
import type { AndroidService } from '../../service/AndroidService';
import { ConfigKeys } from '../../config';

/**
 * Command to set up SDK Manager path.
 */
export class SetupSdkManagerCommand extends Command {
    readonly id = 'android-studio-lite.setup-sdkmanager';
    readonly title = 'Setup SDK Manager Path';
    readonly category = 'Android Studio Lite: Setup';
    readonly icon = '$(file)';
    readonly description = 'Select the SDK Manager executable path';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.updatePathDiag(
            'file',
            ConfigKeys.SDK_MANAGER,
            'Please select the SDKManager Path',
            'SDKManager updated!',
            'SDKManager path not specified!'
        );
    }
}
