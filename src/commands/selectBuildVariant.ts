import * as vscode from 'vscode';
import { BuildVariantService } from '../services/buildVariantService';

export async function selectBuildVariantCommand(buildVariantService: BuildVariantService): Promise<void> {
    // Reload variants in case build.gradle changed (already done in extension.ts, but keep for safety)
    // Note: This is async but we don't await it - variants are loaded from cache immediately
    buildVariantService.reloadVariants().catch(err => {
        console.error('[selectBuildVariant] Failed to reload variants:', err);
    });
    
    const variants = buildVariantService.getVariants();
    const selectedVariant = buildVariantService.getSelectedVariant();

    if (variants.length === 0) {
        vscode.window.showWarningMessage('No build variants found. Make sure you are in an Android project.');
        return;
    }

    // Debug: Log variants to console
    console.log(`Found ${variants.length} build variants:`, variants.map(v => v.name).join(', '));

    const items = variants.map(variant => ({
        label: variant.name,
        description: variant.flavor ? `Flavor: ${variant.flavor}, Type: ${variant.buildType}` : `Type: ${variant.buildType}`,
        variant: variant,
        picked: selectedVariant?.name === variant.name
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Select a build variant (${variants.length} available)`,
        canPickMany: false
    });

    if (selected) {
        buildVariantService.selectVariant(selected.variant);
        vscode.window.showInformationMessage(`Selected build variant: ${selected.label}`);
    }
}

