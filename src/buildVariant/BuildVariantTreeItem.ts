import * as vscode from 'vscode';
import { MuduleBuildVariant } from '../service/BuildVariantService';

export class BuildVariantTreeItem extends vscode.TreeItem {
    constructor(
        public readonly moduleBuildVariant: MuduleBuildVariant,
        public readonly selectedVariantName: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(`${moduleBuildVariant.module} | ${selectedVariantName}`, collapsibleState);

        this.description = moduleBuildVariant.type;

        const selectedVariant = moduleBuildVariant.variants?.find(
            v => v.name === selectedVariantName
        );

        let tooltip = `Module: ${moduleBuildVariant.module}\n`;
        tooltip += `Type: ${moduleBuildVariant.type}\n`;
        tooltip += `Selected Variant: ${selectedVariantName}\n`;

        if (selectedVariant) {
            tooltip += `Build Type: ${selectedVariant.buildType}\n`;
            if (selectedVariant.flavors && selectedVariant.flavors.length > 0) {
                tooltip += `Flavors: ${selectedVariant.flavors[0]}\n`;
            }
        }

        this.tooltip = tooltip;
        this.command = {
            command: 'android-studio-lite.buildvariant-select',
            title: 'Select Build Variant',
            arguments: [this]
        };
    }

    contextValue = "buildVariant";
    iconPath = new vscode.ThemeIcon('package');
}

export type TreeItem = BuildVariantTreeItem;
