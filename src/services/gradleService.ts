import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

    constructor(private context: vscode.ExtensionContext) {
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
}

