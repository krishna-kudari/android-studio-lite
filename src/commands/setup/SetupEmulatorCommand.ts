import { Command } from '../base/Command';
import type { AndroidService } from '../../service/AndroidService';
import { ConfigKeys } from '../../config';

/**
 * Command to set up Emulator path.
 */
export class SetupEmulatorCommand extends Command {
    readonly id = 'android-studio-lite.setup-emulator';
    readonly title = 'Setup Emulator Path';
    readonly category = 'Android Studio Lite: Setup';
    readonly icon = '$(file)';
    readonly description = 'Select the Android Emulator executable path';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.updatePathDiag(
            'file',
            ConfigKeys.EMULATOR_PATH,
            'Please select the Emulator Path',
            'Emulator path updated!',
            'Emulator path not specified!'
        );
    }
}
