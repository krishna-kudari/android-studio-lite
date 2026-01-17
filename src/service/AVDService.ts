import { injectable, inject } from 'tsyringe';
import type { Disposable, ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import * as nodePath from "node:path";
import { AVD, AVDDevice, AVDTarget, AVDManager, Command as avdcommand } from '../cmd/AVDManager';
import { Service } from './Service';
import { Emulator, Command as EmuCommand } from '../cmd/Emulator';
import { TYPES } from '../di/types';
import { Cache } from '../module/cache';
import { ConfigService } from '../config';
import { Output } from '../module/output';
import { ADBExecutable, Command as AdbCommand } from '../cmd/ADB';
import { parseDevicesOutput, Device } from '../utils/adbParser';

/**
 * Unified model that combines AVD with its running device ID
 * This is the single source of truth for AVD selection
 */
export interface AVDWithDevice extends AVD {
    deviceId: string | null;  // Device ID when AVD is running (e.g., "emulator-5554")
    isRunning: boolean;       // Convenience flag indicating if device is online
}

@injectable()
export class AVDService extends Service {
    readonly avdmanager: AVDManager;
    readonly emulator: Emulator;
    private readonly adbExecutable: ADBExecutable;
    private devices: Device[] = [];
    private devicePollingInterval: NodeJS.Timeout | null = null;

    private selectedAVD: AVDWithDevice | null = null;

    private readonly deviceStateListeners = new Set<(state: {
        selectedAVD: AVDWithDevice | null;
        devices: Device[];
    }) => void>();

    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output,
        @inject(TYPES.AndroidService) private readonly androidService: import('./AndroidService').AndroidService,
        @inject(TYPES.ExtensionContext) private readonly context: ExtensionContext
    ) {
        super(cache, configService, output);

        const avdManagerPath = androidService.getAVDManager();
        const emulatorPath = androidService.getEmulator();
        this.avdmanager = new AVDManager(output, avdManagerPath);
        this.emulator = new Emulator(output, emulatorPath);

        const adbPath = configService.getAdbPath() || 'adb';
        this.adbExecutable = new ADBExecutable(output, adbPath);
        void this.loadSelectionState();
    }

    async getAVDList(noCache: boolean = false): Promise<AVD[]> {
        let out = this.getCache("getAVDList");
        if (!out || noCache) {
            out = this.avdmanager.exec<AVD>(avdcommand.listAvd);
            this.setCache("getAVDList", out);
        }
        return out as AVD[];
    }

    async getAVDDeviceList(noCache: boolean = false) {
        let out = this.getCache("getAVDDeviceList");
        if (!out || noCache) {
            out = this.avdmanager.exec<AVDDevice>(avdcommand.listDevice);
            this.setCache("getAVDDeviceList", out);
        }
        return out;
    }

    async getAVDTargetList(noCache: boolean = false) {
        let out = this.getCache("getAVDTargetList");
        if (!out || noCache) {
            out = this.avdmanager.exec<AVDTarget>(avdcommand.listTarget);
            this.setCache("getAVDTargetList", out);
        }
        return out;
    }

    async createAVD(avdname: string, path: string, imgname: string, device: number = -1) {
        const config = this.getConfig();
        const avdHome = config.avdHome;

        let extra = "";
        if (avdHome !== "") {
            const avdPath = nodePath.join(avdHome, avdname + ".avd");
            extra += ` --path "${avdPath}" `;
        }
        if (device >= 0) {
            extra += ` --device "${device}" `;
        }
        return this.avdmanager.exec<AVD>(avdcommand.create, avdname, path, imgname, extra);
    }

    async renameAVD(name: string, newName: string) {
        return this.avdmanager.exec<AVD>(avdcommand.rename, name, newName);
    }

    async deleteAVD(name: string) {
        return this.avdmanager.exec<AVD>(avdcommand.delete, name);
    }

    async launchEmulator(name: string, opt?: string) {
        const config = this.getConfig();
        opt = (opt ?? "") + " " + (config.emulatorOpt ?? "");
        return this.emulator.exec<string>(EmuCommand.run, name, opt);
    }

    startDevicePolling(intervalMs: number = 30 * 1000): void {
        if (this.devicePollingInterval) {
            return;
        }
        void this.refreshDevices(true);
        this.devicePollingInterval = setInterval(() => {
            void this.refreshDevices(true);
        }, intervalMs);
    }

    stopDevicePolling(): void {
        if (this.devicePollingInterval) {
            clearInterval(this.devicePollingInterval);
            this.devicePollingInterval = null;
        }
    }

    async refreshDevices(force: boolean = false): Promise<void> {
        if (!force) {
            const cached = this.getCache(AVDService.DEVICE_LIST_CACHE_KEY);
            if (cached) {
                this.devices = cached;
                await this.updateSelectedAVDDeviceMapping();
                this.notifyDeviceStateChanged();
                return;
            }
        }

        // Fetch devices from ADB (returns Device[] directly)
        const devices = await this.fetchDevicesFromAdb();

        this.devices = devices;
        this.setCache(AVDService.DEVICE_LIST_CACHE_KEY, devices, AVDService.DEVICE_LIST_TTL_SECONDS);

        // Update selectedAVD with current device mapping
        await this.updateSelectedAVDDeviceMapping();

        // Auto-select first device if config enabled (for physical devices)
        if (!this.selectedAVD && devices.length > 0) {
            const config = vscode.workspace.getConfiguration('android-studio-lite');
            const autoSelect = config.get('autoSelectDevice', false);
            if (autoSelect) {
                const firstOnlineDevice = devices.find(d => d.status === 'device');
                if (firstOnlineDevice && firstOnlineDevice.type === 'emulator') {
                    // Try to set AVD for emulator
                    const avdName = await this.getDeviceAVDName(firstOnlineDevice.id);
                    if (avdName) {
                        await this.setSelectedAVD(avdName);
                    }
                }
            }
        }

        this.notifyDeviceStateChanged();
    }

    /**
     * Update the device mapping for selected AVD
     * Finds the running emulator device for the selected AVD and updates deviceId
     * Uses the current devices list (doesn't refresh to avoid infinite loops)
     */
    private async updateSelectedAVDDeviceMapping(): Promise<void> {
        if (!this.selectedAVD) {
            return;
        }

        // Use current devices list instead of calling refreshDevices again
        let matchingEmulator: Device | null = null;
        for (const device of this.devices) {
            if (device.type === 'emulator' && device.status === 'device') {
                const deviceAVDName = await this.getDeviceAVDName(device.id);
                // Compare AVD names (trim and case-insensitive for robustness)
                const normalizedDeviceName = deviceAVDName?.trim().toLowerCase();
                const normalizedSelectedName = this.selectedAVD.name.trim().toLowerCase();
                if (normalizedDeviceName === normalizedSelectedName) {
                    matchingEmulator = device;
                    break;
                }
            }
        }

        if (matchingEmulator) {
            // Update deviceId and isRunning flag
            this.selectedAVD = {
                ...this.selectedAVD,
                deviceId: matchingEmulator.id,
                isRunning: true,
            };
            await this.saveSelectedAVD();
        } else {
            // Device is not running
            this.selectedAVD = {
                ...this.selectedAVD,
                deviceId: null,
                isRunning: false,
            };
        }
    }

    getDevices(): Device[] {
        return this.devices;
    }

    getOnlineDevices(): Device[] {
        return this.devices.filter(d => d.status === 'device');
    }

    getSelectedDeviceId(): string | null {
        return this.selectedAVD?.deviceId || null;
    }

    getSelectedDevice(): Device | null {
        if (!this.selectedAVD?.deviceId) {
            return null;
        }
        return this.devices.find(d => d.id === this.selectedAVD!.deviceId && d.status === 'device') || null;
    }

    async selectDevice(deviceId: string): Promise<void> {
        if (typeof deviceId !== 'string') {
            throw new Error(`Invalid device ID: expected string, got ${typeof deviceId}`);
        }

        const device = this.devices.find(d => d.id === deviceId);
        if (!device) {
            const availableDevices = this.devices.map(d => d.id).join(', ') || 'none';
            throw new Error(`Device "${deviceId}" not found. Available devices: ${availableDevices}`);
        }

        if (device.status !== 'device') {
            throw new Error(`Device "${deviceId}" is not online (status: ${device.status})`);
        }

        // If device is an emulator, set selectedAVD with device mapping
        if (device.type === 'emulator') {
            const avdName = await this.getDeviceAVDName(deviceId);
            if (avdName) {
                await this.setSelectedAVD(avdName);
                // Device mapping will be updated in refreshDevices/updateSelectedAVDDeviceMapping
            }
        }
        // For physical devices, we don't set selectedAVD (it's AVD-specific)

        this.notifyDeviceStateChanged();
    }

    getSelectedAVDName(): string | null {
        return this.selectedAVD?.name || null;
    }

    async setSelectedAVD(avd: string | AVD): Promise<void> {
        let avdObject: AVD | null = null;

        if (typeof avd === 'string') {
            const avds = await this.getAVDList();
            avdObject = avds.find(a => a.name === avd) || null;
        } else {
            avdObject = avd;
        }

        if (!avdObject) {
            this.selectedAVD = null;
            await this.saveSelectedAVD();
            this.notifyDeviceStateChanged();
            return;
        }

                // Create AVDWithDevice with initial device mapping
                // Refresh devices first to ensure we have the latest device list
                await this.refreshDevices(true);
                const matchingEmulator = await this.getRunningEmulatorForAVD(avdObject.name, true);
                this.selectedAVD = {
                    ...avdObject,
                    deviceId: matchingEmulator?.id || null,
                    isRunning: matchingEmulator !== null,
                };

        await this.saveSelectedAVD();
        this.notifyDeviceStateChanged();
    }

    getSelectedAVD(): AVDWithDevice | null {
        return this.selectedAVD;
    }

    async getDeviceAVDName(deviceId: string): Promise<string | null> {
        if (!deviceId.startsWith('emulator-')) return null;
        try {
            const avdName = await this.adbExecutable.exec<string>(
                AdbCommand.emuAvdName,
                deviceId
            );
            return avdName?.trim() || null;
        } catch {
            return null;
        }
    }

    async getRunningEmulatorForAVD(avdName: string, skipRefresh: boolean = false): Promise<Device | null> {
        // Only refresh if not already refreshing (to avoid infinite loops)
        if (!skipRefresh) {
            await this.refreshDevices(true);
        }
        for (const device of this.devices) {
            if (device.type === 'emulator' && device.status === 'device') {
                const deviceAVDName = await this.getDeviceAVDName(device.id);
                // Compare AVD names (trim and case-insensitive for robustness)
                if (deviceAVDName && deviceAVDName.trim().toLowerCase() === avdName.trim().toLowerCase()) {
                    return device;
                }
            }
        }
        return null;
    }

    async getSelectedEmulatorDevice(): Promise<Device | null> {
        if (!this.selectedAVD) return null;

        // If deviceId is set, use it directly
        if (this.selectedAVD.deviceId) {
            const device = this.devices.find(d => d.id === this.selectedAVD!.deviceId && d.status === 'device');
            if (device) return device;
        }

        // If deviceId is null or device not found, search for matching emulator
        // This handles cases where device mapping wasn't updated yet
        for (const device of this.devices) {
            if (device.type === 'emulator' && device.status === 'device') {
                const deviceAVDName = await this.getDeviceAVDName(device.id);
                // Compare AVD names (trim and case-insensitive for robustness)
                const normalizedDeviceName = deviceAVDName?.trim().toLowerCase();
                const normalizedSelectedName = this.selectedAVD.name.trim().toLowerCase();
                if (normalizedDeviceName === normalizedSelectedName) {
                    // Update the mapping
                    this.selectedAVD = {
                        ...this.selectedAVD,
                        deviceId: device.id,
                        isRunning: true,
                    };
                    await this.saveSelectedAVD();
                    return device;
                }
            }
        }

        return null;
    }

    onDeviceStateChanged(cb: (state: { selectedAVD: AVDWithDevice | null; devices: Device[] }) => void): Disposable {
        this.deviceStateListeners.add(cb);
        return {
            dispose: () => this.deviceStateListeners.delete(cb),
        };
    }

    private async loadSelectionState(): Promise<void> {
        // Try new storage key first
        const savedAVDName = this.context.workspaceState.get<string>(
            AVDService.STORAGE_KEY_SELECTED_AVD
        );

        if (savedAVDName) {
            await this.loadAVDFromName(savedAVDName);
            return;
        }

        // Migrate from old storage keys
        const oldAVDName = this.context.workspaceState.get<string>(
            AVDService.STORAGE_KEY_SELECTED_AVD
        );
        const oldDeviceId = this.context.workspaceState.get<string>(
            AVDService.STORAGE_KEY_DEVICE
        );

        if (oldAVDName) {
            await this.setSelectedAVD(oldAVDName);
            // Clean up old keys
            void this.context.workspaceState.update(AVDService.STORAGE_KEY_SELECTED_AVD, undefined);
            void this.context.workspaceState.update(AVDService.STORAGE_KEY_DEVICE, undefined);
        } else if (oldDeviceId) {
            // Migrate from device ID: if it's an emulator, try to find AVD
            await this.refreshDevices(true);
            const device = this.devices.find(d => d.id === oldDeviceId);
            if (device && device.type === 'emulator') {
                const avdName = await this.getDeviceAVDName(oldDeviceId);
                if (avdName) {
                    await this.setSelectedAVD(avdName);
                }
            }
            // Clean up old key
            void this.context.workspaceState.update(AVDService.STORAGE_KEY_DEVICE, undefined);
        }
    }

    private async loadAVDFromName(avdName: string): Promise<void> {
        try {
            const avds = await this.getAVDList();
            const avd = avds.find(a => a.name === avdName);
            if (avd) {
                // Refresh devices first to get current device list
                await this.refreshDevices(true);
                // Create AVDWithDevice with device mapping using current devices
                let matchingEmulator: Device | null = null;
                for (const device of this.devices) {
                    if (device.type === 'emulator' && device.status === 'device') {
                        const deviceAVDName = await this.getDeviceAVDName(device.id);
                        // Compare AVD names (trim and case-insensitive for robustness)
                        if (deviceAVDName && deviceAVDName.trim().toLowerCase() === avdName.trim().toLowerCase()) {
                            matchingEmulator = device;
                            break;
                        }
                    }
                }
                this.selectedAVD = {
                    ...avd,
                    deviceId: matchingEmulator?.id || null,
                    isRunning: matchingEmulator !== null,
                };
            }
        } catch (error) {
            console.error('[AVDService] Error loading AVD from name:', error);
        }
    }


    private async saveSelectedAVD(): Promise<void> {
        if (this.selectedAVD) {
            // Store AVD name as string (AVD object may not be serializable)
            await this.context.workspaceState.update(
                AVDService.STORAGE_KEY_SELECTED_AVD,
                this.selectedAVD.name
            );
        } else {
            await this.context.workspaceState.update(
                AVDService.STORAGE_KEY_SELECTED_AVD,
                undefined
            );
        }
    }

    private notifyDeviceStateChanged(): void {
        const state = {
            selectedAVD: this.selectedAVD,
            devices: this.devices,
        };
        this.deviceStateListeners.forEach(listener => listener(state));
    }

    /**
     * Fetch list of connected devices from ADB using ADBExecutable
     */
    private async fetchDevicesFromAdb(): Promise<Device[]> {
        try {
            const output = await this.adbExecutable.exec<string>(AdbCommand.devices);
            if (!output) {
                return [];
            }
            return parseDevicesOutput(output);
        } catch (error: any) {
            console.error('[AVDService] Error getting devices:', error);
            vscode.window.showErrorMessage(`Failed to get devices: ${error.message || String(error)}`);
            return [];
        }
    }

    public static readonly STORAGE_KEY_DEVICE = 'android-studio-lite.selectedDeviceId';
    public static readonly STORAGE_KEY_SELECTED_AVD = 'android-studio-lite.selectedAVD';
    public static readonly DEVICE_LIST_CACHE_KEY = 'android-studio-lite.deviceList';
    public static readonly DEVICE_LIST_TTL_SECONDS = 300;
}
