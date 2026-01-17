import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ASlElement } from '../shared/components/element.js';
import { elementBase } from '../shared/components/styles/base.css.js';
import '../shared/components/dropdown.js';
import '../shared/components/button.js';
import '../shared/components/toggle-button.js';
import type { DropdownOption } from '../shared/components/dropdown.js';

const playIcon = `<svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 11.2354V1.06934C0 0.703125 0.090332 0.43457 0.270996 0.263672C0.45166 0.0878906 0.666504 0 0.915527 0C1.13525 0 1.35986 0.0634766 1.58936 0.19043L10.1221 5.17822C10.4248 5.354 10.6348 5.5127 10.752 5.6543C10.874 5.79102 10.9351 5.95703 10.9351 6.15234C10.9351 6.34277 10.874 6.50879 10.752 6.65039C10.6348 6.79199 10.4248 6.95068 10.1221 7.12646L1.58936 12.1143C1.35986 12.2412 1.13525 12.3047 0.915527 12.3047C0.666504 12.3047 0.45166 12.2168 0.270996 12.041C0.090332 11.8652 0 11.5967 0 11.2354Z" fill="white"/>
</svg>`;

const progressSpinnerIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="spinner-icon">
<rect x="7" width="2" height="5" rx="1" fill="white" fill-opacity="0.8"/>
<rect x="12.9497" y="1.63604" width="2" height="5" rx="1" transform="rotate(45 12.9497 1.63604)" fill="white" fill-opacity="0.1"/>
<rect x="16" y="7" width="2" height="5" rx="1" transform="rotate(90 16 7)" fill="white" fill-opacity="0.2"/>
<rect x="14.364" y="12.9497" width="2" height="5" rx="1" transform="rotate(135 14.364 12.9497)" fill="white" fill-opacity="0.3"/>
<rect x="9" y="16" width="2" height="5" rx="1" transform="rotate(180 9 16)" fill="white" fill-opacity="0.4"/>
<rect x="3.05029" y="14.364" width="2" height="5" rx="1" transform="rotate(-135 3.05029 14.364)" fill="white" fill-opacity="0.5"/>
<rect y="9" width="2" height="5" rx="1" transform="rotate(-90 0 9)" fill="white" fill-opacity="0.6"/>
<rect x="1.63599" y="3.05025" width="2" height="5" rx="1" transform="rotate(-45 1.63599 3.05025)" fill="white" fill-opacity="0.7"/>
</svg>`;

interface AVD {
    name: string;
    basedOn: string;
    device: string;
    path: string;
    sdCard: string;
    skin: string;
    tagAbi: string;
    target: string;
}

interface Module {
    module: string;
    type: string;
    variants?: any[];
}

@customElement('asl-avd-selector-app')
export class ASlAVDSelectorApp extends ASlElement {
    static override styles = [
        elementBase,
        css`
			:host {
				display: block;
				width: 100%;
				padding: 0.75rem;
				font-family: var(--vscode-font-family);
				font-size: var(--vscode-font-size);
				color: var(--vscode-foreground);
				background-color: var(--vscode-sideBar-background);
			}

			.container {
				display: flex;
				flex-direction: column;
				gap: 0.75rem;
			}

			.section-title {
				font-size: 0.875rem;
				font-weight: 600;
				color: var(--vscode-foreground);
				margin: 0;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.dropdown-container {
				width: 100%;
			}

			.dropdown-label {
				font-size: 0.75rem;
				font-weight: 500;
				color: var(--vscode-descriptionForeground);
				margin-bottom: 0.25rem;
			}

			.button-group {
				display: flex;
				gap: 0.5rem;
				width: 100%;
				margin-top: 0.5rem;
			}

			.button-group asl-button {
				flex: 1;
			}

			.button-group asl-toggle-button {
				flex: 0 0 auto;
			}
		`,
    ];

    @state()
    private avds: AVD[] = [];

    @state()
    private selectedAVD: string = '';

    @state()
    private modules: Module[] = [];

    @state()
    private selectedModule: string = '';

    @state()
    private isBuilding: boolean = false;

    @state()
    private buildCancellable: boolean = false;

    @state()
    private logcatActive: boolean = false;

    private vscode: any;
    private buildCancellationToken: string | null = null;

    private get avdOptions(): DropdownOption[] {
        return this.avds.map(avd => ({
            value: avd.name,
            label: avd.name,
            avd,
        }));
    }

    private get moduleOptions(): DropdownOption[] {
        return this.modules.map(module => ({
            value: module.module,
            label: module.module,
            module,
        }));
    }

    private applyAVDs(avds: AVD[], selectedAVD?: string) {
        this.avds = avds;
        if (selectedAVD) {
            this.selectedAVD = selectedAVD;
            return;
        }
        if (!this.selectedAVD && avds.length > 0) {
            this.selectedAVD = avds[0].name;
        }
    }

    private applyModules(modules: Module[], selectedModule?: string) {
        this.modules = modules;
        if (selectedModule) {
            this.selectedModule = selectedModule;
            return;
        }
        if (!this.selectedModule && modules.length > 0) {
            this.selectedModule = modules[0].module;
        }
    }

    private applyBootstrapState(state: any) {
        if (state.avds) {
            this.applyAVDs(state.avds, state.selectedAVD);
        }
        if (state.modules) {
            this.applyModules(state.modules, state.selectedModule);
        }
    }

    private handleAVDChange(e: CustomEvent) {
        const { value } = e.detail;
        if (value !== this.selectedAVD) {
            this.selectedAVD = value;
            if (this.vscode) {
                this.vscode.postMessage({
                    type: 'select-avd',
                    params: { avdName: value },
                });
            }
        }
    }

    private handleModuleChange(e: CustomEvent) {
        const { value } = e.detail;
        if (value !== this.selectedModule) {
            this.selectedModule = value;
            if (this.vscode) {
                this.vscode.postMessage({
                    type: 'select-module',
                    params: { moduleName: value },
                });
            }
        }
    }

    private handleRunClick() {
        if (!this.selectedAVD || !this.selectedModule || this.isBuilding) {
            return;
        }

        if (this.vscode) {
            this.isBuilding = true;
            this.buildCancellable = true;
            this.buildCancellationToken = `cancel-${Date.now()}`;

            this.vscode.postMessage({
                type: 'run-app',
                params: {
                    avdName: this.selectedAVD,
                    moduleName: this.selectedModule,
                    cancellationToken: this.buildCancellationToken,
                },
            });
        }
    }

    private handleCancelClick() {
        if (!this.buildCancellable || !this.buildCancellationToken) {
            return;
        }

        if (this.vscode) {
            this.vscode.postMessage({
                type: 'cancel-build',
                params: {
                    cancellationToken: this.buildCancellationToken,
                },
            });
        }
    }

    private handleLogcatToggle(e: CustomEvent) {
        const { checked } = e.detail;
        this.logcatActive = checked;

        if (this.vscode) {
            this.vscode.postMessage({
                type: 'toggle-logcat',
                params: { active: checked },
            });
        }
    }

    private handleMessage = (event: MessageEvent) => {
        const message = event.data;
        switch (message.type) {
            case 'update-avds':
                const { avds, selectedAVD } = message.params || {};
                if (avds) {
                    this.applyAVDs(avds, selectedAVD);
                }
                break;
            case 'update-modules':
                const { modules, selectedModule } = message.params || {};
                if (modules) {
                    this.applyModules(modules, selectedModule);
                }
                break;
            case 'webview/ready':
                // Handle bootstrap data from ready response
                if (message.params && message.params.state) {
                    const state = message.params.state;
                    this.applyBootstrapState(state);
                }
                break;
            case 'build-started':
                this.isBuilding = true;
                this.buildCancellable = true;
                if (message.params?.cancellationToken) {
                    this.buildCancellationToken = message.params.cancellationToken;
                }
                break;
            case 'build-completed':
            case 'build-failed':
            case 'build-cancelled':
                this.isBuilding = false;
                this.buildCancellable = false;
                this.buildCancellationToken = null;
                break;
            case 'logcat-state-changed':
                const { active } = message.params || {};
                if (typeof active === 'boolean') {
                    this.logcatActive = active;
                }
                break;
        }
    };

    override connectedCallback() {
        super.connectedCallback();

        // Initialize VS Code API
        if (typeof (window as any).acquireVsCodeApi !== 'undefined') {
            this.vscode = (window as any).acquireVsCodeApi();
        }

        // Listen for messages from extension
        window.addEventListener('message', this.handleMessage);

        // Request initial AVD list and modules
        if (this.vscode) {
            this.vscode.postMessage({ type: 'refresh-avds' });
            this.vscode.postMessage({ type: 'refresh-modules' });
        }

        // Load bootstrap data if available
        if (typeof (window as any).bootstrap !== 'undefined') {
            try {
                // Bootstrap is a base64 encoded JSON string
                const bootstrapStr = (window as any).bootstrap;
                const bootstrap = typeof bootstrapStr === 'string'
                    ? JSON.parse(atob(bootstrapStr))
                    : bootstrapStr;
                if (bootstrap) {
                    this.applyBootstrapState(bootstrap);
                }
            } catch (e) {
                console.error('Failed to parse bootstrap data:', e);
            }
        }

        // Send ready message to extension
        if (this.vscode) {
            this.vscode.postMessage({ type: 'webview/ready' });
        }
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('message', this.handleMessage);
    }

    override render() {
        return html`
			<div class="container">
				<h2 class="section-title">Android Studio Lite</h2>

				<div class="dropdown-container">
					<div class="dropdown-label">Select AVD</div>
					<asl-dropdown
						.options=${this.avdOptions}
						.value=${this.selectedAVD}
						placeholder="No AVDs available"
						@change=${this.handleAVDChange}
					></asl-dropdown>
				</div>

				<div class="dropdown-container">
					<div class="dropdown-label">Select Module</div>
					<asl-dropdown
						.options=${this.moduleOptions}
						.value=${this.selectedModule}
						placeholder="No modules available"
						@change=${this.handleModuleChange}
					></asl-dropdown>
				</div>

				<div class="button-group">
					<asl-button
						icon=${this.isBuilding ? progressSpinnerIcon : playIcon}
						label=${this.isBuilding ? 'Building...' : 'Run'}
						?disabled=${!this.selectedAVD || !this.selectedModule || this.isBuilding}
						@button-click=${this.handleRunClick}
					></asl-button>
					
					<asl-toggle-button
						label="Logcat"
						?checked=${this.logcatActive}
						@toggle-click=${this.handleLogcatToggle}
					></asl-toggle-button>
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
            const app = document.createElement('asl-avd-selector-app');
            document.body.appendChild(app);
        });
    } else {
        const app = document.createElement('asl-avd-selector-app');
        document.body.appendChild(app);
    }
}
