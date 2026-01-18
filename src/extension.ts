import 'reflect-metadata'; // Required for tsyringe decorators
import { DependencyContainer } from 'tsyringe';
import * as vscode from 'vscode';
import { AVDTreeView } from './avd/AVDTreeView';
import { BuildVariantTreeView } from './buildVariant/BuildVariantTreeView';
import { CommandRegistry } from './commands/CommandRegistry';
import { ConfigService } from './config';
import { resolve, setupContainer, TYPES } from './di';
import { EventBus } from './events/EventBus';
import { Output } from './module/output';
import { ExtensionConfig } from './onboarding/extensionConfig';
import { AndroidService } from './service/AndroidService';
import { AVDService } from './service/AVDService';
import { BuildVariantService } from './service/BuildVariantService';
import { GradleService } from './service/GradleService';
import { LogcatService } from './service/Logcat';
import { AVDSelectorProvider } from './webviews/apps/avdSelector/avdSelectorProvider';
import { LogcatWebviewProvider } from './webviews/apps/logcat/logcatProvider';
import { OnboardingWebviewProvider } from './webviews/apps/onboarding/onboardingProvider';
import { WebviewsController } from './webviews/webviewsController';

interface ResolvedServices {
	configService: ConfigService;
	androidService: AndroidService;
	avdService: AVDService;
	buildVariantService: BuildVariantService;
	gradleService: GradleService;
	output: Output;
	logcatService: LogcatService;
	eventBus: EventBus;
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Initialize dependency injection and resolve services
	const container = initializeDependencyInjection(context);
	const services = resolveServices(container);

	// Initialize extension configuration and handle onboarding
	await initializeExtensionConfig(context);

	// Initialize and verify Android service
	await initializeAndroidService(services.androidService);

	// Setup webviews (panels and views)
	const webviewsController = initializeWebviews(context, services);

	// Setup tree views
	const { avdTreeView, buildVariantTreeView } = initializeTreeViews(context, services);

	// Setup commands
	initializeCommands(context, services, webviewsController.onboardingWebview, avdTreeView, buildVariantTreeView);
}

function initializeDependencyInjection(context: vscode.ExtensionContext): DependencyContainer {
	const container = setupContainer(context);
	console.log('Dependency Injection container initialized');
	return container;
}

function resolveServices(container: DependencyContainer): ResolvedServices {
	return {
		configService: container.resolve<ConfigService>(TYPES.ConfigService),
		androidService: container.resolve<AndroidService>(TYPES.AndroidService),
		avdService: container.resolve<AVDService>(TYPES.AVDService),
		buildVariantService: container.resolve<BuildVariantService>(TYPES.BuildVariantService),
		gradleService: container.resolve<GradleService>(TYPES.GradleService),
		output: container.resolve<Output>(TYPES.Output),
		logcatService: resolve<LogcatService>(TYPES.LogcatService),
		eventBus: resolve<EventBus>(TYPES.EventBus),
	};
}

async function initializeExtensionConfig(context: vscode.ExtensionContext): Promise<void> {
	const extensionConfig = new ExtensionConfig(context);

	if (extensionConfig.isInstall()) {
		setTimeout(() => {
			vscode.commands.executeCommand('android-studio-lite.showOnboarding');
		}, 100);
	}

	try {
		await extensionConfig.updateExtensionMetadata();
	} catch (error) {
		console.error('Failed to update extension metadata:', error);
	}
}

async function initializeAndroidService(androidService: AndroidService): Promise<void> {
	await androidService.initCheck();
}

function initializeWebviews(
	context: vscode.ExtensionContext,
	services: ResolvedServices,
): {
	controller: WebviewsController;
	onboardingWebview: any;
	avdSelectorWebview: any;
	logcatPanel: any;
} {
	const webviewsController = new WebviewsController(context);
	context.subscriptions.push(webviewsController);

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

	const avdSelectorWebview = webviewsController.registerWebviewView(
		{
			id: 'android-studio-lite-avd-dropdown',
			fileName: 'avdSelector.html',
			title: 'Android Studio Lite',
		},
		async (host) =>
			new AVDSelectorProvider(
				host,
				context,
				services.avdService,
				services.buildVariantService,
				services.gradleService,
				services.output,
				services.configService,
				services.eventBus,
			),
	);
	context.subscriptions.push(avdSelectorWebview);

	const logcatPanel = webviewsController.registerWebviewView(
		{
			id: 'android-studio-lite-logcat',
			fileName: 'logcat.html',
			title: 'Logcat',
		},
		async (host) => new LogcatWebviewProvider(host),
	);
	context.subscriptions.push(logcatPanel);

	return { controller: webviewsController, onboardingWebview, avdSelectorWebview, logcatPanel };
}

function initializeTreeViews(
	context: vscode.ExtensionContext,
	services: ResolvedServices,
): { avdTreeView: AVDTreeView; buildVariantTreeView: BuildVariantTreeView } {
	const avdTreeView = new AVDTreeView(context, services.avdService);
	console.log('AVD tree view loaded');

	const buildVariantTreeView = new BuildVariantTreeView(context, services.buildVariantService);
	console.log('Build variant tree view loaded');

	return { avdTreeView, buildVariantTreeView };
}

function initializeCommands(
	context: vscode.ExtensionContext,
	services: ResolvedServices,
	onboardingWebview: { show(): Promise<void> },
	avdTreeView: AVDTreeView,
	buildVariantTreeView: BuildVariantTreeView,
): void {
	const commandRegistry = resolve<CommandRegistry>(TYPES.CommandRegistry);
	CommandRegistry.registerCommands(commandRegistry, context, {
		androidService: services.androidService,
		onboardingWebview: onboardingWebview,
		logcatService: services.logcatService,
		avdService: services.avdService,
		treeDataProvider: avdTreeView.provider,
		buildVariantService: services.buildVariantService,
		buildVariantTreeDataProvider: buildVariantTreeView.provider,
	});

	context.subscriptions.push(commandRegistry);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
