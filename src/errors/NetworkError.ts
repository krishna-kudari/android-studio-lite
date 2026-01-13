import { AppError } from "./AppError";

/**
 * Error thrown when network operations fail.
 */
export class NetworkError extends AppError {
    readonly code = 'NETWORK_ERROR';
    readonly severity = 'error' as const;

    constructor(
        message: string,
        public readonly url?: string,
        public readonly statusCode?: number,
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
        if (this.statusCode) {
            return `Network error (${this.statusCode}): ${this.message}`;
        }
        if (this.url) {
            return `Network error for '${this.url}': ${this.message}`;
        }
        return `Network error: ${this.message}`;
    }
}
