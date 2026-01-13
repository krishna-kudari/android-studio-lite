import * as vscode from 'vscode';
import { AppError } from "./AppError";
import type { Output } from '../module/ui';

/**
 * Centralized error handler for the extension.
 * Handles displaying errors to users and logging them appropriately.
 */
export class ErrorHandler {
    private static outputChannel: Output | null = null;

    /**
     * Set the output channel for error logging.
     * Should be called during extension activation.
     */
    static setOutputChannel(output: Output): void {
        ErrorHandler.outputChannel = output;
    }

    /**
     * Handle an error, displaying it to the user and logging it if necessary.
     *
     * @param error - The error to handle
     * @param context - Optional context string (e.g., service name, command name)
     * @param options - Additional options for error handling
     */
    static async handle(
        error: Error,
        context?: string,
        options?: {
            /**
             * Whether to show the error to the user (overrides error's shouldShowToUser)
             */
            showToUser?: boolean;
            /**
             * Whether to log the error (overrides error's shouldLog)
             */
            log?: boolean;
            /**
             * Additional actions to show in the error message
             */
            actions?: string[];
        }
    ): Promise<void> {
        const showToUser = options?.showToUser ?? (error instanceof AppError ? error.shouldShowToUser : true);
        const shouldLog = options?.log ?? (error instanceof AppError ? error.shouldLog : true);

        // Log the error if needed
        if (shouldLog) {
            ErrorHandler.logError(error, context);
        }

        // Show to user if needed
        if (showToUser) {
            await ErrorHandler.showToUser(error, context, options?.actions);
        }
    }

    /**
     * Log error to output channel and console.
     */
    private static logError(error: Error, context?: string): void {
        const timestamp = new Date().toISOString();
        const contextPrefix = context ? `[${context}] ` : '';
        const errorMessage = `[${timestamp}] ${contextPrefix}${error.message}`;

        // Log to console (always)
        console.error(`${contextPrefix}Error:`, error);

        // Log to output channel if available
        if (ErrorHandler.outputChannel) {
            if (error instanceof AppError) {
                ErrorHandler.outputChannel.append(`\n${errorMessage}`, 'error');
                ErrorHandler.outputChannel.append(error.getDetails(), 'error');
            } else {
                ErrorHandler.outputChannel.append(`\n${errorMessage}`, 'error');
                if (error.stack) {
                    ErrorHandler.outputChannel.append(`Stack: ${error.stack}`, 'error');
                }
            }
        }
    }

    /**
     * Show error message to user with appropriate severity.
     */
    private static async showToUser(
        error: Error,
        context?: string,
        actions?: string[]
    ): Promise<string | undefined> {
        const contextPrefix = context ? `[${context}] ` : '';
        let message: string;
        let severity: 'error' | 'warning' | 'info';

        if (error instanceof AppError) {
            message = error.getUserMessage();
            severity = error.severity;
        } else {
            message = error.message || 'An unexpected error occurred';
            severity = 'error';
        }

        const fullMessage = `${contextPrefix}${message}`;
        const actionButtons = actions || ['OK'];

        switch (severity) {
            case 'warning':
                return vscode.window.showWarningMessage(fullMessage, ...actionButtons);
            case 'info':
                return vscode.window.showInformationMessage(fullMessage, ...actionButtons);
            case 'error':
            default:
                // For errors, add "Show Details" option
                const errorActions = [...actionButtons, 'Show Details'];
                const selection = await vscode.window.showErrorMessage(fullMessage, ...errorActions);

                if (selection === 'Show Details') {
                    await ErrorHandler.showErrorDetails(error, context);
                }

                return selection;
        }
    }

    /**
     * Show detailed error information in a webview or output channel.
     */
    private static async showErrorDetails(error: Error, context?: string): Promise<void> {
        const contextPrefix = context ? `[${context}] ` : '';
        let details: string;

        if (error instanceof AppError) {
            details = error.getDetails();
        } else {
            details = [
                `Error: ${error.name}`,
                `Message: ${error.message}`,
                error.stack ? `Stack: ${error.stack}` : '',
            ]
                .filter(Boolean)
                .join('\n');
        }

        // Show in output channel
        if (ErrorHandler.outputChannel) {
            ErrorHandler.outputChannel.show();
            ErrorHandler.outputChannel.append(`\n${contextPrefix}Error Details:`, 'error');
            ErrorHandler.outputChannel.append(details, 'error');
        } else {
            // Fallback: show in information message if no output channel
            await vscode.window.showInformationMessage(
                `${contextPrefix}Error details logged to console. Check Developer Tools for more information.`,
                'OK'
            );
        }
    }

    /**
     * Wrap an async function with error handling.
     * Useful for command handlers and event listeners.
     *
     * @example
     * ```typescript
     * const safeHandler = ErrorHandler.wrap(async () => {
     *     await someAsyncOperation();
     * }, 'MyCommand');
     *
     * vscode.commands.registerCommand('my.command', safeHandler);
     * ```
     */
    static wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        context?: string
    ): T {
        return (async (...args: Parameters<T>) => {
            try {
                return await fn(...args);
            } catch (error) {
                await ErrorHandler.handle(
                    error instanceof Error ? error : new Error(String(error)),
                    context
                );
                throw error; // Re-throw to allow caller to handle if needed
            }
        }) as T;
    }

    /**
     * Wrap a synchronous function with error handling.
     */
    static wrapSync<T extends (...args: any[]) => any>(
        fn: T,
        context?: string
    ): T {
        return ((...args: Parameters<T>) => {
            try {
                return fn(...args);
            } catch (error) {
                ErrorHandler.handle(
                    error instanceof Error ? error : new Error(String(error)),
                    context
                );
                throw error;
            }
        }) as T;
    }
}

