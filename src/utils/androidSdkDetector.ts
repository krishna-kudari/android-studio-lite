import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Platform } from '../module/platform';

export interface AndroidSdkInfo {
    sdkPath: string;
    hasCommandLineTools: boolean;
    commandLineToolsPath?: string;
    hasPlatformTools: boolean;
    platformToolsPath?: string;
    hasBuildTools: boolean;
    buildToolsPath?: string;
    hasEmulator: boolean;
    emulatorPath?: string;
    avdHome?: string;
}

export interface SetupIssue {
    type: 'missing_sdk' | 'missing_cmdline_tools' | 'missing_platform_tools' | 'missing_build_tools' | 'missing_emulator';
    severity: 'error' | 'warning';
    message: string;
    solution: string;
    autoFixable?: boolean;
}

/**
 * Detects Android SDK installation paths across different operating systems
 */
export class AndroidSdkDetector {
    /**
     * Common Android Studio SDK paths per platform
     */
    private static getCommonSdkPaths(): string[] {
        const homeDir = os.homedir();
        const platform = process.platform;

        const paths: string[] = [];

        if (platform === 'darwin') {
            // macOS
            paths.push(
                path.join(homeDir, 'Library', 'Android', 'sdk'),
                path.join(homeDir, '.android', 'sdk'),
                '/Applications/Android Studio.app/Contents/jbr/Contents/Home/../sdk',
                '/usr/local/share/android-sdk',
                '/opt/android-sdk'
            );
        } else if (platform === 'win32') {
            // Windows
            const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
            const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
            paths.push(
                path.join(localAppData, 'Android', 'Sdk'),
                path.join(homeDir, 'AppData', 'Local', 'Android', 'Sdk'),
                path.join('C:', 'Users', os.userInfo().username, 'AppData', 'Local', 'Android', 'Sdk'),
                path.join('C:', 'Android', 'Sdk'),
                path.join(appData, 'Android', 'Sdk')
            );
        } else {
            // Linux
            paths.push(
                path.join(homeDir, 'Android', 'Sdk'),
                path.join(homeDir, '.android', 'sdk'),
                path.join(homeDir, 'Library', 'Android', 'sdk'),
                '/usr/lib/android-sdk',
                '/opt/android-sdk',
                '/usr/local/share/android-sdk'
            );
        }

        return paths;
    }

    /**
     * Detects Android SDK path from environment variables
     */
    private static detectFromEnvironment(): string | null {
        const androidHome = process.env.ANDROID_HOME;
        const androidSdkRoot = process.env.ANDROID_SDK_ROOT;

        if (androidHome && fs.existsSync(androidHome)) {
            return androidHome;
        }

        if (androidSdkRoot && fs.existsSync(androidSdkRoot)) {
            return androidSdkRoot;
        }

        return null;
    }

    /**
     * Checks if a path looks like an Android SDK root
     */
    private static isValidSdkPath(sdkPath: string): boolean {
        if (!fs.existsSync(sdkPath) || !fs.statSync(sdkPath).isDirectory()) {
            return false;
        }

        // Check for common SDK directories
        const requiredDirs = ['platform-tools', 'build-tools'];
        const hasRequiredDirs = requiredDirs.some(dir => {
            const dirPath = path.join(sdkPath, dir);
            return fs.existsSync(dirPath);
        });

        return hasRequiredDirs;
    }

    /**
     * Detects Android SDK path automatically
     */
    public static detectSdkPath(): string | null {
        // 1. Check environment variables first
        const envPath = this.detectFromEnvironment();
        if (envPath && this.isValidSdkPath(envPath)) {
            return envPath;
        }

        // 2. Check common installation paths
        const commonPaths = this.getCommonSdkPaths();
        for (const sdkPath of commonPaths) {
            if (this.isValidSdkPath(sdkPath)) {
                return sdkPath;
            }
        }

        return null;
    }

    /**
     * Analyzes an Android SDK installation and returns detailed information
     */
    public static analyzeSdk(sdkPath: string): AndroidSdkInfo {
        const info: AndroidSdkInfo = {
            sdkPath,
            hasCommandLineTools: false,
            hasPlatformTools: false,
            hasBuildTools: false,
            hasEmulator: false,
        };

        if (!fs.existsSync(sdkPath)) {
            return info;
        }

        // Check for command-line tools
        const cmdlineToolsPaths = [
            path.join(sdkPath, 'cmdline-tools', 'latest', 'bin'),
            path.join(sdkPath, 'cmdline-tools', 'bin'),
        ];

        for (const cmdPath of cmdlineToolsPaths) {
            if (fs.existsSync(cmdPath)) {
                const avdmanager = path.join(cmdPath, process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager');
                if (fs.existsSync(avdmanager)) {
                    info.hasCommandLineTools = true;
                    info.commandLineToolsPath = cmdPath;
                    break;
                }
            }
        }

        // Check for platform-tools (ADB)
        const platformToolsPath = path.join(sdkPath, 'platform-tools');
        if (fs.existsSync(platformToolsPath)) {
            const adb = path.join(platformToolsPath, process.platform === 'win32' ? 'adb.exe' : 'adb');
            if (fs.existsSync(adb)) {
                info.hasPlatformTools = true;
                info.platformToolsPath = platformToolsPath;
            }
        }

        // Check for build-tools
        const buildToolsPath = path.join(sdkPath, 'build-tools');
        if (fs.existsSync(buildToolsPath)) {
            const buildToolsDirs = fs.readdirSync(buildToolsPath).filter(dir => {
                const dirPath = path.join(buildToolsPath, dir);
                return fs.statSync(dirPath).isDirectory();
            });
            if (buildToolsDirs.length > 0) {
                info.hasBuildTools = true;
                info.buildToolsPath = buildToolsPath;
            }
        }

        // Check for emulator
        const emulatorPath = path.join(sdkPath, 'emulator');
        if (fs.existsSync(emulatorPath)) {
            const emulator = path.join(emulatorPath, process.platform === 'win32' ? 'emulator.exe' : 'emulator');
            if (fs.existsSync(emulator)) {
                info.hasEmulator = true;
                info.emulatorPath = emulatorPath;
            }
        }

        // Detect AVD Home
        const avdHome = process.env.ANDROID_AVD_HOME || path.join(os.homedir(), '.android', 'avd');
        if (fs.existsSync(avdHome)) {
            info.avdHome = avdHome;
        }

        return info;
    }

    /**
     * Identifies setup issues and provides solutions
     */
    public static identifyIssues(sdkInfo: AndroidSdkInfo): SetupIssue[] {
        const issues: SetupIssue[] = [];

        if (!sdkInfo.sdkPath || !fs.existsSync(sdkInfo.sdkPath)) {
            issues.push({
                type: 'missing_sdk',
                severity: 'error',
                message: 'Android SDK not found',
                solution: this.getSdkSetupInstructions(),
                autoFixable: false,
            });
            return issues; // Can't check other issues without SDK
        }

        if (!sdkInfo.hasCommandLineTools) {
            issues.push({
                type: 'missing_cmdline_tools',
                severity: 'error',
                message: 'Android SDK Command-Line Tools not found',
                solution: this.getCommandLineToolsSetupInstructions(sdkInfo.sdkPath),
                autoFixable: true,
            });
        }

        if (!sdkInfo.hasPlatformTools) {
            issues.push({
                type: 'missing_platform_tools',
                severity: 'warning',
                message: 'Android Platform Tools (ADB) not found',
                solution: this.getPlatformToolsSetupInstructions(sdkInfo.sdkPath),
                autoFixable: true,
            });
        }

        if (!sdkInfo.hasBuildTools) {
            issues.push({
                type: 'missing_build_tools',
                severity: 'warning',
                message: 'Android Build Tools not found',
                solution: this.getBuildToolsSetupInstructions(sdkInfo.sdkPath),
                autoFixable: true,
            });
        }

        if (!sdkInfo.hasEmulator) {
            issues.push({
                type: 'missing_emulator',
                severity: 'warning',
                message: 'Android Emulator not found',
                solution: this.getEmulatorSetupInstructions(sdkInfo.sdkPath),
                autoFixable: true,
            });
        }

        return issues;
    }

    private static getSdkSetupInstructions(): string {
        const platform = process.platform;
        const homeDir = os.homedir();

        if (platform === 'darwin') {
            return `**macOS Setup:**

1. **If you have Android Studio installed:**
   - Open Android Studio → Preferences → Appearance & Behavior → System Settings → Android SDK
   - Copy the "Android SDK Location" path (usually: \`${homeDir}/Library/Android/sdk\`)
   - Set it as \`ANDROID_HOME\` in your shell config (\`~/.zshrc\` or \`~/.bashrc\`):
     \`\`\`bash
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools
     \`\`\`
   - Restart VS Code/Cursor

2. **If you don't have Android Studio:**
   - Download Android Studio from https://developer.android.com/studio
   - Install it and follow the SDK setup wizard
   - Then follow step 1 above

3. **Or set manually in VS Code Settings:**
   - Open Settings (Cmd+,)
   - Search for \`android-studio-lite.sdkPath\`
   - Enter: \`${homeDir}/Library/Android/sdk\``;
        } else if (platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
            return `**Windows Setup:**

1. **If you have Android Studio installed:**
   - Open Android Studio → File → Settings → Appearance & Behavior → System Settings → Android SDK
   - Copy the "Android SDK Location" path (usually: \`${localAppData}\\Android\\Sdk\`)
   - Add it to System Environment Variables:
     - Open System Properties → Environment Variables
     - Add new variable: \`ANDROID_HOME\` = \`${localAppData}\\Android\\Sdk\`
     - Add to PATH: \`%ANDROID_HOME%\\platform-tools\`
   - Restart VS Code/Cursor

2. **If you don't have Android Studio:**
   - Download Android Studio from https://developer.android.com/studio
   - Install it and follow the SDK setup wizard
   - Then follow step 1 above

3. **Or set manually in VS Code Settings:**
   - Open Settings (Ctrl+,)
   - Search for \`android-studio-lite.sdkPath\`
   - Enter: \`${localAppData}\\Android\\Sdk\``;
        } else {
            return `**Linux Setup:**

1. **If you have Android Studio installed:**
   - Open Android Studio → File → Settings → Appearance & Behavior → System Settings → Android SDK
   - Copy the "Android SDK Location" path (usually: \`${homeDir}/Android/Sdk\`)
   - Set it as \`ANDROID_HOME\` in your shell config (\`~/.bashrc\` or \`~/.zprofile\`):
     \`\`\`bash
     export ANDROID_HOME=$HOME/Android/Sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools
     \`\`\`
   - Restart VS Code/Cursor

2. **If you don't have Android Studio:**
   - Download Android Studio from https://developer.android.com/studio
   - Install it and follow the SDK setup wizard
   - Then follow step 1 above

3. **Or set manually in VS Code Settings:**
   - Open Settings (Ctrl+,)
   - Search for \`android-studio-lite.sdkPath\`
   - Enter: \`${homeDir}/Android/Sdk\``;
        }
    }

    private static getCommandLineToolsSetupInstructions(sdkPath: string): string {
        const platform = process.platform;
        const cmdPath = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin');

        if (platform === 'darwin') {
            return `**Install Command-Line Tools (macOS):**

**Option 1: Using Android Studio (Recommended)**
1. Open Android Studio
2. Tools → SDK Manager
3. SDK Tools tab
4. Check "Android SDK Command-line Tools (latest)"
5. Click Apply

**Option 2: Manual Installation**
\`\`\`bash
cd "${sdkPath}"
curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip
unzip -q cmdline-tools.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm cmdline-tools.zip
\`\`\`

After installation, the tools should be at: \`${cmdPath}\``;
        } else if (platform === 'win32') {
            return `**Install Command-Line Tools (Windows):**

**Option 1: Using Android Studio (Recommended)**
1. Open Android Studio
2. File → Settings → Appearance & Behavior → System Settings → Android SDK
3. SDK Tools tab
4. Check "Android SDK Command-line Tools (latest)"
5. Click Apply

**Option 2: Manual Installation**
1. Download: https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip
2. Extract to: \`${sdkPath}\\cmdline-tools\\latest\\\`
3. The structure should be: \`${sdkPath}\\cmdline-tools\\latest\\bin\\avdmanager.bat\`

After installation, the tools should be at: \`${cmdPath}\``;
        } else {
            return `**Install Command-Line Tools (Linux):**

**Option 1: Using Android Studio (Recommended)**
1. Open Android Studio
2. File → Settings → Appearance & Behavior → System Settings → Android SDK
3. SDK Tools tab
4. Check "Android SDK Command-line Tools (latest)"
5. Click Apply

**Option 2: Manual Installation**
\`\`\`bash
cd "${sdkPath}"
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rm commandlinetools-linux-11076708_latest.zip
\`\`\`

After installation, the tools should be at: \`${cmdPath}\``;
        }
    }

    private static getPlatformToolsSetupInstructions(sdkPath: string): string {
        return `**Install Platform Tools:**

1. Open Android Studio
2. Tools → SDK Manager (or File → Settings → Android SDK)
3. SDK Tools tab
4. Check "Android SDK Platform-Tools"
5. Click Apply

Or install via command-line tools:
\`\`\`bash
${path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager')} "platform-tools"
\`\`\``;
    }

    private static getBuildToolsSetupInstructions(sdkPath: string): string {
        return `**Install Build Tools:**

1. Open Android Studio
2. Tools → SDK Manager (or File → Settings → Android SDK)
3. SDK Tools tab
4. Check "Android SDK Build-Tools"
5. Click Apply

Or install via command-line tools:
\`\`\`bash
${path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager')} "build-tools;34.0.0"
\`\`\``;
    }

    private static getEmulatorSetupInstructions(sdkPath: string): string {
        return `**Install Emulator:**

1. Open Android Studio
2. Tools → SDK Manager (or File → Settings → Android SDK)
3. SDK Tools tab
4. Check "Android Emulator"
5. Click Apply

Or install via command-line tools:
\`\`\`bash
${path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager')} "emulator"
\`\`\``;
    }

    /**
     * Checks if gradlew exists in the workspace
     */
    public static checkGradleWrapper(workspacePath: string): { exists: boolean; path: string; error?: string } {
        if (!workspacePath || !fs.existsSync(workspacePath)) {
            return {
                exists: false,
                path: '',
                error: 'Workspace path not found',
            };
        }

        const gradlewName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
        const gradlewPath = path.join(workspacePath, gradlewName);

        if (!fs.existsSync(gradlewPath)) {
            return {
                exists: false,
                path: gradlewPath,
                error: `Gradle wrapper (${gradlewName}) not found in workspace root. Make sure you're in an Android project directory.`,
            };
        }

        // Check if executable (Unix-like systems)
        if (process.platform !== 'win32') {
            try {
                fs.accessSync(gradlewPath, fs.constants.X_OK);
            } catch (e) {
                return {
                    exists: true,
                    path: gradlewPath,
                    error: `Gradle wrapper exists but is not executable. Run: chmod +x ${gradlewPath}`,
                };
            }
        }

        return {
            exists: true,
            path: gradlewPath,
        };
    }
}
