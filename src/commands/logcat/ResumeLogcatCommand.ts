import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to resume logcat.
 */
export class ResumeLogcatCommand extends Command {
    readonly id = 'android-studio-lite.resumeLogcat';
    readonly title = 'Resume Logcat';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(play)';
    readonly description = 'Resume Android logcat output';

    constructor(
        private readonly logcatService: LogcatService | null,
        private readonly resumeLogcatFn: (service: LogcatService) => void
    ) {
        super();
    }

    execute(): void {
        if (this.logcatService) {
            this.resumeLogcatFn(this.logcatService);
        } else {
            vscode.window.showErrorMessage('Logcat service not initialized');
        }
    }
}
