import { AppError } from "./AppError";

/**
 * Error thrown when a service operation fails.
 */
export class ServiceError extends AppError {
    readonly code = 'SERVICE_ERROR';
    readonly severity = 'error' as const;

    constructor(
        message: string,
        public readonly serviceName?: string,
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
        if (this.serviceName) {
            return `${this.serviceName} error: ${this.message}`;
        }
        return `Service error: ${this.message}`;
    }
}
