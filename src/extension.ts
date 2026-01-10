import * as vscode from 'vscode';
import { GradleService } from './services/gradleService';
import { BuildVariantService } from './services/buildVariantService';
import { AppStateService } from './services/appStateService';
import { AVDTreeView } from './ui/AVDTreeView';
import { BuildVariantTreeView } from './ui/BuildVariantTreeView';
import { Manager, ConfigItem } from './core';
import { subscribe } from './module/';

let buildVariantService: BuildVariantService;
let appStateService: AppStateService;
let gradleService: GradleService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Android Studio Lite extension is now active!');

    // Initialize Manager (core singleton)
    const manager = Manager.getInstance();
    await manager.android.initCheck();

    //avd manager
	new AVDTreeView(context, manager);
	console.log("avd loaded");

    // Initialize Gradle service
    gradleService = new GradleService(context);

    // Initialize build variant service
    buildVariantService = new BuildVariantService(context, gradleService);

    // Detect variants once during activation using Gradle init script
    // This runs asynchronously and will update variants when complete
    buildVariantService.detectVariants().catch(error => {
        console.error('[Extension] Failed to detect build variants:', error);
        vscode.window.showWarningMessage(
            'Failed to detect Android build variants. Using defaults.',
            'Dismiss'
        );
    });

    // Initialize app state service
    appStateService = new AppStateService();

    // Initialize Build Variant Tree View
    new BuildVariantTreeView(context, buildVariantService);
    console.log("Build Variant loaded");

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
