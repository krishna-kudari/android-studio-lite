import { Command } from '../base/Command';
import { LogcatService } from '../../service/Logcat';

/**
 * Command to stop logcat.
 */
export class StopLogcatCommand extends Command {
    readonly id = 'android-studio-lite.stopLogcat';
    readonly title = 'Stop Logcat';
    readonly category = 'Android Studio Lite: Logcat';
    readonly icon = '$(stop)';
    readonly description = 'Stop Android logcat output';

    constructor(
        private readonly logcatService: LogcatService
    ) {
        super();
    }

    execute(): void {
        this.logcatService.stop();
    }
}
