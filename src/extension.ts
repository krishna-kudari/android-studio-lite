import 'reflect-metadata'; // Required for tsyringe decorators
import * as fs from 'fs';
import * as path from 'path';
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
import { OnboardingWebviewProvider } from './webviews/apps/onboarding/onboardingProvider';
import { WebviewsController } from './webviews/webviewsController';
import { KotlinImportFoldingProvider } from './language/KotlinImportFoldingProvider';

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

const ANDROID_PROJECT_CONTEXT_KEY = 'androidStudioLite.isAndroidProject';

function isAndroidProjectRoot(workspaceRoot: string): boolean {
	const gradlew = path.join(workspaceRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
	if (fs.existsSync(gradlew)) return true;
	if (fs.existsSync(path.join(workspaceRoot, 'settings.gradle'))) return true;
	if (fs.existsSync(path.join(workspaceRoot, 'settings.gradle.kts'))) return true;
	return false;
}

function updateAndroidProjectContext(workspaceRoot: string | undefined): boolean {
	const isAndroid = workspaceRoot ? isAndroidProjectRoot(workspaceRoot) : false;
	vscode.commands.executeCommand('setContext', ANDROID_PROJECT_CONTEXT_KEY, isAndroid);
	return isAndroid;
}

function registerStubViewProviders(context: vscode.ExtensionContext): void {
	const emptyTreeProvider: vscode.TreeDataProvider<unknown> = {
		getChildren: () => [],
		getTreeItem: () => new vscode.TreeItem(''),
	};

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'android-studio-lite-avd-dropdown',
			{
				resolveWebviewView(
					webviewView: vscode.WebviewView,
					_resolveContext: vscode.WebviewViewResolveContext,
					_token: vscode.CancellationToken,
				) {
					webviewView.webview.options = { enableScripts: true, enableCommandUris: true };
					webviewView.webview.html = '<!DOCTYPE html><html><body></body></html>';
				},
			},
		),
	);

	context.subscriptions.push(
		vscode.window.createTreeView('android-studio-lite-build-variant', {
			treeDataProvider: emptyTreeProvider,
			showCollapseAll: true,
		}),
	);

	context.subscriptions.push(
		vscode.window.createTreeView('android-studio-lite-avd', {
			treeDataProvider: emptyTreeProvider,
			showCollapseAll: true,
		}),
	);

	registerStubCommands(context);
}

/** Command IDs contributed in package.json - register stubs when not an Android project so they never "not found". */
const CONTRIBUTED_COMMAND_IDS = [
	'android-studio-lite.showOnboarding',
	'android-studio-lite.runApp',
	'android-studio-lite.stopApp',
	'android-studio-lite.clearData',
	'android-studio-lite.uninstallApp',
	'android-studio-lite.startLogcat',
	'android-studio-lite.stopLogcat',
	'android-studio-lite.pauseLogcat',
	'android-studio-lite.resumeLogcat',
	'android-studio-lite.clearLogcat',
	'android-studio-lite.setLogLevel',
	'android-studio-lite.startEmulator',
	'android-studio-lite.selectEmulator',
	'android-studio-lite.bootEmulator',
	'android-studio-lite.avdlist-refresh',
	'android-studio-lite.avd-create',
	'android-studio-lite.avd-launch',
	'android-studio-lite.avd-edit',
	'android-studio-lite.avd-showdir',
	'android-studio-lite.avd-showconfigfile',
	'android-studio-lite.avd-delete',
	'android-studio-lite.setup-wizard',
	'android-studio-lite.setup-sdkpath',
	'android-studio-lite.setup-avdmanager',
	'android-studio-lite.setup-emulator',
	'android-studio-lite.avd-select',
	'android-studio-lite.buildvariant-select',
	'android-studio-lite.buildvariant-refresh',
] as const;

const NO_PROJECT_MESSAGE = 'Open the root folder of an Android project (containing gradlew or settings.gradle) to use Android Studio Lite.';

function registerStubCommands(context: vscode.ExtensionContext): void {
	for (const id of CONTRIBUTED_COMMAND_IDS) {
		context.subscriptions.push(
			vscode.commands.registerCommand(id, () => {
				void vscode.window.showInformationMessage(NO_PROJECT_MESSAGE);
			}),
		);
	}
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Android Studio Lite extension is now active!');

	// Kotlin import folding: fwcd/kotlin-language-server doesn't return FoldingRangeKind.Imports
	context.subscriptions.push(
		vscode.languages.registerFoldingRangeProvider(
			{ language: 'kotlin' },
			new KotlinImportFoldingProvider(),
		),
	);

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const isAndroid = updateAndroidProjectContext(workspaceRoot);

	context.subscriptions.push(
		vscode.workspace.onDidChangeWorkspaceFolders(() => {
			const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			updateAndroidProjectContext(root);
		}),
	);

	if (!isAndroid) {
		registerStubViewProviders(context);
		return;
	}

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
			webviewHostOptions: { retainContextWhenHidden: true },
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

	return { controller: webviewsController, onboardingWebview, avdSelectorWebview };
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
