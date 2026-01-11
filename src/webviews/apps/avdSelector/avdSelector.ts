import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ASlElement } from '../shared/components/element.js';
import { elementBase } from '../shared/components/styles/base.css.js';
import '../shared/components/dropdown.js';
import '../shared/components/button.js';
import type { DropdownOption } from '../shared/components/dropdown.js';

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

			.loading-spinner {
				display: inline-block;
				width: 0.875rem;
				height: 0.875rem;
				border: 2px solid var(--vscode-button-foreground);
				border-top-color: transparent;
				border-radius: 50%;
				animation: spin 0.8s linear infinite;
			}

			@keyframes spin {
				to {
					transform: rotate(360deg);
				}
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

    private handleMessage = (event: MessageEvent) => {
        const message = event.data;
        switch (message.type) {
            case 'update-avds':
                const { avds } = message.params || {};
                if (avds) {
                    this.avds = avds;
                    // Select first AVD if none selected
                    if (!this.selectedAVD && avds.length > 0) {
                        this.selectedAVD = avds[0].name;
                    }
                }
                break;
            case 'update-modules':
                const { modules } = message.params || {};
                if (modules) {
                    this.modules = modules;
                    // Select first module if none selected
                    if (!this.selectedModule && modules.length > 0) {
                        this.selectedModule = modules[0].module;
                    }
                }
                break;
            case 'webview/ready':
                // Handle bootstrap data from ready response
                if (message.params && message.params.state) {
                    const state = message.params.state;
                    if (state.avds) {
                        this.avds = state.avds;
                        if (state.selectedAVD) {
                            this.selectedAVD = state.selectedAVD;
                        } else if (this.avds.length > 0) {
                            this.selectedAVD = this.avds[0].name;
                        }
                    }
                    if (state.modules) {
                        this.modules = state.modules;
                        if (state.selectedModule) {
                            this.selectedModule = state.selectedModule;
                        } else if (this.modules.length > 0) {
                            this.selectedModule = this.modules[0].module;
                        }
                    }
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
                if (bootstrap && bootstrap.avds) {
                    this.avds = bootstrap.avds;
                    if (bootstrap.selectedAVD) {
                        this.selectedAVD = bootstrap.selectedAVD;
                    } else if (this.avds.length > 0) {
                        this.selectedAVD = this.avds[0].name;
                    }
                }
                if (bootstrap && bootstrap.modules) {
                    this.modules = bootstrap.modules;
                    if (bootstrap.selectedModule) {
                        this.selectedModule = bootstrap.selectedModule;
                    } else if (this.modules.length > 0) {
                        this.selectedModule = this.modules[0].module;
                    }
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
						icon=${this.isBuilding ? '' : '▶'}
						label=${this.isBuilding ? 'Building...' : 'Run'}
						?disabled=${!this.selectedAVD || !this.selectedModule || this.isBuilding}
						@button-click=${this.handleRunClick}
					>
						${this.isBuilding ? html`<span class="loading-spinner"></span>` : ''}
					</asl-button>
					<asl-button
						variant="secondary"
						icon="⏹"
						label="Cancel"
						?disabled=${!this.buildCancellable}
						@button-click=${this.handleCancelClick}
					></asl-button>
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
