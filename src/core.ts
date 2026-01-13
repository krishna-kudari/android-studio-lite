import * as path from "path";
import { workspace, Disposable } from 'vscode';
import { AVDService } from './service/AVDService';
import { AndroidService } from './service/AndroidService';

import { Output } from "./module/ui";
import { Cache } from "./module/cache";
import { Platform } from "./module/platform";
import { BuildVariantService } from "./service/BuildVariantService";
import { GradleService } from "./service/GradleService";
import { ConfigService, ConfigScope as NewConfigScope, type IConfig as IConfigFromService } from './config';
import { ConfigKeys } from './config/ConfigKeys';

/**
 * Configuration interface (re-exported from config module for backward compatibility).
 * @deprecated Use IConfig from './config' instead.
 */
export type IConfig = IConfigFromService;

export enum ConfigItem {
    sdkPath = "sdkPath",
    avdHome = "avdHome",
    cmdVersion = "cmdVersion",
    executable = "executable",
    emulator = "emulator",
    emulatorOpt = "emulatorOpt",
    sdkManager = "sdkManager",
}

/**
 * Configuration scope enum (kept for backward compatibility).
 * Maps to ConfigScope from config module.
 */
export enum ConfigScope {
    global = 1,
    workspace = 2,
    folder = 3,
    globalnWorkspace = 4,
    globalnfolder = 5,
}

/**
 * Map old ConfigScope to new ConfigScope.
 */
function mapConfigScope(scope: ConfigScope): NewConfigScope {
    switch (scope) {
        case ConfigScope.global:
            return NewConfigScope.Global;
        case ConfigScope.workspace:
            return NewConfigScope.Workspace;
        case ConfigScope.folder:
            return NewConfigScope.Folder;
        case ConfigScope.globalnWorkspace:
            return NewConfigScope.GlobalAndWorkspace;
        case ConfigScope.globalnfolder:
            return NewConfigScope.GlobalAndFolder;
        default:
            return NewConfigScope.Folder;
    }
}

/**
 * Map ConfigItem to ConfigKey.
 */
function mapConfigItem(item: ConfigItem): string {
    switch (item) {
        case ConfigItem.sdkPath:
            return ConfigKeys.SDK_PATH;
        case ConfigItem.avdHome:
            return ConfigKeys.AVD_HOME;
        case ConfigItem.cmdVersion:
            return ConfigKeys.CMD_VERSION;
        case ConfigItem.executable:
            return ConfigKeys.EXECUTABLE;
        case ConfigItem.emulator:
            return ConfigKeys.EMULATOR_PATH;
        case ConfigItem.emulatorOpt:
            return ConfigKeys.EMULATOR_OPT;
        case ConfigItem.sdkManager:
            return ConfigKeys.SDK_MANAGER;
        default:
            return `android-studio-lite.${item}`;
    }
}

export class Manager {
    private static instance: Manager;
    public static getInstance() {
        if (!Manager.instance) {
            Manager.instance = new Manager();
        }
        return Manager.instance;
    }

    readonly android: AndroidService;
    readonly avd: AVDService;
    readonly buildVariant: BuildVariantService;
    readonly gradle: GradleService;
    readonly output: Output;
    readonly cache: Cache;
    readonly config: ConfigService;

    private constructor() {
        this.cache = new Cache();
        this.config = new ConfigService();

        this.android = new AndroidService(this);
        this.avd = new AVDService(this);
        this.buildVariant = new BuildVariantService(this);
        this.gradle = new GradleService(this);
        this.output = new Output("Android Studio Lite");
    }

    /**
     * Set configuration value (delegates to ConfigService).
     * @param key Configuration key (can be ConfigItem enum or string)
     * @param value Configuration value
     * @param scope Configuration scope
     * @deprecated Use manager.config.set() directly with ConfigKeys for better type safety.
     */
    public async setConfig(key: string | ConfigItem, value: any, scope: ConfigScope = ConfigScope.folder): Promise<void> {
        const configKey = typeof key === 'string' ? key : mapConfigItem(key);
        const newScope = mapConfigScope(scope);
        await this.config.set(configKey as any, value, newScope);
    }

    /**
     * Get configuration (delegates to ConfigService).
     * @deprecated Use manager.config.getConfig() or specific getters for better type safety.
     */
    public getConfig(): IConfig {
        return this.config.getConfig();
    }

    public getPlatform() {
        switch (process.platform) {
            case 'linux':
                return Platform.linux;
            case 'darwin':
                return Platform.macOS;
        }
        return Platform.window;
    }

    private _windows: { [key: string]: Disposable } = {};
    registerDisposable(name: string, window: Disposable) {
        this._windows[name] = window;
    }

    getDisposable(name: string) {
        return this._windows[name];
    }
}
