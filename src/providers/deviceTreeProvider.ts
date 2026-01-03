import * as vscode from 'vscode';
import { Device } from '../utils/adbParser';
import { DeviceService } from '../services/deviceService';

export class DeviceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly device: Device,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(device.id, collapsibleState);

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIcon();
        this.contextValue = device.status === 'device' ? 'device-online' : 'device-offline';
    }

    private getTooltip(): string {
        const parts: string[] = [];
        if (this.device.name) parts.push(`Model: ${this.device.name}`);
        if (this.device.androidVersion) parts.push(`Android: ${this.device.androidVersion}`);
        parts.push(`Type: ${this.device.type || 'unknown'}`);
        parts.push(`Status: ${this.device.status}`);
        return parts.join('\n');
    }

    private getDescription(): string {
        const parts: string[] = [];
        if (this.device.name) {
            parts.push(this.device.name);
        }
        if (this.device.androidVersion) {
            parts.push(`Android ${this.device.androidVersion}`);
        }
        return parts.join(' • ') || this.device.status;
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.device.status === 'device') {
            return this.device.type === 'emulator' 
                ? new vscode.ThemeIcon('device-mobile')
                : new vscode.ThemeIcon('device-desktop');
        }
        return new vscode.ThemeIcon('circle-slash');
    }
}

export class DeviceTreeProvider implements vscode.TreeDataProvider<DeviceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeviceTreeItem | undefined | null | void> = new vscode.EventEmitter<DeviceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeviceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private devices: Device[] = [];

    constructor(private deviceService: DeviceService) {
        // Subscribe to device changes
        deviceService.refreshDevices().then(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this.devices = this.deviceService.getDevices();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
        const selectedDevice = this.deviceService.getSelectedDevice();
        if (selectedDevice && element.device.id === selectedDevice.id) {
            element.label = `✓ ${element.device.id}`;
        }
        return element;
    }

    getChildren(element?: DeviceTreeItem): DeviceTreeItem[] {
        if (element) {
            return []; // Devices don't have children
        }

        if (this.devices.length === 0) {
            return [];
        }

        return this.devices.map(device => new DeviceTreeItem(device, vscode.TreeItemCollapsibleState.None));
    }
}

