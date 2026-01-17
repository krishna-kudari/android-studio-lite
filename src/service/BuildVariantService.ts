import { injectable, inject } from 'tsyringe';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Service } from "./Service";
import { AndroidBuildVariantsModel, Command, Module } from "../cmd/Gradle";
import { AndroidSdkDetector } from "../utils/androidSdkDetector";
import { showMsg, MsgType } from '../module/ui';
import { TYPES } from '../di/types';
import { Cache } from '../module/cache';
import { ConfigService } from '../config';
import { Output } from '../module/output';
import { GradleExecutable } from '../cmd/Gradle';
import type { Disposable } from 'vscode';


export interface MuduleBuildVariant extends Module {
    module: string;
}

const defaultVariants: MuduleBuildVariant[] = [
    {
        module: "app",
        type: "application",
        variants: [{
            name: "debug",
            flavors: ["debug"],
            buildType: "debug",
            tasks: {
                assemble: "assembleDebug",
                install: "installDebug",
                bundle: "bundleDebug",
            },
        }, {
            name: "release",
            flavors: ["release"],
            buildType: "release",
            tasks: {
                assemble: "assembleRelease",
                bundle: "bundleRelease",
            },
        }],
    }
];

@injectable()
export class BuildVariantService extends Service {
    readonly gradle: GradleExecutable;
    readonly workspacePath: string;
    private selectedModule: string | null = null;
    private readonly STORAGE_KEY_MODULE = 'selectedModule';
    public readonly STORAGE_KEY_MODULE_VARIANT = 'android-studio-lite.selectedBuildVariants';
    private readonly moduleSelectionListeners = new Set<(moduleName: string | null) => void>();

    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output,
        @inject(TYPES.ExtensionContext) private readonly context: vscode.ExtensionContext
    ) {
        super(cache, configService, output);
        this.gradle = new GradleExecutable(output);
        this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
        this.loadSelectedModule();
    }

    /**
     * Get currently selected module name
     */
    getSelectedModule(): string | null {
        return this.selectedModule;
    }

    /**
     * Set selected module and persist to workspace state
     */
    async setSelectedModule(moduleName: string): Promise<void> {
        this.selectedModule = moduleName;
        await this.context.workspaceState.update(this.STORAGE_KEY_MODULE, moduleName);
        this.notifyModuleSelectionChanged();
    }

    /**
     * Get applicationId for the selected module's selected variant
     */
    getSelectedModuleApplicationId(): string | null {
        if (!this.selectedModule) {
            return null;
        }

        try {
            const selectedVariants = this.context.workspaceState.get<Record<string, string>>(
                this.STORAGE_KEY_MODULE_VARIANT,
                {}
            );
            const variantName = selectedVariants[this.selectedModule];

            // Get modules from cache or return null if not available
            const modules = this.getCache("getModuleBuildVariants");
            if (!modules || !Array.isArray(modules)) {
                return null;
            }

            const module = modules.find((m: MuduleBuildVariant) => m.module === this.selectedModule);
            if (!module || !module.variants || module.variants.length === 0) {
                return null;
            }

            const variant = variantName
                ? module.variants.find((v: { name: string }) => v.name === variantName) || module.variants[0]
                : module.variants[0];

            return variant.applicationId || null;
        } catch (error) {
            console.error('[BuildVariantService] Error getting applicationId:', error);
            return null;
        }
    }

    /**
     * Subscribe to module selection changes
     */
    onModuleSelectionChanged(cb: (moduleName: string | null) => void): Disposable {
        this.moduleSelectionListeners.add(cb);
        return {
            dispose: () => {
                this.moduleSelectionListeners.delete(cb);
            }
        };
    }

    /**
     * Load selected module from workspace state
     */
    private loadSelectedModule(): void {
        this.selectedModule = this.context.workspaceState.get(this.STORAGE_KEY_MODULE) || null;
    }

    /**
     * Notify listeners of module selection change
     */
    private notifyModuleSelectionChanged(): void {
        this.moduleSelectionListeners.forEach(cb => {
            try {
                cb(this.selectedModule);
            } catch (error) {
                console.error('[BuildVariantService] Error in module selection listener:', error);
            }
        });
    }

    public async getModuleBuildVariants(context: vscode.ExtensionContext): Promise<MuduleBuildVariant[]> {
        let out = this.getCache("getModuleBuildVariants");
        if (!out) {
            // Check if gradlew exists before attempting to run
            if (!this.workspacePath) {
                showMsg(MsgType.warning, "No workspace folder found. Please open an Android project folder.");
                return defaultVariants;
            }

            const gradleCheck = AndroidSdkDetector.checkGradleWrapper(this.workspacePath);
            if (!gradleCheck.exists) {
                const errorMsg = gradleCheck.error || `Gradle wrapper not found at: ${gradleCheck.path}`;
                showMsg(
                    MsgType.error,
                    `${errorMsg}\n\nMake sure you're in an Android project root directory.`,
                    {}
                );
                return defaultVariants;
            }

            // If gradlew exists but is not executable, try to fix it
            if (gradleCheck.error && gradleCheck.error.includes('not executable')) {
                try {
                    fs.chmodSync(gradleCheck.path, 0o755);
                } catch (e) {
                    showMsg(
                        MsgType.warning,
                        `Gradle wrapper exists but couldn't make it executable. Please run: chmod +x ${gradleCheck.path}`,
                        {}
                    );
                }
            }

            const initScriptPath = this.getInitScriptPath(context);
            try {
                const variantsObj = await this.gradle.exec<AndroidBuildVariantsModel>(
                    Command.loadModuleConfig,
                    initScriptPath,
                    { cwd: this.workspacePath }
                );
                fs.unlinkSync(initScriptPath);

                if (!variantsObj) {
                    return defaultVariants;
                }

                const variants: MuduleBuildVariant[] = [];

                Object.entries(variantsObj.modules).forEach(([module, moduleObj]) => {
                    const moduleData = moduleObj as Module;
                    variants.push({
                        module: module,
                        type: moduleData.type,
                        variants: moduleData.variants,
                    });
                });
                out = variants;
                // Cache for 10 minutes
                this.setCache("getModuleBuildVariants", out, 10*60);
            } catch (error: any) {
                fs.unlinkSync(initScriptPath);
                const errorMessage = error?.message || String(error);
                if (errorMessage.includes('No such file or directory') || errorMessage.includes('gradlew')) {
                    showMsg(
                        MsgType.error,
                        `Gradle wrapper not found or not executable.\n\nError: ${errorMessage}\n\nMake sure you're in an Android project root directory with a gradlew file.`,
                        {}
                    );
                } else {
                    showMsg(
                        MsgType.error,
                        `Failed to load build variants.\n\nError: ${errorMessage}`,
                        {}
                    );
                }
                return defaultVariants;
            }
        }
        return out;
    }

    public clearCache(): void {
        // Force expire the cache by setting it with expired timestamp
        this.setCache("getModuleBuildVariants", null, -1);
    }

    private getInitScriptPath(context: vscode.ExtensionContext) {
        // Try to find script in out/scripts first (published extension), then src/scripts (development)
        let buildVariantGradleInitScriptPath = path.join(
            context.extensionPath,
            'out',
            'scripts',
            'build-variant-init.gradle.kts'
        );

        if (!fs.existsSync(buildVariantGradleInitScriptPath)) {
            // Fallback to src/scripts for development
            buildVariantGradleInitScriptPath = path.join(
                context.extensionPath,
                'src',
                'scripts',
                'build-variant-init.gradle.kts'
            );
        }

        if (!fs.existsSync(buildVariantGradleInitScriptPath)) {
            throw new Error(`[BuildVariantService] Build variant Gradle init script not found. Checked: ${path.join(context.extensionPath, 'out/scripts')} and ${path.join(context.extensionPath, 'src/scripts')}`);
        }

        const buildVariantGradleInitScriptContent = fs.readFileSync(buildVariantGradleInitScriptPath, 'utf-8');

        const tempDir = os.tmpdir();
        const tempInitScript = path.join(tempDir, `android-variant-init-${Date.now()}.gradle.kts`);
        fs.writeFileSync(tempInitScript, buildVariantGradleInitScriptContent);

        return tempInitScript;
    }

}
