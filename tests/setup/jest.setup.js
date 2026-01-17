"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Jest setup file.
 * Runs before all tests to configure the test environment.
 */
require("reflect-metadata"); // Required for tsyringe decorators
// Mock VS Code API
jest.mock('vscode', () => {
    const mockWorkspace = {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
        workspaceFolders: [],
    };
    const mockWindow = {
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showQuickPick: jest.fn(),
        showInputBox: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            append: jest.fn(),
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
        })),
    };
    const mockCommands = {
        executeCommand: jest.fn(),
        registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    };
    return {
        workspace: mockWorkspace,
        window: mockWindow,
        commands: mockCommands,
        Uri: {
            file: jest.fn((path) => ({ fsPath: path })),
        },
        ConfigurationTarget: {
            Global: 1,
            Workspace: 2,
            WorkspaceFolder: 3,
        },
        Disposable: jest.fn(),
        EventEmitter: jest.fn(() => ({
            event: jest.fn(),
            fire: jest.fn(),
            dispose: jest.fn(),
        })),
    };
});
//# sourceMappingURL=jest.setup.js.map