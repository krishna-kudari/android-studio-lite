/**
 * Dependency Injection module exports.
 *
 * This module provides dependency injection capabilities using tsyringe.
 *
 * @example
 * ```typescript
 * import { setupContainer, resolve, TYPES } from './di';
 * import { Manager } from '../core';
 *
 * // Setup container during extension activation
 * const container = setupContainer(context);
 *
 * // Resolve dependencies
 * const manager = resolve<Manager>(TYPES.Manager);
 * const androidService = resolve<AndroidService>(TYPES.AndroidService);
 * ```
 */

export { TYPES } from './types';
export { setupContainer, getContainer, resolve } from './container';
