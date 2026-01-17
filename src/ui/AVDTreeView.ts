import * as nodePath from 'path';
import * as vscode from 'vscode';
import { AVD, AVDDevice } from '../cmd/AVDManager';
import { AVDService } from '../service/AVDService';
import { showMsg, showQuickPick, MsgType, showYesNoQuickPick } from '../module/ui';

import { subscribe } from '../module/';
import { AVDQuickPickItem } from './AVDQuickPick';
import { AVDDeviceQuickPickItem } from './AVDDeviceQuickPick';



export class AVDTreeView {
    readonly provider: AVDTreeDataProvider;

    constructor(context: vscode.ExtensionContext, private avdService: AVDService) {
        this.provider = new AVDTreeDataProvider(this.avdService);

        const view = vscode.window.createTreeView('android-studio-lite-avd', { treeDataProvider: this.provider, showCollapseAll: true });

        subscribe(context, [
            view,

            vscode.commands.registerCommand('android-studio-lite.avd-create', async (node) => {
                let path = node?.pkg?.pathRaw ?? undefined;
                let name = node?.pkg?.description ?? undefined;
                this.createAVDDiag(path, name).then(() => this.provider.refresh());
            }),


            vscode.commands.registerCommand('android-studio-lite.avdlist-refresh', this.refresh),

            vscode.commands.registerCommand('android-studio-lite.avd-launch', async (node) => {
                let name = node?.avd?.name ?? undefined;
                this.launchAVDDiag(name).then(() => this.provider.refresh());
            }),
            vscode.commands.registerCommand('android-studio-lite.avd-edit', async (node) => {
                let name = node?.avd?.name ?? undefined;
                this.renameAVDDiag(name).then(() => this.provider.refresh());
            }),
            vscode.commands.registerCommand('android-studio-lite.avd-showdir', async (node) => {
                let { name, path } = node?.avd;
                if (path !== undefined) {
                    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(path));
                }
            }),
            vscode.commands.registerCommand('android-studio-lite.avd-showconfigfile', async (node) => {
                let { name, path } = node?.avd;
                if (path !== undefined) {
                    let configPath = nodePath.join(path, "config.ini");
                    //console.log("avdmanager.avd-showdir", configPath);
                    vscode.workspace.openTextDocument(configPath)
                        .then(document => vscode.window.showTextDocument(document, { preserveFocus: true, preview: false }));
                }
            }),

            vscode.commands.registerCommand('android-studio-lite.avd-delete', async (node) => {
                let name = node?.avd?.name ?? undefined;
                this.deleteAVDDiag(name).then(() => this.provider.refresh());
            })
        ]);

    }

    create = async () => {
        console.log("call android-studio-lite.avd-create");
        vscode.window.createWebviewPanel('android-studio-lite-avdCreate', "Create New AVD", vscode.ViewColumn.Beside);
    };

    refresh = async () => {
        await this.avdService.getAVDList(true);
        this.provider.refresh();
    };

    async getAVDQuickPickItems(): Promise<AVDQuickPickItem[] | undefined> {
        return this.avdService.getAVDList()
            .then(avds => {
                return avds === undefined ? avds : avds.map((avd: AVD) => new AVDQuickPickItem(avd));
            });
    };

    async askAVDName() {
        const selected = await showQuickPick(this.getAVDQuickPickItems(), {
            placeHolder: "Select AVD name",
            canPickMany: false
        },
            "No AVD Found. Please create AVD first.",
            "No AVD selected");
        return (selected as AVDQuickPickItem)?.avd?.name ?? false;
    }


    async getAVDDeviceQuickPickItems(): Promise<AVDDeviceQuickPickItem[] | undefined> {

        let defaultItem: AVDDeviceQuickPickItem = new AVDDeviceQuickPickItem({
            id: -1, idName: "", name: "Default (No device definition)", oem: "",
        });
        return this.avdService.getAVDDeviceList()
            .then(devices => {
                return devices === undefined ? devices : devices.map((device: AVDDevice) => new AVDDeviceQuickPickItem(device));
            }).then((devices) => {
                if (Array.isArray(devices)) {
                    return [defaultItem, ...devices];
                }
                return [defaultItem];
            });
    };

    async createAVDDiag(path: string, name: string) {

        //get new name
        let avdlist = await this.avdService.getAVDList();
        const newAvdName = await vscode.window.showInputBox({
            title: `Create AVD with ${name}:`,
            placeHolder: "Enter a new AVD name. (Must be unique)",
            validateInput: (name) => {
                if (name.match(/[^a-zA-Z0-9_]/)) {
                    return `${name} is invalid! Must be [a-zA-Z0-9_]`;
                } else if (name.trim() === "") {
                    return "Can't be blank!";
                } else if (avdlist.filter((avd: AVD) => avd.name === name).length > 0) {
                    return `${name} already exits!`;
                } else {
                    return null;
                }
            },
        });
        if (!newAvdName) {
            showMsg(MsgType.info, "The AVD name cannot be blank.");
            return;
        }

        const device = await showQuickPick(this.getAVDDeviceQuickPickItems(), {
            //placeHolder: "Select AVD Device definition",
            canPickMany: false,
            title: "Select AVD Device definition",
        },
            "No AVD device definition. Please retry.",
            "No AVD device definition selected");


        const deviceId = (device as AVDDeviceQuickPickItem)?.avdDevice?.id ?? -2;
        if (deviceId === -2) {
            showMsg(MsgType.info, "Please Select one of the AVD device definition.");
            return;
        }

        await this.avdService.createAVD(newAvdName, path, name, deviceId);
        await this.avdService.getAVDList(true); //reload cache
    }

    async renameAVDDiag(avdname: string | undefined) {
        //select avd
        let target = avdname ?? await this.askAVDName();

        if (!target) {
            return;
        }

        //get new name
        let avdlist = await this.avdService.getAVDList();
        const newAvdName = await vscode.window.showInputBox({
            title: `Rename AVD ${target}:`,
            placeHolder: "Enter a new AVD name. (Must be unique)",
            validateInput: (name) => {
                if (name.match(/[^a-zA-Z0-9_]/)) {
                    return `${name} is invalid! Must be [a-zA-Z0-9_]`;
                } else if (name.trim() === "") {
                    return "Can't be blank!";
                } else if (avdlist.filter((avd: AVD) => avd.name === name).length > 0) {
                    return `${name} already exits!`;
                } else {
                    return null;
                }
            },
        });
        if (!newAvdName) {
            showMsg(MsgType.info, "The new AVD cannot be blank.");
            return;
        }

        await this.avdService.renameAVD(target, newAvdName);
        await this.avdService.getAVDList(true); //reload cache
    }


    async deleteAVDDiag(avdname: string | undefined) {
        let target = avdname ?? await this.askAVDName();

        const ans = await showYesNoQuickPick(`Are you sure to delete AVD ${target}?`);

        if (ans === "Yes" && target) {
            await this.avdService.deleteAVD(target);
        }
        await this.avdService.getAVDList(true); //reload cache
    }


    async launchAVDDiag(avdname: string | undefined) {
        let target = avdname ?? await this.askAVDName();
        if (target) {
            await this.avdService.launchEmulator(target);
        }
    }


}

type TreeItem = AVDTreeItem;
class AVDTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    constructor(private avdService: AVDService) { }


    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {


        return this.avdService.getAVDList().then((avds) => {
            let list: AVDTreeItem[] = [];
            if (!avds) {
                return [];
            }
            avds.forEach((avd: AVD) => {
                if (avd.name && avd.name !== "") {
                    list.push(new AVDTreeItem(avd, vscode.TreeItemCollapsibleState.None));
                }
            });
            return list;
        });

    }

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class AVDTreeItem extends vscode.TreeItem {
    constructor(
        public readonly avd: AVD,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {

        super(avd.name, collapsibleState);

        this.description = avd.basedOn + " | " + avd.tagAbi;

        let infos = [
            { name: "Device", value: avd.device },
            { name: "Path", value: avd.path },
            { name: "Target", value: avd.target },
            { name: "Based on", value: avd.basedOn },
            { name: "Tag/ABI", value: avd.tagAbi },
            { name: "Skin", value: avd.skin },
            { name: "Sdcard", value: avd.sdCard },
        ];
        let tooltip = "";
        infos.forEach(element => {
            if (element.value) {
                tooltip += (tooltip.length === 0 ? "" : "\n") + `${element.name}: ${element.value}`;
            }
        });
        this.tooltip = tooltip;
    }
    contextValue = "avd";
    iconPath = new vscode.ThemeIcon('device-mobile');
}
