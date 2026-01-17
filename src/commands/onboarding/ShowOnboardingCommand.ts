import { Command } from '../base/Command';
import type { WebviewsController } from '../../webviews/webviewsController';

/**
 * Command to show the onboarding webview.
 */
export class ShowOnboardingCommand extends Command {
    readonly id = 'android-studio-lite.showOnboarding';
    readonly title = 'Show Onboarding';
    readonly category = 'Android Studio Lite';
    readonly icon = '$(book)';
    readonly description = 'Show the onboarding guide';

    constructor(private readonly onboardingWebview: { show(): Promise<void> }) {
        super();
    }

    async execute(): Promise<void> {
        await this.onboardingWebview.show();
    }
}
