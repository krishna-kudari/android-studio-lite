/**
 * VS Code extension test configuration.
 * Used by @vscode/test-cli to run extension tests.
 */
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/tests/**/*.test.js',
    mocha: {
        timeout: 60000,
        ui: 'tdd',
    },
});
