import * as vscode from 'vscode';
import { getExtensionId } from '../utils/extension';
import { ValidationError } from '../errors';

/**
 * Extension metadata stored in global state.
 */
export interface ExtensionMetadata {
    id: string;
    name: string;
    publisher: string;
    version: string;
}

/**
 * Minimal package.json structure required for extension metadata.
 */
interface PackageJson {
    name: string;
    publisher: string;
    version: string;
}

/**
 * Manages extension metadata for tracking installs and updates.
 * Stores metadata in VS Code's global state to persist across sessions.
 */
export class ExtensionConfig {
    private readonly extensionContext: vscode.ExtensionContext;
    private readonly metadataKey: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        // Namespace metadata key with extension ID to avoid conflicts
        this.metadataKey = `${getExtensionId()}.metadata`;
    }

    /**
     * Retrieves the stored extension metadata from global state.
     * @returns The extension metadata, or undefined if not found (first install).
     */
    getExtensionMetadata(): ExtensionMetadata | undefined {
        return this.extensionContext.globalState.get<ExtensionMetadata>(this.metadataKey);
    }

    /**
     * Updates the extension metadata in global state with current package.json values.
     * @throws {ValidationError} If required package.json fields are missing.
     */
    async updateExtensionMetadata(): Promise<void> {
        const pkg = this.getExtensionPkg();

        if (!pkg.name || !pkg.publisher || !pkg.version) {
            throw new ValidationError(
                'Missing required fields in package.json: name, publisher, or version',
                'package.json',
                {
                    context: {
                        hasName: !!pkg.name,
                        hasPublisher: !!pkg.publisher,
                        hasVersion: !!pkg.version,
                    },
                }
            );
        }

        const metadata: ExtensionMetadata = {
            id: `${pkg.publisher}.${pkg.name}`,
            name: pkg.name,
            publisher: pkg.publisher,
            version: pkg.version,
        };

        await this.extensionContext.globalState.update(this.metadataKey, metadata);
    }

    /**
     * Checks if this is a fresh installation (no metadata exists).
     * @returns true if no metadata is stored, false otherwise.
     */
    isInstall(): boolean {
        return !this.getExtensionMetadata();
    }

    /**
     * Gets the extension's package.json.
     * @returns The package.json object.
     */
    getExtensionPkg(): PackageJson {
        return this.extensionContext.extension.packageJSON as PackageJson;
    }

    /**
     * Checks if this is an update (metadata exists but version differs).
     * @returns true if metadata exists and version changed, false otherwise.
     */
    isUpdate(): boolean {
        const pkg = this.getExtensionPkg();
        const metadata = this.getExtensionMetadata();

        if (!metadata) {
            return false;
        }

        // Validate that package.json has version before comparing
        if (!pkg.version) {
            return false;
        }

        return metadata.version !== pkg.version;
    }
}
