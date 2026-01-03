import { spawn, ChildProcess } from 'child_process';
import { AdbService } from './adbService';
import { parseLogcatLine, LogcatLine, LogLevel } from '../utils/logcatParser';

export interface LogcatFilter {
    packageName?: string;
    level?: LogLevel;
    tag?: string;
    pid?: string;
}

export class LogcatService {
    private logcatProcess: ChildProcess | null = null;
    private isPaused: boolean = false;
    private buffer: LogcatLine[] = [];
    private maxBufferSize: number = 10000;
    private pidToPackageCache: Map<string, string> = new Map();
    private packageCacheUpdateTime: number = 0;
    private readonly PACKAGE_CACHE_TTL = 30000; // 30 seconds

    constructor(private adbService: AdbService) {}

    /**
     * Get package name for a PID
     */
    private async getPackageNameForPid(deviceId: string, pid: string): Promise<string | undefined> {
        // Check cache first
        if (this.pidToPackageCache.has(pid)) {
            return this.pidToPackageCache.get(pid);
        }

        // Update cache if expired
        const now = Date.now();
        if (now - this.packageCacheUpdateTime > this.PACKAGE_CACHE_TTL) {
            await this.updatePackageCache(deviceId);
            this.packageCacheUpdateTime = now;
        }

        return this.pidToPackageCache.get(pid);
    }

    /**
     * Update PID to package name mapping cache
     */
    private async updatePackageCache(deviceId: string): Promise<void> {
        try {
            // Use ps command with specific format to get PID and process name
            // Try 'ps -A -o PID,NAME,ARGS' to get more info
            const output = await this.adbService.executeCommand(
                'shell ps -A -o PID,NAME',
                deviceId
            );

            const lines = output.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('PID')) {
                    continue; // Skip header
                }

                // Parse: PID NAME (or PID NAME ARGS...)
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    const pid = parts[0];
                    const name = parts[1];

                    // Check if name looks like a package (contains dots)
                    if (/^\d+$/.test(pid) && name && name.includes('.')) {
                        // Extract package name (might be full path or just package)
                        let packageName = name;
                        
                        // If it's a path, extract the package name part
                        if (name.includes('/')) {
                            // Try to find package-like segment
                            const packageMatch = name.match(/([a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+)/);
                            if (packageMatch) {
                                packageName = packageMatch[1];
                            } else {
                                continue; // Skip if no package-like name found
                            }
                        }

                        // Filter: must be a valid package name format
                        if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName) && packageName.length > 3) {
                            this.pidToPackageCache.set(pid, packageName);
                        }
                    }
                }
            }
        } catch (error) {
            // Silently fail - we'll just not show package names
            console.warn(`[Logcat] Failed to update package cache: ${error}`);
        }
    }

    /**
     * Start streaming logcat
     */
    public async start(
        deviceId: string,
        filter: LogcatFilter = {},
        onLog: (logLine: LogcatLine) => void
    ): Promise<void> {
        // Stop existing process if any
        this.stop();

        // Clear logcat buffer first (separate command)
        try {
            await this.adbService.executeCommand('logcat -c', deviceId);
        } catch (error) {
            // Ignore clear errors, continue anyway
            console.warn(`[Logcat] Failed to clear buffer: ${error}`);
        }

        // Update package cache on start
        await this.updatePackageCache(deviceId);
        this.packageCacheUpdateTime = Date.now();

        const adbPath = this.adbService.getAdbPath();
        const args: string[] = ['-s', deviceId, 'logcat'];

        // Build filter arguments
        if (filter.packageName) {
            // Try multiple methods to get PID for package
            let pid: string | null = null;
            
            // Method 1: Try pidof
            try {
                const pidOutput = await this.adbService.executeCommand(
                    `shell pidof -s ${filter.packageName}`,
                    deviceId
                );
                pid = pidOutput.trim();
            } catch {
                // Continue to next method
            }

            // Method 2: Try using ps and grep if pidof failed
            if (!pid || pid === '') {
                try {
                    const psOutput = await this.adbService.executeCommand(
                        `shell ps -A | grep ${filter.packageName} | head -1`,
                        deviceId
                    );
                    const match = psOutput.match(/^\s*(\d+)/);
                    if (match) {
                        pid = match[1];
                    }
                } catch {
                    // Continue
                }
            }

            // Method 3: Try using dumpsys if still no PID
            if (!pid || pid === '') {
                try {
                    const dumpsysOutput = await this.adbService.executeCommand(
                        `shell dumpsys activity activities | grep ${filter.packageName} | head -1`,
                        deviceId
                    );
                    // This is a fallback, might not always work
                } catch {
                    // Continue
                }
            }

            if (pid && pid !== '') {
                args.push('--pid', pid);
                // Also store PID in filter for later filtering
                filter.pid = pid;
            } else {
                // If we can't find PID, we'll filter by package name in shouldShowLog
                // Don't add ADB-level filter, let all logs through and filter in code
                console.warn(`[Logcat] Could not find PID for package ${filter.packageName}, will filter in code`);
            }
        }

        // Add log level filter
        if (filter.level) {
            const levelMap: Record<LogLevel, string> = {
                [LogLevel.VERBOSE]: '*:V',
                [LogLevel.DEBUG]: '*:D',
                [LogLevel.INFO]: '*:I',
                [LogLevel.WARN]: '*:W',
                [LogLevel.ERROR]: '*:E',
                [LogLevel.FATAL]: '*:F',
                [LogLevel.SILENT]: '*:S'
            };
            args.push(levelMap[filter.level]);
        } else {
            // Default to show all levels
            args.push('*:V');
        }

        // Add tag filter (use tag name directly, not -s flag)
        if (filter.tag) {
            args.push(`${filter.tag}:*`);
        }

        return new Promise((resolve, reject) => {
            this.logcatProcess = spawn(adbPath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Helper function to process logcat output
            const processLogcatOutput = async (data: Buffer) => {
                if (this.isPaused) {
                    return;
                }

                const text = data.toString();
                const lines = text.split('\n');

                for (const line of lines) {
                    if (!line.trim()) {
                        continue;
                    }

                    const logLine = parseLogcatLine(line);
                    if (logLine) {
                        // Enrich with package name if PID is available
                        if (logLine.pid && !logLine.packageName) {
                            try {
                                const packageName = await this.getPackageNameForPid(deviceId, logLine.pid);
                                if (packageName) {
                                    logLine.packageName = packageName;
                                }
                            } catch {
                                // Ignore errors, continue without package name
                            }
                        }

                        // Add to buffer
                        this.buffer.push(logLine);
                        if (this.buffer.length > this.maxBufferSize) {
                            this.buffer.shift(); // Remove oldest
                        }

                        // Apply filters (check package name after enrichment)
                        if (this.shouldShowLog(logLine, filter)) {
                            onLog(logLine);
                        }
                    }
                }
            };

            // Logcat output can come from both stdout and stderr
            this.logcatProcess.stdout?.on('data', (data: Buffer) => {
                processLogcatOutput(data).catch(err => {
                    console.error(`[Logcat] Error processing stdout: ${err}`);
                });
            });

            this.logcatProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                
                // Check for error messages
                if (text.includes('waiting for device')) {
                    // Device not ready yet, but don't error
                    return;
                }
                
                // Some logcat output goes to stderr, so process it as logs
                if (!text.includes('error') && !text.includes('Error') && !text.includes('ERROR')) {
                    processLogcatOutput(data).catch(err => {
                        console.error(`[Logcat] Error processing stderr: ${err}`);
                    });
                } else {
                    console.error(`[Logcat] stderr: ${text}`);
                }
            });

            this.logcatProcess.on('error', (error) => {
                reject(new Error(`Failed to start logcat: ${error.message}`));
            });

            this.logcatProcess.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.log(`[Logcat] Process exited with code ${code}`);
                }
                this.logcatProcess = null;
            });

            // Give it a moment to start
            setTimeout(() => {
                resolve();
            }, 500);
        });
    }

    /**
     * Stop logcat streaming
     */
    public stop(): void {
        if (this.logcatProcess) {
            this.logcatProcess.kill();
            this.logcatProcess = null;
        }
        this.isPaused = false;
    }

    /**
     * Pause logcat streaming
     */
    public pause(): void {
        this.isPaused = true;
    }

    /**
     * Resume logcat streaming
     */
    public resume(): void {
        this.isPaused = false;
    }

    /**
     * Check if logcat is paused
     */
    public getPaused(): boolean {
        return this.isPaused;
    }

    /**
     * Check if logcat is running
     */
    public isRunning(): boolean {
        return this.logcatProcess !== null;
    }

    /**
     * Clear buffer
     */
    public clearBuffer(): void {
        this.buffer = [];
    }

    /**
     * Get buffered logs
     */
    public getBufferedLogs(): LogcatLine[] {
        return [...this.buffer];
    }

    /**
     * Check if log should be shown based on filter
     */
    private shouldShowLog(logLine: LogcatLine, filter: LogcatFilter): boolean {
        // Filter by package name (most important filter)
        if (filter.packageName) {
            // First check if PID matches (if we found PID for the package)
            if (filter.pid) {
                if (logLine.pid !== filter.pid) {
                    return false;
                }
            } else {
                // If no PID found, check package name directly
                if (logLine.packageName) {
                    if (logLine.packageName !== filter.packageName) {
                        return false;
                    }
                } else {
                    // If we don't have package name yet, allow it through
                    // It will be enriched later and filtered on next log
                    // For now, we can't filter it out
                }
            }
        }

        // Filter by log level (show only this level and above)
        if (filter.level) {
            const levelOrder = [LogLevel.VERBOSE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
            const filterIndex = levelOrder.indexOf(filter.level);
            const logIndex = levelOrder.indexOf(logLine.level);
            if (logIndex < filterIndex) {
                return false;
            }
        }

        // Filter by tag
        if (filter.tag && !logLine.tag.includes(filter.tag)) {
            return false;
        }

        // Filter by PID (if specified directly, not from package)
        if (filter.pid && !filter.packageName && logLine.pid !== filter.pid) {
            return false;
        }

        return true;
    }
}

