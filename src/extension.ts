import * as vscode from 'vscode';
import { AVDTreeView } from './ui/AVDTreeView';
import { BuildVariantTreeView } from './ui/BuildVariantTreeView';
import { Manager, ConfigItem } from './core';
import { subscribe } from './module/';
import { WebviewsController } from './webviews/webviewsController';
import { AVDSelectorProvider } from './webviews/avdSelectorProvider';

// Import logcat commands and provider from compiled output
const logcatCommands = require('../out/commands/logcatCommands');
const LogcatProvider = require('../out/providers/logcatProvider').LogcatProvider;
const DeviceService = require('../out/services/deviceService').DeviceService;
const AdbService = require('../out/services/adbService').AdbService;

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Initialize Manager (core singleton)
	const manager = Manager.getInstance();
	await manager.android.initCheck();

	// Register AVD Selector webview view using new architecture
	const webviewsController = new WebviewsController(context);
	context.subscriptions.push(webviewsController);

	context.subscriptions.push(
		webviewsController.registerWebviewView(
			{
				id: 'android-studio-lite-avd-dropdown',
				fileName: 'avdSelector.html',
				title: 'Android Studio Lite',
			},
			async (host) => new AVDSelectorProvider(host, context),
		)
	);

	//avd manager
	const avdTreeView = new AVDTreeView(context, manager);
	console.log("avd loaded");

	//build variant manager
	new BuildVariantTreeView(context, manager);
	console.log("build variant loaded");

	// Initialize logcat services
	let logcatProvider: any = null;
	try {
		const adbService = new AdbService(context);
		// Initialize ADB path asynchronously (it's async but constructor doesn't await)
		await adbService.initializeAdbPath();
		const deviceService = new DeviceService(adbService, context, () => {});
		logcatProvider = new LogcatProvider(deviceService, adbService, manager.gradle);
		console.log("logcat services initialized");
	} catch (error) {
		console.error("Failed to initialize logcat services:", error);
	}

	// Register commands
	subscribe(context, [
		vscode.commands.registerCommand('android-studio-lite.setup-wizard', async () => {
			await manager.android.initCheck();
		}),
		vscode.commands.registerCommand('android-studio-lite.setup-sdkpath', async () => {
			await manager.android.updatePathDiag("dir", ConfigItem.sdkPath, "Please select the Android SDK Root Path", "Android SDK Root path updated!", "Android SDK path not specified!");
		}),
		vscode.commands.registerCommand('android-studio-lite.setup-avdmanager', async () => {
			await manager.android.updatePathDiag("file", ConfigItem.executable, "Please select the AVDManager Path", "AVDManager updated!", "AVDManager path not specified!");
		}),
		vscode.commands.registerCommand('android-studio-lite.setup-sdkmanager', async () => {
			await manager.android.updatePathDiag("file", ConfigItem.sdkManager, "Please select the SDKManager Path", "SDKManager updated!", "SDKManager path not specified!");
		}),
		vscode.commands.registerCommand('android-studio-lite.setup-emulator', async () => {
			await manager.android.updatePathDiag("file", ConfigItem.emulator, "Please select the Emulator Path", "Emulator path updated!", "Emulator path not specified!");
		}),
		// Register logcat commands
		vscode.commands.registerCommand('android-studio-lite.startLogcat', async () => {
			if (!logcatProvider) {
				vscode.window.showErrorMessage('Logcat services not initialized');
				return;
			}

			// Get device service from logcat provider
			const deviceService = (logcatProvider as any).deviceService;
			if (!deviceService) {
				vscode.window.showErrorMessage('Device service not available');
				return;
			}

			// Check if device is selected, if not try to auto-select first available device
			let selectedDevice = deviceService.getSelectedDevice();
			if (!selectedDevice) {
				const devices = deviceService.getDevices();
				const onlineDevices = devices.filter((d: any) => d.status === 'device');

				if (onlineDevices.length === 0) {
					vscode.window.showWarningMessage(
						'No online devices found. Please connect a device or start an emulator first.',
						'OK'
					);
					return;
				}

				// Auto-select first online device
				try {
					await deviceService.selectDevice(onlineDevices[0].id);
					selectedDevice = deviceService.getSelectedDevice();
					if (selectedDevice) {
						vscode.window.showInformationMessage(`Auto-selected device: ${selectedDevice.name || selectedDevice.id}`);
					}
				} catch (error: any) {
					vscode.window.showErrorMessage(`Failed to select device: ${error.message || String(error)}`);
					return;
				}
			}

			// Start logcat
			await logcatCommands.startLogcatCommand(logcatProvider);
		}),
		vscode.commands.registerCommand('android-studio-lite.stopLogcat', async () => {
			if (logcatProvider) {
				logcatCommands.stopLogcatCommand(logcatProvider);
			} else {
				vscode.window.showErrorMessage('Logcat services not initialized');
			}
		}),
		vscode.commands.registerCommand('android-studio-lite.pauseLogcat', async () => {
			if (logcatProvider) {
				logcatCommands.pauseLogcatCommand(logcatProvider);
			} else {
				vscode.window.showErrorMessage('Logcat services not initialized');
			}
		}),
		vscode.commands.registerCommand('android-studio-lite.resumeLogcat', async () => {
			if (logcatProvider) {
				logcatCommands.resumeLogcatCommand(logcatProvider);
			} else {
				vscode.window.showErrorMessage('Logcat services not initialized');
			}
		}),
		vscode.commands.registerCommand('android-studio-lite.clearLogcat', async () => {
			if (logcatProvider) {
				logcatCommands.clearLogcatCommand(logcatProvider);
			} else {
				vscode.window.showErrorMessage('Logcat services not initialized');
			}
		}),
		vscode.commands.registerCommand('android-studio-lite.setLogLevel', async () => {
			if (logcatProvider) {
				await logcatCommands.setLogLevelCommand(logcatProvider);
			} else {
				vscode.window.showErrorMessage('Logcat services not initialized');
			}
		}),
	]);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
