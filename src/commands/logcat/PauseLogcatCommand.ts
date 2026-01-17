import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to pause logcat.
 */
export class PauseLogcatCommand extends Command {
    readonly id = 'android-studio-lite.pauseLogcat';
    readonly title = 'Pause Logcat';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(debug-pause)';
    readonly description = 'Pause Android logcat output';

    constructor(
        private readonly logcatService: LogcatService | null,
        private readonly pauseLogcatFn: (service: LogcatService) => void
    ) {
        super();
    }

    execute(): void {
        if (this.logcatService) {
            this.pauseLogcatFn(this.logcatService);
        } else {
            vscode.window.showErrorMessage('Logcat service not initialized');
        }
    }
}
