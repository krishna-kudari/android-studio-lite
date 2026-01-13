import * as vscode from 'vscode';
import * as path from 'path';
import { workspace, ConfigurationTarget } from 'vscode';
import { ConfigKeys, ConfigKey } from './ConfigKeys';
import { ConfigError } from '../errors';
import { Platform } from '../module/platform';

/**
 * Configuration scope mapping from old ConfigScope enum to VS Code ConfigurationTarget.
 */
export enum ConfigScope {
    Global = 1,
    Workspace = 2,
    Folder = 3,
    GlobalAndWorkspace = 4,
    GlobalAndFolder = 5,
}

/**
 * Configuration interface matching the structure used throughout the extension.
 */
export interface IConfig {
    /** PATHS */
    sdkPath: string;
    cmdPath: string;
    avdHome: string;
    buildToolPath: string;
    platformToolsPath: string;
    emuPath: string;

    /** exe */
    cmdVersion: string;
    executable?: string;
    emulator?: string;
    sdkManager?: string;

    /** opts */
    emulatorOpt?: string;

    /** Additional configs */
    adbPath?: string;
    autoSelectDevice?: boolean;
    devicePollInterval?: number;
    logcatBufferSize?: number;
}

/**
 * Configuration service that provides type-safe access to extension configuration.
 *
 * Features:
 * - Type-safe configuration access
 * - Environment variable fallback handling
 * - Computed path resolution
 * - Configuration validation
 * - Centralized configuration logic
 */
export class ConfigService {
    private readonly configSection = 'android-studio-lite';
    private readonly workspaceConfig: vscode.WorkspaceConfiguration;

    constructor() {
        this.workspaceConfig = workspace.getConfiguration(this.configSection);
    }

    /**
     * Get a configuration value with optional default.
     */
    get<T>(key: ConfigKey, defaultValue?: T): T {
        return this.workspaceConfig.get<T>(key, defaultValue as T);
    }

    /**
     * Set a configuration value.
     */
    async set(
        key: ConfigKey,
        value: any,
        scope: ConfigScope = ConfigScope.Folder
    ): Promise<void> {
        const target = this.scopeToConfigurationTarget(scope);

        if (scope === ConfigScope.GlobalAndWorkspace) {
            await this.workspaceConfig.update(key, value, ConfigurationTarget.Global);
            await this.workspaceConfig.update(key, value, ConfigurationTarget.Workspace);
        } else if (scope === ConfigScope.GlobalAndFolder) {
            await this.workspaceConfig.update(key, value, ConfigurationTarget.Global);
            await this.workspaceConfig.update(key, value, ConfigurationTarget.WorkspaceFolder);
        } else {
            await this.workspaceConfig.update(key, value, target);
        }
    }

    /**
     * Get SDK Root Path with environment variable fallback.
     */
    getSdkPath(): string {
        // Check environment variables first
        const envSdkRoot = process.env.ANDROID_SDK_ROOT ?? '';
        const envAndroidHome = process.env.ANDROID_HOME ?? '';
        const envValue = envAndroidHome || envSdkRoot;

        // Get from config, fallback to environment variable
        const configValue = this.get<string>(ConfigKeys.SDK_PATH, '');
        const sdkPath = configValue || envValue;

        return sdkPath;
    }

    /**
     * Get AVD Home Path with environment variable fallback.
     */
    getAvdHome(): string {
        const envAvdHome = process.env.ANDROID_AVD_HOME ?? '';
        const configValue = this.get<string>(ConfigKeys.AVD_HOME, '');
        return configValue || envAvdHome;
    }

    /**
     * Get ADB Path with auto-detection fallback.
     */
    getAdbPath(): string {
        const customPath = this.get<string>(ConfigKeys.ADB_PATH, '');
        if (customPath) {
            return customPath;
        }

        // Auto-detect from SDK path
        const sdkPath = this.getSdkPath();
        if (sdkPath) {
            const platformToolsPath = path.join(sdkPath, 'platform-tools');
            const platform = this.getPlatform();
            const adbExecutable = platform === Platform.window ? 'adb.exe' : 'adb';
            return path.join(platformToolsPath, adbExecutable);
        }

        return '';
    }

    /**
     * Get Emulator Path with auto-detection fallback.
     */
    getEmulatorPath(): string {
        const customPath = this.get<string>(ConfigKeys.EMULATOR_PATH, '');
        if (customPath) {
            return customPath;
        }

        // Auto-detect from SDK path
        const sdkPath = this.getSdkPath();
        if (sdkPath) {
            const emuPath = path.join(sdkPath, 'emulator');
            const platform = this.getPlatform();
            const emulatorExecutable = platform === Platform.window ? 'emulator.exe' : 'emulator';
            return path.join(emuPath, emulatorExecutable);
        }

        return '';
    }

    /**
     * Get Command-Line Tools Version.
     */
    getCmdVersion(): string {
        return this.get<string>(ConfigKeys.CMD_VERSION, 'latest');
    }

    /**
     * Get Command-Line Tools Path (computed from SDK path and version).
     */
    getCmdPath(): string {
        const sdkPath = this.getSdkPath();
        const cmdVersion = this.getCmdVersion();
        if (!sdkPath) {
            return '';
        }
        return path.join(sdkPath, 'cmdline-tools', cmdVersion, 'bin');
    }

    /**
     * Get Build Tools Path (computed from SDK path).
     */
    getBuildToolPath(): string {
        const sdkPath = this.getSdkPath();
        if (!sdkPath) {
            return '';
        }
        return path.join(sdkPath, 'build-tools');
    }

    /**
     * Get Platform Tools Path (computed from SDK path).
     */
    getPlatformToolsPath(): string {
        const sdkPath = this.getSdkPath();
        if (!sdkPath) {
            return '';
        }
        return path.join(sdkPath, 'platform-tools');
    }

    /**
     * Get Emulator Path (computed from SDK path).
     */
    getEmuPath(): string {
        const sdkPath = this.getSdkPath();
        if (!sdkPath) {
            return '';
        }
        return path.join(sdkPath, 'emulator');
    }

    /**
     * Get AVD Manager executable name.
     */
    getExecutable(): string {
        return this.get<string>(ConfigKeys.EXECUTABLE, 'avdmanager');
    }

    /**
     * Get SDK Manager executable name.
     */
    getSdkManager(): string {
        return this.get<string>(ConfigKeys.SDK_MANAGER, 'sdkmanager');
    }

    /**
     * Get Emulator executable name.
     * Note: This returns the executable name, not the path.
     * Use getEmulatorPath() to get the full path.
     */
    getEmulatorExecutable(): string {
        const customPath = this.get<string>(ConfigKeys.EMULATOR_PATH, '');
        if (customPath) {
            // Extract executable name from path
            return path.basename(customPath);
        }
        // Default executable name based on platform
        const platform = this.getPlatform();
        return platform === Platform.window ? 'emulator.exe' : 'emulator';
    }

    /**
     * Get Emulator Options.
     */
    getEmulatorOpt(): string {
        return this.get<string>(ConfigKeys.EMULATOR_OPT, '');
    }

    /**
     * Get Auto-Select Device setting.
     */
    getAutoSelectDevice(): boolean {
        return this.get<boolean>(ConfigKeys.AUTO_SELECT_DEVICE, false);
    }

    /**
     * Get Device Poll Interval in milliseconds.
     */
    getDevicePollInterval(): number {
        return this.get<number>(ConfigKeys.DEVICE_POLL_INTERVAL, 5*60*1000);
    }

    /**
     * Get Logcat Buffer Size.
     */
    getLogcatBufferSize(): number {
        return this.get<number>(ConfigKeys.LOGCAT_BUFFER_SIZE, 10000);
    }

    /**
     * Get the full configuration object (for backward compatibility).
     * This computes all paths based on SDK path.
     */
    getConfig(): IConfig {
        const sdkPath = this.getSdkPath();
        const cmdVersion = this.getCmdVersion();
        const avdHome = this.getAvdHome();

        return {
            sdkPath,
            cmdPath: this.getCmdPath(),
            avdHome,
            buildToolPath: this.getBuildToolPath(),
            platformToolsPath: this.getPlatformToolsPath(),
            emuPath: this.getEmuPath(),

            cmdVersion,
            executable: this.getExecutable(),
            sdkManager: this.getSdkManager(),
            emulator: this.getEmulatorExecutable(),
            emulatorOpt: this.getEmulatorOpt(),

            adbPath: this.getAdbPath(),
            autoSelectDevice: this.getAutoSelectDevice(),
            devicePollInterval: this.getDevicePollInterval(),
            logcatBufferSize: this.getLogcatBufferSize(),
        };
    }

    /**
     * Validate that required configuration is present.
     * Throws ConfigError if validation fails.
     */
    validateRequired(): void {
        const sdkPath = this.getSdkPath();
        if (!sdkPath || sdkPath.trim() === '') {
            throw new ConfigError(
                'Android SDK Root Path is not configured',
                ConfigKeys.SDK_PATH,
                {
                    context: {
                        env: {
                            ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT,
                            ANDROID_HOME: process.env.ANDROID_HOME,
                        },
                    },
                }
            );
        }
    }

    /**
     * Validate SDK path exists and is accessible.
     */
    async validateSdkPath(): Promise<boolean> {
        const sdkPath = this.getSdkPath();
        if (!sdkPath) {
            return false;
        }

        try {
            const fs = await import('fs');
            return fs.existsSync(sdkPath) && fs.statSync(sdkPath).isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Get platform type.
     */
    private getPlatform(): Platform {
        switch (process.platform) {
            case 'linux':
                return Platform.linux;
            case 'darwin':
                return Platform.macOS;
            default:
                return Platform.window;
        }
    }

    /**
     * Convert ConfigScope to VS Code ConfigurationTarget.
     */
    private scopeToConfigurationTarget(scope: ConfigScope): ConfigurationTarget {
        switch (scope) {
            case ConfigScope.Global:
                return ConfigurationTarget.Global;
            case ConfigScope.Workspace:
                return ConfigurationTarget.Workspace;
            case ConfigScope.Folder:
                return ConfigurationTarget.WorkspaceFolder;
            default:
                return ConfigurationTarget.WorkspaceFolder;
        }
    }

    /**
     * Listen for configuration changes.
     */
    onDidChangeConfiguration(
        callback: (e: vscode.ConfigurationChangeEvent) => void
    ): vscode.Disposable {
        return workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(this.configSection)) {
                callback(e);
            }
        });
    }
}
