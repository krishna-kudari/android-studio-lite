import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively search for AndroidManifest.xml
 */
function findManifestRecursive(dir: string, maxDepth: number = 5, currentDepth: number = 0): string | null {
    if (currentDepth > maxDepth) {
        return null;
    }

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isFile() && entry.name === 'AndroidManifest.xml') {
                return fullPath;
            }
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'build') {
                const found = findManifestRecursive(fullPath, maxDepth, currentDepth + 1);
                if (found) {
                    return found;
                }
            }
        }
    } catch {
        // Ignore errors
    }

    return null;
}

/**
 * Find AndroidManifest.xml in the project
 */
export function findManifest(workspaceRoot: string, buildVariant?: string): string | null {
    // Priority 1: Variant-specific manifests
    if (buildVariant) {
        const variantPaths = [
            path.join(workspaceRoot, 'app', 'src', buildVariant, 'AndroidManifest.xml'),
            path.join(workspaceRoot, 'app', 'src', buildVariant.toLowerCase(), 'AndroidManifest.xml'),
            // Handle flavor/buildType combinations
            path.join(workspaceRoot, 'app', 'src', buildVariant.split(/(?=[A-Z])/).join('/').toLowerCase(), 'AndroidManifest.xml'),
        ];
        for (const variantPath of variantPaths) {
            if (fs.existsSync(variantPath)) {
                return variantPath;
            }
        }
    }

    // Priority 2: Common locations
    const commonPaths = [
        path.join(workspaceRoot, 'app', 'src', 'main', 'AndroidManifest.xml'),
        path.join(workspaceRoot, 'app', 'src', 'debug', 'AndroidManifest.xml'),
        path.join(workspaceRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
        path.join(workspaceRoot, 'src', 'main', 'AndroidManifest.xml'),
    ];

    for (const manifestPath of commonPaths) {
        if (fs.existsSync(manifestPath)) {
            return manifestPath;
        }
    }

    // Priority 3: Recursive search in app/src directory
    const appSrcDir = path.join(workspaceRoot, 'app', 'src');
    if (fs.existsSync(appSrcDir)) {
        const found = findManifestRecursive(appSrcDir, 3);
        if (found) {
            return found;
        }
    }

    // Priority 4: Recursive search in android/app/src directory
    const androidAppSrcDir = path.join(workspaceRoot, 'android', 'app', 'src');
    if (fs.existsSync(androidAppSrcDir)) {
        const found = findManifestRecursive(androidAppSrcDir, 3);
        if (found) {
            return found;
        }
    }

    return null;
}

/**
 * Parse AndroidManifest.xml to extract package name and main activity
 */
export function parseManifest(manifestPath: string): { packageName: string; mainActivity?: string } {
    const content = fs.readFileSync(manifestPath, 'utf-8');

    // Extract package name
    const packageMatch = content.match(/package\s*=\s*["']([^"']+)["']/);
    const packageName = packageMatch ? packageMatch[1] : '';

    // Extract main activity (activity with MAIN/LAUNCHER intent filter)
    // Use a more robust approach that properly handles nested tags
    let mainActivity: string | undefined;
    let pos = 0;
    
    while (pos < content.length) {
        // Find next activity tag
        const activityStart = content.indexOf('<activity', pos);
        if (activityStart === -1) {
            break;
        }
        
        // Find the end of the opening tag
        const tagEnd = content.indexOf('>', activityStart);
        if (tagEnd === -1) {
            break;
        }
        
        const activityAttributes = content.substring(activityStart, tagEnd);
        
        // Extract activity name from attributes
        const nameMatch = activityAttributes.match(/android:name\s*=\s*["']([^"']+)["']/);
        if (!nameMatch) {
            pos = tagEnd + 1;
            continue;
        }
        
        const activityName = nameMatch[1];
        
        // Find the matching closing tag by counting opening/closing tags
        let depth = 1;
        let contentStart = tagEnd + 1;
        let contentEnd = contentStart;
        
        while (depth > 0 && contentEnd < content.length) {
            const nextOpen = content.indexOf('<activity', contentEnd);
            const nextClose = content.indexOf('</activity>', contentEnd);
            
            if (nextClose === -1) {
                break;
            }
            
            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                contentEnd = nextOpen + 9; // length of '<activity'
            } else {
                depth--;
                if (depth === 0) {
                    contentEnd = nextClose;
                    break;
                }
                contentEnd = nextClose + 11; // length of '</activity>'
            }
        }
        
        if (depth === 0) {
            const activityContent = content.substring(contentStart, contentEnd);
            
            // Check for intent-filter with MAIN/LAUNCHER
            const intentFilterRegex = /<intent-filter[\s\S]*?<\/intent-filter>/g;
            let foundMainLauncher = false;
            
            let intentMatch;
            while ((intentMatch = intentFilterRegex.exec(activityContent)) !== null) {
                const intentFilterContent = intentMatch[0];
                const hasMainAction = /<action[^>]*android\.intent\.action\.MAIN[^>]*\/?>/.test(intentFilterContent);
                const hasLauncherCategory = /<category[^>]*android\.intent\.category\.LAUNCHER[^>]*\/?>/.test(intentFilterContent);
                
                if (hasMainAction && hasLauncherCategory) {
                    foundMainLauncher = true;
                    break;
                }
            }
            
            if (foundMainLauncher) {
                mainActivity = activityName;
                console.log(`[Manifest Parser] Found main activity: ${activityName}`);
                break;
            }
            
            pos = contentEnd + 11; // Move past </activity>
        } else {
            // Didn't find matching closing tag, skip this one
            pos = tagEnd + 1;
        }
    }
    
    // If activity name starts with ., prepend package name
    if (mainActivity && mainActivity.startsWith('.')) {
        mainActivity = packageName + mainActivity;
    }
    
    // If activity name doesn't have package prefix and package name exists, prepend it
    if (mainActivity && packageName && !mainActivity.includes('.')) {
        mainActivity = packageName + '.' + mainActivity;
    }

    return { packageName, mainActivity };
}

/**
 * Extract package name from build.gradle.kts (namespace or applicationId)
 */
function getPackageNameFromGradle(workspaceRoot: string): string | null {
    const gradlePaths = [
        path.join(workspaceRoot, 'app', 'build.gradle'),
        path.join(workspaceRoot, 'app', 'build.gradle.kts'),
        path.join(workspaceRoot, 'android', 'app', 'build.gradle'),
        path.join(workspaceRoot, 'android', 'app', 'build.gradle.kts'),
    ];

    for (const gradlePath of gradlePaths) {
        if (!fs.existsSync(gradlePath)) {
            continue;
        }

        try {
            const content = fs.readFileSync(gradlePath, 'utf-8');
            
            // Try namespace first (Kotlin DSL, newer syntax)
            const namespaceMatch = content.match(/namespace\s*=\s*["']([^"']+)["']/);
            if (namespaceMatch) {
                return namespaceMatch[1];
            }

            // Try applicationId in defaultConfig
            const defaultConfigBlock = extractBlockContent(content, 'defaultConfig');
            if (defaultConfigBlock) {
                const applicationIdMatch = defaultConfigBlock.match(/applicationId\s*=\s*["']([^"']+)["']/);
                if (applicationIdMatch) {
                    return applicationIdMatch[1];
                }
            }

            // Try applicationId directly (Groovy DSL)
            const applicationIdDirectMatch = content.match(/applicationId\s+["']([^"']+)["']/);
            if (applicationIdDirectMatch) {
                return applicationIdDirectMatch[1];
            }
        } catch {
            // Continue to next file
        }
    }

    return null;
}

/**
 * Extract block content handling nested braces (for Gradle parsing)
 */
function extractBlockContent(content: string, blockName: string): string | null {
    const regex = new RegExp(`${blockName}\\s*[=\\{]`, 'g');
    let match;
    let startPos = -1;
    let braceCount = 0;

    // Find the start of the block
    while ((match = regex.exec(content)) !== null) {
        startPos = match.index + match[0].length;
        // Check if it's a block start
        if (content[startPos - 1] === '{' || content[startPos - 1] === '=') {
            break;
        }
    }

    if (startPos === -1) {
        return null;
    }

    // Skip whitespace and opening brace
    while (startPos < content.length && (content[startPos] === ' ' || content[startPos] === '\n' || content[startPos] === '\t' || content[startPos] === '{')) {
        if (content[startPos] === '{') {
            braceCount = 1;
            startPos++;
            break;
        }
        startPos++;
    }

    if (braceCount === 0) {
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
 * Get package name from Android project
 */
export function getPackageName(workspaceRoot: string): string | null {
    // First try to get from build.gradle (namespace or applicationId)
    const gradlePackageName = getPackageNameFromGradle(workspaceRoot);
    if (gradlePackageName) {
        return gradlePackageName;
    }

    // Fallback to manifest
    const manifestPath = findManifest(workspaceRoot);
    if (!manifestPath) {
        return null;
    }

    try {
        const { packageName } = parseManifest(manifestPath);
        return packageName || null;
    } catch {
        return null;
    }
}

