/**
 * Configuration module exports.
 *
 * This module provides a centralized, type-safe configuration service for the extension.
 *
 * @example
 * ```typescript
 * import { ConfigService, ConfigKeys, ConfigScope } from './config';
 *
 * const configService = new ConfigService();
 *
 * // Get SDK path (with env fallback)
 * const sdkPath = configService.getSdkPath();
 *
 * // Set configuration
 * await configService.set(ConfigKeys.SDK_PATH, '/path/to/sdk', ConfigScope.Global);
 *
 * // Get full config
 * const config = configService.getConfig();
 * ```
 */

export { ConfigService, ConfigScope, type IConfig } from './ConfigService';
export { ConfigKeys, type ConfigKey, ConfigKeyToProperty } from './ConfigKeys';
