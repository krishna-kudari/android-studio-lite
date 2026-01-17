import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to clear logcat.
 */
export class ClearLogcatCommand extends Command {
    readonly id = 'android-studio-lite.clearLogcat';
    readonly title = 'Clear Logcat';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(clear-all)';
    readonly description = 'Clear Android logcat output';

    constructor(
        private readonly logcatService: LogcatService | null,
        private readonly clearLogcatFn: (service: LogcatService) => void
    ) {
        super();
    }

    execute(): void {
        if (this.logcatService) {
            this.clearLogcatFn(this.logcatService);
        } else {
            vscode.window.showErrorMessage('Logcat service not initialized');
        }
    }
}
