import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ASlElement } from './element.js';
import { designTokens, spacing, borderRadius, typography } from '../design/tokens.js';

/**
 * Input component for text input fields.
 *
 * @example
 * ```html
 * <asl-input
 *   label="SDK Path"
 *   placeholder="Enter SDK path"
 *   value="/path/to/sdk"
 *   @input=${this.handleInput}
 * ></asl-input>
 * ```
 */
@customElement('asl-input')
export class ASlInput extends ASlElement {
	static override styles = [
		designTokens,
		css`
			:host {
				display: block;
			}

			.input-wrapper {
				display: flex;
				flex-direction: column;
				gap: var(--asl-spacing-xs);
			}

			.label {
				font-family: var(--asl-font-family-sans);
				font-size: 0.875rem;
				font-weight: 500;
				color: var(--asl-color-text-primary);
			}

			.input {
				width: 100%;
				padding: var(--asl-spacing-sm) var(--asl-spacing-md);
				font-family: var(--asl-font-family-sans);
				font-size: 1rem;
				line-height: 1.5;
				color: var(--asl-color-text-primary);
				background-color: var(--vscode-input-background);
				border: 1px solid var(--asl-color-border-input);
				border-radius: var(--asl-radius-base);
				outline: none;
				transition: border-color var(--asl-transition-fast) ease-out,
				            box-shadow var(--asl-transition-fast) ease-out;
			}

			.input:hover {
				border-color: var(--asl-color-border-focus);
			}

			.input:focus {
				border-color: var(--asl-color-border-focus);
				box-shadow: 0 0 0 2px var(--asl-color-border-focus);
			}

			.input:disabled {
				opacity: 0.6;
				cursor: not-allowed;
				background-color: var(--vscode-input-background);
			}

			.input::placeholder {
				color: var(--asl-color-text-secondary);
			}

			.helper-text {
				font-family: var(--asl-font-family-sans);
				font-size: 0.875rem;
				color: var(--asl-color-text-secondary);
			}

			.error-text {
				font-family: var(--asl-font-family-sans);
				font-size: 0.875rem;
				color: var(--asl-color-status-error);
			}

			:host([error]) .input {
				border-color: var(--asl-color-status-error);
			}

			:host([error]) .input:focus {
				box-shadow: 0 0 0 2px var(--asl-color-status-error);
			}
		`,
	];

	@property({ type: String })
	label = '';

	@property({ type: String })
	placeholder = '';

	@property({ type: String })
	value = '';

	@property({ type: String })
	type: 'text' | 'password' | 'email' | 'number' | 'url' = 'text';

	@property({ type: Boolean })
	disabled = false;

	@property({ type: Boolean })
	required = false;

	@property({ type: String })
	helperText = '';

	@property({ type: String })
	errorText = '';

	@property({ type: Boolean, reflect: true })
	error = false;

	private handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		this.value = input.value;
		this.emit('input', { value: this.value });
	}

	private handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		this.value = input.value;
		this.emit('change', { value: this.value });
	}

	override render() {
		return html`
			<div class="input-wrapper">
				${this.label
					? html`<label class="label" for="input">
							${this.label}
							${this.required ? html`<span aria-label="required">*</span>` : ''}
						</label>`
					: ''}
				<input
					id="input"
					class="input"
					type=${this.type}
					placeholder=${this.placeholder}
					.value=${this.value}
					?disabled=${this.disabled}
					?required=${this.required}
					@input=${this.handleInput}
					@change=${this.handleChange}
				/>
				${this.error && this.errorText
					? html`<div class="error-text">${this.errorText}</div>`
					: this.helperText
					? html`<div class="helper-text">${this.helperText}</div>`
					: ''}
			</div>
		`;
	}
}
