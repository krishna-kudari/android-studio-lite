import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { Manager } from '../core';
import { parseLogcatLine, formatLogcatLine } from '../utils/logcatParser';

const WORKSPACE_LAST_RUN_APP = 'android-studio-lite.lastRunApplicationId';
const WORKSPACE_LAST_RUN_SERIAL = 'android-studio-lite.lastRunDeviceSerial';

export class LogcatService {
	private readonly channel: vscode.OutputChannel;
	private logcatProcess: cp.ChildProcess | null = null;

	constructor(
		private readonly manager: Manager,
		private readonly context: vscode.ExtensionContext,
	) {
		this.channel = vscode.window.createOutputChannel('Logcat');
	}

	getOutputChannel(): vscode.OutputChannel {
		return this.channel;
	}

	show(): void {
		this.channel.show(true);
	}

	clear(): void {
		this.channel.clear();
	}

	isRunning(): boolean {
		return this.logcatProcess !== null;
	}

	async start(): Promise<void> {
		if (this.logcatProcess) {
			this.show();
			return;
		}

		const adbPath = this.getAdbPath();
		if (!adbPath) {
			vscode.window.showErrorMessage('ADB not found. Configure Android SDK path in settings.');
			return;
		}

		const applicationId = this.context.workspaceState.get<string>(WORKSPACE_LAST_RUN_APP);
		const serial = this.context.workspaceState.get<string>(WORKSPACE_LAST_RUN_SERIAL);

		if (!applicationId || !serial) {
			this.channel.clear();
			this.channel.appendLine('Run the app first (Build & Run from Android Studio Lite). Logcat will show logs for that app.');
			this.show();
			vscode.window.showInformationMessage('Run the app first, then turn on Logcat to see its logs.');
			return;
		}

		const pid = await this.getPidForPackage(adbPath, serial, applicationId);
		if (!pid) {
			this.channel.clear();
			this.channel.appendLine(`App ${applicationId} is not running on device ${serial}.`);
			this.channel.appendLine('Run the app from Android Studio Lite, then try again.');
			this.show();
			vscode.window.showWarningMessage('App is not running. Run the app first, then start Logcat.');
			return;
		}

		this.channel.clear();
		this.channel.appendLine(`Logcat for ${applicationId} (pid ${pid}) on ${serial}`);
		this.channel.appendLine('');

		const args = ['-s', serial, 'logcat', '--pid=' + pid];
		this.logcatProcess = cp.spawn(adbPath, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const onData = (data: Buffer | string) => {
			const text = Buffer.isBuffer(data) ? data.toString('utf8') : data;
			const lines = text.split(/\r?\n/);
			for (const line of lines) {
				if (!line.trim()) continue;
				const parsed = parseLogcatLine(line);
				const formatted = parsed ? formatLogcatLine(parsed) : line.replace(/\x1b\[[0-9;]*m/g, '');
				this.channel.appendLine(formatted);
			}
		};

		if (this.logcatProcess.stdout) {
			this.logcatProcess.stdout.on('data', onData);
		}
		if (this.logcatProcess.stderr) {
			this.logcatProcess.stderr.on('data', onData);
		}

		this.logcatProcess.on('error', (err) => {
			this.channel.appendLine(`[Logcat error] ${err.message}`);
			this.logcatProcess = null;
		});

		this.logcatProcess.on('exit', (code, signal) => {
			this.logcatProcess = null;
			if (code !== 0 && code !== null && signal !== 'SIGTERM') {
				this.channel.appendLine(`[Logcat stopped] code=${code} signal=${signal}`);
			}
		});

		this.show();
	}

	stop(): void {
		if (this.logcatProcess) {
			this.logcatProcess.kill('SIGTERM');
			this.logcatProcess = null;
		}
	}

	private getAdbPath(): string | null {
		const config = this.manager.getConfig();
		const platformToolsPath = config.platformToolsPath;
		if (!platformToolsPath) return null;
		return path.join(platformToolsPath, process.platform === 'win32' ? 'adb.exe' : 'adb');
	}

	private getPidForPackage(adbPath: string, serial: string, applicationId: string): Promise<string | null> {
		return new Promise((resolve) => {
			const args = ['-s', serial, 'shell', 'pidof', '-s', applicationId];
			cp.execFile(adbPath, args, { timeout: 5000 }, (err, stdout) => {
				if (err) {
					resolve(null);
					return;
				}
				const pid = (stdout || '').trim();
				resolve(pid || null);
			});
		});
	}

	/** Call after a successful run to set the app/device used for logcat. */
	static setLastRun(context: vscode.ExtensionContext, applicationId: string, deviceSerial: string): void {
		context.workspaceState.update(WORKSPACE_LAST_RUN_APP, applicationId);
		context.workspaceState.update(WORKSPACE_LAST_RUN_SERIAL, deviceSerial);
	}
}
