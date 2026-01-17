import * as vscode from 'vscode';
import { Command } from '../../commands';
import { AVDService } from '../../service/AVDService';
import { AVDTreeDataProvider } from '../AVDTreeDataProvider';
import { AVDDeviceQuickPickItem } from '../AVDDeviceQuickPick';
import { showQuickPick, showMsg, MsgType } from '../../module/ui';

/**
 * Command to create a new AVD.
 */
export class CreateAVDCommand extends Command {
    readonly id = 'android-studio-lite.avd-create';
    readonly title = 'Create AVD';
    readonly description = 'Create a new Android Virtual Device';
    readonly category = 'Android Studio Lite: AVD';
    readonly icon = '$(device-mobile)';

    constructor(
        private readonly avdService: AVDService,
        private readonly treeDataProvider: AVDTreeDataProvider
    ) {
        super();
    }

    async execute(node?: any): Promise<void> {
        let path = node?.pkg?.pathRaw ?? undefined;
        let name = node?.pkg?.description ?? undefined;
        await this.createAVDDiag(path, name);
        this.treeDataProvider.refresh();
    }

    private async createAVDDiag(path: string, name: string) {
        // Get new name
        let avdlist = await this.avdService.getAVDList();
        const newAvdName = await vscode.window.showInputBox({
            title: `Create AVD with ${name}:`,
            placeHolder: 'Enter a new AVD name. (Must be unique)',
            validateInput: (name) => {
                if (name.match(/[^a-zA-Z0-9_]/)) {
                    return `${name} is invalid! Must be [a-zA-Z0-9_]`;
                } else if (name.trim() === '') {
                    return "Can't be blank!";
                } else if (avdlist && avdlist.filter((avd: any) => avd.name === name).length > 0) {
                    return `${name} already exits!`;
                } else {
                    return null;
                }
            },
        });
        if (!newAvdName) {
            showMsg(MsgType.info, 'The AVD name cannot be blank.');
            return;
        }

        // Get device definition
        const defaultItem: AVDDeviceQuickPickItem = new AVDDeviceQuickPickItem({
            id: -1, idName: '', name: 'Default (No device definition)', oem: '',
        });
        const devices = await this.avdService.getAVDDeviceList();
        const deviceItems = devices
            ? [defaultItem, ...devices.map((device: any) => new AVDDeviceQuickPickItem(device))]
            : [defaultItem];

        const device = await showQuickPick(
            Promise.resolve(deviceItems),
            {
                canPickMany: false,
                title: 'Select AVD Device definition',
            },
            'No AVD device definition. Please retry.',
            'No AVD device definition selected'
        );

        const deviceId = (device as AVDDeviceQuickPickItem)?.avdDevice?.id ?? -2;
        if (deviceId === -2) {
            showMsg(MsgType.info, 'Please Select one of the AVD device definition.');
            return;
        }

        await this.avdService.createAVD(newAvdName, path, name, deviceId);
        await this.avdService.getAVDList(true); // Reload cache
    }
}
