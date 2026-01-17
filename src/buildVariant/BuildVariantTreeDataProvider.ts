import * as vscode from 'vscode';
import { BuildVariantService, MuduleBuildVariant } from '../service/BuildVariantService';
import { BuildVariantTreeItem } from './BuildVariantTreeItem';
import { TreeItem } from './BuildVariantTreeItem';

export class BuildVariantTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    constructor(
        private buildVariantService: BuildVariantService,
        public readonly context: vscode.ExtensionContext
    ) { }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        try {
            const modules = await this.buildVariantService.getModuleBuildVariants(this.context);

            if (!modules || modules.length === 0) {
                return [];
            }

            const selectedVariants = this.context.workspaceState.get<Record<string, string>>(
                this.buildVariantService.STORAGE_KEY_MODULE_VARIANT,
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

    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
