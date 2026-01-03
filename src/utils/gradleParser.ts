import * as fs from 'fs';
import * as path from 'path';

export interface BuildVariant {
    name: string; // e.g., "devDebug", "prodRelease"
    buildType: string; // e.g., "debug", "release"
    flavor?: string; // e.g., "dev", "prod"
}

/**
 * Find the app module's build.gradle file in an Android project
 */
export function findAppBuildGradle(workspaceRoot: string): string | null {
    // Common locations for app module
    const possiblePaths = [
        path.join(workspaceRoot, 'app', 'build.gradle'),
        path.join(workspaceRoot, 'app', 'build.gradle.kts'),
        path.join(workspaceRoot, 'android', 'app', 'build.gradle'),
        path.join(workspaceRoot, 'android', 'app', 'build.gradle.kts'),
    ];

    for (const gradlePath of possiblePaths) {
        if (fs.existsSync(gradlePath)) {
            return gradlePath;
        }
    }

    // Try to find any build.gradle in subdirectories (simple approach)
    try {
        const appDir = path.join(workspaceRoot, 'app');
        if (fs.existsSync(appDir)) {
            const files = fs.readdirSync(appDir);
            const gradleFile = files.find(f => f === 'build.gradle' || f === 'build.gradle.kts');
            if (gradleFile) {
                return path.join(appDir, gradleFile);
            }
        }
    } catch {
        // Ignore errors
    }

    return null;
}

/**
 * Extract block content handling nested braces
 */
function extractBlockContent(content: string, blockName: string): string | null {
    // Find the block name in the content
    const blockNameIndex = content.indexOf(blockName);
    if (blockNameIndex === -1) {
        return null;
    }

    // Start searching from after the block name
    let pos = blockNameIndex + blockName.length;
    let braceCount = 0;
    let startPos = -1;

    // Skip whitespace and find opening brace
    while (pos < content.length) {
        const char = content[pos];
        
        if (char === '{') {
            startPos = pos + 1; // Content starts after the opening brace
            braceCount = 1;
            break;
        } else if (char === '=') {
            // Handle assignment syntax: buildTypes = { ... }
            pos++;
            // Skip whitespace after =
            while (pos < content.length && /\s/.test(content[pos])) {
                pos++;
            }
            if (content[pos] === '{') {
                startPos = pos + 1;
                braceCount = 1;
                break;
            }
        } else if (/\s/.test(char)) {
            pos++;
        } else {
            // Unexpected character, block name might be part of another word
            return null;
        }
    }

    if (startPos === -1 || braceCount === 0) {
        return null;
    }

    // Count braces to find the end of the block
    for (let i = startPos; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
        } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                return content.substring(startPos, i);
            }
        }
    }

    return null;
}

/**
 * Parse build.gradle file to extract build types and flavors
 */
export function parseBuildGradle(gradlePath: string): { buildTypes: string[]; flavors: string[] } {
    const content = fs.readFileSync(gradlePath, 'utf-8');
    const isKotlinDsl = gradlePath.endsWith('.kts');
    
    const buildTypes: string[] = [];
    const flavors: string[] = [];

    // Parse buildTypes block (handling nested braces)
    const buildTypesBlock = extractBlockContent(content, 'buildTypes');
    console.log(`[Gradle Parser] buildTypesBlock found: ${buildTypesBlock ? 'yes' : 'no'}`);
    if (buildTypesBlock) {
        console.log(`[Gradle Parser] buildTypesBlock length: ${buildTypesBlock.length}, preview: ${buildTypesBlock.substring(0, 200)}`);
        if (isKotlinDsl) {
            // Kotlin DSL: release { ... } or create("custom") { ... }
            // Match: release { or create("name") {
            // Use a more precise regex that matches at the start of line or after whitespace
            const lines = buildTypesBlock.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                // Match: release { or create("name") {
                const createMatch = trimmed.match(/^create\s*\(\s*["'](\w+)["']\s*\)\s*\{/);
                const directMatch = trimmed.match(/^(\w+)\s*\{/);
                
                if (createMatch) {
                    const typeName = createMatch[1];
                    if (!['get', 'set', 'all', 'configure', 'each', 'with', 'getByName'].includes(typeName.toLowerCase())) {
                        buildTypes.push(typeName);
                    }
                } else if (directMatch) {
                    const typeName = directMatch[1];
                    if (!['get', 'set', 'all', 'configure', 'each', 'with', 'getByName'].includes(typeName.toLowerCase())) {
                        buildTypes.push(typeName);
                    }
                }
            }
        } else {
            // Groovy DSL: release { ... }
            const typeMatches = buildTypesBlock.matchAll(/(\w+)\s*\{/g);
            for (const match of typeMatches) {
                const typeName = match[1];
                if (!['get', 'set', 'all', 'configure', 'each', 'with'].includes(typeName.toLowerCase())) {
                    buildTypes.push(typeName);
                }
            }
        }
    }

    // Parse productFlavors block (handling nested braces)
    const flavorsBlock = extractBlockContent(content, 'productFlavors');
    console.log(`[Gradle Parser] flavorsBlock found: ${flavorsBlock ? 'yes' : 'no'}`);
    if (flavorsBlock) {
        console.log(`[Gradle Parser] flavorsBlock length: ${flavorsBlock.length}, preview: ${flavorsBlock.substring(0, 200)}`);
        if (isKotlinDsl) {
            // Kotlin DSL: create("production") { ... }
            // Match: create("flavorName") { - handle multiline too
            const lines = flavorsBlock.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Match create("flavor") { on same line or across lines
                const createMatch = trimmed.match(/create\s*\(\s*["'](\w+)["']\s*\)/);
                if (createMatch) {
                    const flavorName = createMatch[1];
                    // Check if opening brace is on same line or next line
                    if (trimmed.includes('{') || (i + 1 < lines.length && lines[i + 1].trim().startsWith('{'))) {
                        if (flavorName && !flavors.includes(flavorName)) {
                            flavors.push(flavorName);
                        }
                    }
                }
            }
            
            // Also try regex matchAll as fallback
            if (flavors.length === 0) {
                const flavorMatches = flavorsBlock.matchAll(/create\s*\(\s*["'](\w+)["']\s*\)/g);
                for (const match of flavorMatches) {
                    const flavorName = match[1];
                    if (flavorName && !flavors.includes(flavorName)) {
                        flavors.push(flavorName);
                    }
                }
            }
        } else {
            // Groovy DSL: production { ... }
            const flavorMatches = flavorsBlock.matchAll(/(\w+)\s*\{/g);
            for (const match of flavorMatches) {
                const flavorName = match[1];
                if (!['get', 'set', 'all', 'configure', 'each', 'with'].includes(flavorName.toLowerCase())) {
                    flavors.push(flavorName);
                }
            }
        }
    }

    // Default build types if none found
    if (buildTypes.length === 0) {
        buildTypes.push('debug', 'release');
    }

    console.log(`[Gradle Parser] Detected ${buildTypes.length} build types: ${buildTypes.join(', ')}`);
    console.log(`[Gradle Parser] Detected ${flavors.length} flavors: ${flavors.join(', ')}`);

    return { buildTypes, flavors };
}

/**
 * Generate all possible build variant combinations
 */
export function generateBuildVariants(buildTypes: string[], flavors: string[]): BuildVariant[] {
    const variants: BuildVariant[] = [];

    if (flavors.length === 0) {
        // No flavors, just build types
        return buildTypes.map(bt => ({
            name: bt,
            buildType: bt
        }));
    }

    // Generate combinations: <flavor><BuildType>
    for (const flavor of flavors) {
        for (const buildType of buildTypes) {
            const capitalizedBuildType = buildType.charAt(0).toUpperCase() + buildType.slice(1);
            variants.push({
                name: `${flavor}${capitalizedBuildType}`,
                buildType,
                flavor
            });
        }
    }

    return variants;
}

/**
 * Detect build variants from Android project
 */
export function detectBuildVariants(workspaceRoot: string): BuildVariant[] {
    const gradlePath = findAppBuildGradle(workspaceRoot);
    if (!gradlePath) {
        // Return default variants if no build.gradle found
        return [
            { name: 'debug', buildType: 'debug' },
            { name: 'release', buildType: 'release' }
        ];
    }

    const { buildTypes, flavors } = parseBuildGradle(gradlePath);
    return generateBuildVariants(buildTypes, flavors);
}

