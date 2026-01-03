import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface AVD {
    name: string;
    path?: string;
}

export class EmulatorService {
    private emulatorPath: string | null = null;
    private runningEmulators: Map<string, ChildProcess> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.initializeEmulatorPath();
    }

    /**
     * Check for custom emulator path in settings
     */
    private getCustomEmulatorPath(): string | null {
        const config = vscode.workspace.getConfiguration('android-studio-lite');
        const customPath = config.get<string>('emulatorPath');
        return customPath && customPath.trim() ? customPath.trim() : null;
    }

    /**
     * Find emulator executable
     */
    private async initializeEmulatorPath(): Promise<void> {
        // First check for custom path in settings
        const customPath = this.getCustomEmulatorPath();
        if (customPath) {
            try {
                await Promise.race([
                    execAsync(`"${customPath}" -version`, { timeout: 3000 }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                this.emulatorPath = customPath;
                console.log(`[EmulatorService] Using custom emulator path: ${customPath}`);
                return;
            } catch (error: any) {
                console.warn(`[EmulatorService] Custom emulator path invalid: ${customPath}`);
            }
        }

        // Try common locations
        const commonPaths: string[] = [];

        // Check environment variables
        if (process.env.ANDROID_HOME) {
            commonPaths.push(
                `${process.env.ANDROID_HOME}/emulator/emulator`,
                `${process.env.ANDROID_HOME}/tools/emulator`, // Legacy location
                `${process.env.ANDROID_HOME}/platform-tools/emulator`
            );
        }

        if (process.env.ANDROID_SDK_ROOT) {
            commonPaths.push(
                `${process.env.ANDROID_SDK_ROOT}/emulator/emulator`,
                `${process.env.ANDROID_SDK_ROOT}/tools/emulator`, // Legacy location
                `${process.env.ANDROID_SDK_ROOT}/platform-tools/emulator`
            );
        }

        // Check common macOS/Linux locations
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (homeDir) {
            commonPaths.push(
                `${homeDir}/Library/Android/sdk/emulator/emulator`, // macOS default
                `${homeDir}/Android/Sdk/emulator/emulator`, // Linux default
                `${homeDir}/AppData/Local/Android/Sdk/emulator/emulator.exe` // Windows
            );
        }

        // Check if emulator is in PATH
        commonPaths.push('emulator');

        // Remove duplicates
        const uniquePaths = [...new Set(commonPaths)];

        for (const path of uniquePaths) {
            try {
                // Use timeout to avoid hanging
                await Promise.race([
                    execAsync(`"${path}" -version`, { timeout: 3000 }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                
                this.emulatorPath = path;
                console.log(`[EmulatorService] Found emulator at: ${path}`);
                return;
            } catch (error: any) {
                // Continue to next path
                continue;
            }
        }

        // If not found, default to 'emulator' and let it fail with a clear error
        this.emulatorPath = 'emulator';
        console.log('[EmulatorService] Emulator not found in common locations, will try PATH');
    }

    /**
     * Get emulator path
     */
    public getEmulatorPath(): string {
        return this.emulatorPath || 'emulator';
    }

    /**
     * Check if emulator is available
     */
    public async isAvailable(): Promise<boolean> {
        // Ensure emulator path is initialized
        if (!this.emulatorPath) {
            await this.initializeEmulatorPath();
        }

        try {
            const emulatorPath = this.getEmulatorPath();
            await Promise.race([
                execAsync(`"${emulatorPath}" -version`, { timeout: 3000 }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get helpful error message with suggestions
     */
    public getErrorMessage(): string {
        const suggestions: string[] = [];
        
        if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
            suggestions.push('Set ANDROID_HOME or ANDROID_SDK_ROOT environment variable');
            suggestions.push('Example: export ANDROID_HOME=$HOME/Library/Android/sdk');
        }
        
        suggestions.push('Install Android SDK Emulator via Android Studio SDK Manager');
        suggestions.push('Or install via command line: sdkmanager "emulator"');
        
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (homeDir) {
            suggestions.push(`Check if emulator exists at: ${homeDir}/Library/Android/sdk/emulator/emulator`);
        }
        
        return `Android Emulator not found.\n\nSuggestions:\n${suggestions.map(s => `  • ${s}`).join('\n')}`;
    }

    /**
     * List available AVDs
     */
    public async listAVDs(): Promise<AVD[]> {
        // Ensure emulator path is initialized
        if (!this.emulatorPath) {
            await this.initializeEmulatorPath();
        }

        const emulatorPath = this.getEmulatorPath();
        console.log(`[EmulatorService] Using emulator path: ${emulatorPath}`);
        
        try {
            console.log(`[EmulatorService] Executing: "${emulatorPath}" -list-avds`);
            const { stdout, stderr } = await execAsync(`"${emulatorPath}" -list-avds`, { timeout: 10000 });
            
            console.log(`[EmulatorService] Command stdout:`, stdout);
            if (stderr) {
                console.warn(`[EmulatorService] Command stderr:`, stderr);
            }
            
            const avdNames = stdout
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            console.log(`[EmulatorService] Parsed ${avdNames.length} AVDs:`, avdNames);
            return avdNames.map(name => ({ name }));
        } catch (error: any) {
            console.error(`[EmulatorService] Error listing AVDs:`, error);
            console.error(`[EmulatorService] Error details:`, {
                message: error.message,
                code: error.code,
                stderr: error.stderr,
                stdout: error.stdout
            });
            
            // Provide more helpful error message
            if (error.message.includes('ENOENT') || error.message.includes('not found')) {
                throw new Error(`Emulator executable not found at: ${emulatorPath}. ${this.getErrorMessage()}`);
            }
            
            // Include stderr in error message if available
            const errorMsg = error.stderr 
                ? `Failed to list AVDs: ${error.message}\n${error.stderr}`
                : `Failed to list AVDs: ${error.message}`;
            throw new Error(errorMsg);
        }
    }

    /**
     * Start an emulator
     */
    public async startAVD(avdName: string, onOutput?: (data: string) => void): Promise<void> {
        // Check if already running
        if (this.runningEmulators.has(avdName)) {
            throw new Error(`Emulator ${avdName} is already running`);
        }

        const emulatorPath = this.getEmulatorPath();
        const args = ['-avd', avdName, '-no-snapshot-load'];

        return new Promise((resolve, reject) => {
            const emulatorProcess = spawn(emulatorPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: true // Allow emulator to continue after extension closes
            });

            // Store process reference
            this.runningEmulators.set(avdName, emulatorProcess);

            emulatorProcess.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                onOutput?.(text);
            });

            emulatorProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                onOutput?.(text);
                
                // Check for common errors
                if (text.includes('ERROR') && !text.includes('qemu')) {
                    // Some errors are expected during startup, ignore qemu errors
                }
            });

            emulatorProcess.on('error', (error) => {
                this.runningEmulators.delete(avdName);
                reject(new Error(`Failed to start emulator: ${error.message}`));
            });

            emulatorProcess.on('close', (code) => {
                this.runningEmulators.delete(avdName);
                if (code !== 0 && code !== null) {
                    console.log(`[Emulator] Process exited with code ${code}`);
                }
            });

            // Unref to allow process to continue independently
            emulatorProcess.unref();

            // Give it a moment to start
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    }

    /**
     * Stop an emulator (by killing the process)
     */
    public async stopAVD(avdName: string): Promise<void> {
        const process = this.runningEmulators.get(avdName);
        if (process) {
            process.kill();
            this.runningEmulators.delete(avdName);
        } else {
            // Try to kill by name using adb
            try {
                await execAsync(`adb -s emulator-* emu kill`);
            } catch {
                // Ignore errors
            }
        }
    }

    /**
     * Get running emulators
     */
    public getRunningEmulators(): string[] {
        return Array.from(this.runningEmulators.keys());
    }
}

