/**
 * Command registration helper.
 *
 * This module provides a function to register all commands with the registry.
 */
import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry';
import {
    SetupWizardCommand,
    SetupSdkPathCommand,
    SetupAvdManagerCommand,
    SetupSdkManagerCommand,
    SetupEmulatorCommand,
} from './setup';
import { ShowOnboardingCommand } from './onboarding';
import {
    StartLogcatCommand,
    StopLogcatCommand,
    PauseLogcatCommand,
    ResumeLogcatCommand,
    ClearLogcatCommand,
    SetLogLevelCommand,
    LogcatService,
} from './logcat';
import type { AndroidService } from '../service/AndroidService';

/**
 * Logcat command functions interface.
 */
export interface ILogcatCommandFunctions {
    startLogcatCommand: (service: LogcatService) => Promise<void>;
    stopLogcatCommand: (service: LogcatService) => void;
    pauseLogcatCommand: (service: LogcatService) => void;
    resumeLogcatCommand: (service: LogcatService) => void;
    clearLogcatCommand: (service: LogcatService) => void;
    setLogLevelCommand: (service: LogcatService) => Promise<void>;
}

/**
 * Register all commands with the command registry.
 *
 * @param registry Command registry instance
 * @param context VS Code extension context
 * @param dependencies Command dependencies
 */
export function registerCommands(
    registry: CommandRegistry,
    context: vscode.ExtensionContext,
    dependencies: {
        androidService: AndroidService;
        onboardingWebview: { show(): Promise<void> };
        logcatService: LogcatService;
        logcatCommands: ILogcatCommandFunctions;
    }
): void {
    // Setup commands
    registry.register(new SetupWizardCommand(dependencies.androidService), context);
    registry.register(new SetupSdkPathCommand(dependencies.androidService), context);
    registry.register(new SetupAvdManagerCommand(dependencies.androidService), context);
    registry.register(new SetupSdkManagerCommand(dependencies.androidService), context);
    registry.register(new SetupEmulatorCommand(dependencies.androidService), context);

    // Onboarding command
    registry.register(new ShowOnboardingCommand(dependencies.onboardingWebview), context);

    // Logcat commands
    registry.register(
        new StartLogcatCommand(
            dependencies.logcatService,
            dependencies.logcatCommands.startLogcatCommand
        ),
        context
    );
    registry.register(
        new StopLogcatCommand(
            dependencies.logcatService,
            dependencies.logcatCommands.stopLogcatCommand
        ),
        context
    );
    registry.register(
        new PauseLogcatCommand(
            dependencies.logcatService,
            dependencies.logcatCommands.pauseLogcatCommand
        ),
        context
    );
    registry.register(
        new ResumeLogcatCommand(
            dependencies.logcatService,
            dependencies.logcatCommands.resumeLogcatCommand
        ),
        context
    );
    registry.register(
        new ClearLogcatCommand(
            dependencies.logcatService,
        ),
        context
    );
    registry.register(
        new SetLogLevelCommand(
            dependencies.logcatService,
            dependencies.logcatCommands.setLogLevelCommand
        ),
        context
    );
}
