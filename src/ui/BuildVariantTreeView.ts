import * as vscode from 'vscode';
import { Manager } from '../core';
import { showMsg, showQuickPick, MsgType } from '../module/ui';
import { subscribe } from '../module/';
import { BuildVariantQuickPickItem } from './BuildVariantQuickPick';
import { MuduleBuildVariant } from '../service/BuildVariantService';

const SELECTED_BUILD_VARIANTS_KEY = 'android-studio-lite.selectedBuildVariants';

export class BuildVariantTreeView {
    readonly provider: BuildVariantTreeDataProvider;
    constructor(context: vscode.ExtensionContext, private manager: Manager) {
        this.provider = new BuildVariantTreeDataProvider(this.manager, context);

        const view = vscode.window.createTreeView('android-studio-lite-build-variant', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        });

        subscribe(context, [
            view,

            vscode.commands.registerCommand('android-studio-lite.buildvariant-refresh', this.refresh),

            vscode.commands.registerCommand('android-studio-lite.buildvariant-select', async (node) => {
                let moduleName: string | undefined;
                if (node instanceof BuildVariantTreeItem) {
                    moduleName = node.moduleBuildVariant?.module;
                } else if (node?.moduleBuildVariant?.module) {
                    moduleName = node.moduleBuildVariant.module;
                } else if (typeof node === 'string') {
                    moduleName = node;
                }
                await this.selectBuildVariant(moduleName);
            }),
        ]);
    }

    refresh = async () => {
        // Refresh the tree view - this will reload modules and variants
        this.provider.refresh();
    };

    async getBuildVariantQuickPickItems(moduleName: string): Promise<BuildVariantQuickPickItem[] | undefined> {
        const modules = await this.manager.buildVariant.getModuleBuildVariants(this.provider.context);
        const module = modules.find(m => m.module === moduleName);

        if (!module || !module.variants || module.variants.length === 0) {
            return undefined;
        }

        return module.variants.map((variant) => new BuildVariantQuickPickItem(variant));
    }

    async selectBuildVariant(moduleName: string | undefined) {
        if (!moduleName) {
            showMsg(MsgType.warning, "No module selected.");
            return;
        }

        const modules = await this.manager.buildVariant.getModuleBuildVariants(this.provider.context);
        const module = modules.find(m => m.module === moduleName);

        if (!module) {
            showMsg(MsgType.warning, `Module ${moduleName} not found.`);
            return;
        }

        const selected = await showQuickPick(
            this.getBuildVariantQuickPickItems(moduleName),
            {
                placeHolder: `Select build variant for ${moduleName}`,
                canPickMany: false
            },
            `No build variants found for ${moduleName}.`,
            "No build variant selected."
        );

        if (selected && typeof selected !== 'boolean') {
            const buildVariant = (selected as BuildVariantQuickPickItem).buildVariant;
            await this.saveSelectedBuildVariant(this.provider.context, moduleName, buildVariant.name);
            this.provider.refresh();
        }
    }

    private async saveSelectedBuildVariant(
        context: vscode.ExtensionContext,
        moduleName: string,
        variantName: string
    ) {
        const selectedVariants = context.workspaceState.get<Record<string, string>>(
            SELECTED_BUILD_VARIANTS_KEY,
            {}
        );
        selectedVariants[moduleName] = variantName;
        await context.workspaceState.update(SELECTED_BUILD_VARIANTS_KEY, selectedVariants);
    }

    getSelectedBuildVariant(context: vscode.ExtensionContext, moduleName: string): string | undefined {
        const selectedVariants = context.workspaceState.get<Record<string, string>>(
            SELECTED_BUILD_VARIANTS_KEY,
            {}
        );
        return selectedVariants[moduleName];
    }
}

type TreeItem = BuildVariantTreeItem;

class BuildVariantTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    constructor(
        private manager: Manager,
        public readonly context: vscode.ExtensionContext
    ) { }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        try {
            const modules = await this.manager.buildVariant.getModuleBuildVariants(this.context);

            if (!modules || modules.length === 0) {
                return [];
            }

            const selectedVariants = this.context.workspaceState.get<Record<string, string>>(
                SELECTED_BUILD_VARIANTS_KEY,
                {}
            );

            return modules.map((moduleBuildVariant: MuduleBuildVariant) => {
                const selectedVariant = selectedVariants[moduleBuildVariant.module];
                // If no variant is selected, use the first one as default
                const variantName = selectedVariant ||
                    (moduleBuildVariant.variants && moduleBuildVariant.variants.length > 0
                        ? moduleBuildVariant.variants[0].name
                        : "none");

                return new BuildVariantTreeItem(
                    moduleBuildVariant,
                    variantName,
                    vscode.TreeItemCollapsibleState.None
                );
            });
        } catch (error) {
            console.error('Error loading build variants:', error);
            return [];
        }
    }

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> =
        new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

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
