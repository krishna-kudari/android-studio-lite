import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

export interface GradleTask {
    task: string;
    onOutput?: (data: string) => void;
    onError?: (data: string) => void;
}

export class GradleService {
    private gradleWrapperPath: string | null = null;
    private workspaceRoot: string | null = null;
    private currentProcess: ChildProcess | null = null;
    private isBuilding: boolean = false;
    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.initializeGradleWrapper();
    }

    /**
     * Find Gradle wrapper in workspace
     */
    private initializeGradleWrapper(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        this.workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Check for gradlew (Unix) or gradlew.bat (Windows)
        const gradlewPath = path.join(this.workspaceRoot, 'gradlew');
        const gradlewBatPath = path.join(this.workspaceRoot, 'gradlew.bat');

        if (fs.existsSync(gradlewPath)) {
            this.gradleWrapperPath = gradlewPath;
        } else if (fs.existsSync(gradlewBatPath)) {
            this.gradleWrapperPath = gradlewBatPath;
        }
    }

    /**
     * Check if Gradle wrapper is available
     */
    public isAvailable(): boolean {
        return this.gradleWrapperPath !== null && this.workspaceRoot !== null;
    }

    /**
     * Get Gradle wrapper path
     */
    public getGradleWrapperPath(): string {
        if (!this.gradleWrapperPath) {
            throw new Error('Gradle wrapper not found. Please ensure you are in an Android project root.');
        }
        return this.gradleWrapperPath;
    }

    /**
     * Get workspace root
     */
    public getWorkspaceRoot(): string {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder found.');
        }
        return this.workspaceRoot;
    }

    /**
     * Check if a build is currently in progress
     */
    public isBuildInProgress(): boolean {
        return this.isBuilding;
    }

    /**
     * Cancel the current build process
     */
    public cancelBuild(): void {
        if (this.currentProcess && this.currentProcess.pid) {
            try {
                // Kill the process
                if (process.platform === 'win32') {
                    // On Windows, use taskkill to kill the process tree
                    spawn('taskkill', ['/F', '/T', '/PID', this.currentProcess.pid.toString()], {
                        stdio: 'ignore',
                        detached: true
                    });
                } else {
                    // On Unix-like systems, kill the process directly
                    // The OS will clean up child processes
                    this.currentProcess.kill('SIGTERM');
                    // Force kill after a short delay if process is still running
                    setTimeout(() => {
                        if (this.currentProcess && !this.currentProcess.killed) {
                            this.currentProcess.kill('SIGKILL');
                        }
                    }, 2000);
                }
                this.currentProcess = null;
                this.isBuilding = false;
            } catch (error) {
                console.error('Error cancelling build:', error);
                // Ensure state is reset even if kill fails
                this.currentProcess = null;
                this.isBuilding = false;
            }
        }
    }

    /**
     * Execute a Gradle task
     */
    public async executeTask(
        task: string,
        onOutput?: (data: string) => void,
        onError?: (data: string) => void
    ): Promise<{ success: boolean; output: string; error?: string }> {
        if (!this.isAvailable()) {
            throw new Error('Gradle wrapper not found. Please ensure you are in an Android project root.');
        }

        if (this.isBuilding) {
            throw new Error('A build is already in progress. Please wait for it to complete or stop it first.');
        }

        const gradlew = this.getGradleWrapperPath();
        const workspaceRoot = this.getWorkspaceRoot();
        const isWindows = process.platform === 'win32';
        const command = isWindows ? gradlew : './gradlew';
        const args = task.split(' ');

        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            this.isBuilding = true;
            const spawnOptions: any = {
                cwd: workspaceRoot,
                shell: isWindows
            };
            
            // On Unix systems, create a new process group for easier cleanup
            if (!isWindows) {
                spawnOptions.detached = false;
            }
            
            const gradleProcess = spawn(command, args, spawnOptions);

            // Store reference to the process
            this.currentProcess = gradleProcess;

            gradleProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                onOutput?.(text);
            });

            gradleProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                onError?.(text);
            });

            gradleProcess.on('close', (code) => {
                this.currentProcess = null;
                this.isBuilding = false;
                if (code === 0) {
                    resolve({ success: true, output, error: errorOutput || undefined });
                } else {
                    // Check if it was cancelled (SIGTERM/SIGKILL)
                    const wasCancelled = code === null || code === 143 || code === 130;
                    if (wasCancelled) {
                        reject(new Error('Build was cancelled'));
                    } else {
                        resolve({ success: false, output, error: errorOutput || 'Build failed' });
                    }
                }
            });

            gradleProcess.on('error', (error) => {
                this.currentProcess = null;
                this.isBuilding = false;
                reject(new Error(`Failed to execute Gradle: ${error.message}`));
            });
        });
    }

    /**
     * Install app variant on device
     */
    public async installVariant(variant: string, onProgress?: (message: string) => void): Promise<string> {
        const task = `install${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
        
        let apkPath: string | undefined;

        const result = await this.executeTask(
            task,
            (data) => {
                onProgress?.(data);
                // Try to extract APK path from output
                const apkMatch = data.match(/(app[\/\\][^\/\\]+\.apk)/);
                if (apkMatch) {
                    apkPath = path.join(this.getWorkspaceRoot(), apkMatch[1]);
                }
            },
            (data) => {
                onProgress?.(data);
            }
        );

        if (!result.success) {
            throw new Error(result.error || 'Installation failed');
        }

        return apkPath || '';
    }

    /**
     * Assemble app variant (build APK without installing)
     */
    public async assembleVariant(variant: string, onProgress?: (message: string) => void): Promise<string> {
        const task = `assemble${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
        
        let apkPath: string | undefined;

        const result = await this.executeTask(
            task,
            (data) => {
                onProgress?.(data);
                // Try to extract APK path from output
                const apkMatch = data.match(/(app[\/\\][^\/\\]+\.apk)/);
                if (apkMatch) {
                    apkPath = path.join(this.getWorkspaceRoot(), apkMatch[1]);
                }
            },
            (data) => {
                onProgress?.(data);
            }
        );

        if (!result.success) {
            throw new Error(result.error || 'Build failed');
        }

        return apkPath || '';
    }

    /**
     * Detect Android build variants using Gradle init script
     * Returns parsed variant data from all modules
     */
    public async detectBuildVariants(): Promise<AndroidVariantsModel | null> {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            // Read the init script content from extension directory
            // .kts files are source files, so they're in src/ directory
            const initScriptPath = path.join(
                this.extensionPath,
                'src',
                'services',
                'buildVariants',
                'gradle',
                'variant-init.gradle.kts'
            );

            if (!fs.existsSync(initScriptPath)) {
                console.error(`[GradleService] Init script not found at: ${initScriptPath}`);
                return null;
            }

            const initScriptContent = fs.readFileSync(initScriptPath, 'utf-8');

            // Write to temp file
            const tempDir = os.tmpdir();
            const tempInitScript = path.join(tempDir, `android-variant-init-${Date.now()}.gradle.kts`);
            fs.writeFileSync(tempInitScript, initScriptContent);

            try {
                // Execute Gradle with init script using spawn directly
                const gradlew = this.getGradleWrapperPath();
                const workspaceRoot = this.getWorkspaceRoot();
                const isWindows = process.platform === 'win32';
                const command = isWindows ? gradlew : './gradlew';
                
                // Use quiet mode and avoid build cache for faster execution
                const args = [
                    '-I', tempInitScript,
                    'printAndroidVariants',
                    '-q',
                    '--no-build-cache'
                ];

                const result = await new Promise<{ success: boolean; output: string; error?: string }>((resolve, reject) => {
                    let output = '';
                    let errorOutput = '';

                    const gradleProcess = spawn(command, args, {
                        cwd: workspaceRoot,
                        shell: isWindows
                    });

                    gradleProcess.stdout.on('data', (data) => {
                        output += data.toString();
                    });

                    gradleProcess.stderr.on('data', (data) => {
                        errorOutput += data.toString();
                    });

                    gradleProcess.on('close', (code) => {
                        if (code === 0) {
                            resolve({ success: true, output, error: errorOutput || undefined });
                        } else {
                            resolve({ success: false, output, error: errorOutput || 'Build failed' });
                        }
                    });

                    gradleProcess.on('error', (error) => {
                        reject(new Error(`Failed to execute Gradle: ${error.message}`));
                    });
                });

                // Clean up temp file
                try {
                    fs.unlinkSync(tempInitScript);
                } catch (e) {
                    // Ignore cleanup errors
                }

                if (!result.success) {
                    console.error(`[GradleService] Failed to detect variants: ${result.error}`);
                    return null;
                }

                // Parse JSON output
                const lines = result.output.split('\n');
                const markerLine = lines.find(line => line.startsWith('ANDROID_VARIANTS='));
                
                if (!markerLine) {
                    console.error('[GradleService] No ANDROID_VARIANTS marker found in output');
                    return null;
                }

                const jsonStr = markerLine.replace('ANDROID_VARIANTS=', '').trim();
                const variantsData = JSON.parse(jsonStr) as AndroidVariantsModel;
                console.log('[GradleService] Detected build variants:', variantsData);
                return variantsData;
            } catch (error) {
                // Clean up temp file on error
                try {
                    fs.unlinkSync(tempInitScript);
                } catch (e) {
                    // Ignore cleanup errors
                }
                throw error;
            }
        } catch (error) {
            console.error('[GradleService] Error detecting build variants:', error);
            return null;
        }
    }
}

/**
 * Android Variants Model from Gradle init script
 */
export interface AndroidVariantsModel {
    schemaVersion: number;
    generatedAt: number;
    modules: Record<string, {
        type: 'application' | 'library';
        variants: Array<{
            name: string;
            buildType: string;
            flavors: string[];
            tasks: {
                assemble: string;
                install?: string;
                bundle?: string;
            };
        }>;
    }>;
}

