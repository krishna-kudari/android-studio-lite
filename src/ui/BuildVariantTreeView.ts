import * as vscode from 'vscode';
import { BuildVariant } from '../utils/gradleParser';
import { BuildVariantService } from '../services/buildVariantService';
import { subscribe } from '../module/';

export class BuildVariantTreeView {
    readonly provider: BuildVariantTreeDataProvider;
    constructor(context: vscode.ExtensionContext, private buildVariantService: BuildVariantService) {
        this.provider = new BuildVariantTreeDataProvider(this.buildVariantService);

        const view = vscode.window.createTreeView('android-studio-lite-build-variant', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        });

        subscribe(context, [
            view,
            vscode.commands.registerCommand('android-studio-lite.buildvariant-select', async (node) => {
                const variantName = node?.variant?.name ?? undefined;
                if (variantName) {
                    const success = this.buildVariantService.selectVariantByName(variantName);
                    if (success) {
                        this.provider.refresh();
                        vscode.window.showInformationMessage(`Selected build variant: ${variantName}`);
                    }
                }
            }),
            vscode.commands.registerCommand('android-studio-lite.buildvariant-refresh', async () => {
                await this.buildVariantService.reloadVariants();
                this.provider.refresh();
            })
        ]);
    }

    refresh = () => this.provider.refresh();
}

type TreeItem = BuildVariantTreeItem;
class BuildVariantTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    constructor(private buildVariantService: BuildVariantService) { }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        const variants = this.buildVariantService.getVariants();
        const selectedVariant = this.buildVariantService.getSelectedVariant();

        const list: BuildVariantTreeItem[] = [];
        variants.forEach((variant: BuildVariant) => {
            if (variant.name) {
                const isSelected = selectedVariant?.name === variant.name;
                list.push(new BuildVariantTreeItem(variant, vscode.TreeItemCollapsibleState.None, isSelected));
            }
        });
        return Promise.resolve(list);
    }

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

export class BuildVariantTreeItem extends vscode.TreeItem {
    constructor(
        public readonly variant: BuildVariant,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false
    ) {
        // Use variant.name as the label (this is the full name like "devDebug", "prodRelease", etc.)
        super(variant.name, collapsibleState);

        // Show build type in description
        this.description = variant.buildType;
        if (variant.flavor) {
            // If flavor exists, show it in description
            this.description = `${variant.flavor} • ${variant.buildType}`;
        }

        const tooltip = `Variant: ${variant.name}\nBuild Type: ${variant.buildType}${variant.flavor ? `\nFlavor: ${variant.flavor}` : ''}`;
        this.tooltip = tooltip;

        // Visual indicator for selected variant
        if (isSelected) {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }

        // Add command to select on click
        this.command = {
            command: 'android-studio-lite.buildvariant-select',
            title: 'Select Build Variant',
            arguments: [this]
        };
    }
    contextValue = "build-variant";
}
