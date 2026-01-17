/**
 * Base command interface and abstract class for VS Code commands.
 *
 * All commands should extend this class to ensure consistent structure
 * and enable centralized command management.
 */
import * as vscode from 'vscode';

/**
 * Command metadata for registration and discovery.
 */
export interface ICommandMetadata {
    /** Unique command identifier (e.g., 'android-studio-lite.setup-wizard') */
    readonly id: string;
    /** Human-readable command title */
    readonly title: string;
    /** Command category for organization */
    readonly category?: string;
    /** VS Code icon identifier */
    readonly icon?: string;
    /** Command description */
    readonly description?: string;
}

/**
 * Abstract base class for all commands.
 *
 * Commands extending this class will be automatically registered
 * by the CommandRegistry.
 */
export abstract class Command implements ICommandMetadata {
    abstract readonly id: string;
    abstract readonly title: string;
    readonly category?: string;
    readonly icon?: string;
    readonly description?: string;

    /**
     * Execute the command.
     *
     * @param args Command arguments passed from VS Code
     * @returns Promise that resolves when command completes
     */
    abstract execute(...args: any[]): Promise<void> | void;

    /**
     * Register this command with VS Code.
     *
     * @param context VS Code extension context
     * @returns Disposable for command registration
     */
    register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand(this.id, async (...args: any[]) => {
            try {
                await this.execute(...args);
            } catch (error) {
                console.error(`Error executing command ${this.id}:`, error);
                throw error;
            }
        });
    }
}
