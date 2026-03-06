import * as cp from 'child_process';
import * as vscode from 'vscode';

const POLL_INTERVAL_MS = 2000;
const BOOT_TIMEOUT_MS = 120000;
const SETTLE_DELAY_MS = 2000;

export type OutputChannelLike = { appendLine(line: string): void };
export type ProgressLike = vscode.Progress<{ message?: string }>;

export class EmulatorBootService {
    constructor(
        private readonly adbPath: string,
        private readonly emulatorPath: string,
        private readonly outputChannel: OutputChannelLike,
    ) {}

    /**
     * Launch emulator (if not already running) and wait until
     * ADB reports it fully booted. Returns the resolved ADB serial.
     */
    async launchAndWait(
        avdName: string,
        progress: ProgressLike,
        cancellationToken?: vscode.CancellationToken,
    ): Promise<string> {
        // Step 1: Check if already running
        const existing = await this._findSerialForAvd(avdName);
        if (existing) {
            this._log(`${avdName} already running as ${existing}`);
            const booted = await this._isBooted(existing);
            if (booted) {
                this._log(`${existing} already fully booted`);
                return existing;
            }
            this._log(`${existing} found but not fully booted yet — waiting...`);
            return this._waitForBoot(existing, avdName, progress, cancellationToken);
        }

        // Step 2: Fire-and-forget spawn — DO NOT await; process runs until emulator is closed
        this._spawnEmulator(avdName);

        // Step 3: Poll ADB in parallel
        return this._waitForBoot(null, avdName, progress, cancellationToken);
    }

    /**
     * Spawns the emulator detached — never awaited.
     */
    private _spawnEmulator(avdName: string): void {
        this._log(`Spawning: ${this.emulatorPath} @${avdName}`);

        const proc = cp.spawn(this.emulatorPath, [`@${avdName}`], {
            detached: true,
            stdio: 'ignore',
        });

        proc.unref();

        proc.on('error', (err) => {
            this._log(`Emulator spawn error: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to start emulator: ${err.message}`);
        });
    }

    /**
     * Phase 1 — poll adb devices until our AVD serial appears.
     * Phase 2 — poll boot_completed + bootanim on that serial.
     */
    private async _waitForBoot(
        knownSerial: string | null,
        avdName: string,
        progress: ProgressLike,
        cancellationToken?: vscode.CancellationToken,
    ): Promise<string> {
        const start = Date.now();

        let serial = knownSerial;

        if (!serial) {
            progress.report({ message: `Starting ${avdName}...` });
            serial = await this._pollForSerial(avdName, start, progress, cancellationToken);
        }

        await this._pollForBootCompleted(serial, start, progress, cancellationToken);

        progress.report({ message: 'Almost ready...' });
        await this._delay(SETTLE_DELAY_MS);

        this._log(`${serial} fully booted and ready`);
        return serial;
    }

    private _pollForSerial(
        avdName: string,
        start: number,
        progress: ProgressLike,
        cancellationToken?: vscode.CancellationToken,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const timer = setInterval(async () => {
                const elapsed = Math.round((Date.now() - start) / 1000);

                if (cancellationToken?.isCancellationRequested) {
                    clearInterval(timer);
                    reject(new Error('Build was cancelled'));
                    return;
                }
                if (Date.now() - start > BOOT_TIMEOUT_MS) {
                    clearInterval(timer);
                    reject(new Error(`Timed out waiting for ${avdName} to appear in adb devices (${elapsed}s)`));
                    return;
                }

                progress.report({ message: `Waiting for emulator to connect... (${elapsed}s)` });

                try {
                    const serial = await this._findSerialForAvd(avdName);
                    if (serial) {
                        clearInterval(timer);
                        this._log(`Resolved ADB serial: ${serial}`);
                        resolve(serial);
                    }
                } catch {
                    /* adb not ready */
                }
            }, POLL_INTERVAL_MS);
        });
    }

    private _pollForBootCompleted(
        serial: string,
        start: number,
        progress: ProgressLike,
        cancellationToken?: vscode.CancellationToken,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setInterval(async () => {
                const elapsed = Math.round((Date.now() - start) / 1000);

                if (cancellationToken?.isCancellationRequested) {
                    clearInterval(timer);
                    reject(new Error('Build was cancelled'));
                    return;
                }
                if (Date.now() - start > BOOT_TIMEOUT_MS) {
                    clearInterval(timer);
                    reject(new Error(`Emulator ${serial} did not finish booting (${elapsed}s)`));
                    return;
                }

                progress.report({ message: `Emulator booting... (${elapsed}s)` });

                try {
                    const booted = await this._isBooted(serial);
                    if (booted) {
                        clearInterval(timer);
                        resolve();
                    }
                } catch {
                    /* shell not ready yet */
                }
            }, POLL_INTERVAL_MS);
        });
    }

    private async _isBooted(serial: string): Promise<boolean> {
        const [bootCompleted, bootAnim] = await Promise.all([
            this._getProp(serial, 'sys.boot_completed'),
            this._getProp(serial, 'init.svc.bootanim'),
        ]);
        this._log(`${serial} — boot_completed=${bootCompleted} bootanim=${bootAnim}`);
        return bootCompleted === '1' && bootAnim === 'stopped';
    }

    private async _findSerialForAvd(avdName: string): Promise<string | null> {
        const output = await this._exec(`"${this.adbPath}" devices -l`);
        const lines = output.split('\n').filter((l) => /^emulator-\d+/.test(l.trim()));

        for (const line of lines) {
            if (line.includes(`avd_name:${avdName}`)) {
                return line.trim().split(/\s+/)[0];
            }
        }

        for (const line of lines) {
            const serial = line.trim().split(/\s+/)[0];
            if (!serial) continue;
            try {
                const name = await this._exec(`"${this.adbPath}" -s ${serial} emu avd name`);
                if (name.split('\n')[0].trim() === avdName) {
                    return serial;
                }
            } catch {
                /* this emulator not responding yet */
            }
        }

        return null;
    }

    private _getProp(serial: string, prop: string): Promise<string> {
        return this._exec(`"${this.adbPath}" -s ${serial} shell getprop ${prop}`)
            .then((s) => s.trim())
            .catch(() => '');
    }

    private _exec(cmd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(cmd, { timeout: 5000 }, (err, stdout) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stdout ?? '');
            });
        });
    }

    private _delay(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    }

    private _log(msg: string): void {
        this.outputChannel.appendLine(`[EmulatorBoot] ${msg}`);
    }
}
