import * as vscode from 'vscode';
import { Command } from '../../commands';
import { BuildVariantService } from '../../service/BuildVariantService';
import { BuildVariantTreeDataProvider } from '../BuildVariantTreeDataProvider';

/**
 * Command to refresh the build variant list.
 */
export class RefreshBuildVariantListCommand extends Command {
    readonly id = 'android-studio-lite.buildvariant-refresh';
    readonly title = 'Refresh Build Variant List';
    readonly description = 'Refresh the list of build variants';
    readonly category = 'Android Studio Lite: Build Variant';
    readonly icon = '$(refresh)';

    constructor(
        private readonly buildVariantService: BuildVariantService,
        private readonly treeDataProvider: BuildVariantTreeDataProvider
    ) {
        super();
    }

    async execute(): Promise<void> {
        // Clear cache and refresh the tree view - this will reload modules and variants
        this.buildVariantService.clearCache();
        this.treeDataProvider.refresh();
    }
}
