import { QuickPickItem } from "vscode";
import { AVDDevice } from "../cmd/AVDManager";

export class AVDDeviceQuickPickItem implements QuickPickItem {
    label: string;
    description: string;

    public readonly avdDevice: AVDDevice;
    constructor(device: AVDDevice) {
        this.avdDevice = device;
        this.label = device.name;
        this.description = "";
        if (device.id >= 0) {
            this.description = device.oem + (device.tag === "" || device.tag === undefined ? "" : ` | ${device.tag}`) + " | ID: " + device.id;
        }
    }
}
