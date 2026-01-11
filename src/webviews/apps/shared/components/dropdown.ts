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

			.dropdown-button {
				display: flex;
				align-items: center;
				justify-content: space-between;
				width: 100%;
				padding: 0.25rem 0.5rem;
				font-size: 0.875rem;
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background-color: var(--vscode-dropdown-background);
				border: 1px solid var(--vscode-dropdown-border);
				border-radius: 2px;
				cursor: pointer;
				transition: background-color 0.1s ease;
				min-height: 22px;
			}

			.dropdown-button:hover {
				background-color: var(--vscode-dropdown-listBackground);
			}

			.dropdown-button:focus {
				outline: 1px solid var(--vscode-focusBorder);
				outline-offset: -1px;
			}

			.dropdown-button[disabled] {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.dropdown-label {
				flex: 1;
				text-overflow: ellipsis;
				overflow: hidden;
				white-space: nowrap;
				text-align: left;
			}

			.dropdown-icon {
				margin-left: 0.5rem;
				font-size: 0.75rem;
				color: var(--vscode-foreground);
				opacity: 0.7;
				transition: transform 0.2s ease;
			}

			.dropdown-icon.open {
				transform: rotate(180deg);
			}

			.dropdown-menu {
				position: absolute;
				top: calc(100% + 2px);
				left: 0;
				right: 0;
				background-color: var(--vscode-dropdown-background);
				border: 1px solid var(--vscode-dropdown-border);
				border-radius: 2px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
				max-height: 200px;
				overflow-y: auto;
				z-index: 10000;
				display: none;
			}

			.dropdown-menu.open {
				display: block;
			}

			.dropdown-item {
				padding: 0.25rem 0.5rem;
				font-size: 0.875rem;
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				cursor: pointer;
				transition: background-color 0.1s ease;
				text-overflow: ellipsis;
				overflow: hidden;
				white-space: nowrap;
			}

			.dropdown-item:hover {
				background-color: var(--vscode-list-hoverBackground);
			}

			.dropdown-item.selected {
				background-color: var(--vscode-list-activeSelectionBackground);
				color: var(--vscode-list-activeSelectionForeground);
			}

			.dropdown-empty {
				padding: 0.5rem;
				font-size: 0.875rem;
				color: var(--vscode-descriptionForeground);
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
					<span class="dropdown-icon ${this.isOpen ? 'open' : ''}">▼</span>
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
