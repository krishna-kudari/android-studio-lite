import { AppError } from "./AppError";

/**
 * Error thrown when a command execution fails.
 */
export class CommandError extends AppError {
    readonly code = 'COMMAND_ERROR';
    readonly severity = 'error' as const;

    constructor(
        message: string,
        public readonly commandId?: string,
        options?: {
            cause?: Error;
            context?: Record<string, unknown>;
            shouldLog?: boolean;
            shouldShowToUser?: boolean;
        }
    ) {
        super(message, options);
    }

    override getUserMessage(): string {
        if (this.commandId) {
            return `Command '${this.commandId}' failed: ${this.message}`;
        }
        return `Command error: ${this.message}`;
    }
}
