import { AppError } from "./AppError";

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends AppError {
    readonly code = 'VALIDATION_ERROR';
    readonly severity = 'warning' as const;

    constructor(
        message: string,
        public readonly field?: string,
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
        if (this.field) {
            return `Validation error for '${this.field}': ${this.message}`;
        }
        return `Validation error: ${this.message}`;
    }
}
