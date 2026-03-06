import * as cp from 'child_process';
import * as vscode from 'vscode';

const POLL_INTERVAL_MS = 2000;
const BOOT_TIMEOUT_MS = 120000;
const SETTLE_DELAY_MS = 1500;

export type OutputChannelLike = { appendLine(line: string): void };
export type ProgressLike = vscode.Progress<{ message?: string; increment?: number }>;

/**
 * Full boot flow:
 *  1. Wait for the emulator to appear in `adb devices` and resolve its ADB serial (e.g. emulator-5554) by AVD name.
 *  2. Wait for sys.boot_completed=1 + init.svc.bootanim=stopped on that serial.
 *  3. Settle delay for package manager.
 *
 * @param avdName AVD name (e.g. "Pixel_2_API_29") — same as used for `emulator @AVD_NAME`.
 * @returns The resolved ADB serial so the caller can use it for install/launch.
 */
export async function waitForEmulatorReady(
    adbPath: string,
    avdName: string,
    outputChannel: OutputChannelLike,
    progress: ProgressLike,
    cancellationToken?: vscode.CancellationToken,
): Promise<string> {
    // Phase 1: find the ADB serial for this AVD
    progress.report({ message: `Waiting for ${avdName} to connect to ADB...` });
    outputChannel.appendLine(`[Emulator] Resolving ADB serial for AVD: ${avdName}`);

    const serial = await resolveAdbSerial(adbPath, avdName, progress, outputChannel, cancellationToken);
    outputChannel.appendLine(`[Emulator] Resolved serial: ${serial}`);

    // Phase 2: wait for full boot on that serial
    await waitForBootCompleted(adbPath, serial, progress, outputChannel, cancellationToken);

    // Phase 3: package manager settle
    progress.report({ message: 'Boot complete. Preparing package manager...' });
    await delay(SETTLE_DELAY_MS);

    return serial;
}

/**
 * Polls `adb devices -l` until an emulator appears whose AVD name matches.
 * Returns its serial (e.g. "emulator-5554").
 *
 * Strategy A: parse avd_name from `adb devices -l` (newer SDK).
 * Strategy B: for each emulator serial, run `adb -s <serial> emu avd name`.
 */
function resolveAdbSerial(
    adbPath: string,
    avdName: string,
    progress: ProgressLike,
    outputChannel: OutputChannelLike,
    cancellationToken?: vscode.CancellationToken,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const poll = setInterval(async () => {
            const elapsed = Math.round((Date.now() - start) / 1000);

            if (cancellationToken?.isCancellationRequested) {
                clearInterval(poll);
                reject(new Error('Build was cancelled'));
                return;
            }
            if (Date.now() - start > BOOT_TIMEOUT_MS) {
                clearInterval(poll);
                reject(new Error(`Timed out waiting for ${avdName} to appear in adb devices`));
                return;
            }

            progress.report({ message: `Waiting for ${avdName} to connect to ADB... (${elapsed}s)` });

            try {
                const serial = await findSerialForAvd(adbPath, avdName);
                if (serial) {
                    clearInterval(poll);
                    resolve(serial);
                }
            } catch {
                // adb not ready yet — keep polling
            }
        }, POLL_INTERVAL_MS);
    });
}

/**
 * Runs `adb devices -l` and returns the serial for the given AVD name.
 * Returns null if not found yet.
 */
async function findSerialForAvd(adbPath: string, avdName: string): Promise<string | null> {
    const devicesOutput = await exec(`"${adbPath}" devices -l`);

    // Strategy A — newer ADB includes avd_name in `devices -l`
    const lines = devicesOutput.split('\n').filter((l) => l.includes('emulator-'));
    for (const line of lines) {
        if (line.includes(`avd_name:${avdName}`) || line.toLowerCase().includes(avdName.toLowerCase())) {
            const serial = line.trim().split(/\s+/)[0];
            if (serial) return serial;
        }
    }

    // Strategy B — fallback: ask each emulator for its AVD name via emu avd name
    const emulatorSerials = devicesOutput
        .split('\n')
        .filter((l) => l.includes('emulator-') && (l.includes('device') || l.includes('offline') || l.includes('connecting')))
        .map((l) => l.trim().split(/\s+/)[0])
        .filter(Boolean);

    for (const serial of emulatorSerials) {
        try {
            const name = await exec(`"${adbPath}" -s ${serial} emu avd name`);
            // Output: "Pixel_2_API_29\nOK" or similar
            const reportedName = name.split('\n')[0].trim();
            if (reportedName === avdName) {
                return serial;
            }
        } catch {
            // This emulator not ready yet
        }
    }

    return null;
}

/**
 * Polls boot_completed + bootanim on the resolved serial.
 */
function waitForBootCompleted(
    adbPath: string,
    serial: string,
    progress: ProgressLike,
    outputChannel: OutputChannelLike,
    cancellationToken?: vscode.CancellationToken,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const poll = setInterval(async () => {
            const elapsed = Math.round((Date.now() - start) / 1000);

            if (cancellationToken?.isCancellationRequested) {
                clearInterval(poll);
                reject(new Error('Build was cancelled'));
                return;
            }
            if (Date.now() - start > BOOT_TIMEOUT_MS) {
                clearInterval(poll);
                reject(new Error(`Emulator ${serial} did not finish booting within ${BOOT_TIMEOUT_MS / 1000}s`));
                return;
            }

            progress.report({ message: `Emulator booting... (${elapsed}s)` });

            try {
                const bootCompleted = await getProp(adbPath, serial, 'sys.boot_completed');
                const bootAnim = await getProp(adbPath, serial, 'init.svc.bootanim');

                outputChannel.appendLine(`[Emulator] ${serial} — boot_completed=${bootCompleted} bootanim=${bootAnim}`);

                if (bootCompleted === '1' && bootAnim === 'stopped') {
                    clearInterval(poll);
                    resolve();
                }
            } catch {
                // Shell not ready yet — keep polling
            }
        }, POLL_INTERVAL_MS);
    });
}

function getProp(adbPath: string, serial: string, prop: string): Promise<string> {
    return exec(`"${adbPath}" -s ${serial} shell getprop ${prop}`).then((s) => s.trim());
}

function exec(cmd: string): Promise<string> {
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

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
