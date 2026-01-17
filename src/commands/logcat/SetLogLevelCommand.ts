import * as vscode from 'vscode';
import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';
import { LogLevel } from '../../utils/logcatParser';

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
        private readonly logcatService: LogcatService
    ) {
        super();
    }

    async execute(): Promise<void> {
        const levels = [
            { label: 'Verbose (V)', level: LogLevel.VERBOSE },
            { label: 'Debug (D)', level: LogLevel.DEBUG },
            { label: 'Info (I)', level: LogLevel.INFO },
            { label: 'Warn (W)', level: LogLevel.WARN },
            { label: 'Error (E)', level: LogLevel.ERROR }
        ];

        const selected = await vscode.window.showQuickPick(levels, {
            placeHolder: 'Select log level filter'
        });

        if (selected) {
            this.logcatService.setLogLevel(selected.level);
        }
    }
}
