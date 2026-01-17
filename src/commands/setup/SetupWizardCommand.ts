import { Command } from '../base/Command';
import type { AndroidService } from '../../service/AndroidService';

/**
 * Command to run the Android SDK setup wizard.
 */
export class SetupWizardCommand extends Command {
    readonly id = 'android-studio-lite.setup-wizard';
    readonly title = 'Run Setup Wizard';
    readonly category = 'Android Studio Lite: Setup';
    readonly icon = '$(wrench)';
    readonly description = 'Run the Android SDK setup wizard to configure your development environment';

    constructor(private readonly androidService: AndroidService) {
        super();
    }

    async execute(): Promise<void> {
        await this.androidService.initCheck();
    }
}
