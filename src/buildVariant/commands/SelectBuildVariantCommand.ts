import * as vscode from 'vscode';
import { Command } from '../../commands';
import { BuildVariantService, MuduleBuildVariant } from '../../service/BuildVariantService';
import { BuildVariantTreeDataProvider } from '../BuildVariantTreeDataProvider';
import { BuildVariantQuickPickItem } from '../BuildVariantQuickPick';
import { BuildVariantTreeItem } from '../BuildVariantTreeItem';
import { showMsg, showQuickPick, MsgType } from '../../module/ui';

class ModuleQuickPickItem implements vscode.QuickPickItem {
    label: string;
    description: string;
    detail?: string;

    public readonly moduleBuildVariant: MuduleBuildVariant;

    constructor(moduleBuildVariant: MuduleBuildVariant) {
        this.moduleBuildVariant = moduleBuildVariant;
        this.label = moduleBuildVariant.module;
        this.description = moduleBuildVariant.type;
        const variantCount = moduleBuildVariant.variants?.length || 0;
        this.detail = `${variantCount} variant${variantCount !== 1 ? 's' : ''} available`;
    }
}

/**
 * Command to select a build variant for a module.
 */
export class SelectBuildVariantCommand extends Command {
    readonly id = 'android-studio-lite.buildvariant-select';
    readonly title = 'Select Build Variant';
    readonly description = 'Select a build variant for a module';
    readonly category = 'Android Studio Lite: Build Variant';
    readonly icon = '$(check)';

    constructor(
        private readonly buildVariantService: BuildVariantService,
        private readonly treeDataProvider: BuildVariantTreeDataProvider
    ) {
        super();
    }

    async execute(node?: BuildVariantTreeItem | any): Promise<void> {
        let moduleName: string | undefined;
        if (node instanceof BuildVariantTreeItem) {
            moduleName = node.moduleBuildVariant?.module;
        } else if (node?.moduleBuildVariant?.module) {
            moduleName = node.moduleBuildVariant.module;
        } else if (typeof node === 'string') {
            moduleName = node;
        }

        // If no module provided (e.g., called from command palette), first ask for module
        if (!moduleName) {
            await this.selectModule();
            return;
        }

        await this.selectBuildVariant(moduleName);
    }

    private async selectModule() {
        const modules = await this.buildVariantService.getModuleBuildVariants(this.treeDataProvider.context);

        if (!modules || modules.length === 0) {
            showMsg(MsgType.warning, 'No modules found.');
            return;
        }

        const selected = await showQuickPick(
            Promise.resolve(modules.map(m => new ModuleQuickPickItem(m))),
            {
                placeHolder: 'Select module',
                canPickMany: false
            },
            'No modules found.',
            'No module selected.'
        );

        if (selected && typeof selected !== 'boolean') {
            const moduleName = (selected as ModuleQuickPickItem).moduleBuildVariant.module;
            await this.selectBuildVariant(moduleName);
        }
    }

    private async selectBuildVariant(moduleName: string | undefined) {
        if (!moduleName) {
            showMsg(MsgType.warning, 'No module selected.');
            return;
        }

        const modules = await this.buildVariantService.getModuleBuildVariants(this.treeDataProvider.context);
        const module = modules.find(m => m.module === moduleName);

        if (!module) {
            showMsg(MsgType.warning, `Module ${moduleName} not found.`);
            return;
        }

        const quickPickItems = await this.getBuildVariantQuickPickItems(moduleName);
        const selected = await showQuickPick(
            Promise.resolve(quickPickItems),
            {
                placeHolder: `Select build variant for ${moduleName}`,
                canPickMany: false
            },
            `No build variants found for ${moduleName}.`,
            'No build variant selected.'
        );

        if (selected && typeof selected !== 'boolean') {
            const buildVariant = (selected as BuildVariantQuickPickItem).buildVariant;
            await this.saveSelectedBuildVariant(moduleName, buildVariant.name);
            this.treeDataProvider.refresh();
        }
    }

    private async getBuildVariantQuickPickItems(moduleName: string): Promise<BuildVariantQuickPickItem[] | undefined> {
        const modules = await this.buildVariantService.getModuleBuildVariants(this.treeDataProvider.context);
        const module = modules.find(m => m.module === moduleName);

        if (!module || !module.variants || module.variants.length === 0) {
            return undefined;
        }

        return module.variants.map((variant) => new BuildVariantQuickPickItem(variant));
    }

    private async saveSelectedBuildVariant(moduleName: string, variantName: string) {
        await this.buildVariantService.setSelectedVariant(moduleName, variantName);
    }
}
