import * as vscode from 'vscode';
import { LogcatProvider } from '../providers/logcatProvider';
import { LogLevel } from '../utils/logcatParser';

export async function startLogcatCommand(logcatProvider: LogcatProvider): Promise<void> {
    await logcatProvider.start();
}

export async function stopLogcatCommand(logcatProvider: LogcatProvider): Promise<void> {
    logcatProvider.stop();
}

export async function pauseLogcatCommand(logcatProvider: LogcatProvider): Promise<void> {
    logcatProvider.pause();
}

export async function resumeLogcatCommand(logcatProvider: LogcatProvider): Promise<void> {
    logcatProvider.resume();
}

export async function clearLogcatCommand(logcatProvider: LogcatProvider): Promise<void> {
    logcatProvider.clear();
}

export async function setLogLevelCommand(logcatProvider: LogcatProvider): Promise<void> {
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
        logcatProvider.setLogLevel(selected.level);
    }
}

