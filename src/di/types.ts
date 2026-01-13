/**
 * Dependency Injection type symbols.
 *
 * These symbols are used to register and resolve dependencies in the DI container.
 * Using symbols ensures type safety and prevents naming conflicts.
 */
export const TYPES = {
    // Core Services
    Manager: Symbol.for('Manager'),
    ConfigService: Symbol.for('ConfigService'),
    Output: Symbol.for('Output'),
    Cache: Symbol.for('Cache'),

    // Android Services
    AndroidService: Symbol.for('AndroidService'),
    AVDService: Symbol.for('AVDService'),
    BuildVariantService: Symbol.for('BuildVariantService'),
    GradleService: Symbol.for('GradleService'),
    SdkInstallerService: Symbol.for('SdkInstallerService'),

    // VS Code Context
    ExtensionContext: Symbol.for('ExtensionContext'),
} as const;

/**
 * Type helper for getting symbol values.
 */
export type TypeSymbol = typeof TYPES[keyof typeof TYPES];
