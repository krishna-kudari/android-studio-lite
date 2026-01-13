/**
 * Base error class for all application errors.
 * Provides structured error handling with severity levels and error codes.
 */
export abstract class AppError extends Error {
    abstract readonly code: string;
    abstract readonly severity: 'error' | 'warning' | 'info';

    /**
     * Optional context information about where the error occurred
     */
    public readonly context?: Record<string, unknown>;

    /**
     * Whether this error should be logged to the output channel
     */
    public readonly shouldLog: boolean = true;

    /**
     * Whether this error should be shown to the user
     */
    public readonly shouldShowToUser: boolean = true;

    constructor(
        message: string,
        options?: {
            cause?: Error;
            context?: Record<string, unknown>;
            shouldLog?: boolean;
            shouldShowToUser?: boolean;
        }
    ) {
        super(message);
        this.name = this.constructor.name;
        this.cause = options?.cause;
        this.context = options?.context;
        this.shouldLog = options?.shouldLog ?? true;
        this.shouldShowToUser = options?.shouldShowToUser ?? true;

        // Maintains proper stack trace for where error was thrown (V8 only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Get a user-friendly error message
     */
    getUserMessage(): string {
        return this.message;
    }

    /**
     * Get detailed error information for logging
     */
    getDetails(): string {
        const details: string[] = [
            `Error: ${this.name}`,
            `Code: ${this.code}`,
            `Message: ${this.message}`,
        ];

        if (this.context) {
            details.push(`Context: ${JSON.stringify(this.context, null, 2)}`);
        }

        if (this.cause instanceof Error) {
            details.push(`Cause: ${this.cause.message}`);
            if (this.cause.stack) {
                details.push(`Cause Stack: ${this.cause.stack}`);
            }
        }

        if (this.stack) {
            details.push(`Stack: ${this.stack}`);
        }

        return details.join('\n');
    }
}
