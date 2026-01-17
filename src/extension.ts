import 'reflect-metadata'; // Required for tsyringe decorators
import * as vscode from 'vscode';
import { AVDTreeView } from './ui/AVDTreeView';
import { BuildVariantTreeView } from './ui/BuildVariantTreeView';
import { WebviewsController } from './webviews/webviewsController';
import { AVDSelectorProvider } from './webviews/avdSelectorProvider';
import { setupContainer, resolve, TYPES } from './di';
import { ExtensionConfig } from './onboarding/extensionConfig';
import { OnboardingWebviewProvider } from './webviews/apps/onboarding/onboardingProvider';
import { LogcatWebviewProvider } from './webviews/apps/logcat/logcatProvider';
import { CommandRegistry } from './commands/CommandRegistry';
import { LogcatService } from './service/Logcat';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Register AVD Selector webview view using new architecture
	const webviewsController = new WebviewsController(context);
	context.subscriptions.push(webviewsController);

	// seperate webviews registy like commands registry
	const onboardingWebview = webviewsController.registerWebviewPanel(
		{
			id: 'android-studio-lite.onboarding',
			fileName: 'onboarding.html',
			iconPath: 'assets/icon.png',
			title: 'Onboarding',
			contextKeyPrefix: 'android-studio-lite:webview:onboarding',
		},
		async (host) => new OnboardingWebviewProvider(host),
	);

	// Initialize Dependency Injection Container
	// This registers all services and their dependencies
	const container = setupContainer(context);
	console.log('Dependency Injection container initialized');

	// Get services from DI container (preferred approach)
	const configService = container.resolve<import('./config').ConfigService>(TYPES.ConfigService);
	const androidService = container.resolve<import('./service/AndroidService').AndroidService>(TYPES.AndroidService);
	const avdService = container.resolve<import('./service/AVDService').AVDService>(TYPES.AVDService);
	const buildVariantService = container.resolve<import('./service/BuildVariantService').BuildVariantService>(TYPES.BuildVariantService);
	const gradleService = container.resolve<import('./service/GradleService').GradleService>(TYPES.GradleService);
	const output = container.resolve<import('./module/output').Output>(TYPES.Output);

	const extensionConfig = new ExtensionConfig(context);
	if (extensionConfig.isInstall()) {
		// Will be executed after onboarding command is registered
		setTimeout(() => {
			vscode.commands.executeCommand('android-studio-lite.showOnboarding');
		}, 100);
	}

	// Update metadata asynchronously, handle errors gracefully
	try {
		await extensionConfig.updateExtensionMetadata();
	} catch (error) {
		// Log error but don't fail activation
		console.error('Failed to update extension metadata:', error);
	}

	// Initialize Android service check (using DI-resolved service)
	await androidService.initCheck();


	context.subscriptions.push(
		webviewsController.registerWebviewView(
			{
				id: 'android-studio-lite-avd-dropdown',
				fileName: 'avdSelector.html',
				title: 'Android Studio Lite',
			},
			async (host) => new AVDSelectorProvider(host, context, avdService, buildVariantService, gradleService, output, configService),
		)
	);

	// Register Logcat panel webview view
	context.subscriptions.push(
		webviewsController.registerWebviewView(
			{
				id: 'android-studio-lite-logcat',
				fileName: 'logcat.html',
				title: 'Logcat',
			},
			async (host) => new LogcatWebviewProvider(host),
		)
	);

	//avd manager
	const avdTreeView = new AVDTreeView(context, avdService);
	console.log("avd loaded");

	//build variant manager
	new BuildVariantTreeView(context, buildVariantService);
	console.log("build variant loaded");

	// Initialize logcat service using DI
	const logcatService = resolve<LogcatService>(TYPES.LogcatService);

	// Get Command Registry from DI container
	const commandRegistry = resolve<CommandRegistry>(TYPES.CommandRegistry);

	// Register all commands using the new command registry
	CommandRegistry.registerCommands(commandRegistry, context, {
		androidService, // Use DI-resolved AndroidService
		onboardingWebview,
		logcatService,
	});

	// Add command registry disposal to context subscriptions
	context.subscriptions.push(commandRegistry);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
