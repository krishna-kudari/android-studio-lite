import { injectable, inject } from 'tsyringe';
import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import { Service } from "./Service";
import { GradleExecutable, Command } from "../cmd/Gradle";
import { showMsg, MsgType } from '../module/ui';
import { TYPES } from '../di/types';
import { Cache } from '../module/cache';
import { ConfigService } from '../config';
import { Output } from '../module/output';

@injectable()
export class GradleService extends Service {
    readonly gradle: GradleExecutable;
    readonly workspacePath: string;
    private buildProcess: child_process.ChildProcess | null = null;

    constructor(
        @inject(TYPES.Cache) cache: Cache,
        @inject(TYPES.ConfigService) configService: ConfigService,
        @inject(TYPES.Output) output: Output
    ) {
        super(cache, configService, output);
        this.gradle = new GradleExecutable(output);
        this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    }

    public async installVariant(
        variantTask: string,
        onOutput?: (output: string) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        if (!this.workspacePath) {
            throw new Error("No workspace folder found");
        }

        // Check if gradlew exists
        const gradlewPath = path.join(this.workspacePath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
        const fs = await import('fs');
        if (!fs.existsSync(gradlewPath)) {
            throw new Error("Gradle wrapper not found. Please ensure you are in an Android project root.");
        }

        // Get command from executable
        const commandProp = this.gradle.getCommand(Command.install);
        const cmd = this.gradle.getCmd(commandProp, variantTask);

        return new Promise<void>((resolve, reject) => {
            // Check cancellation before starting
            if (cancellationToken?.isCancellationRequested) {
                reject(new Error("Build was cancelled"));
                return;
            }

            const spawnOptions: child_process.SpawnOptions = {
                shell: true,
                cwd: this.workspacePath,
            };

            this.buildProcess = child_process.spawn(cmd, [], spawnOptions);

            let stdout = '';
            let stderr = '';

            if (this.buildProcess.stdout) {
                this.buildProcess.stdout.on('data', (data) => {
                    const output = Buffer.from(data).toString();
                    stdout += output;
                    if (onOutput) {
                        onOutput(output);
                    }
                    this.output.append(output);
                });
            }

            if (this.buildProcess.stderr) {
                this.buildProcess.stderr.on('data', (data) => {
                    const output = Buffer.from(data).toString();
                    stderr += output;
                    if (onOutput) {
                        onOutput(output);
                    }
                    this.output.append(output, "error");
                });
            }

            // Handle cancellation
            if (cancellationToken) {
                const cancellationListener = cancellationToken.onCancellationRequested(() => {
                    if (this.buildProcess) {
                        this.buildProcess.kill('SIGTERM');
                        this.buildProcess = null;
                    }
                    reject(new Error("Build was cancelled"));
                });
                this.buildProcess.on('close', () => {
                    cancellationListener.dispose();
                });
            }

            this.buildProcess.on('error', (error) => {
                this.buildProcess = null;
                this.output.append(stderr, "error");
                showMsg(MsgType.error, `Failed to install ${variantTask}: ${error.message}`);
                reject(error);
            });

            this.buildProcess.on('close', (code) => {
                this.buildProcess = null;
                if (code === 0) {
                    showMsg(MsgType.info, `${variantTask} installed successfully.`);
                    resolve();
                } else {
                    this.output.append(stderr, "error");
                    const errorMsg = stderr || stdout || `Gradle build failed with exit code ${code}`;
                    console.error(`[GradleService] Build failed. Exit code: ${code}, stderr: ${stderr}, stdout: ${stdout}`);
                    showMsg(MsgType.error, `Failed to install ${variantTask}. Exit code: ${code}`);
                    reject(new Error(errorMsg));
                }
            });
        });
    }

    public async assembleVariant(
        variantTask: string,
        onOutput?: (output: string) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        if (!this.workspacePath) {
            throw new Error("No workspace folder found");
        }

        // Check if gradlew exists
        const gradlewPath = path.join(this.workspacePath, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
        const fs = await import('fs');
        if (!fs.existsSync(gradlewPath)) {
            throw new Error("Gradle wrapper not found. Please ensure you are in an Android project root.");
        }

        // Get command from executable
        const commandProp = this.gradle.getCommand(Command.assemble);
        const cmd = this.gradle.getCmd(commandProp, variantTask);

        return new Promise<void>((resolve, reject) => {
            // Check cancellation before starting
            if (cancellationToken?.isCancellationRequested) {
                reject(new Error("Build was cancelled"));
                return;
            }

            const spawnOptions: child_process.SpawnOptions = {
                shell: true,
                cwd: this.workspacePath,
            };

            this.buildProcess = child_process.spawn(cmd, [], spawnOptions);

            let stdout = '';
            let stderr = '';

            if (this.buildProcess.stdout) {
                this.buildProcess.stdout.on('data', (data) => {
                    const output = Buffer.from(data).toString();
                    stdout += output;
                    if (onOutput) {
                        onOutput(output);
                    }
                    this.output.append(output);
                });
            }

            if (this.buildProcess.stderr) {
                this.buildProcess.stderr.on('data', (data) => {
                    const output = Buffer.from(data).toString();
                    stderr += output;
                    if (onOutput) {
                        onOutput(output);
                    }
                    this.output.append(output, "error");
                });
            }

            // Handle cancellation
            if (cancellationToken) {
                const cancellationListener = cancellationToken.onCancellationRequested(() => {
                    if (this.buildProcess) {
                        this.buildProcess.kill('SIGTERM');
                        this.buildProcess = null;
                    }
                    reject(new Error("Build was cancelled"));
                });
                this.buildProcess.on('close', () => {
                    cancellationListener.dispose();
                });
            }

            this.buildProcess.on('error', (error) => {
                this.buildProcess = null;
                this.output.append(stderr, "error");
                showMsg(MsgType.error, `Failed to assemble ${variantTask}: ${error.message}`);
                reject(error);
            });

            this.buildProcess.on('close', (code) => {
                this.buildProcess = null;
                if (code === 0) {
                    showMsg(MsgType.info, `${variantTask} assembled successfully.`);
                    resolve();
                } else {
                    this.output.append(stderr, "error");
                    showMsg(MsgType.error, `Failed to assemble ${variantTask}. Exit code: ${code}`);
                    reject(new Error(`Gradle build failed with exit code ${code}`));
                }
            });
        });
    }

    public isBuildInProgress(): boolean {
        return this.buildProcess !== null;
    }

    public cancelBuild(): void {
        if (this.buildProcess) {
            try {
                this.buildProcess.kill('SIGTERM');
            } catch (error) {
                console.error('[GradleService] Error cancelling build:', error);
            }
            this.buildProcess = null;
        }
    }
}
