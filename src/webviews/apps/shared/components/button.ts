import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ASlElement } from './element.js';

export interface ButtonClickEventDetail {
	button: ASlButton;
}

@customElement('asl-button')
export class ASlButton extends ASlElement {
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
				/* macOS button height: 22px, with 13px font and 16px line-height */
				height: 22px;
				padding: 0 7px;
				font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Helvetica Neue', sans-serif;
				font-size: 13px;
				font-weight: 400;
				line-height: 16px;
				border: none;
				border-radius: 5px;
				cursor: pointer;
				transition: opacity 0.15s ease, background-color 0.15s ease;
				user-select: none;
				outline: none;
				position: relative;
				white-space: nowrap;
			}

			/* Primary button - macOS blue with gradient overlay */
			button {
				color: #ffffff;
				background-color: #007aff;
				background-image: linear-gradient(
					to bottom,
					rgba(255, 255, 255, 0.17) 0%,
					rgba(255, 255, 255, 0) 100%
				);
			}

			button:hover {
				background-color: #0051d5;
			}

			button:active {
				background-color: #0040a8;
			}

			button:focus {
				outline: 2px solid #007aff;
				outline-offset: 2px;
			}

			button:disabled {
				cursor: not-allowed;
				background-color: rgba(255, 255, 255, 0.5);
				background-image: none;
				color: rgba(0, 0, 0, 0.25);
			}

			/* Secondary button - white background with dark text */
			:host([variant='secondary']) button {
				color: rgba(0, 0, 0, 0.85);
				background-color: #ffffff;
				background-image: none;
			}

			:host([variant='secondary']) button:hover {
				background-color: #f5f5f5;
			}

			:host([variant='secondary']) button:active {
				background-color: #ebebeb;
			}

			:host([variant='secondary']) button:disabled {
				cursor: not-allowed;
				background-color: rgba(255, 255, 255, 0.5);
				color: rgba(0, 0, 0, 0.25);
			}

			/* Icon button variant */
			:host([variant='icon']) button {
				padding: 0;
				width: 22px;
				height: 22px;
				background-color: transparent;
				background-image: none;
				color: rgba(0, 0, 0, 0.85);
			}

			:host([variant='icon']) button:hover {
				background-color: rgba(0, 0, 0, 0.05);
			}

			:host([variant='icon']) button:active {
				background-color: rgba(0, 0, 0, 0.1);
			}

			:host([variant='icon']) button:disabled {
				cursor: not-allowed;
				background-color: transparent;
				color: rgba(0, 0, 0, 0.25);
				opacity: 0.5;
			}

			.icon {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.icon svg {
				width: 1em;
				height: 1em;
				display: block;
			}

			.icon svg.spinner-icon {
				width: 16px;
				height: 16px;
				animation: spin 0.8s linear infinite;
			}

			@keyframes spin {
				to {
					transform: rotate(360deg);
				}
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

	private isSvgIcon(icon: string): boolean {
		return icon.trim().startsWith('<svg') || icon.includes('<svg');
	}

	override render() {
		return html`
			<button
				?disabled=${this.disabled}
				aria-label=${this.ariaLabel || this.label || ''}
				@click=${this.handleClick}
			>
				${this.icon
				? this.isSvgIcon(this.icon)
					? html`<span class="icon">${unsafeHTML(this.icon)}</span>`
					: html`<span class="icon">${this.icon}</span>`
				: ''}
				${this.label ? html`<span>${this.label}</span>` : ''}
				<slot></slot>
			</button>
		`;
	}
}
