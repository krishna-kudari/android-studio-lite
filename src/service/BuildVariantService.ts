import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Service } from "./Service";
import { Manager } from "../core";
import { AndroidBuildVariantsModel, BuildVariantExecutable, Command, Module } from "../cmd/BuildVariant";
import { AndroidSdkDetector } from "../utils/androidSdkDetector";
import { showMsg, MsgType } from '../module/ui';


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
