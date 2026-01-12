import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Manager } from '../core';
import { AndroidSdkDetector, AndroidSdkInfo } from '../utils/androidSdkDetector';
import { showMsg, MsgType } from '../module/ui';

const execAsync = promisify(exec);

interface DownloadProgress {
    downloaded: number;
    total: number;
    percentage: number;
}

export class SdkInstallerService {
    constructor(private manager: Manager) {}

    /**
     * Checks network connectivity
     */
    private async checkNetworkConnectivity(): Promise<boolean> {
        return new Promise((resolve) => {
            const req = https.request(
                {
                    hostname: 'www.google.com',
                    port: 443,
                    path: '/',
                    method: 'HEAD',
                    timeout: 5000,
                },
                () => {
                    resolve(true);
                }
            );

            req.on('error', () => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    /**
     * Downloads a file with progress tracking
     */
    private async downloadFile(
        url: string,
        destPath: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<void> {
        // Check network connectivity first
        const hasNetwork = await this.checkNetworkConnectivity();
        if (!hasNetwork) {
            throw new Error(
                'No internet connection detected. Please check your network and try again.'
            );
        }
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            const protocol = url.startsWith('https:') ? https : http;

            protocol.get(url, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Handle redirect
                    if (response.headers.location) {
                        file.close();
                        fs.unlinkSync(destPath);
                        return this.downloadFile(response.headers.location, destPath, onProgress)
                            .then(resolve)
                            .catch(reject);
                    }
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(destPath);
                    reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloaded = 0;

                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (onProgress && totalSize > 0) {
                        onProgress({
                            downloaded,
                            total: totalSize,
                            percentage: Math.round((downloaded / totalSize) * 100),
                        });
                    }
                });

                response.on('end', () => {
                    file.close();
                    resolve();
                });

                response.on('error', (error) => {
                    file.close();
                    fs.unlinkSync(destPath);
                    reject(error);
                });

                response.pipe(file);
            }).on('error', (error) => {
                file.close();
                if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                }
                reject(error);
            });
        });
    }

    /**
     * Gets the command-line tools download URL for the current platform
     */
    private getCommandLineToolsUrl(): string {
        const platform = process.platform;
        // Using a stable version URL - update as needed
        const version = '11076708'; // Latest as of 2024
        const baseUrl = 'https://dl.google.com/android/repository';

        if (platform === 'darwin') {
            return `${baseUrl}/commandlinetools-mac-${version}_latest.zip`;
        } else if (platform === 'win32') {
            return `${baseUrl}/commandlinetools-win-${version}_latest.zip`;
        } else {
            return `${baseUrl}/commandlinetools-linux-${version}_latest.zip`;
        }
    }

    /**
     * Extracts ZIP file (simple implementation using unzip/tar)
     */
    private async extractZip(zipPath: string, destDir: string): Promise<void> {
        const platform = process.platform;

        if (platform === 'win32') {
            // Windows: Use PowerShell Expand-Archive
            try {
                await execAsync(
                    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
                    { maxBuffer: 10 * 1024 * 1024 }
                );
            } catch (error) {
                // Fallback: try using 7z or other tools
                throw new Error('Failed to extract ZIP. Please install 7-Zip or extract manually.');
            }
        } else {
            // macOS/Linux: Use unzip command
            try {
                await execAsync(`unzip -q -o "${zipPath}" -d "${destDir}"`, {
                    maxBuffer: 10 * 1024 * 1024,
                });
            } catch (error) {
                throw new Error('Failed to extract ZIP. Please ensure unzip is installed.');
            }
        }
    }

    /**
     * Installs Android SDK Command-Line Tools
     */
    public async installCommandLineTools(
        sdkPath: string,
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<string> {
        const url = this.getCommandLineToolsUrl();
        const tempDir = os.tmpdir();
        const zipFileName = `cmdline-tools-${Date.now()}.zip`;
        const zipPath = path.join(tempDir, zipFileName);
        const cmdlineToolsDir = path.join(sdkPath, 'cmdline-tools');
        const latestDir = path.join(cmdlineToolsDir, 'latest');

        try {
            // Create directories
            if (!fs.existsSync(cmdlineToolsDir)) {
                fs.mkdirSync(cmdlineToolsDir, { recursive: true });
            }

            // Download
            if (progress) {
                progress.report({ message: 'Downloading Command-Line Tools...' });
            }
            this.manager.output.append(`Downloading Command-Line Tools from ${url}...`);

            await this.downloadFile(url, zipPath, (downloadProgress) => {
                if (progress) {
                    progress.report({
                        message: `Downloading Command-Line Tools... ${downloadProgress.percentage}%`,
                        increment: 0,
                    });
                }
            });

            // Extract
            if (progress) {
                progress.report({ message: 'Extracting Command-Line Tools...' });
            }
            this.manager.output.append('Extracting Command-Line Tools...');

            // Extract to temp location first
            const tempExtractDir = path.join(tempDir, `cmdline-tools-extract-${Date.now()}`);
            fs.mkdirSync(tempExtractDir, { recursive: true });
            await this.extractZip(zipPath, tempExtractDir);

            // Move to correct location
            const extractedContents = fs.readdirSync(tempExtractDir);
            const cmdlineToolsFolder = extractedContents.find((item) => {
                const itemPath = path.join(tempExtractDir, item);
                return fs.statSync(itemPath).isDirectory() && item === 'cmdline-tools';
            });

            if (cmdlineToolsFolder) {
                // Structure: cmdline-tools/cmdline-tools/...
                const innerCmdlineTools = path.join(tempExtractDir, cmdlineToolsFolder);
                const innerContents = fs.readdirSync(innerCmdlineTools);
                if (innerContents.length > 0) {
                    // Move contents to latest directory
                    if (!fs.existsSync(latestDir)) {
                        fs.mkdirSync(latestDir, { recursive: true });
                    }
                    for (const item of innerContents) {
                        const src = path.join(innerCmdlineTools, item);
                        const dest = path.join(latestDir, item);
                        if (fs.existsSync(dest)) {
                            if (fs.statSync(dest).isDirectory()) {
                                fs.rmSync(dest, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(dest);
                            }
                        }
                        fs.renameSync(src, dest);
                    }
                }
            } else {
                // Direct structure: cmdline-tools/bin/...
                const binDir = path.join(tempExtractDir, 'bin');
                if (fs.existsSync(binDir)) {
                    // Move entire structure to latest
                    if (!fs.existsSync(latestDir)) {
                        fs.mkdirSync(latestDir, { recursive: true });
                    }
                    const contents = fs.readdirSync(tempExtractDir);
                    for (const item of contents) {
                        const src = path.join(tempExtractDir, item);
                        const dest = path.join(latestDir, item);
                        if (fs.existsSync(dest)) {
                            if (fs.statSync(dest).isDirectory()) {
                                fs.rmSync(dest, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(dest);
                            }
                        }
                        fs.renameSync(src, dest);
                    }
                } else {
                    throw new Error('Unexpected ZIP structure');
                }
            }

            // Cleanup
            fs.rmSync(tempExtractDir, { recursive: true, force: true });
            fs.unlinkSync(zipPath);

            // Verify installation
            const avdmanagerPath = path.join(
                latestDir,
                'bin',
                process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager'
            );

            if (!fs.existsSync(avdmanagerPath)) {
                throw new Error('Command-Line Tools installed but avdmanager not found');
            }

            // Make executable on Unix-like systems
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(avdmanagerPath, 0o755);
                    const sdkmanagerPath = path.join(latestDir, 'bin', 'sdkmanager');
                    if (fs.existsSync(sdkmanagerPath)) {
                        fs.chmodSync(sdkmanagerPath, 0o755);
                    }
                } catch (e) {
                    // Ignore chmod errors
                }
            }

            this.manager.output.append('Command-Line Tools installed successfully!');
            return latestDir;
        } catch (error: any) {
            // Cleanup on error
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            throw error;
        }
    }

    /**
     * Accepts Android SDK licenses
     */
    public async acceptLicenses(sdkManagerPath: string): Promise<void> {
        try {
            // Accept all licenses
            const yesCommand = process.platform === 'win32' ? 'echo y' : 'yes';
            await execAsync(`echo y | "${sdkManagerPath}" --licenses`, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 60000, // 60 seconds timeout
            });
            this.manager.output.append('Android SDK licenses accepted');
        } catch (error) {
            // License acceptance might fail, but that's okay - user can accept manually later
            console.warn('Failed to auto-accept licenses:', error);
        }
    }

    /**
     * Installs SDK components using sdkmanager
     */
    public async installSdkComponent(
        sdkManagerPath: string,
        component: string,
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<void> {
        if (progress) {
            progress.report({ message: `Installing ${component}...` });
        }
        this.manager.output.append(`Installing ${component}...`);

        try {
            const { stdout, stderr } = await execAsync(`"${sdkManagerPath}" "${component}"`, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 300000, // 5 minutes timeout
            });

            if (stdout) {
                this.manager.output.append(stdout);
            }
            if (stderr && !stderr.includes('Warning:')) {
                this.manager.output.append(stderr, 'error');
            }

            this.manager.output.append(`${component} installed successfully`);
        } catch (error: any) {
            const errorMsg = error.stderr || error.message || String(error);
            throw new Error(`Failed to install ${component}: ${errorMsg}`);
        }
    }

    /**
     * Checks if we have write permissions to the SDK directory
     */
    private canWriteToSdk(sdkPath: string): boolean {
        try {
            const testFile = path.join(sdkPath, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Auto-installs missing SDK components with user consent
     */
    public async autoInstallMissingComponents(
        sdkInfo: AndroidSdkInfo,
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<boolean> {
        // Check write permissions
        if (!this.canWriteToSdk(sdkInfo.sdkPath)) {
            throw new Error(
                `No write permission to SDK directory: ${sdkInfo.sdkPath}\n` +
                'Please run VS Code with appropriate permissions or change SDK directory permissions.'
            );
        }
        const installed: string[] = [];
        const failed: string[] = [];

        try {
            // 1. Install Command-Line Tools if missing
            if (!sdkInfo.hasCommandLineTools) {
                if (progress) {
                    progress.report({ message: 'Installing Command-Line Tools...' });
                }
                try {
                    const cmdPath = await this.installCommandLineTools(sdkInfo.sdkPath, progress);
                    installed.push('Command-Line Tools');
                    sdkInfo.hasCommandLineTools = true;
                    sdkInfo.commandLineToolsPath = cmdPath;
                } catch (error: any) {
                    failed.push(`Command-Line Tools: ${error.message}`);
                    return false; // Can't continue without command-line tools
                }
            }

            // 2. Accept licenses
            if (sdkInfo.hasCommandLineTools && sdkInfo.commandLineToolsPath) {
                const sdkManagerPath = path.join(
                    sdkInfo.commandLineToolsPath,
                    'bin',
                    process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager'
                );

                if (fs.existsSync(sdkManagerPath)) {
                    await this.acceptLicenses(sdkManagerPath);

                    // 3. Install Platform Tools if missing
                    if (!sdkInfo.hasPlatformTools) {
                        try {
                            await this.installSdkComponent(sdkManagerPath, 'platform-tools', progress);
                            installed.push('Platform Tools');
                        } catch (error: any) {
                            failed.push(`Platform Tools: ${error.message}`);
                        }
                    }

                    // 4. Install Build Tools if missing
                    if (!sdkInfo.hasBuildTools) {
                        try {
                            await this.installSdkComponent(sdkManagerPath, 'build-tools;34.0.0', progress);
                            installed.push('Build Tools');
                        } catch (error: any) {
                            failed.push(`Build Tools: ${error.message}`);
                        }
                    }

                    // 5. Install Emulator if missing
                    if (!sdkInfo.hasEmulator) {
                        try {
                            await this.installSdkComponent(sdkManagerPath, 'emulator', progress);
                            installed.push('Emulator');
                        } catch (error: any) {
                            failed.push(`Emulator: ${error.message}`);
                        }
                    }
                }
            }

            // Show results
            if (installed.length > 0) {
                showMsg(
                    MsgType.info,
                    `Successfully installed: ${installed.join(', ')}`,
                    {}
                );
            }

            if (failed.length > 0) {
                showMsg(
                    MsgType.warning,
                    `Failed to install: ${failed.join(', ')}`,
                    {}
                );
            }

            return failed.length === 0;
        } catch (error: any) {
            showMsg(MsgType.error, `Auto-installation failed: ${error.message}`, {});
            return false;
        }
    }
}
