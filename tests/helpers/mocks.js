"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockExtensionContext = createMockExtensionContext;
exports.createMockConfigService = createMockConfigService;
exports.createMockOutput = createMockOutput;
exports.createMockCache = createMockCache;
exports.resetMocks = resetMocks;
exports.createTestContainer = createTestContainer;
/**
 * Test mocks and helpers for unit tests.
 */
const vscode = __importStar(require("vscode"));
/**
 * Create a mock VS Code ExtensionContext.
 */
function createMockExtensionContext() {
    const subscriptions = [];
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
        environmentVariableCollection: {},
        secrets: {},
        extensionRuntime: 1,
    };
}
/**
 * Create a mock ConfigService.
 */
function createMockConfigService() {
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
function createMockOutput() {
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
function createMockCache() {
    const cache = new Map();
    return {
        get: jest.fn((key) => cache.get(key)),
        set: jest.fn((key, value) => {
            cache.set(key, value);
        }),
        clear: jest.fn(() => cache.clear()),
    };
}
/**
 * Reset all mocks before each test.
 */
function resetMocks() {
    jest.clearAllMocks();
}
/**
 * Create a test DI container with mocked dependencies.
 */
function createTestContainer() {
    const { container } = require('tsyringe');
    container.clearInstances();
    return container;
}
//# sourceMappingURL=mocks.js.map