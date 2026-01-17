import * as vscode from 'vscode';
import { AVD } from '../cmd/AVDManager';
import { AVDService } from '../service/AVDService';
import { AVDTreeItem } from './AVDTreeItem';
import { TreeItem } from './AVDTreeItem';

export class AVDTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
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
