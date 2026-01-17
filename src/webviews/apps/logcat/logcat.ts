import { ASlElement } from "../shared/components/element";
import { css, html } from "lit";
import { elementBase } from "../shared/components/styles/base.css.js";
import { customElement, state } from "lit/decorators.js";

@customElement('asl-logcat-app')
export class ASlLogcatApp extends ASlElement {
    @state() private logLines: string[] = [];
    private vscode: any = null;
    private handleMessage: ((event: MessageEvent) => void) | null = null;

    static override styles = [
        elementBase,
        css`
            :host {
                display: block;
                width: 100%;
                height: 100%;
                overflow: hidden;
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-panel-background);
            }

            .logcat-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .logcat-content {
                flex: 1;
                overflow-y: auto;
                padding: 0.5rem;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .logcat-line {
                margin: 0;
                padding: 0;
            }

            .logcat-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--vscode-descriptionForeground);
            }
        `,
    ];

    override render() {
        return html`
            <div class="logcat-container">
                <div class="logcat-content" id="logcat-content">
                    ${this.logLines.length === 0
                        ? html`<div class="logcat-empty">Logcat Panel - Ready. Start logcat to see output.</div>`
                        : this.logLines.map(line => html`<div class="logcat-line">${line}</div>`)
                    }
                </div>
            </div>
        `;
    }

    override updated() {
        // Auto-scroll to bottom when new logs arrive
        const content = this.shadowRoot?.getElementById('logcat-content');
        if (content) {
            content.scrollTop = content.scrollHeight;
        }
    }

    override connectedCallback() {
        super.connectedCallback();

        // Initialize VS Code API
        if (typeof (window as any).acquireVsCodeApi !== 'undefined') {
            this.vscode = (window as any).acquireVsCodeApi();
        }

        // Set up message handler
        this.handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (!message || !message.type) return;

            switch (message.type) {
                case 'logcat-data':
                    const { message: logMessage } = message.params || {};
                    if (logMessage) {
                        if (logMessage === 'clear') {
                            this.logLines = [];
                        } else {
                            // Split by newlines and add each line (keep empty lines for formatting)
                            const lines = logMessage.split('\n');
                            this.logLines = [...this.logLines, ...lines];
                            // Keep only last 10000 lines to prevent memory issues
                            if (this.logLines.length > 10000) {
                                this.logLines = this.logLines.slice(-10000);
                            }
                        }
                        this.requestUpdate();
                    }
                    break;
            }
        };

        // Listen for messages from extension
        window.addEventListener('message', this.handleMessage);

        // Send ready message to extension
        if (this.vscode) {
            this.vscode.postMessage({ type: 'webview/ready' });
        }
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.handleMessage) {
            window.removeEventListener('message', this.handleMessage);
        }
    }
}

// Initialize the app when the module loads
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const app = document.createElement('asl-logcat-app');
            document.body.appendChild(app);
        });
    } else {
        const app = document.createElement('asl-logcat-app');
        document.body.appendChild(app);
    }
}
