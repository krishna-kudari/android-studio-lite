import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to set logcat log level.
 */
export class SetLogLevelCommand extends Command {
    readonly id = 'android-studio-lite.setLogLevel';
    readonly title = 'Set Log Level';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(settings)';
    readonly description = 'Set Android logcat log level';

    constructor(
        private readonly logcatService: LogcatService | null,
        private readonly setLogLevelFn: (service: LogcatService) => Promise<void>
    ) {
        super();
    }

    async execute(): Promise<void> {
        if (this.logcatService) {
            await this.setLogLevelFn(this.logcatService);
        } else {
            vscode.window.showErrorMessage('Logcat service not initialized');
        }
    }
}
