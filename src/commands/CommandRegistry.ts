/**
 * Centralized command registry for managing all VS Code commands.
 *
 * This registry provides a single point of control for command registration,
 * discovery, and execution.
 */
import * as vscode from 'vscode';
import { Command } from './base/Command';

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
}
