import { QuickPickItem } from "vscode";
import { BuildVariantModel } from "../cmd/BuildVariant";

export class BuildVariantQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail?: string;

    public readonly buildVariant: BuildVariantModel;
    constructor(buildVariant: BuildVariantModel) {
        this.buildVariant = buildVariant;
        this.label = buildVariant.name;
        this.description = buildVariant.buildType;

        const flavorText = buildVariant.flavors && buildVariant.flavors.length > 0
            ? buildVariant.flavors[0]
            : "";
        console.log(`Flavors: ${flavorText}, buildVariant: ${JSON.stringify(buildVariant)}`);
        this.detail = `Flavors: ${flavorText}`;
    }
}
