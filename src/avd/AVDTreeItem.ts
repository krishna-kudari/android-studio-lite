import * as vscode from 'vscode';
import { AVD } from '../cmd/AVDManager';

export class AVDTreeItem extends vscode.TreeItem {
    constructor(
        public readonly avd: AVD,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {

        super(avd.name, collapsibleState);

        this.description = avd.basedOn;

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

export type TreeItem = AVDTreeItem;
