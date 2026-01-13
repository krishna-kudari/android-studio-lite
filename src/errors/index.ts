/**
 * Error handling module exports.
 *
 * This module provides a comprehensive error handling strategy for the extension:
 * - Base error class (AppError) with severity levels
 * - Specific error types for different scenarios
 * - Centralized error handler (ErrorHandler) for user-facing errors and logging
 *
 * @example
 * ```typescript
 * import { ErrorHandler, ConfigError } from './errors';
 *
 * try {
 *     // Some operation
 * } catch (error) {
 *     if (error instanceof ConfigError) {
 *         await ErrorHandler.handle(error, 'ConfigService');
 *     } else {
 *         await ErrorHandler.handle(error, 'MyService');
 *     }
 * }
 * ```
 */

export { AppError } from './AppError';
export { ConfigError } from './ConfigError';
export { ServiceError } from './ServiceError';
export { CommandError } from './CommandError';
export { ValidationError } from './ValidationError';
export { NetworkError } from './NetworkError';
export { ErrorHandler } from './ErrorHandler';
