import * as vscode from 'vscode';
import { AdbService } from './services/adbService';
import { DeviceService } from './services/deviceService';
import { AndroidTreeProvider } from './providers/androidTreeProvider';
import { GradleService } from './services/gradleService';
import { BuildVariantService } from './services/buildVariantService';
import { LogcatProvider } from './providers/logcatProvider';
import { AppStateService } from './services/appStateService';
import { EmulatorService } from './services/emulatorService';
import { selectDeviceCommand } from './commands/selectDevice';
import { refreshDevicesCommand } from './commands/refreshDevices';
import { selectBuildVariantCommand } from './commands/selectBuildVariant';
import { runAppCommand } from './commands/runApp';
import { stopAppCommand } from './commands/stopApp';
import { uninstallAppCommand } from './commands/uninstallApp';
import {
    startLogcatCommand,
    stopLogcatCommand,
    pauseLogcatCommand,
    resumeLogcatCommand,
    clearLogcatCommand,
    setLogLevelCommand
} from './commands/logcatCommands';

let deviceService: DeviceService;
let androidTreeProvider: AndroidTreeProvider;
let buildVariantService: BuildVariantService;
let logcatProvider: LogcatProvider;
let appStateService: AppStateService;
let adbService: AdbService;
let gradleService: GradleService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Android Studio Lite extension is now active!');

    // Initialize ADB service
    adbService = new AdbService(context);

    // Check if ADB is available
    const isAdbAvailable = await adbService.isAvailable();
    if (!isAdbAvailable) {
        vscode.window.showWarningMessage(
            'ADB not found. Please install Android SDK Platform Tools or set "android-studio-lite.adbPath" in settings.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'android-studio-lite.adbPath');
            }
        });
    }

    // Initialize Gradle service
    gradleService = new GradleService(context);

    // Initialize build variant service
    buildVariantService = new BuildVariantService(context);
    // Reload variants to ensure they're detected
    buildVariantService.loadVariants();

    // Initialize app state service
    appStateService = new AppStateService();

    // Initialize emulator service
    const emulatorService = new EmulatorService(context);

    // Initialize device service with a callback that will be set up after tree provider is created
    let treeProviderRefreshCallback: (() => void) | null = null;
    deviceService = new DeviceService(
        adbService,
        context,
        () => {
            // Callback when devices change - will be set after tree provider is created
            treeProviderRefreshCallback?.();
        }
    );

    // Wait for initial device refresh to complete
    await deviceService.refreshDevices();

    // Initialize logcat provider
    logcatProvider = new LogcatProvider(deviceService, adbService, gradleService);

    // Create and register Android tree provider
    androidTreeProvider = new AndroidTreeProvider(
        deviceService,
        buildVariantService,
        appStateService,
        logcatProvider
    );
    
    // Now set up the callback properly so device changes trigger tree refresh
    treeProviderRefreshCallback = () => {
        androidTreeProvider.refresh();
    };
    
    logcatProvider.setStateChangeCallback(() => {
        androidTreeProvider.refresh();
    });
    
    const treeView = vscode.window.createTreeView('androidDevices', {
        treeDataProvider: androidTreeProvider,
        showCollapseAll: false
    });
    
    // Refresh tree provider to show initial state
    androidTreeProvider.refresh();

    // Register commands
    const selectDeviceDisposable = vscode.commands.registerCommand(
        'android-studio-lite.selectDevice',
        async () => {
            await selectDeviceCommand(deviceService, emulatorService);
            androidTreeProvider.refresh();
        }
    );

    const refreshDevicesDisposable = vscode.commands.registerCommand(
        'android-studio-lite.refreshDevices',
        async () => {
            console.log('[Extension] refreshDevices command called');
            await refreshDevicesCommand(deviceService);
            console.log('[Extension] refreshDevices command completed, refreshing tree');
            // Force refresh after a small delay to ensure devices are loaded
            setTimeout(() => {
                androidTreeProvider.refresh();
            }, 100);
            androidTreeProvider.refresh();
        }
    );

    const selectBuildVariantDisposable = vscode.commands.registerCommand(
        'android-studio-lite.selectBuildVariant',
        async () => {
            // Reload variants before showing selector
            buildVariantService.loadVariants();
            await selectBuildVariantCommand(buildVariantService);
            androidTreeProvider.refresh();
        }
    );

    const runAppDisposable = vscode.commands.registerCommand(
        'android-studio-lite.runApp',
        async () => {
            // Check if build is already in progress before setting state
            if (gradleService.isBuildInProgress()) {
                vscode.window.showWarningMessage('A build is already in progress. Please wait for it to complete or stop it first.');
                return;
            }
            appStateService.setState('installing');
            androidTreeProvider.refresh();
            try {
                await runAppCommand(deviceService, gradleService, buildVariantService, adbService, emulatorService);
                appStateService.setState('running');
            } catch (error: any) {
                // Only reset to idle if not cancelled (cancelled is handled by stopApp)
                if (error.message !== 'Build was cancelled') {
                    appStateService.setState('idle');
                }
            }
            androidTreeProvider.refresh();
        }
    );

    const stopAppDisposable = vscode.commands.registerCommand(
        'android-studio-lite.stopApp',
        async () => {
            const wasBuilding = gradleService.isBuildInProgress();
            await stopAppCommand(deviceService, adbService, gradleService);
            // Reset state to idle if we were building or if app was running
            if (wasBuilding || appStateService.getState() !== 'idle') {
                appStateService.setState('idle');
            }
            androidTreeProvider.refresh();
        }
    );

    const uninstallAppDisposable = vscode.commands.registerCommand(
        'android-studio-lite.uninstallApp',
        async () => {
            await uninstallAppCommand(deviceService, adbService, gradleService);
            appStateService.setState('idle');
            androidTreeProvider.refresh();
        }
    );

    // Register logcat commands
    const startLogcatDisposable = vscode.commands.registerCommand(
        'android-studio-lite.startLogcat',
        async () => {
            await startLogcatCommand(logcatProvider);
        }
    );

    const stopLogcatDisposable = vscode.commands.registerCommand(
        'android-studio-lite.stopLogcat',
        async () => {
            await stopLogcatCommand(logcatProvider);
        }
    );

    const pauseLogcatDisposable = vscode.commands.registerCommand(
        'android-studio-lite.pauseLogcat',
        async () => {
            await pauseLogcatCommand(logcatProvider);
        }
    );

    const resumeLogcatDisposable = vscode.commands.registerCommand(
        'android-studio-lite.resumeLogcat',
        async () => {
            await resumeLogcatCommand(logcatProvider);
        }
    );

    const clearLogcatDisposable = vscode.commands.registerCommand(
        'android-studio-lite.clearLogcat',
        async () => {
            await clearLogcatCommand(logcatProvider);
        }
    );

    const setLogLevelDisposable = vscode.commands.registerCommand(
        'android-studio-lite.setLogLevel',
        async () => {
            await setLogLevelCommand(logcatProvider);
        }
    );

    // Register all disposables
    context.subscriptions.push(
        treeView,
        selectDeviceDisposable,
        refreshDevicesDisposable,
        selectBuildVariantDisposable,
        runAppDisposable,
        stopAppDisposable,
        uninstallAppDisposable,
        startLogcatDisposable,
        stopLogcatDisposable,
        pauseLogcatDisposable,
        resumeLogcatDisposable,
        clearLogcatDisposable,
        setLogLevelDisposable,
        {
            dispose: () => {
                deviceService.stopPolling();
                logcatProvider.stop();
            }
        }
    );

    // Initial device refresh (wait for it to complete)
    await deviceService.refreshDevices();
    // Refresh tree provider to show devices
    androidTreeProvider.refresh();
}

export function deactivate() {
    if (deviceService) {
        deviceService.stopPolling();
    }
    if (logcatProvider) {
        logcatProvider.stop();
    }
}
