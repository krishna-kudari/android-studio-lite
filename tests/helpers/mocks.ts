/**
 * Test mocks and helpers for unit tests.
 */
import * as vscode from 'vscode';
import { DependencyContainer } from 'tsyringe';

/**
 * Create a mock VS Code ExtensionContext.
 */
export function createMockExtensionContext(): vscode.ExtensionContext {
    const subscriptions: vscode.Disposable[] = [];

    return {
        subscriptions,
        workspaceState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(() => []),
        },
        globalState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(() => []),
            setKeysForSync: jest.fn(),
        },
        extensionPath: '/mock/extension/path',
        globalStoragePath: '/mock/global/storage',
        workspaceStoragePath: '/mock/workspace/storage',
        storagePath: '/mock/storage',
        globalStorageUri: vscode.Uri.file('/mock/global/storage'),
        workspaceStorageUri: vscode.Uri.file('/mock/workspace/storage'),
        storageUri: vscode.Uri.file('/mock/storage'),
        extensionUri: vscode.Uri.file('/mock/extension'),
        extensionMode: vscode.ExtensionMode.Production,
        extension: {
            id: 'mock-extension-id',
            extensionPath: '/mock/extension/path',
            extensionUri: vscode.Uri.file('/mock/extension'),
            packageJSON: {},
            isActive: true,
            exports: {},
            activate: jest.fn(),
        },
        environmentVariableCollection: {} as any,
        secrets: {} as any,
        extensionRuntime: 1,
    };
}

/**
 * Create a mock ConfigService.
 */
export function createMockConfigService() {
    return {
        getConfig: jest.fn(() => ({
            sdkPath: '/mock/sdk/path',
            avdHome: '/mock/avd/home',
            adbPath: '/mock/adb/path',
            emulatorPath: '/mock/emulator/path',
            emulatorOpt: '',
            cmdVersion: 'latest',
            executable: 'avdmanager',
            sdkManager: 'sdkmanager',
        })),
        get: jest.fn(),
        set: jest.fn(),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
    };
}

/**
 * Create a mock Output channel.
 */
export function createMockOutput() {
    return {
        append: jest.fn(),
        appendLine: jest.fn(),
        clear: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    };
}

/**
 * Create a mock Cache.
 */
export function createMockCache() {
    const cache = new Map<string, any>();
    return {
        get: jest.fn((key: string) => cache.get(key)),
        set: jest.fn((key: string, value: any) => {
            cache.set(key, value);
        }),
        clear: jest.fn(() => cache.clear()),
    };
}

/**
 * Reset all mocks before each test.
 */
export function resetMocks() {
    jest.clearAllMocks();
}

/**
 * Create a test DI container with mocked dependencies.
 */
export function createTestContainer(): DependencyContainer {
    const { container } = require('tsyringe');
    container.clearInstances();
    return container;
}
