import { css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { GlElement } from '../shared/components/element.js';
import { elementBase, scrollableBase } from '../shared/components/styles/base.css.js';
import '../shared/components/button.js';

@customElement('gl-example-app')
export class GlExampleApp extends GlElement {
    static override styles = [
        elementBase,
        scrollableBase,
        css`
			:host {
				display: block;
				width: 100%;
				height: 100vh;
				padding: 1rem;
				font-family: var(--vscode-font-family);
				font-size: var(--vscode-font-size);
				color: var(--vscode-foreground);
				background-color: var(--vscode-editor-background);
			}

			.container {
				display: flex;
				flex-direction: column;
				gap: 1rem;
				max-width: 600px;
				margin: 0 auto;
			}

			.header {
				font-size: 1.5rem;
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

    private handleButtonClick(e: CustomEvent) {
        this.clickCount++;
        const button = e.detail.button as any;
        const label = button.label || button.textContent?.trim() || 'Button';
        this.message = `${label} clicked! (Total clicks: ${this.clickCount})`;
    }

    override connectedCallback() {
        super.connectedCallback();
        this.addEventListener('button-click', this.handleButtonClick as EventListener);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('button-click', this.handleButtonClick as EventListener);
    }

    override render() {
        return html`
			<div class="container scrollable">
				<div class="header">Android Studio Lite - Example Webview</div>

				<div class="section">
					<div class="section-title">Button Component Examples</div>
					<div class="button-group">
						<gl-button label="Primary Button" @button-click=${this.handleButtonClick}></gl-button>
						<gl-button
							variant="secondary"
							label="Secondary Button"
							@button-click=${this.handleButtonClick}
						></gl-button>
						<gl-button variant="icon" icon="⚙️" aria-label="Settings" @button-click=${this.handleButtonClick}></gl-button>
						<gl-button label="Disabled" disabled @button-click=${this.handleButtonClick}></gl-button>
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
            const app = document.createElement('gl-example-app');
            document.body.appendChild(app);
        });
    } else {
        const app = document.createElement('gl-example-app');
        document.body.appendChild(app);
    }
}
