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
        private readonly logcatService: LogcatService
    ) {
        super();
    }

    async execute(): Promise<void> {
        this.logcatService.start();
    }
}
