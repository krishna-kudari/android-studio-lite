export interface Device {
    id: string;
    status: 'device' | 'offline' | 'unauthorized' | 'unknown';
    type?: 'emulator' | 'physical';
    name?: string;
    androidVersion?: string;
    avdName?: string; // AVD name for emulators
}

/**
 * Parse the output of `adb devices` command
 */
export function parseDevicesOutput(output: string): Device[] {
    const lines = output.split('\n');
    const devices: Device[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        // Skip header line and empty lines
        if (!trimmed || trimmed === 'List of devices attached') {
            continue;
        }

        // Format: <device-id>    <status>
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const id = parts[0];
            const status = parts[1] as Device['status'];
            
            // Detect emulator by ID pattern (emulator-XXXX)
            const type = id.startsWith('emulator-') ? 'emulator' : 'physical';

            devices.push({
                id,
                status,
                type
            });
        }
    }

    return devices;
}

