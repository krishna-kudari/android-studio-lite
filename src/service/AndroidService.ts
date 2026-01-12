import { Manager, ConfigItem, ConfigScope } from "../core";
import { Service } from "./Service";
import { MsgType, showQuickPick, showMsg, showTargetOfSettingsSelectionMsg, showYesNoMsg } from '../module/ui';
import { checkExecutable, checkPathExists } from "../module/util";
import { commands, env, OpenDialogOptions, QuickPickItem, Uri, window, ProgressLocation } from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Platform } from "../module/platform";
import { execWithMsg } from "../module/cmd";
import { AndroidSdkDetector, SetupIssue } from "../utils/androidSdkDetector";
import { SdkInstallerService } from "./SdkInstallerService";

export class AndroidService extends Service {
    private sdkInstaller: SdkInstallerService;

    constructor(protected manager: Manager) {
        super(manager);
        this.sdkInstaller = new SdkInstallerService(manager);
    }

    public async initCheck() {
        this.manager.output.append("Config Checking start 👓 ... ");
        let configChanged = false;
        let mayFail = false;

        this.manager.output.show();

        let config = this.getConfig();
        let sdkPathLookup = this.lookupSDKPath();

        // Try auto-detection if SDK path is not found
        if (sdkPathLookup !== 0) {
            this.manager.output.append("SDK Root Path not found. Attempting auto-detection...");
            const detectedSdkPath = AndroidSdkDetector.detectSdkPath();

            if (detectedSdkPath) {
                this.manager.output.append(`Auto-detected SDK path: ${detectedSdkPath}`);
                const result = await showMsg(
                    MsgType.info,
                    `Found Android SDK at: ${detectedSdkPath}\n\nWould you like to use this path?`,
                    {},
                    "Use Detected Path",
                    "Select Manually",
                    "Cancel"
                );

                if (result === "Use Detected Path") {
                    const target = await showTargetOfSettingsSelectionMsg();
                    if (target !== "Cancel") {
                        const scope = target === "Global" ? ConfigScope.global :
                            target === "Workspace (Folder)" ? ConfigScope.folder :
                                ConfigScope.globalnfolder;
                        await this.manager.setConfig(ConfigItem.sdkPath, detectedSdkPath, scope);
                        configChanged = true;
                        config = this.getConfig();
                    }
                } else if (result === "Select Manually") {
                    let newpath = await this.updatePathDiag("dir", ConfigItem.sdkPath, "Please select the Android SDK Root Path", "Android SDK Root path updated!", "Android SDK path not specified!");
                    if (newpath !== "") {
                        configChanged = true;
                        config = this.getConfig();
                    }
                } else {
                    // User cancelled, show setup instructions
                    await this.showSetupInstructions('missing_sdk');
                    return;
                }
            } else {
                // No SDK found, show setup instructions
                const result = await showMsg(
                    MsgType.warning,
                    "Android SDK not found!\n\nWould you like to see setup instructions?",
                    {},
                    "Show Setup Instructions",
                    "Select SDK Path Manually",
                    "Cancel"
                );

                if (result === "Show Setup Instructions") {
                    await this.showSetupInstructions('missing_sdk');
                    return;
                } else if (result === "Select SDK Path Manually") {
                    let newpath = await this.updatePathDiag("dir", ConfigItem.sdkPath, "Please select the Android SDK Root Path", "Android SDK Root path updated!", "Android SDK path not specified!");
                    if (newpath !== "") {
                        configChanged = true;
                        config = this.getConfig();
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            }
        }

        config = this.getConfig();

        // Analyze SDK and identify issues
        if (config.sdkPath !== "") {
            const sdkInfo = AndroidSdkDetector.analyzeSdk(config.sdkPath);
            const issues = AndroidSdkDetector.identifyIssues(sdkInfo);

            this.manager.output.append("SDK Root Path:            " + config.sdkPath);
            this.manager.output.append("SDK Command-Line Tools:   " + config.cmdPath);
            this.manager.output.append("SDK Build Tools:          " + config.buildToolPath);
            this.manager.output.append("SDK Platform Tools:       " + config.platformToolsPath);
            this.manager.output.append("Emulator Path:            " + config.emuPath);

            // Check each component
            if (sdkInfo.hasCommandLineTools) {
                this.manager.output.append(" -- check OK 👍");
            } else {
                this.manager.output.append(" -- ⚠️  Command-Line Tools not found");
                mayFail = true;
            }
            this.manager.output.append("\n");

            // Show issues and offer auto-installation
            const missingComponents: SetupIssue[] = [];
            for (const issue of issues) {
                if (issue.severity === 'error' || issue.type === 'missing_cmdline_tools') {
                    missingComponents.push(issue);
                    this.manager.output.append(`\n⚠️  ${issue.message}`);
                }
            }

            // Offer auto-installation for critical missing components
            if (missingComponents.length > 0) {
                const criticalIssues = missingComponents.filter(
                    i => i.type === 'missing_cmdline_tools' || i.type === 'missing_sdk'
                );

                if (criticalIssues.length > 0 && sdkInfo.sdkPath && fs.existsSync(sdkInfo.sdkPath)) {
                    const result = await showMsg(
                        MsgType.warning,
                        `Missing required Android SDK components detected.\n\nWould you like to install them automatically?`,
                        {},
                        "Install Automatically",
                        "Show Instructions",
                        "Skip"
                    );

                    if (result === "Install Automatically") {
                        try {
                            const installSuccess = await window.withProgress(
                                {
                                    location: ProgressLocation.Notification,
                                    title: "Installing Android SDK Components",
                                    cancellable: false,
                                },
                                async (progress) => {
                                    // Re-analyze SDK to get current state
                                    const currentSdkInfo = AndroidSdkDetector.analyzeSdk(sdkInfo.sdkPath);
                                    return await this.sdkInstaller.autoInstallMissingComponents(
                                        currentSdkInfo,
                                        progress
                                    );
                                }
                            );

                            if (installSuccess) {
                                // Re-check configuration after installation
                                config = this.getConfig();
                                const updatedSdkInfo = AndroidSdkDetector.analyzeSdk(config.sdkPath);

                                // Update status in output
                                this.manager.output.append("\n📦 Installation Summary:");
                                if (updatedSdkInfo.hasCommandLineTools) {
                                    this.manager.output.append("✅ Command-Line Tools: Installed");
                                }
                                if (updatedSdkInfo.hasPlatformTools) {
                                    this.manager.output.append("✅ Platform Tools: Installed");
                                }
                                if (updatedSdkInfo.hasBuildTools) {
                                    this.manager.output.append("✅ Build Tools: Installed");
                                }
                                if (updatedSdkInfo.hasEmulator) {
                                    this.manager.output.append("✅ Emulator: Installed");
                                }

                                // Re-run AVD Manager check
                                if (updatedSdkInfo.hasCommandLineTools) {
                                    this.manager.output.append("\nVerifying AVD Manager...");
                                    try {
                                        await this.checkAVDManager();
                                        this.manager.output.append("AVD Manager: ✅ Working");
                                        mayFail = false; // Update status since we fixed it
                                    } catch (e) {
                                        // Still might fail, but less likely
                                    }
                                }
                            } else {
                                // Show instructions as fallback
                                const cmdlineIssue = missingComponents.find(i => i.type === 'missing_cmdline_tools');
                                if (cmdlineIssue) {
                                    await this.showSetupInstructions('missing_cmdline_tools', cmdlineIssue.solution);
                                }
                            }
                        } catch (error: any) {
                            showMsg(
                                MsgType.error,
                                `Auto-installation failed: ${error.message}\n\nPlease try manual installation or check the output panel for details.`,
                                {}
                            );
                            this.manager.output.append(`\n[ERR] Installation error: ${error.message}`, "error");
                            // Show instructions as fallback
                            const cmdlineIssue = missingComponents.find(i => i.type === 'missing_cmdline_tools');
                            if (cmdlineIssue) {
                                await this.showSetupInstructions('missing_cmdline_tools', cmdlineIssue.solution);
                            }
                        }
                    } else if (result === "Show Instructions") {
                        const cmdlineIssue = missingComponents.find(i => i.type === 'missing_cmdline_tools');
                        if (cmdlineIssue) {
                            await this.showSetupInstructions('missing_cmdline_tools', cmdlineIssue.solution);
                        }
                    }
                } else {
                    // Show instructions for non-critical issues or when SDK path is missing
                    for (const issue of missingComponents) {
                        const result = await showMsg(
                            MsgType.warning,
                            `${issue.message}\n\nWould you like to see installation instructions?`,
                            {},
                            "Show Instructions",
                            "Skip"
                        );
                        if (result === "Show Instructions") {
                            await this.showSetupInstructions(issue.type, issue.solution);
                        }
                    }
                }
            }
        } else {
            showMsg(MsgType.info, "Android SDK path not specified / fail!😓");
            return;
        }

        //check avd
        this.manager.output.append("AVD Manager path:         " + this.getAVDManager());
        await this.checkAVDManager().then((o) => {
            this.manager.output.append(" -- check OK 👍");
        }).catch(async (e) => {
            const config = this.getConfig();
            const sdkInfo = AndroidSdkDetector.analyzeSdk(config.sdkPath);

            if (!sdkInfo.hasCommandLineTools) {
                this.manager.output.append(" -- ⚠️  Command-Line Tools required for AVD Manager");
                const result = await showMsg(
                    MsgType.warning,
                    "AVD Manager requires Command-Line Tools.\n\nWould you like to see installation instructions?",
                    {},
                    "Show Instructions",
                    "Skip"
                );
                if (result === "Show Instructions") {
                    const issues = AndroidSdkDetector.identifyIssues(sdkInfo);
                    const cmdlineIssue = issues.find(i => i.type === 'missing_cmdline_tools');
                    if (cmdlineIssue) {
                        await this.showSetupInstructions('missing_cmdline_tools', cmdlineIssue.solution);
                    }
                }
            } else {
                let result = await showMsg(MsgType.warning, "AVD Manager Not found/Not exist!", {}, "Update Path", "Skip");
                if (result === "Update Path") {
                    let newpath = await this.updatePathDiag("file", ConfigItem.executable, "Please select the AVDManager Path", "AVDManager updated!", "AVDManager path not specified!");
                    if (newpath !== "") {
                        configChanged = true;
                        this.manager.output.append("AVD Manager path:         " + newpath);
                    } else {
                        mayFail = true;
                        this.manager.output.append("AVDManager path not specified!");
                    }
                }
            }
            mayFail = true;
        });

        let avdHome = config.avdHome;
        if (config.avdHome === ""){
            avdHome = "System Default";
        }
        this.manager.output.append("AVD Home path:            " + avdHome);
        this.manager.output.append("");

        //check emu
        this.manager.output.append("Emulator path:            " + this.getEmulator());
        await this.checkEmulator().then((o) => {
            this.manager.output.append(" -- check OK 👍");
        }).catch(async (e) => {
            let result = await showMsg(MsgType.warning, "Emulator Not found/Not exist!", {}, "Update Emulator Path", "Skip");
            if (result === "Update Emulator Path") {
                let newpath = await this.updatePathDiag("file", ConfigItem.emulator, "Please select the Emulator Path", "Emulator path updated!", "Emulator path not specified!");
                if (newpath !== "") {
                    configChanged = true;
                    this.manager.output.append("Emulator path:            " + newpath);
                } else {
                    mayFail = true;
                    this.manager.output.append("Emulator path not specified / fail!😓");
                }
            } else {
                this.manager.output.append("Emulator path not specified / fail!😓");
                mayFail = true;
            }
        });

        if (configChanged) {
            let result = await showYesNoMsg(MsgType.warning, "Reload window to take effect");
            if (result === "Yes") {
                commands.executeCommand('workbench.action.reloadWindow');
            }
        } else {
            if (mayFail) {
                this.manager.output.append("\n⚠️  Some configuration issues detected. Some features may not work correctly.");
                this.manager.output.append("Please check the setup instructions above or use the command palette:");
                this.manager.output.append("  - Android Studio Lite: Update SDK Root Path");
                this.manager.output.append("  - Android Studio Lite: Setup AVD Manager");
            } else {
                this.manager.output.append("\n✅ Everything looks good! 😎");
            }
        }

        this.manager.output.show();
    }

    private async showSetupInstructions(issueType: string, customSolution?: string) {
        const solution = customSolution || this.getDefaultSolution(issueType);

        // Convert markdown to HTML (simple conversion)
        let html = solution
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\n/g, '<br>');

        const doc = window.createWebviewPanel(
            'androidStudioLiteSetup',
            'Android Studio Lite - Setup Instructions',
            { viewColumn: 1, preserveFocus: false },
            { enableScripts: false }
        );

        doc.webview.html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.6;
        }
        pre {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        h1, h2, h3 {
            color: var(--vscode-textLink-foreground);
            margin-top: 20px;
        }
        h1 {
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        strong {
            color: var(--vscode-textLink-foreground);
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
    }

    private getDefaultSolution(issueType: string): string {
        const config = this.getConfig();
        const sdkInfo = AndroidSdkDetector.analyzeSdk(config.sdkPath);
        const issues = AndroidSdkDetector.identifyIssues(sdkInfo);
        const issue = issues.find(i => i.type === issueType);
        return issue?.solution || "Please refer to the README for setup instructions.";
    }

    public async updatePathDiag(type: string, configkey: string, openDialogTitle: string, successMsg: string, failMsg: string) {
        //1. ask dir
        let options: OpenDialogOptions = {
            openLabel: "Update",
            title: openDialogTitle
        };
        if (type === "dir") {
            options = { canSelectFiles: false, canSelectFolders: true, canSelectMany: false, ...options };
        } else if (type === "file") {
            options = { canSelectFiles: true, canSelectFolders: false, canSelectMany: false, ...options };
        }

        let uri = await window.showOpenDialog(options);

        //2. check path empty or not
        let newpath = (uri && uri[0].fsPath) ?? "";
        let title = failMsg;
        let msgType = MsgType.warning;

        //2b. path valid, save
        if (newpath !== "") {
            title = successMsg;
            msgType = MsgType.info;

            //3. ask scope
            let target = await showTargetOfSettingsSelectionMsg();
            if (target === "Cancel") {
                showMsg(MsgType.info, "Cancelled");
                return Promise.resolve("");
            }
            let scope = ConfigScope.folder;
            if (target === "Global") {
                scope = ConfigScope.global;
            } else if (target === "Both") {
                scope = ConfigScope.globalnfolder;
            }
            await this.manager.setConfig(configkey, newpath, scope);
        }

        showMsg(msgType, title);
        return Promise.resolve(newpath);
    }

    public lookupSDKPath(): number {
        let config = this.getConfig();
        if (config.sdkPath !== "" && checkPathExists(config.sdkPath)) {
            return 0; //SDK path exists
        }
        return -1;
    }

    public getAVDManager() {
        let config = this.getConfig();
        let platform = this.manager.getPlatform();
        let filenames = ["", "avdmanager.bat", "avdmanager",
            "avdManager.bat", "avdManager",
            "AvdManager.bat", "AvdManager",
            "AVDManager.bat", "AVDManager"
        ];
        //exec name
        let exec = platform === Platform.window ? "avdmanager.bat" : "avdmanager";

        //get config exec, replace to exec name
        let avdManager = config.executable ?? "";
        if (filenames.includes(avdManager)) { avdManager = exec; }

        //get alt exec
        let altExecutable = path.join(config.cmdPath, exec);

        if (filenames.includes(avdManager) && checkExecutable(altExecutable)) {
            return altExecutable;
        }
        return avdManager;
    }

    public getSDKManager() {
        let config = this.getConfig();
        let platform = this.manager.getPlatform();

        let filenames = ["", "sdkmanager.bat", "sdkmanager",
            "sdkManager.bat", "sdkManager",
            "SdkManager.bat", "SdkManager",
            "SDKManager.bat", "SDKManager"
        ];

        //exec name
        let exec = platform === Platform.window ? "sdkmanager.bat" : "sdkmanager";

        //get config exec, replace to exec name
        let sdkManager = config.sdkManager ?? "";
        if (filenames.includes(sdkManager)) { sdkManager = exec; }

        //get alt exec
        let altSDKManager = path.join(config.cmdPath, exec);

        if (filenames.includes(sdkManager) && checkExecutable(altSDKManager)) {
            return altSDKManager;
        }
        return sdkManager;
    }

    public getEmulator() {
        let config = this.getConfig();
        let platform = this.manager.getPlatform();

        let filenames = ["", "emulator.exe", "emulator", "Emulator.exe", "Emulator"];

        //exec name
        let exec = platform === Platform.window ? "emulator.exe" : "emulator";

        //get config exec, replace to exec name
        let emulator = config.emulator ?? "";
        if (filenames.includes(emulator)) { emulator = exec; }

        //get alt exec
        let altEmulator = path.join(config.emuPath, exec);

        if (filenames.includes(emulator) && checkExecutable(altEmulator)) {
            return altEmulator;
        }
        return emulator;
    }

    public async checkAVDManager() {
        let exec = this.getAVDManager();
        return execWithMsg(this.manager, false, exec + " list avd");
    }

    public async checkEmulator() {
        let exec = this.getEmulator();
        return execWithMsg(this.manager, false, exec + " -version ");
    }
}
