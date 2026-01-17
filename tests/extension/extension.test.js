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
/**
 * VS Code extension tests.
 * These tests run in the VS Code extension host environment.
 */
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
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
            assert.ok(commands.includes(command), `Command ${command} should be registered`);
        }
    });
});
//# sourceMappingURL=extension.test.js.map