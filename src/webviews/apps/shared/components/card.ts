import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ASlElement } from './element.js';
import { designTokens, spacing, borderRadius, shadows } from '../design/tokens.js';

/**
 * Card component for displaying content in a contained, elevated container.
 *
 * @example
 * ```html
 * <asl-card>
 *   <h2 slot="header">Card Title</h2>
 *   <p>Card content goes here</p>
 *   <div slot="footer">
 *     <asl-button>Action</asl-button>
 *   </div>
 * </asl-card>
 * ```
 */
@customElement('asl-card')
export class ASlCard extends ASlElement {
	static override styles = [
		designTokens,
		css`
			:host {
				display: block;
			}

			.card {
				background-color: var(--asl-color-bg-primary);
				border: 1px solid var(--asl-color-border-default);
				border-radius: var(--asl-radius-lg);
				box-shadow: var(--asl-shadow-base);
				overflow: hidden;
				transition: box-shadow var(--asl-transition-base) ease-out,
				            border-color var(--asl-transition-base) ease-out;
			}

			:host([elevated]) .card {
				box-shadow: var(--asl-shadow-md);
			}

			:host([hoverable]) .card:hover {
				box-shadow: var(--asl-shadow-lg);
				border-color: var(--asl-color-border-focus);
			}

			.card-header {
				padding: var(--asl-spacing-lg) var(--asl-spacing-lg) var(--asl-spacing-md) var(--asl-spacing-lg);
				border-bottom: 1px solid var(--asl-color-border-default);
			}

			:host([no-header]) .card-header {
				display: none;
			}

			.card-body {
				padding: var(--asl-spacing-lg);
			}

			:host([no-body]) .card-body {
				display: none;
			}

			.card-footer {
				padding: var(--asl-spacing-md) var(--asl-spacing-lg) var(--asl-spacing-lg) var(--asl-spacing-lg);
				border-top: 1px solid var(--asl-color-border-default);
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: var(--asl-spacing-md);
			}

			:host([no-footer]) .card-footer {
				display: none;
			}

			:host([compact]) .card-header,
			:host([compact]) .card-body,
			:host([compact]) .card-footer {
				padding: var(--asl-spacing-md);
			}
		`,
	];

	@property({ type: Boolean, reflect: true })
	elevated = false;

	@property({ type: Boolean, reflect: true })
	hoverable = false;

	@property({ type: Boolean, reflect: true })
	compact = false;

	override render() {
		return html`
			<div class="card">
				<div class="card-header">
					<slot name="header"></slot>
				</div>
				<div class="card-body">
					<slot></slot>
				</div>
				<div class="card-footer">
					<slot name="footer"></slot>
				</div>
			</div>
		`;
	}
}
