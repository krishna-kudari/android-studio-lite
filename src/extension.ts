import * as vscode from 'vscode';
import { ViewColumn } from 'vscode';
import { AVDTreeView } from './ui/AVDTreeView';
import { BuildVariantTreeView } from './ui/BuildVariantTreeView';
import { AVDDropdownViewProvider } from './ui/AVDDropdownView';
import { Manager, ConfigItem } from './core';
import { subscribe } from './module/';
import { WebviewsController } from './webviews/webviewsController';
import { ExampleWebviewProvider } from './webviews/exampleProvider';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Initialize Manager (core singleton)
	const manager = Manager.getInstance();
	await manager.android.initCheck();

	const avdDropdownProvider = new AVDDropdownViewProvider(context, manager);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			AVDDropdownViewProvider.viewType,
			avdDropdownProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	//avd manager
	const avdTreeView = new AVDTreeView(context, manager);
	avdTreeView.setDropdownProvider(avdDropdownProvider);
	console.log("avd loaded");

	//build variant manager
	new BuildVariantTreeView(context, manager);
	console.log("build variant loaded");

	// Initialize webviews controller
	const webviewsController = new WebviewsController(context);
	context.subscriptions.push(webviewsController);

	// Register example webview panel
	const exampleWebview = webviewsController.registerWebviewPanel(
		{
			id: 'android-studio-lite.example',
			fileName: 'example.html',
			iconPath: 'assets/android_studio_alt_macos_bigsur_icon_190395.png',
			title: 'Example Webview',
			contextKeyPrefix: 'android-studio-lite:webview:example',
			column: ViewColumn.Beside,
		},
		async (host) => new ExampleWebviewProvider(host),
	);
	context.subscriptions.push(exampleWebview);

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
		vscode.commands.registerCommand('android-studio-lite.showExampleWebview', async () => {
			await exampleWebview.show();
		}),

	]);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
