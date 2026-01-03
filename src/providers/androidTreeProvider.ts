import * as vscode from 'vscode';
import { Device } from '../utils/adbParser';
import { DeviceService } from '../services/deviceService';
import { BuildVariantService } from '../services/buildVariantService';
import { BuildVariant } from '../utils/gradleParser';
import { LogcatProvider } from './logcatProvider';
import { AppStateService, AppState } from '../services/appStateService';

// Tree item types matching wireframe structure
export type AndroidTreeItem = 
    | SectionHeaderItem 
    | DeviceSelectorItem 
    | BuildVariantSelectorItem 
    | ActionItem 
    | LogcatItem
    | ErrorItem;

/**
 * Section header (uppercase, minimal styling)
 */
export class SectionHeaderItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label.toUpperCase(), vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'section-header';
        this.description = '';
    }
}

/**
 * Device selector row (with dropdown chevron)
 */
export class DeviceSelectorItem extends vscode.TreeItem {
    constructor(
        public readonly device: Device | null,
        public readonly devices: Device[],
        public readonly lastSelectedEmulator: string | null = null
    ) {
        super('', vscode.TreeItemCollapsibleState.None);
        
        if (device) {
            // For emulators, prefer AVD name over system image name
            let displayName = device.name || device.id;
            if (device.type === 'emulator' && device.avdName) {
                displayName = device.avdName;
            }
            const deviceLabel = displayName.includes('API') 
                ? displayName 
                : `${displayName} (API ${device.androidVersion || '?'})`;
            this.label = deviceLabel;
            this.description = '';
        } else if (devices.length > 0) {
            // Show first available device if none selected
            const firstDevice = devices.find(d => d.status === 'device') || devices[0];
            // For emulators, prefer AVD name
            let displayName = firstDevice.name || firstDevice.id;
            if (firstDevice.type === 'emulator' && firstDevice.avdName) {
                displayName = firstDevice.avdName;
            }
            const deviceLabel = displayName.includes('API') 
                ? displayName 
                : `${displayName} (API ${firstDevice.androidVersion || '?'})`;
            this.label = deviceLabel;
            this.description = '';
        } else if (lastSelectedEmulator) {
            // Show last used emulator even if not booted
            this.label = lastSelectedEmulator;
            this.description = 'Not booted';
        } else {
            this.label = 'No device selected';
            this.description = '';
        }
        
        this.tooltip = 'Select target Android device';
        this.iconPath = new vscode.ThemeIcon('device-mobile');
        this.contextValue = 'device-selector';
        this.command = {
            command: 'android-studio-lite.selectDevice',
            title: 'Select Device'
        };
    }
}

/**
 * Build variant selector row (with dropdown chevron)
 */
export class BuildVariantSelectorItem extends vscode.TreeItem {
    constructor(
        public readonly variant: BuildVariant | null,
        public readonly variants: BuildVariant[]
    ) {
        super('', vscode.TreeItemCollapsibleState.None);
        
        if (variant) {
            this.label = variant.name;
            this.description = '';
        } else {
            this.label = 'No variant selected';
            this.description = '';
        }
        
        this.tooltip = 'Select active build configuration';
        this.iconPath = new vscode.ThemeIcon('tools');
        this.contextValue = 'build-variant-selector';
        this.command = {
            command: 'android-studio-lite.selectBuildVariant',
            title: 'Select Build Variant'
        };
    }
}

/**
 * Action button row (Run App, Stop App, Uninstall)
 */
export class ActionItem extends vscode.TreeItem {
    constructor(
        public readonly actionType: 'run' | 'stop' | 'uninstall',
        public readonly appState: AppState,
        public readonly hasDevice: boolean,
        public readonly hasVariant: boolean
    ) {
        super('', vscode.TreeItemCollapsibleState.None);
        
        this.setupItem();
    }

    private setupItem(): void {
        switch (this.actionType) {
            case 'run':
                this.label = 'Run App';
                this.iconPath = this.appState === 'installing' 
                    ? new vscode.ThemeIcon('loading~spin')
                    : new vscode.ThemeIcon('play');
                this.tooltip = 'Build and launch app on device';
                this.contextValue = this.appState === 'installing' 
                    ? 'action-run-installing'
                    : this.appState === 'running' || !this.hasDevice || !this.hasVariant
                    ? 'action-run-disabled'
                    : 'action-run';
                // Only set command if not disabled
                if (this.appState !== 'running' && this.hasDevice && this.hasVariant) {
                    this.command = {
                        command: 'android-studio-lite.runApp',
                        title: 'Run App'
                    };
                }
                if (this.appState === 'installing') {
                    this.description = 'Installing…';
                }
                break;
                
            case 'stop':
                this.label = 'Stop App';
                this.iconPath = new vscode.ThemeIcon('debug-stop');
                this.tooltip = this.appState === 'installing' 
                    ? 'Cancel build and stop app'
                    : 'Force-stop the running app';
                // Enable Stop App when running OR when installing (to cancel build)
                const stopEnabled = (this.appState === 'running' || this.appState === 'installing') && this.hasDevice;
                this.contextValue = stopEnabled
                    ? 'action-stop'
                    : 'action-stop-disabled';
                // Only set command if enabled
                if (stopEnabled) {
                    this.command = {
                        command: 'android-studio-lite.stopApp',
                        title: 'Stop App'
                    };
                }
                if (this.appState === 'installing') {
                    this.description = 'Cancel build';
                }
                break;
                
            case 'uninstall':
                this.label = 'Uninstall';
                this.iconPath = new vscode.ThemeIcon('trashcan');
                this.tooltip = 'Remove app from device';
                this.contextValue = this.hasDevice && this.appState !== 'installing'
                    ? 'action-uninstall'
                    : 'action-uninstall-disabled';
                // Only set command if enabled
                if (this.hasDevice && this.appState !== 'installing') {
                    this.command = {
                        command: 'android-studio-lite.uninstallApp',
                        title: 'Uninstall'
                    };
                }
                break;
        }
    }
}

/**
 * Logcat entry row
 */
export class LogcatItem extends vscode.TreeItem {
    constructor(
        public readonly isActive: boolean,
        public readonly isPaused: boolean
    ) {
        super('', vscode.TreeItemCollapsibleState.None);
        
        if (isActive) {
            this.label = 'Live Logcat';
            this.description = '●';
        } else {
            this.label = 'Open Logcat';
            this.description = '';
        }
        
        this.tooltip = 'View real-time app logs';
        this.iconPath = new vscode.ThemeIcon('output');
        this.contextValue = isActive ? 'logcat-active' : 'logcat';
        this.command = {
            command: 'android-studio-lite.startLogcat',
            title: 'Open Logcat'
        };
    }
}

/**
 * Error state block
 */
export class ErrorItem extends vscode.TreeItem {
    constructor(
        public readonly message: string,
        public readonly retryCommand?: string
    ) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.tooltip = message;
        this.iconPath = new vscode.ThemeIcon('warning');
        this.contextValue = 'error';
        if (retryCommand) {
            this.command = {
                command: retryCommand,
                title: 'Retry'
            };
        }
    }
}

/**
 * Main tree provider matching wireframe structure
 */
export class AndroidTreeProvider implements vscode.TreeDataProvider<AndroidTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AndroidTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<AndroidTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AndroidTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(
        private deviceService: DeviceService,
        private buildVariantService: BuildVariantService,
        private appStateService: AppStateService,
        private logcatProvider?: LogcatProvider
    ) {
        // Subscribe to state changes
        appStateService.onStateChange(() => {
            this.refresh();
        });
        
        // Initial refresh
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AndroidTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AndroidTreeItem): AndroidTreeItem[] {
        // Root level - return flat list matching wireframe
        if (!element) {
            const devices = this.deviceService.getDevices();
            const selectedDevice = this.deviceService.getSelectedDevice();
            const variants = this.buildVariantService.getVariants();
            const selectedVariant = this.buildVariantService.getSelectedVariant();
            const appState = this.appStateService.getState();
            const isLogcatActive = this.logcatProvider?.isStreamingActive() || false;
            const isLogcatPaused = this.logcatProvider?.isPaused() || false;

            console.log(`[AndroidTreeProvider] getChildren called with ${devices.length} devices`);
            console.log(`[AndroidTreeProvider] Devices:`, devices.map(d => `${d.id} (${d.status})`).join(', '));

            const items: AndroidTreeItem[] = [];

            // Device section
            items.push(new SectionHeaderItem('Device'));
            // Always show device selector (with last selected emulator if no devices)
            const onlineDevices = devices.filter(d => d.status === 'device');
            const lastSelectedEmulator = this.deviceService.getLastSelectedEmulator();
            
            // Show device selector if we have devices OR a last selected emulator
            if (devices.length > 0 || lastSelectedEmulator) {
                console.log(`[AndroidTreeProvider] Showing device selector with ${devices.length} devices`);
                items.push(new DeviceSelectorItem(selectedDevice, devices, lastSelectedEmulator));
            } else {
                console.log(`[AndroidTreeProvider] No devices found, showing error`);
                items.push(new ErrorItem('No devices detected', 'android-studio-lite.refreshDevices'));
            }

            // Build Variant section
            items.push(new SectionHeaderItem('Build Variant'));
            items.push(new BuildVariantSelectorItem(selectedVariant, variants));

            // Actions section
            items.push(new SectionHeaderItem('Actions'));
            items.push(new ActionItem('run', appState, !!selectedDevice, !!selectedVariant));
            items.push(new ActionItem('stop', appState, !!selectedDevice, !!selectedVariant));
            items.push(new ActionItem('uninstall', appState, !!selectedDevice, !!selectedVariant));

            // Logs section
            items.push(new SectionHeaderItem('Logs'));
            items.push(new LogcatItem(isLogcatActive, isLogcatPaused));

            return items;
        }

        // No nested children (flat structure)
        return [];
    }
}
