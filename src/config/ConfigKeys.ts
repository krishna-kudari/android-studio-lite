/**
 * Type-safe configuration keys for Android Studio Lite extension.
 *
 * These keys match the configuration properties defined in package.json.
 * Using constants ensures type safety and prevents typos.
 */
export const ConfigKeys = {
    // Paths
    SDK_PATH: 'android-studio-lite.sdkPath',
    AVD_HOME: 'android-studio-lite.avdHome',
    ADB_PATH: 'android-studio-lite.adbPath',
    EMULATOR_PATH: 'android-studio-lite.emulatorPath',

    // Executables
    EXECUTABLE: 'android-studio-lite.executable',
    SDK_MANAGER: 'android-studio-lite.sdkManager',
    EMULATOR_OPT: 'android-studio-lite.emulatorOpt',

    // Versions
    CMD_VERSION: 'android-studio-lite.cmdVersion',

    // Device Management
    AUTO_SELECT_DEVICE: 'android-studio-lite.autoSelectDevice',
    DEVICE_POLL_INTERVAL: 'android-studio-lite.devicePollInterval',

    // Logcat
    LOGCAT_BUFFER_SIZE: 'android-studio-lite.logcatBufferSize',
} as const;

/**
 * Type for configuration key values.
 */
export type ConfigKey = typeof ConfigKeys[keyof typeof ConfigKeys];

/**
 * Configuration key to property name mapping (without prefix).
 */
export const ConfigKeyToProperty: Record<ConfigKey, string> = {
    [ConfigKeys.SDK_PATH]: 'sdkPath',
    [ConfigKeys.AVD_HOME]: 'avdHome',
    [ConfigKeys.ADB_PATH]: 'adbPath',
    [ConfigKeys.EMULATOR_PATH]: 'emulatorPath',
    [ConfigKeys.EXECUTABLE]: 'executable',
    [ConfigKeys.SDK_MANAGER]: 'sdkManager',
    [ConfigKeys.EMULATOR_OPT]: 'emulatorOpt',
    [ConfigKeys.CMD_VERSION]: 'cmdVersion',
    [ConfigKeys.AUTO_SELECT_DEVICE]: 'autoSelectDevice',
    [ConfigKeys.DEVICE_POLL_INTERVAL]: 'devicePollInterval',
    [ConfigKeys.LOGCAT_BUFFER_SIZE]: 'logcatBufferSize',
};
