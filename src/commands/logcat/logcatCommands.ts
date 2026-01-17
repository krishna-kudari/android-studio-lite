/**
 * Logcat command functions.
 * These functions are used by logcat commands to interact with LogcatService.
 */
import * as vscode from 'vscode';
import { LogLevel } from '../../utils/logcatParser';
import { LogcatService } from '../../service/Logcat';

/**
 * Start logcat command
 */
export async function startLogcatCommand(logcatService: LogcatService): Promise<void> {
    await logcatService.start();
}

/**
 * Stop logcat command
 */
export function stopLogcatCommand(logcatService: LogcatService): void {
    logcatService.stop();
}

/**
 * Pause logcat command
 */
export function pauseLogcatCommand(logcatService: LogcatService): void {
    logcatService.pause();
}

/**
 * Resume logcat command
 */
export function resumeLogcatCommand(logcatService: LogcatService): void {
    logcatService.resume();
}

/**
 * Clear logcat command
 */
export function clearLogcatCommand(logcatService: LogcatService): void {
    logcatService.clear();
}

/**
 * Set log level command
 */
export async function setLogLevelCommand(logcatService: LogcatService): Promise<void> {
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
        logcatService.setLogLevel(selected.level);
    }
}
