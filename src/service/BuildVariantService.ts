import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Service } from "./Service";
import { Manager } from "../core";
import { AndroidBuildVariantsModel, BuildVariantExecutable, Command, Module } from "../cmd/BuildVariant";


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

export class BuildVariantService extends Service {
    readonly manager: Manager;
    readonly buildVariant: BuildVariantExecutable;
    readonly workspacePath: string;

    constructor(manager: Manager) {
        super(manager);
        this.manager = manager;
        this.buildVariant = new BuildVariantExecutable(manager);
        this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    }

    public async getModuleBuildVariants(context: vscode.ExtensionContext): Promise<MuduleBuildVariant[]> {
        let out = this.getCache("getModuleBuildVariants");
        if (!out) {

            const initScriptPath = this.getInitScriptPath(context);
            const variantsObj = await this.buildVariant.exec<AndroidBuildVariantsModel>(
                Command.load,
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
            // Cache for 5 minutes (300 seconds)
            this.setCache("getModuleBuildVariants", out, 300);
        }
        return out;
    }

    public clearCache(): void {
        // Force expire the cache by setting it with expired timestamp
        this.manager.cache.set("getModuleBuildVariants", null, -1);
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
