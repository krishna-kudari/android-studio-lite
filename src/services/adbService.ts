import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { promisify } from 'util';
import { parseDevicesOutput, Device } from '../utils/adbParser';

const exec = promisify(child_process.exec);

export class AdbService {
    private adbPath: string | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.initializeAdbPath();
    }

    /**
     * Initialize ADB path from configuration or system PATH
     */
    private async initializeAdbPath(): Promise<void> {
        const config = vscode.workspace.getConfiguration('android-studio-lite');
        const customPath = config.get<string>('adbPath');

        if (customPath) {
            this.adbPath = customPath;
            return;
        }

        // Try common ADB locations
        const commonPaths = [
            process.env.ANDROID_HOME ? `${process.env.ANDROID_HOME}/platform-tools/adb` : null,
            process.env.ANDROID_SDK_ROOT ? `${process.env.ANDROID_SDK_ROOT}/platform-tools/adb` : null,
            'adb' // Try PATH
        ].filter(Boolean) as string[];

        for (const path of commonPaths) {
            try {
                await exec(`"${path}" version`);
                this.adbPath = path;
                return;
            } catch {
                // Try next path
            }
        }

        // If not found, default to 'adb' and let it fail with a clear error
        this.adbPath = 'adb';
    }

    /**
     * Get the ADB path
     */
    public getAdbPath(): string {
        return this.adbPath || 'adb';
    }

    /**
     * Execute an ADB command
     */
    public async executeCommand(command: string, deviceId?: string): Promise<string> {
        const adbCmd = deviceId 
            ? `"${this.getAdbPath()}" -s ${deviceId} ${command}`
            : `"${this.getAdbPath()}" ${command}`;

        try {
            const { stdout, stderr } = await exec(adbCmd, {
                timeout: 10000,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            if (stderr && !stderr.includes('daemon')) {
                throw new Error(stderr);
            }

            return stdout;
        } catch (error: any) {
            if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                throw new Error(`ADB not found. Please install Android SDK Platform Tools or set 'android-studio-lite.adbPath' in settings.`);
            }
            throw error;
        }
    }

    /**
     * Get list of connected devices
     */
    public async getDevices(): Promise<Device[]> {
        try {
            const output = await this.executeCommand('devices');
            return parseDevicesOutput(output);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get devices: ${error.message}`);
            return [];
        }
    }

    /**
     * Get device details (name, Android version)
     */
    public async getDeviceDetails(deviceId: string): Promise<{ name?: string; androidVersion?: string; avdName?: string }> {
        try {
            const [modelOutput, versionOutput, avdNameOutput] = await Promise.all([
                this.executeCommand('shell getprop ro.product.model', deviceId).catch(() => ''),
                this.executeCommand('shell getprop ro.build.version.release', deviceId).catch(() => ''),
                // Try to get AVD name from emulator (only works for emulators)
                deviceId.startsWith('emulator-') 
                    ? this.executeCommand(`emu avd name`, deviceId).catch(() => '')
                    : Promise.resolve('')
            ]);

            return {
                name: modelOutput.trim() || undefined,
                androidVersion: versionOutput.trim() || undefined,
                avdName: avdNameOutput.trim() || undefined
            };
        } catch {
            return {};
        }
    }

    /**
     * Check if ADB is available
     */
    public async isAvailable(): Promise<boolean> {
        try {
            await this.executeCommand('version');
            return true;
        } catch {
            return false;
        }
    }
}

