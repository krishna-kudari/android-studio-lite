import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to start logcat.
 */
export class StartLogcatCommand extends Command {
    readonly id = 'android-studio-lite.startLogcat';
    readonly title = 'Start Logcat';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(play)';
    readonly description = 'Start Android logcat output';

    constructor(
        private readonly logcatService: LogcatService | null,
        private readonly startLogcatFn: (service: LogcatService) => Promise<void>
    ) {
        super();
    }

    async execute(): Promise<void> {
        if (!this.logcatService) {
            vscode.window.showErrorMessage('Logcat service not initialized');
            return;
        }

        // Start logcat (validation happens inside LogcatService.start())
        await this.startLogcatFn(this.logcatService);
    }
}
