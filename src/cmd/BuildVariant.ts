import { Manager } from '../core';
import { Executable, CommandType, ICommandProp } from './Executable';


export interface BuildVariantModel {
    name: string;
    flavors: string[];
    buildType: string;
    tasks: {
        assemble: string;
        install?: string;
        bundle?: string;
    }
}

export interface Module {
    type: "application" | "library";
    variants: BuildVariantModel[];
}

/**
 * {
 *   "schemaVersion": 1,
 *   "generatedAt": 1768035436814,
 *   "modules": {
 *     ":app": {
 *       "type": "application",
 *       "variants": [
 *         {
 *           "name": "productionDebug",
 *           "buildType": "debug",
 *           "flavors": [
 *             "production"
 *           ],
 *           "tasks": {
 *             "assemble": "assembleProductionDebug",
 *             "install": "installProductionDebug"
 *           }
 *         },
 *         {
 *           "name": "stagingDebug",
 *           "buildType": "debug",
 *           "flavors": [
 *             "staging"
 *           ],
 *           "tasks": {
 *             "assemble": "assembleStagingDebug",
 *             "install": "installStagingDebug"
 *           }
 *         },
 *         {
 *           "name": "productionRelease",
 *           "buildType": "release",
 *           "flavors": [
 *             "production"
 *           ],
 *           "tasks": {
 *             "assemble": "assembleProductionRelease",
 *             "bundle": "bundleProductionRelease"
 *           }
 *         },
 *         {
 *           "name": "stagingRelease",
 *           "buildType": "release",
 *           "flavors": [
 *             "staging"
 *           ],
 *           "tasks": {
 *             "assemble": "assembleStagingRelease",
 *             "bundle": "bundleStagingRelease"
 *           }
 *         }
 *       ]
 *     }
 *   }
 * }
 */
export interface AndroidBuildVariantsModel {
    schemaVersion: number;
    generatedAt: number;
    gradle: {
        version: string;
        agpVersion: string;
    };
    modules: Record<string, Module>;
}

export enum Command {
    load = "load",
}

let commands: { [key in Command]?: ICommandProp } = {
    [Command.load]: {
        log: true,
        command: {
            linux: "./gradlew -q -I {{0}} printAndroidVariants -q --no-build-cache --no-configuration-cache",
            window: "gradlew.bat -q -I {{0}} printAndroidVariants -q --no-build-cache --no-configuration-cache",
            macOS: "./gradlew -q -I {{0}} printAndroidVariants -q --no-build-cache --no-configuration-cache",
        },
        type: CommandType.progress,
        msg: "Loading build variants...",
        successMsg: "Build variants loaded successfully.",
        failureMsg: "Failed to load build variants.",
        parser: function (out: string): AndroidBuildVariantsModel | null {
            if (!out) {
                return null;
            }

            // Try to find ANDROID_BUILD_VARIANTS_PROTOCOL= line in output
            const lines = out.split('\n');
            const markerLine = lines.find(line => line.startsWith('ANDROID_BUILD_VARIANTS_PROTOCOL='));

            if (!markerLine) {
                console.warn('[AndroidBuildVariantsModel] No ANDROID_BUILD_VARIANTS_PROTOCOL marker found in output');
                return null;
            }

            try {
                const jsonStr = markerLine.replace('ANDROID_BUILD_VARIANTS_PROTOCOL=', '').trim();
                return JSON.parse(jsonStr) as AndroidBuildVariantsModel;

            } catch (error) {
                console.error('[AndroidBuildVariantsModel] Error parsing AndroidBuildVariantsModel from output:', error);
                return null;
            }
        }
    },
};

export class BuildVariantExecutable extends Executable {
    constructor(manager: Manager) {
        super(manager, "gradlew", commands);
    }
}
