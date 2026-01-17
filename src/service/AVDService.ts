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

export interface DeviceDetails {
    name?: string;
    androidVersion?: string;
    avdName?: string;
}

export interface EnrichedDevice extends Device, DeviceDetails {}

@injectable()
export class AVDService extends Service {
    readonly avdmanager: AVDManager;
    readonly emulator: Emulator;
    private readonly adbExecutable: ADBExecutable;
    private selectedDeviceId: string | null = null;
    private selectedAVDName: string | null = null;
    private devices: EnrichedDevice[] = [];
    private devicePollingInterval: NodeJS.Timeout | null = null;
    private readonly deviceStateListeners = new Set<(state: {
        selectedDeviceId: string | null;
        selectedAVDName: string | null;
        devices: EnrichedDevice[];
    }) => void>();
    private readonly STORAGE_KEY_DEVICE = 'selectedDeviceId';
    private readonly STORAGE_KEY_AVD = 'selectedAVD';
    private readonly DEVICE_LIST_CACHE_KEY = 'deviceList';
    private readonly DEVICE_LIST_TTL_SECONDS = 300;

    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output,
        @inject(TYPES.AndroidService) private readonly androidService: import('./AndroidService').AndroidService,
        @inject(TYPES.ExtensionContext) private readonly context: ExtensionContext
    ) {
        super(cache, configService, output);
        // Create Executable instances with Output and executable paths
        const avdManagerPath = androidService.getAVDManager();
        const emulatorPath = androidService.getEmulator();
        this.avdmanager = new AVDManager(output, avdManagerPath);
        this.emulator = new Emulator(output, emulatorPath);
        // Get ADB path from config, fallback to 'adb' if not configured
        const adbPath = configService.getAdbPath() || 'adb';
        this.adbExecutable = new ADBExecutable(output, adbPath);
        this.loadSelectionState();
    }

    async getAVDList(noCache: boolean = false) {
        let out = this.getCache("getAVDList");
        if (!out || noCache) {
            out = this.avdmanager.exec<AVD>(avdcommand.listAvd);
            this.setCache("getAVDList", out);
        }
        return out;
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

    startDevicePolling(intervalMs: number = 5 * 60 * 1000): void {
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
            const cached = this.getCache(this.DEVICE_LIST_CACHE_KEY);
            if (cached) {
                this.devices = cached;
                this.notifyDeviceStateChanged();
                return;
            }
        }

        const devices = await this.fetchDevicesFromAdb();
        const enrichedDevices = await Promise.all(devices.map(async (device) => {
            if (device.status === 'device') {
                const details = await this.getDeviceDetails(device.id);
                const enrichedDevice: EnrichedDevice = { ...device, ...details };
                if (device.type === 'emulator' && details.avdName) {
                    enrichedDevice.name = details.avdName;
                }
                return enrichedDevice;
            }
            return device as EnrichedDevice;
        }));

        this.devices = enrichedDevices;
        this.setCache(this.DEVICE_LIST_CACHE_KEY, enrichedDevices, this.DEVICE_LIST_TTL_SECONDS);

        // Validate selected device still exists
        if (this.selectedDeviceId) {
            const stillExists = enrichedDevices.some(d => d.id === this.selectedDeviceId && d.status === 'device');
            if (!stillExists) {
                this.selectedDeviceId = null;
                this.saveSelectedDevice();
            }
        }

        // Auto-select based on AVD name if possible
        if (!this.selectedDeviceId && this.selectedAVDName) {
            const matching = enrichedDevices.find(d => d.status === 'device' && d.avdName === this.selectedAVDName);
            if (matching) {
                this.selectedDeviceId = matching.id;
                this.saveSelectedDevice();
            }
        }

        // Auto-select first device if config enabled
        if (!this.selectedDeviceId && enrichedDevices.length > 0) {
            const config = vscode.workspace.getConfiguration('android-studio-lite');
            const autoSelect = config.get('autoSelectDevice', false);
            if (autoSelect) {
                const firstOnlineDevice = enrichedDevices.find(d => d.status === 'device');
                if (firstOnlineDevice) {
                    this.selectedDeviceId = firstOnlineDevice.id;
                    this.saveSelectedDevice();
                }
            }
        }

        // Sync selected AVD from selected device if needed
        if (this.selectedDeviceId && !this.selectedAVDName) {
            const selectedDevice = enrichedDevices.find(d => d.id === this.selectedDeviceId);
            if (selectedDevice?.avdName) {
                this.selectedAVDName = selectedDevice.avdName;
                this.saveSelectedAVDName();
            }
        }

        this.notifyDeviceStateChanged();
    }

    getDevices(): EnrichedDevice[] {
        return this.devices;
    }

    getOnlineDevices(): EnrichedDevice[] {
        return this.devices.filter(d => d.status === 'device');
    }

    getSelectedDeviceId(): string | null {
        return this.selectedDeviceId;
    }

    getSelectedDevice(): EnrichedDevice | null {
        if (!this.selectedDeviceId) {
            return null;
        }
        return this.devices.find(d => d.id === this.selectedDeviceId && d.status === 'device') || null;
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

        this.selectedDeviceId = deviceId;
        if (device.avdName) {
            this.selectedAVDName = device.avdName;
            this.saveSelectedAVDName();
        }
        this.saveSelectedDevice();
        this.notifyDeviceStateChanged();
    }

    getSelectedAVDName(): string | null {
        return this.selectedAVDName;
    }

    async setSelectedAVDName(name: string | null): Promise<void> {
        this.selectedAVDName = name;
        this.saveSelectedAVDName();
        await this.refreshDevices(false);
    }

    onDeviceStateChanged(cb: (state: { selectedDeviceId: string | null; selectedAVDName: string | null; devices: EnrichedDevice[] }) => void): Disposable {
        this.deviceStateListeners.add(cb);
        return {
            dispose: () => this.deviceStateListeners.delete(cb),
        };
    }

    private loadSelectionState(): void {
        this.selectedDeviceId = this.context.workspaceState.get(this.STORAGE_KEY_DEVICE) || null;
        this.selectedAVDName = this.context.workspaceState.get(this.STORAGE_KEY_AVD) || null;
    }

    private saveSelectedDevice(): void {
        if (this.selectedDeviceId) {
            void this.context.workspaceState.update(this.STORAGE_KEY_DEVICE, this.selectedDeviceId);
        } else {
            void this.context.workspaceState.update(this.STORAGE_KEY_DEVICE, undefined);
        }
    }

    private saveSelectedAVDName(): void {
        if (this.selectedAVDName) {
            void this.context.workspaceState.update(this.STORAGE_KEY_AVD, this.selectedAVDName);
        } else {
            void this.context.workspaceState.update(this.STORAGE_KEY_AVD, undefined);
        }
    }

    private notifyDeviceStateChanged(): void {
        const state = {
            selectedDeviceId: this.selectedDeviceId,
            selectedAVDName: this.selectedAVDName,
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

    /**
     * Get device details (name, Android version, AVD name) using ADBExecutable
     */
    private async getDeviceDetails(deviceId: string): Promise<DeviceDetails> {
        try {
            const [modelOutput, versionOutput, avdNameOutput] = await Promise.all([
                this.adbExecutable.exec<string>(AdbCommand.shellGetprop, deviceId, 'ro.product.model').catch(() => ''),
                this.adbExecutable.exec<string>(AdbCommand.shellGetprop, deviceId, 'ro.build.version.release').catch(() => ''),
                // Try to get AVD name from emulator (only works for emulators)
                deviceId.startsWith('emulator-')
                    ? this.adbExecutable.exec<string>(AdbCommand.emuAvdName, deviceId).catch(() => '')
                    : Promise.resolve('')
            ]);

            return {
                name: modelOutput?.trim() || undefined,
                androidVersion: versionOutput?.trim() || undefined,
                avdName: avdNameOutput?.trim() || undefined
            };
        } catch (error) {
            console.error('[AVDService] Error getting device details:', error);
            return {};
        }
    }
}
