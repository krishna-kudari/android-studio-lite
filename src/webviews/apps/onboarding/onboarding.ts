import { ASlElement } from "../shared/components/element";
import { css, html } from "lit";
import { elementBase } from "../shared/components/styles/base.css.js";
import { customElement, state } from "lit/decorators.js";
import type { OnboardingState } from "../../protocol";

@customElement('asl-onboarding-app')
export class ASlOnboardingApp extends ASlElement {
    @state() private state: OnboardingState | null = null;

    static override styles = [
        elementBase,
        css`
            :host {
                display: block;
                width: 100%;
                height: 100%;
                overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                color: var(--vscode-foreground);
                background: linear-gradient(180deg,
                    var(--vscode-editor-background) 0%,
                    var(--vscode-sideBar-background) 100%);
            }

            * {
                box-sizing: border-box;
            }

            .container {
                max-width: 900px;
                margin: 0 auto;
                padding: 3rem 2rem;
            }

            .hero {
                text-align: center;
                margin-bottom: 4rem;
                animation: fadeInUp 0.6s ease-out;
            }

            .hero-title {
                font-size: 3rem;
                font-weight: 700;
                margin: 0 0 1rem 0;
                background: linear-gradient(135deg,
                    var(--vscode-textLink-foreground) 0%,
                    var(--vscode-textLink-foreground) 50%,
                    var(--vscode-button-background) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: -0.02em;
            }

            .hero-subtitle {
                font-size: 1.25rem;
                color: var(--vscode-descriptionForeground);
                margin: 0;
                font-weight: 400;
                opacity: 0.8;
            }

            .section {
                background: var(--vscode-editor-background);
                border-radius: 16px;
                padding: 2.5rem;
                margin-bottom: 2rem;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                border: 1px solid var(--vscode-panel-border);
                animation: fadeInUp 0.6s ease-out;
                animation-fill-mode: both;
            }

            .section:nth-child(2) { animation-delay: 0.1s; }
            .section:nth-child(3) { animation-delay: 0.2s; }
            .section:nth-child(4) { animation-delay: 0.3s; }
            .section:nth-child(5) { animation-delay: 0.4s; }

            .section-title {
                font-size: 1.75rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                color: var(--vscode-foreground);
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .section-description {
                font-size: 1rem;
                color: var(--vscode-descriptionForeground);
                margin: 0 0 1.5rem 0;
                line-height: 1.6;
                opacity: 0.9;
            }

            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 500;
                margin-bottom: 1.5rem;
            }

            .status-badge.success {
                background: rgba(52, 199, 89, 0.15);
                color: #34c759;
                border: 1px solid rgba(52, 199, 89, 0.3);
            }

            .status-badge.warning {
                background: rgba(255, 149, 0, 0.15);
                color: #ff9500;
                border: 1px solid rgba(255, 149, 0, 0.3);
            }

            .status-icon {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: inline-block;
            }

            .status-icon.success {
                background: #34c759;
            }

            .status-icon.warning {
                background: #ff9500;
            }

            .step-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .step-item {
                display: flex;
                gap: 1rem;
                padding: 1.25rem 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }

            .step-item:last-child {
                border-bottom: none;
            }

            .step-number {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
            }

            .step-content {
                flex: 1;
            }

            .step-title {
                font-size: 1rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                color: var(--vscode-foreground);
            }

            .step-description {
                font-size: 0.875rem;
                color: var(--vscode-descriptionForeground);
                margin: 0;
                line-height: 1.6;
                opacity: 0.9;
            }

            .code-block {
                background: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
                font-size: 0.875rem;
                overflow-x: auto;
                color: var(--vscode-textPreformat-foreground);
            }

            .directory-tree {
                background: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 1.5rem;
                margin: 1rem 0;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
                font-size: 0.875rem;
                line-height: 1.8;
                color: var(--vscode-textPreformat-foreground);
            }

            .directory-tree .dir {
                color: var(--vscode-textLink-foreground);
            }

            .directory-tree .file {
                color: var(--vscode-descriptionForeground);
            }

            .link {
                color: var(--vscode-textLink-foreground);
                text-decoration: none;
                font-weight: 500;
            }

            .link:hover {
                text-decoration: underline;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-top: 1.5rem;
            }

            .info-item {
                padding: 1rem;
                background: var(--vscode-sideBar-background);
                border-radius: 8px;
                border: 1px solid var(--vscode-panel-border);
            }

            .info-label {
                font-size: 0.75rem;
                color: var(--vscode-descriptionForeground);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.25rem;
            }

            .info-value {
                font-size: 0.875rem;
                color: var(--vscode-foreground);
                font-weight: 500;
                word-break: break-all;
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (max-width: 768px) {
                .container {
                    padding: 2rem 1rem;
                }

                .hero-title {
                    font-size: 2rem;
                }

                .section {
                    padding: 1.5rem;
                }
            }
        `,
    ];

    override connectedCallback(): void {
        super.connectedCallback();
        this.loadState();
    }

    private loadState(): void {
        const vscode = (window as any).acquireVsCodeApi?.();
        if (vscode) {
            const state = vscode.getState();
            if (state) {
                this.state = state;
            } else {
                // Get initial state from bootstrap (injected by webviewController)
                try {
                    const bootstrapStr = (window as any).bootstrap;
                    if (bootstrapStr) {
                        const bootstrap = typeof bootstrapStr === 'string'
                            ? JSON.parse(atob(bootstrapStr))
                            : bootstrapStr;
                        this.state = bootstrap as OnboardingState;
                        if (vscode.setState) {
                            vscode.setState(this.state);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse bootstrap data', e);
                }
            }
        }
    }

    private getPlatformName(): string {
        if (!this.state) return '';
        switch (this.state.platform) {
            case 'darwin': return 'macOS';
            case 'win32': return 'Windows';
            case 'linux': return 'Linux';
            default: return this.state.platform;
        }
    }

    private getSdkPath(): string {
        if (!this.state) return '';
        switch (this.state.platform) {
            case 'darwin': return '~/Library/Android/sdk';
            case 'win32': return '%LOCALAPPDATA%\\Android\\Sdk';
            case 'linux': return '~/Android/Sdk';
            default: return '';
        }
    }

    private getEnvSetupCommands(): string {
        if (!this.state) return '';
        const sdkPath = this.getSdkPath();
        switch (this.state.platform) {
            case 'darwin':
                return `export ANDROID_HOME=${sdkPath.replace('~', '$HOME')}
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin`;
            case 'win32':
                return `setx ANDROID_HOME "${sdkPath.replace('%LOCALAPPDATA%', '%LOCALAPPDATA%')}"
setx PATH "%PATH%;%ANDROID_HOME%\\platform-tools"
setx PATH "%PATH%;%ANDROID_HOME%\\tools"
setx PATH "%PATH%;%ANDROID_HOME%\\tools\\bin"`;
            case 'linux':
                return `export ANDROID_HOME=${sdkPath.replace('~', '$HOME')}
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin`;
            default:
                return '';
        }
    }

    override render() {
        if (!this.state) {
            return html`<div class="container"><p>Loading...</p></div>`;
        }

        return html`
            <div class="container">
                <div class="hero">
                    <h1 class="hero-title">Welcome to Android Studio Lite</h1>
                    <p class="hero-subtitle">Your Android development companion for VS Code</p>
                </div>

                ${this.state.hasSdk ? this.renderSdkFound() : this.renderSdkNotFound()}

                ${this.renderDirectoryStructure()}
                ${this.renderEnvironmentSetup()}
            </div>
        `;
    }

    private renderSdkFound() {
        const sdkInfo = this.state!.sdkInfo;
        return html`
            <div class="section">
                <h2 class="section-title">
                    <span class="status-icon success"></span>
                    Android SDK Detected
                </h2>
                <div class="status-badge success">
                    <span class="status-icon success"></span>
                    SDK Found at: ${this.state!.sdkPath}
                </div>
                <p class="section-description">
                    Great! Your Android SDK is properly configured. Here's what we found:
                </p>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Command-Line Tools</div>
                        <div class="info-value">${sdkInfo?.hasCommandLineTools ? '✓ Installed' : '✗ Missing'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Platform Tools (ADB)</div>
                        <div class="info-value">${sdkInfo?.hasPlatformTools ? '✓ Installed' : '✗ Missing'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Build Tools</div>
                        <div class="info-value">${sdkInfo?.hasBuildTools ? '✓ Installed' : '✗ Missing'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Emulator</div>
                        <div class="info-value">${sdkInfo?.hasEmulator ? '✓ Installed' : '✗ Missing'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderSdkNotFound() {
        return html`
            <div class="section">
                <h2 class="section-title">
                    <span class="status-icon warning"></span>
                    Android SDK Not Found
                </h2>
                <div class="status-badge warning">
                    <span class="status-icon warning"></span>
                    Setup Required
                </div>
                <p class="section-description">
                    To get started with Android development, you'll need to install the Android SDK.
                    Follow these steps to set it up:
                </p>
                <ol class="step-list">
                    <li class="step-item">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <div class="step-title">Download Android Studio</div>
                            <div class="step-description">
                                Download and install Android Studio from
                                <a href="https://developer.android.com/studio" target="_blank" class="link">developer.android.com/studio</a>
                            </div>
                        </div>
                    </li>
                    <li class="step-item">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <div class="step-title">Install Android SDK</div>
                            <div class="step-description">
                                Open Android Studio → Preferences → Appearance & Behavior → System Settings → Android SDK
                                <br>Copy the "Android SDK Location" path
                            </div>
                        </div>
                    </li>
                    <li class="step-item">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <div class="step-title">Configure in VS Code</div>
                            <div class="step-description">
                                Open Settings (${this.state!.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,'})
                                → Search for "android-studio-lite.sdkPath" → Enter your SDK path
                            </div>
                        </div>
                    </li>
                    <li class="step-item">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <div class="step-title">Set Environment Variables</div>
                            <div class="step-description">
                                See the Environment Setup section below for platform-specific instructions
                            </div>
                        </div>
                    </li>
                </ol>
            </div>
        `;
    }

    private renderDirectoryStructure() {
        return html`
            <div class="section">
                <h2 class="section-title">SDK Directory Structure</h2>
                <p class="section-description">
                    Understanding the Android SDK directory structure helps you navigate and configure your development environment.
                </p>
                <div class="directory-tree">
<span class="dir">android-sdk/</span>
├── <span class="dir">build-tools/</span>          # Build tools (aapt, dx, etc.)
│   └── <span class="dir">34.0.0/</span>         # Version-specific tools
├── <span class="dir">cmdline-tools/</span>       # Command-line tools
│   └── <span class="dir">latest/</span>
│       └── <span class="dir">bin/</span>         # sdkmanager, avdmanager
├── <span class="dir">emulator/</span>            # Android Emulator
│   └── <span class="file">emulator</span>        # Emulator executable
├── <span class="dir">platform-tools/</span>      # Platform tools (ADB, fastboot)
│   ├── <span class="file">adb</span>            # Android Debug Bridge
│   └── <span class="file">fastboot</span>       # Fastboot utility
├── <span class="dir">platforms/</span>           # Android platform SDKs
│   └── <span class="dir">android-34/</span>      # API level 34
├── <span class="dir">sources/</span>             # Android source code
├── <span class="dir">system-images/</span>        # System images for emulators
└── <span class="dir">tools/</span>               # Legacy tools
                </div>
            </div>
        `;
    }

    private renderEnvironmentSetup() {
        const commands = this.getEnvSetupCommands();
        const platformName = this.getPlatformName();

        return html`
            <div class="section">
                <h2 class="section-title">Environment Setup</h2>
                <p class="section-description">
                    Configure your environment variables to use Android SDK tools from the command line.
                </p>
                <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <div class="step-title">${platformName} Configuration</div>
                        <div class="step-description">
                            Add these to your shell configuration file:
                            ${platformName === 'Windows' ? html`
                                <div class="code-block">${commands}</div>
                                <p>Or set via System Properties → Environment Variables</p>
                            ` : html`
                                <div class="code-block"># Add to ~/.zshrc (macOS) or ~/.bashrc (Linux)
${commands}</div>
                                <p>Then run: <code>source ~/.zshrc</code> or <code>source ~/.bashrc</code></p>
                            `}
                        </div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <div class="step-title">Verify Installation</div>
                        <div class="step-description">
                            Open a new terminal and verify:
                            <div class="code-block">adb version
sdkmanager --version</div>
                        </div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <div class="step-title">Restart VS Code</div>
                        <div class="step-description">
                            After setting environment variables, restart VS Code/Cursor to ensure the extension detects the SDK.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize the app when the module loads
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const app = document.createElement('asl-onboarding-app');
            document.body.appendChild(app);
        });
    } else {
        const app = document.createElement('asl-onboarding-app');
        document.body.appendChild(app);
    }
}
