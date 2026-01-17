/**
 * VS Code extension tests.
 * These tests run in the VS Code extension host environment.
 * Uses Mocha's TDD interface (suite/test) as configured in .vscode-test.mjs
 */
import * as assert from 'assert';
import * as vscode from 'vscode';

// Mocha TDD interface types
declare function suite(name: string, fn: () => void): void;
declare function test(name: string, fn: (done?: () => void) => void | Promise<void>): void;

suite('Extension Tests', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('krishna-kudari.android-studio-lite'));
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('krishna-kudari.android-studio-lite');
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive);
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        const expectedCommands = [
            'android-studio-lite.startLogcat',
            'android-studio-lite.stopLogcat',
            'android-studio-lite.setup-wizard',
            'android-studio-lite.showOnboarding',
        ];

        for (const command of expectedCommands) {
            assert.ok(
                commands.includes(command),
                `Command ${command} should be registered`
            );
        }
    });
});
