import { AppError } from "./AppError";

/**
 * Error thrown when configuration is invalid or missing.
 */
export class ConfigError extends AppError {
    readonly code = 'CONFIG_ERROR';
    readonly severity = 'error' as const;

    constructor(
        message: string,
        public readonly configKey?: string,
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
        if (this.configKey) {
            return `Configuration error for '${this.configKey}': ${this.message}`;
        }
        return `Configuration error: ${this.message}`;
    }
}
