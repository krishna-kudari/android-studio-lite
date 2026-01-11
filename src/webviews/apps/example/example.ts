import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ASlElement } from '../shared/components/element.js';
import { elementBase, scrollableBase } from '../shared/components/styles/base.css.js';
import '../shared/components/button.js';
import '../shared/components/dropdown.js';
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

@customElement('asl-example-app')
export class ASlExampleApp extends ASlElement {
    static override styles = [
        elementBase,
        scrollableBase,
        css`
			:host {
				display: block;
				width: 100%;
				height: 100vh;
				padding: 0.75rem;
				font-family: var(--vscode-font-family);
				font-size: var(--vscode-font-size);
				color: var(--vscode-foreground);
				background-color: var(--vscode-editor-background);
			}

			.container {
				display: flex;
				flex-direction: column;
				gap: 0.75rem;
				max-width: 600px;
				margin: 0 auto;
			}

			.top-section {
				display: flex;
				flex-direction: column;
				gap: 0.75rem;
				padding: 1rem;
				background-color: var(--vscode-sideBar-background);
				border-radius: 3px;
				border: 1px solid var(--vscode-panel-border);
			}

			.top-section-title {
				font-size: 1.125rem;
				font-weight: 600;
				color: var(--vscode-foreground);
				margin: 0;
			}

			.section-label {
				font-size: 0.875rem;
				font-weight: 500;
				color: var(--vscode-foreground);
				margin: 0;
			}

			.header {
				font-size: 1.25rem;
				font-weight: 600;
				margin-bottom: 0.5rem;
			}

			.section {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				padding: 1rem;
				background-color: var(--vscode-sideBar-background);
				border-radius: 4px;
			}

			.section-title {
				font-size: 1.1rem;
				font-weight: 500;
				margin-bottom: 0.5rem;
			}

			.button-group {
				display: flex;
				gap: 0.5rem;
				flex-wrap: wrap;
			}

			.message {
				padding: 0.5rem;
				background-color: var(--vscode-input-background);
				border: 1px solid var(--vscode-input-border);
				border-radius: 2px;
				min-height: 2rem;
			}
		`,
    ];

    @state()
    private message = 'Click a button to see it in action!';

    @state()
    private clickCount = 0;

    @state()
    private avds: AVD[] = [];

    @state()
    private selectedAVD: string = '';

    private vscode: any;

    private get avdOptions(): DropdownOption[] {
        return this.avds.map(avd => ({
            value: avd.name,
            label: avd.name,
            avd,
        }));
    }

    private handleButtonClick(e: CustomEvent) {
        this.clickCount++;
        const button = e.detail.button as any;
        const label = button.label || button.textContent?.trim() || 'Button';
        this.message = `${label} clicked! (Total clicks: ${this.clickCount})`;
    }

    private handleAVDChange(e: CustomEvent) {
        const { value } = e.detail;
        this.selectedAVD = value;
        if (this.vscode) {
            this.vscode.postMessage({
                type: 'select-avd',
                params: { avdName: value },
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
                }
                break;
        }
    };

    override connectedCallback() {
        super.connectedCallback();
        this.addEventListener('button-click', this.handleButtonClick as EventListener);
        this.addEventListener('change', this.handleAVDChange as EventListener);

        // Initialize VS Code API
        if (typeof (window as any).acquireVsCodeApi !== 'undefined') {
            this.vscode = (window as any).acquireVsCodeApi();
        }

        // Listen for messages from extension
        window.addEventListener('message', this.handleMessage);

        // Request initial AVD list
        if (this.vscode) {
            this.vscode.postMessage({ type: 'refresh-avds' });
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
        this.removeEventListener('button-click', this.handleButtonClick as EventListener);
        this.removeEventListener('change', this.handleAVDChange as EventListener);
        window.removeEventListener('message', this.handleMessage);
    }

    override render() {
        return html`
			<div class="container scrollable">
				<div class="top-section">
					<h2 class="top-section-title">Android Studio Lite</h2>
					<div class="section-label">Select AVD</div>
					<asl-dropdown
						.options=${this.avdOptions}
						.value=${this.selectedAVD}
						placeholder="No AVDs available"
						@change=${this.handleAVDChange}
					></asl-dropdown>
				</div>

				<div class="header">Example Webview</div>

				<div class="section">
					<div class="section-title">Button Component Examples</div>
					<div class="button-group">
						<asl-button label="Primary Button" @button-click=${this.handleButtonClick}></asl-button>
						<asl-button
							variant="secondary"
							label="Secondary Button"
							@button-click=${this.handleButtonClick}
						></asl-button>
						<asl-button variant="icon" icon="⚙️" aria-label="Settings" @button-click=${this.handleButtonClick}></asl-button>
						<asl-button label="Disabled" disabled @button-click=${this.handleButtonClick}></asl-button>
					</div>
				</div>

				<div class="section">
					<div class="section-title">Message</div>
					<div class="message">${this.message}</div>
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
            const app = document.createElement('asl-example-app');
            document.body.appendChild(app);
        });
    } else {
        const app = document.createElement('asl-example-app');
        document.body.appendChild(app);
    }
}
