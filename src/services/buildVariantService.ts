import * as vscode from 'vscode';
import { detectBuildVariants, BuildVariant } from '../utils/gradleParser';

export class BuildVariantService {
    private selectedVariant: BuildVariant | null = null;
    private variants: BuildVariant[] = [];
    private readonly STORAGE_KEY = 'selectedBuildVariant';

    constructor(private context: vscode.ExtensionContext) {
        this.loadVariants();
        this.loadSelectedVariant();
    }

    /**
     * Detect and load build variants from project
     */
    public loadVariants(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.variants = [];
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        console.log(`[BuildVariantService] Loading variants from: ${workspaceRoot}`);
        this.variants = detectBuildVariants(workspaceRoot);
        console.log(`[BuildVariantService] Loaded ${this.variants.length} variants:`, this.variants.map(v => v.name).join(', '));
    }

    /**
     * Get all available variants
     */
    public getVariants(): BuildVariant[] {
        return this.variants;
    }

    /**
     * Get selected variant
     */
    public getSelectedVariant(): BuildVariant | null {
        return this.selectedVariant;
    }

    /**
     * Load selected variant from workspace state
     */
    private loadSelectedVariant(): void {
        const variantName = this.context.workspaceState.get<string>(this.STORAGE_KEY);
        if (variantName) {
            this.selectedVariant = this.variants.find(v => v.name === variantName) || null;
        }

        // Default to first variant if none selected
        if (!this.selectedVariant && this.variants.length > 0) {
            this.selectedVariant = this.variants[0];
            this.saveSelectedVariant();
        }
    }

    /**
     * Save selected variant to workspace state
     */
    private saveSelectedVariant(): void {
        if (this.selectedVariant) {
            this.context.workspaceState.update(this.STORAGE_KEY, this.selectedVariant.name);
        }
    }

    /**
     * Select a build variant
     */
    public selectVariant(variant: BuildVariant): void {
        this.selectedVariant = variant;
        this.saveSelectedVariant();
    }

    /**
     * Select variant by name
     */
    public selectVariantByName(variantName: string): boolean {
        const variant = this.variants.find(v => v.name === variantName);
        if (variant) {
            this.selectVariant(variant);
            return true;
        }
        return false;
    }
}

