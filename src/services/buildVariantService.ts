import * as vscode from 'vscode';
import { BuildVariant } from '../utils/gradleParser';
import { GradleService, AndroidVariantsModel } from './gradleService';

export class BuildVariantService {
    private selectedVariant: BuildVariant | null = null;
    private variants: BuildVariant[] = [];
    private readonly STORAGE_KEY = 'selectedBuildVariant';
    private readonly VARIANTS_CACHE_KEY = 'androidVariantsCache';
    private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private context: vscode.ExtensionContext,
        private gradleService: GradleService
    ) {
        this.loadVariantsFromCache();
        this.loadSelectedVariant();
    }

    /**
     * Detect and load build variants from project using Gradle init script
     * This should be called once during extension activation
     */
    public async detectVariants(): Promise<void> {
        console.log('[BuildVariantService] Detecting variants using Gradle init script...');
        
        const variantsData = await this.gradleService.detectBuildVariants();
        
        if (!variantsData) {
            console.warn('[BuildVariantService] Failed to detect variants, using defaults');
            this.variants = [
                { name: 'debug', buildType: 'debug' },
                { name: 'release', buildType: 'release' }
            ];
            return;
        }

        // Convert AndroidVariantsModel to BuildVariant[]
        this.variants = this.convertToBuildVariants(variantsData);
        
        // Store in cache
        this.saveVariantsToCache(variantsData);
        
        console.log(`[BuildVariantService] Detected ${this.variants.length} variants:`, this.variants.map(v => v.name).join(', '));
        
        // Reload selected variant after loading new variants
        this.loadSelectedVariant();
    }

    /**
     * Load variants from cache if available and not expired
     */
    private loadVariantsFromCache(): void {
        const cached = this.context.workspaceState.get<{
            data: AndroidVariantsModel;
            timestamp: number;
        }>(this.VARIANTS_CACHE_KEY);

        if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
            console.log('[BuildVariantService] Loading variants from cache');
            this.variants = this.convertToBuildVariants(cached.data);
        } else {
            // Use defaults until detection completes
            this.variants = [
                { name: 'debug', buildType: 'debug' },
                { name: 'release', buildType: 'release' }
            ];
        }
    }

    /**
     * Save variants to cache
     */
    private saveVariantsToCache(variantsData: AndroidVariantsModel): void {
        this.context.workspaceState.update(this.VARIANTS_CACHE_KEY, {
            data: variantsData,
            timestamp: Date.now()
        });
    }

    /**
     * Convert AndroidVariantsModel to BuildVariant[]
     */
    private convertToBuildVariants(model: AndroidVariantsModel): BuildVariant[] {
        const variants: BuildVariant[] = [];

        for (const [modulePath, module] of Object.entries(model.modules)) {
            // Only process application modules for now (can extend to libraries later)
            if (module.type === 'application') {
                for (const variant of module.variants) {
                    // Combine flavors into a single flavor string (or use first flavor)
                    const flavor = variant.flavors.length > 0 ? variant.flavors.join('') : undefined;
                    
                    variants.push({
                        name: variant.name,
                        buildType: variant.buildType,
                        flavor: flavor
                    });
                }
            }
        }

        // If no variants found, return defaults
        if (variants.length === 0) {
            return [
                { name: 'debug', buildType: 'debug' },
                { name: 'release', buildType: 'release' }
            ];
        }

        return variants;
    }

    /**
     * Reload variants (forces re-detection)
     */
    public async reloadVariants(): Promise<void> {
        await this.detectVariants();
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

    /**
     * Get module information for a variant (if available)
     */
    public getVariantModule(variantName: string): string | null {
        const cached = this.context.workspaceState.get<{
            data: AndroidVariantsModel;
            timestamp: number;
        }>(this.VARIANTS_CACHE_KEY);

        if (!cached) {
            return null;
        }

        for (const [modulePath, module] of Object.entries(cached.data.modules)) {
            const variant = module.variants.find(v => v.name === variantName);
            if (variant) {
                return modulePath;
            }
        }

        return null;
    }

    /**
     * Get Gradle task name for a variant operation
     */
    public getVariantTask(variantName: string, operation: 'assemble' | 'install' | 'bundle'): string | null {
        const cached = this.context.workspaceState.get<{
            data: AndroidVariantsModel;
            timestamp: number;
        }>(this.VARIANTS_CACHE_KEY);

        if (!cached) {
            return null;
        }

        for (const module of Object.values(cached.data.modules)) {
            const variant = module.variants.find(v => v.name === variantName);
            if (variant && variant.tasks[operation]) {
                return variant.tasks[operation];
            }
        }

        return null;
    }
}

