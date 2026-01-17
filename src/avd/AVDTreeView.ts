import * as vscode from 'vscode';
import { AVDService } from '../service/AVDService';
import { subscribe } from '../module';
import { AVDTreeDataProvider } from './AVDTreeDataProvider';

export class AVDTreeView {
    readonly provider: AVDTreeDataProvider;

    constructor(context: vscode.ExtensionContext, private avdService: AVDService) {
        this.provider = new AVDTreeDataProvider(this.avdService);

        const view = vscode.window.createTreeView('android-studio-lite-avd', { treeDataProvider: this.provider, showCollapseAll: true });

        subscribe(context, [view]);
    }


}

