/**
 * Centralized command registry for managing all VS Code commands.
 *
 * This registry provides a single point of control for command registration,
 * discovery, and execution.
 */
import * as vscode from 'vscode';
import { Command } from './base/Command';
import { AndroidService } from '../service/AndroidService';
import { LogcatService, StartLogcatCommand, StopLogcatCommand, ClearLogcatCommand, SetLogLevelCommand } from './logcat';
import { ShowOnboardingCommand } from './onboarding';
import { SetupWizardCommand, SetupSdkPathCommand, SetupAvdManagerCommand, SetupSdkManagerCommand, SetupEmulatorCommand } from './setup';
import { CreateAVDCommand, RefreshAVDListCommand, LaunchAVDCommand, RenameAVDCommand, DeleteAVDCommand, ShowAVDDirectoryCommand, ShowAVDConfigFileCommand } from '../avd/commands';
import { AVDService } from '../service/AVDService';
import { AVDTreeDataProvider } from '../avd/AVDTreeDataProvider';
import { RefreshBuildVariantListCommand, SelectBuildVariantCommand } from '../buildVariant/commands';
import { BuildVariantService } from '../service/BuildVariantService';
import { BuildVariantTreeDataProvider } from '../buildVariant/BuildVariantTreeDataProvider';

/**
 * Command registry for managing all extension commands.
 */
export class CommandRegistry {
    private commands = new Map<string, Command>();
    private disposables: vscode.Disposable[] = [];

    /**
     * Register a single command.
     *
     * @param command Command instance to register
     * @param context VS Code extension context
     */
    register(command: Command, context: vscode.ExtensionContext): void {
        if (this.commands.has(command.id)) {
            console.warn(`Command ${command.id} is already registered. Overwriting...`);
        }

        this.commands.set(command.id, command);
        const disposable = command.register(context);
        this.disposables.push(disposable);
    }

    /**
     * Register multiple commands at once.
     *
     * @param commands Array of command instances
     * @param context VS Code extension context
     */
    registerAll(commands: Command[], context: vscode.ExtensionContext): void {
        commands.forEach(cmd => this.register(cmd, context));
    }

    /**
     * Execute a command by ID.
     *
     * @param id Command identifier
     * @param args Command arguments
     * @returns Promise that resolves when command completes
     */
    async execute(id: string, ...args: any[]): Promise<void> {
        const command = this.commands.get(id);
        if (!command) {
            throw new Error(`Command ${id} not found in registry`);
        }
        return command.execute(...args);
    }

    /**
     * Get a command by ID.
     *
     * @param id Command identifier
     * @returns Command instance or undefined
     */
    get(id: string): Command | undefined {
        return this.commands.get(id);
    }

    /**
     * Get all registered commands.
     *
     * @returns Array of all registered commands
     */
    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get commands by category.
     *
     * @param category Category name
     * @returns Array of commands in the category
     */
    getByCategory(category: string): Command[] {
        return this.getAll().filter(cmd => cmd.category === category);
    }

    /**
     * Check if a command is registered.
     *
     * @param id Command identifier
     * @returns True if command is registered
     */
    has(id: string): boolean {
        return this.commands.has(id);
    }

    /**
     * Dispose all registered commands.
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.commands.clear();
    }

    /**
     * Register all commands with the command registry.
     *
     * @param registry Command registry instance
     * @param context VS Code extension context
     * @param dependencies Command dependencies
     */
    static registerCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            androidService: AndroidService;
            onboardingWebview: { show(): Promise<void> };
            logcatService: LogcatService;
            avdService: AVDService;
            treeDataProvider: AVDTreeDataProvider;
            buildVariantService: BuildVariantService;
            buildVariantTreeDataProvider: BuildVariantTreeDataProvider;
        }
    ): void {
        CommandRegistry.registerSetupCommands(registry, context, {
            androidService: dependencies.androidService,
        });

        CommandRegistry.registerOnboardingCommands(registry, context, {
            onboardingWebview: dependencies.onboardingWebview,
        });

        CommandRegistry.registerLogcatCommands(registry, context, {
            logcatService: dependencies.logcatService,
        });

        CommandRegistry.registerAVDCommands(registry, context, {
            avdService: dependencies.avdService,
            treeDataProvider: dependencies.treeDataProvider,
        });

        CommandRegistry.registerBuildVariantCommands(registry, context, {
            buildVariantService: dependencies.buildVariantService,
            treeDataProvider: dependencies.buildVariantTreeDataProvider,
        });
    }

    static registerLogcatCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            logcatService: LogcatService;
        }
    ): void {
        registry.register(new StartLogcatCommand(dependencies.logcatService), context);
        registry.register(new StopLogcatCommand(dependencies.logcatService), context);
        registry.register(new ClearLogcatCommand(dependencies.logcatService), context);
        registry.register(new SetLogLevelCommand(dependencies.logcatService), context);
    }

    static registerOnboardingCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            onboardingWebview: { show(): Promise<void> };
        }
    ): void {
        registry.register(new ShowOnboardingCommand(dependencies.onboardingWebview), context);
    }

    static registerSetupCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            androidService: AndroidService;
        }
    ): void {
        registry.register(new SetupWizardCommand(dependencies.androidService), context);
        registry.register(new SetupSdkPathCommand(dependencies.androidService), context);
        registry.register(new SetupAvdManagerCommand(dependencies.androidService), context);
        registry.register(new SetupSdkManagerCommand(dependencies.androidService), context);
        registry.register(new SetupEmulatorCommand(dependencies.androidService), context);
    }

    static registerAVDCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            avdService: AVDService;
            treeDataProvider: AVDTreeDataProvider;
        }
    ): void {
        registry.register(new CreateAVDCommand(dependencies.avdService, dependencies.treeDataProvider), context);
        registry.register(new RefreshAVDListCommand(dependencies.avdService, dependencies.treeDataProvider), context);
        registry.register(new LaunchAVDCommand(dependencies.avdService, dependencies.treeDataProvider), context);
        registry.register(new RenameAVDCommand(dependencies.avdService, dependencies.treeDataProvider), context);
        registry.register(new DeleteAVDCommand(dependencies.avdService, dependencies.treeDataProvider), context);
        registry.register(new ShowAVDDirectoryCommand(), context);
        registry.register(new ShowAVDConfigFileCommand(), context);
    }

    static registerBuildVariantCommands(
        registry: CommandRegistry,
        context: vscode.ExtensionContext,
        dependencies: {
            buildVariantService: BuildVariantService;
            treeDataProvider: BuildVariantTreeDataProvider;
        }
    ): void {
        registry.register(new RefreshBuildVariantListCommand(dependencies.buildVariantService, dependencies.treeDataProvider), context);
        registry.register(new SelectBuildVariantCommand(dependencies.buildVariantService, dependencies.treeDataProvider), context);
    }
}
