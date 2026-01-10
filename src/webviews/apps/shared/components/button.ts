import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GlElement } from './element.js';

export interface ButtonClickEventDetail {
    button: GlButton;
}

@customElement('gl-button')
export class GlButton extends GlElement {
    static override styles = [
        css`
			:host {
				display: inline-block;
			}

			* {
				box-sizing: border-box;
			}

			button {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 0.4rem;
				padding: 0.4rem 0.8rem;
				font-family: var(--vscode-font-family);
				font-size: var(--vscode-font-size);
				font-weight: 400;
				line-height: 1.4;
				color: var(--vscode-button-foreground);
				background-color: var(--vscode-button-background);
				border: none;
				border-radius: 2px;
				cursor: pointer;
				transition: background-color 0.1s ease;
				user-select: none;
				outline: none;
			}

			button:hover {
				background-color: var(--vscode-button-hoverBackground);
			}

			button:focus {
				outline: 1px solid var(--vscode-focusBorder);
				outline-offset: -1px;
			}

			button:active {
				background-color: var(--vscode-button-hoverBackground);
			}

			button:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			:host([variant='secondary']) button {
				color: var(--vscode-button-secondaryForeground);
				background-color: var(--vscode-button-secondaryBackground);
			}

			:host([variant='secondary']) button:hover {
				background-color: var(--vscode-button-secondaryHoverBackground);
			}

			:host([variant='icon']) button {
				padding: 0.4rem;
				background-color: transparent;
				color: var(--vscode-icon-foreground);
			}

			:host([variant='icon']) button:hover {
				background-color: var(--vscode-toolbar-hoverBackground);
			}

			.icon {
				display: inline-block;
				width: 1em;
				height: 1em;
				flex-shrink: 0;
			}
		`,
    ];

    @property({ type: String, reflect: true })
    variant: 'primary' | 'secondary' | 'icon' = 'primary';

    @property({ type: Boolean, reflect: true })
    disabled = false;

    @property({ type: String })
    icon?: string;

    @property({ type: String })
    label?: string;

    @property({ type: String })
    ariaLabel: string | null = null;

    private handleClick(e: MouseEvent) {
        if (this.disabled) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        this.emit('button-click' as any, { button: this });
    }

    override render() {
        return html`
			<button
				?disabled=${this.disabled}
				aria-label=${this.ariaLabel || this.label || ''}
				@click=${this.handleClick}
			>
				${this.icon ? html`<span class="icon">${this.icon}</span>` : ''}
				${this.label ? html`<span>${this.label}</span>` : ''}
				<slot></slot>
			</button>
		`;
    }
}
