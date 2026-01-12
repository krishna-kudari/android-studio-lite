import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ASlElement } from './element.js';
import { elementBase } from './styles/base.css.js';

export interface ToggleButtonClickEventDetail {
	button: ASlToggleButton;
	checked: boolean;
}

@customElement('asl-toggle-button')
export class ASlToggleButton extends ASlElement {
	static override styles = [
		elementBase,
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
				height: 22px;
				padding: 0 7px;
				font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Helvetica Neue', sans-serif;
				font-size: 13px;
				font-weight: 400;
				line-height: 16px;
				border: none;
				border-radius: 5px;
				cursor: pointer;
				transition: background-color 0.15s ease, color 0.15s ease;
				user-select: none;
				outline: none;
				position: relative;
				white-space: nowrap;
				background-color: #ffffff;
				color: rgba(0, 0, 0, 0.85);
			}

			/* Toggled state - blue text */
			:host([checked]) button {
				color: #007aff;
				background-color: #ffffff;
			}

			/* Off state - black text (default) */
			button {
				color: rgba(0, 0, 0, 0.85);
				background-color: #ffffff;
			}

			button:hover {
				background-color: #f5f5f5;
			}

			:host([checked]) button:hover {
				background-color: #f5f5f5;
			}

			button:active {
				background-color: #ebebeb;
			}

			button:focus {
				outline: 2px solid #007aff;
				outline-offset: 2px;
			}

			button:disabled {
				cursor: not-allowed;
				background-color: rgba(255, 255, 255, 0.5);
				color: rgba(0, 0, 0, 0.25);
				opacity: 0.5;
			}
		`,
	];

	@property({ type: Boolean, reflect: true })
	checked = false;

	@property({ type: Boolean, reflect: true })
	disabled = false;

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

		this.checked = !this.checked;
		this.emit('toggle-click' as any, { button: this, checked: this.checked });
	}

	override render() {
		return html`
			<button
				?disabled=${this.disabled}
				aria-label=${this.ariaLabel || this.label || ''}
				aria-pressed=${this.checked}
				role="switch"
				@click=${this.handleClick}
			>
				${this.label ? html`<span>${this.label}</span>` : ''}
				<slot></slot>
			</button>
		`;
	}
}
