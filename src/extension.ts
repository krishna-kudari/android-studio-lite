import * as vscode from 'vscode';
import { AVDTreeView } from './ui/AVDTreeView';
import { BuildVariantTreeView } from './ui/BuildVariantTreeView';
import { Manager, ConfigItem } from './core';
import { subscribe } from './module/';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Initialize Manager (core singleton)
	const manager = Manager.getInstance();
	await manager.android.initCheck();

	//avd manager
	new AVDTreeView(context, manager);
	console.log("avd loaded");

	//build variant manager
	new BuildVariantTreeView(context, manager);
	console.log("build variant loaded");

	// Register commands
	subscribe(context, [
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

	]);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
