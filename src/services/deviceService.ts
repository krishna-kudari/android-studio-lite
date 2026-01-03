import * as vscode from 'vscode';
import { AdbService } from './adbService';
import { Device } from '../utils/adbParser';

export class DeviceService {
    private selectedDeviceId: string | null = null;
    private devices: Device[] = [];
    private refreshInterval: NodeJS.Timeout | null = null;
    private readonly STORAGE_KEY = 'selectedDeviceId';
    private readonly STORAGE_KEY_EMULATOR = 'lastSelectedEmulator';

    constructor(
        private adbService: AdbService,
        private context: vscode.ExtensionContext,
        private onDevicesChanged: (devices: Device[]) => void
    ) {
        this.loadSelectedDevice();
        this.startPolling();
    }

    /**
     * Load selected device from workspace state
     */
    private loadSelectedDevice(): void {
        this.selectedDeviceId = this.context.workspaceState.get<string>(this.STORAGE_KEY) || null;
    }

    /**
     * Save selected device to workspace state
     */
    private saveSelectedDevice(): void {
        if (this.selectedDeviceId) {
            this.context.workspaceState.update(this.STORAGE_KEY, this.selectedDeviceId);
        }
    }

    /**
     * Get last selected emulator name
     */
    public getLastSelectedEmulator(): string | null {
        return this.context.workspaceState.get<string>(this.STORAGE_KEY_EMULATOR) || null;
    }

    /**
     * Save last selected emulator name
     */
    public setLastSelectedEmulator(emulatorName: string): void {
        this.context.workspaceState.update(this.STORAGE_KEY_EMULATOR, emulatorName);
    }

    /**
     * Start polling for devices
     */
    private startPolling(): void {
        // Initial refresh
        this.refreshDevices();

        // Poll every 3 seconds
        this.refreshInterval = setInterval(() => {
            this.refreshDevices();
        }, 3000);
    }

    /**
     * Stop polling
     */
    public stopPolling(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Refresh device list
     */
    public async refreshDevices(): Promise<void> {
        const devices = await this.adbService.getDevices();
        console.log(`[DeviceService] Found ${devices.length} devices:`, devices.map(d => `${d.id} (${d.status})`).join(', '));
        
        // Enrich devices with details for online devices
        const enrichedDevices = await Promise.all(
            devices.map(async (device) => {
                if (device.status === 'device') {
                    const details = await this.adbService.getDeviceDetails(device.id);
                    // For emulators, prefer AVD name over system image name
                    const enrichedDevice = { ...device, ...details };
                    if (device.type === 'emulator' && details.avdName) {
                        enrichedDevice.name = details.avdName;
                    }
                    return enrichedDevice;
                }
                return device;
            })
        );

        this.devices = enrichedDevices;
        console.log(`[DeviceService] Enriched devices:`, enrichedDevices.length);

        // Validate selected device still exists
        if (this.selectedDeviceId) {
            const stillExists = enrichedDevices.some(d => d.id === this.selectedDeviceId && d.status === 'device');
            if (!stillExists) {
                this.selectedDeviceId = null;
                this.saveSelectedDevice();
            }
        }

        // Auto-select first device if none selected and auto-select is enabled
        if (!this.selectedDeviceId && enrichedDevices.length > 0) {
            const config = vscode.workspace.getConfiguration('android-studio-lite');
            const autoSelect = config.get<boolean>('autoSelectDevice', false);
            if (autoSelect) {
                const firstOnlineDevice = enrichedDevices.find(d => d.status === 'device');
                if (firstOnlineDevice) {
                    this.selectedDeviceId = firstOnlineDevice.id;
                    this.saveSelectedDevice();
                }
            }
        }

        console.log(`[DeviceService] Calling onDevicesChanged with ${enrichedDevices.length} devices`);
        this.onDevicesChanged(this.devices);
    }

    /**
     * Get current device list
     */
    public getDevices(): Device[] {
        return this.devices;
    }

    /**
     * Get selected device
     */
    public getSelectedDevice(): Device | null {
        if (!this.selectedDeviceId) {
            return null;
        }
        return this.devices.find(d => d.id === this.selectedDeviceId && d.status === 'device') || null;
    }

    /**
     * Select a device
     */
    public async selectDevice(deviceId: string): Promise<void> {
        // Validate deviceId is a string
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
        this.saveSelectedDevice();
        this.onDevicesChanged(this.devices);
    }
}

