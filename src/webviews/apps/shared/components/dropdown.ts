import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ASlElement } from './element.js';
import { elementBase } from './styles/base.css.js';

export interface DropdownOption {
	value: string;
	label: string;
	[key: string]: any;
}

@customElement('asl-dropdown')
export class ASlDropdown extends ASlElement {
	static override styles = [
		elementBase,
		css`
			:host {
				display: inline-block;
				position: relative;
				width: 100%;
				max-width: 300px;
			}

			.dropdown-container {
				position: relative;
				width: 100%;
			}

			/* macOS Pull-Down Button - Dark Theme */
			.dropdown-button {
				display: flex;
				align-items: center;
				justify-content: space-between;
				width: 100%;
				height: 22px;
				padding: 0 7px;
				font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Helvetica Neue', sans-serif;
				font-size: 13px;
				font-weight: 400;
				line-height: 16px;
				color: rgba(255, 255, 255, 0.85);
				background-color: rgba(255, 255, 255, 0.1);
				border: none;
				border-radius: 5px;
				cursor: pointer;
				transition: background-color 0.15s ease;
				user-select: none;
				outline: none;
			}

			.dropdown-button:hover {
				background-color: rgba(255, 255, 255, 0.15);
			}

			.dropdown-button:active {
				background-color: rgba(255, 255, 255, 0.2);
			}

			.dropdown-button:focus {
				outline: 2px solid #007aff;
				outline-offset: 2px;
			}

			.dropdown-button[disabled] {
				cursor: not-allowed;
				background-color: rgba(255, 255, 255, 0.05);
				color: rgba(255, 255, 255, 0.25);
			}

			.dropdown-label {
				flex: 1;
				text-overflow: ellipsis;
				overflow: hidden;
				white-space: nowrap;
				text-align: left;
				color: inherit;
			}

			/* Combo Box Button (chevron container) - matches Figma design */
			.dropdown-icon-container {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 15px;
				height: 16px;
				margin-left: 4px;
				background-color: #007aff;
				background-image: linear-gradient(
					to bottom,
					rgba(255, 255, 255, 0.17) 0%,
					rgba(255, 255, 255, 0) 100%
				);
				border-radius: 4px;
				flex-shrink: 0;
				position: relative;
			}

			.dropdown-button[disabled] .dropdown-icon-container {
				background-color: rgba(255, 255, 255, 0.1);
				background-image: none;
			}

			.dropdown-icon {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 15px;
				height: 15.5px;
				transition: transform 0.2s ease;
				flex-shrink: 0;
			}

			.dropdown-icon svg {
				width: 9px;
				height: 6px;
				display: block;
			}

			.dropdown-icon svg path {
				fill: #ffffff;
				fill-opacity: 1;
			}

			.dropdown-button[disabled] .dropdown-icon svg path {
				fill: rgba(255, 255, 255, 0.25);
			}

			.dropdown-icon.open {
				transform: rotate(180deg);
			}

			/* macOS Menu - Dark Theme */
			.dropdown-menu {
				position: absolute;
				top: calc(100% + 4px);
				left: 0;
				min-width: 100%;
				background-color: rgba(28, 28, 30, 0.95);
				backdrop-filter: blur(20px);
				border-radius: 6px;
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
				max-height: 200px;
				overflow-y: auto;
				z-index: 10000;
				display: none;
				padding: 2px;
			}

			.dropdown-menu.open {
				display: block;
			}

			/* macOS Menu Item - Dark Theme */
			.dropdown-item {
				display: flex;
				align-items: center;
				height: 22px;
				padding: 0 7px;
				font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Helvetica Neue', sans-serif;
				font-size: 13px;
				font-weight: 510;
				line-height: 16px;
				color: rgba(255, 255, 255, 0.85);
				cursor: pointer;
				transition: background-color 0.1s ease;
				text-overflow: ellipsis;
				overflow: hidden;
				white-space: nowrap;
				border-radius: 5px;
				margin: 0 2px;
			}

			.dropdown-item:hover {
				background-color: rgba(255, 255, 255, 0.1);
			}

			.dropdown-item.selected {
				background-color: #007aff;
				color: #ffffff;
			}

			.dropdown-empty {
				padding: 8px;
				font-size: 13px;
				color: rgba(255, 255, 255, 0.5);
				text-align: center;
			}
		`,
	];

	@property({ type: Array })
	options: DropdownOption[] = [];

	@property({ type: String })
	value: string = '';

	@property({ type: String })
	placeholder: string = 'Select an option';

	@property({ type: Boolean })
	disabled: boolean = false;

	@state()
	private isOpen: boolean = false;

	private get selectedOption(): DropdownOption | undefined {
		return this.options.find(opt => opt.value === this.value);
	}

	private get displayLabel(): string {
		return this.selectedOption?.label || this.placeholder;
	}

	private handleButtonClick(e: MouseEvent) {
		e.stopPropagation();
		if (!this.disabled) {
			this.isOpen = !this.isOpen;
		}
	}

	private handleItemClick(e: MouseEvent, option: DropdownOption) {
		e.stopPropagation();
		if (this.value !== option.value) {
			this.value = option.value;
			this.emit('change', { value: option.value, option });
		}
		this.isOpen = false;
	}

	private handleClickOutside = (e: MouseEvent) => {
		if (!this.contains(e.target as Node)) {
			this.isOpen = false;
		}
	};

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener('click', this.handleClickOutside);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener('click', this.handleClickOutside);
	}

	override render() {
		return html`
			<div class="dropdown-container">
				<button
					class="dropdown-button"
					?disabled=${this.disabled}
					@click=${this.handleButtonClick}
					aria-haspopup="listbox"
					aria-expanded=${this.isOpen}
				>
					<span class="dropdown-label">${this.displayLabel}</span>
					<div class="dropdown-icon-container">
						<span class="dropdown-icon ${this.isOpen ? 'open' : ''}">
							<svg width="8" height="6" viewBox="0 0 8.3 5" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M0.241699 1.46338L3.41016 4.70215C3.62988 4.9248 3.87305 5.03613 4.13965 5.03613C4.27734 5.0332 4.40332 5.00537 4.51758 4.95264C4.63477 4.8999 4.75049 4.81641 4.86475 4.70215L8.02881 1.46338C8.19287 1.30225 8.2749 1.10449 8.2749 0.870117C8.2749 0.708984 8.23535 0.5625 8.15625 0.430664C8.08008 0.301758 7.97607 0.197754 7.84424 0.118652C7.71533 0.0395508 7.57178 0 7.41357 0C7.17041 0 6.95947 0.0952148 6.78076 0.285645L3.99463 3.17285H4.29346L1.49854 0.285645C1.31396 0.0952148 1.1001 0 0.856934 0C0.70166 0 0.558105 0.0395508 0.42627 0.118652C0.297363 0.197754 0.193359 0.301758 0.114258 0.430664C0.0380859 0.5625 0 0.708984 0 0.870117C0 0.987305 0.019043 1.09424 0.0571289 1.19092C0.0981445 1.2876 0.159668 1.37842 0.241699 1.46338Z" fill="white"/>
							</svg>
						</span>
					</div>
				</button>
				<div class="dropdown-menu ${this.isOpen ? 'open' : ''}">
					${this.options.length === 0
				? html`<div class="dropdown-empty">No options available</div>`
				: this.options.map(
					option => html`
									<div
										class="dropdown-item ${this.value === option.value ? 'selected' : ''}"
										@click=${(e: MouseEvent) => this.handleItemClick(e, option)}
									>
										${option.label}
									</div>
								`
				)}
				</div>
			</div>
		`;
	}
}
