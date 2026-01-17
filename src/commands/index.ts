/**
 * Command module exports.
 *
 * This module provides centralized command management for the extension.
 */
export { Command, ICommandMetadata } from './base/Command';
export { CommandRegistry } from './CommandRegistry';

// Export command implementations
export * from './setup';
export * from './onboarding';
export * from './logcat';
