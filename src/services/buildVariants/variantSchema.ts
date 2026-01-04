interface Variant {
    name: string;
    flavor: string[];
    buildType: string;
    tasks: {
        assemble: string;
        install?: string;
        bundle?: string;
    }
}

interface Module {
    type: "application" | "library";
    variants: Variant[];
}

/**
 *  {
        "schemaVersion": 1,
        "generatedAt": 1710000000000,
        "gradle": {
            "version": "8.10.2",
            "agpVersion": "8.2.1"
        },
        "modules": {
            ":app": {
            "type": "application",
            "variants": [
                {
                "name": "productionDebug",
                "buildType": "debug",
                "flavors": ["production"],
                "tasks": {
                    "assemble": "assembleProductionDebug",
                    "install": "installProductionDebug",
                    "bundle": "bundleProductionDebug"
                }
                }
            ]
            }
        }
    }
 */
interface AndroidVariantsModel {
    schemaVersion: number;
    generatedAt: number;
    gradle: {
        version: string;
        agpVersion: string;
    };
    modules: Record<string, Module>;
}