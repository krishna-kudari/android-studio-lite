import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ASlElement } from './element.js';
import { designTokens, spacing, borderRadius, typography } from '../design/tokens.js';

/**
 * Badge component for displaying status, labels, or counts.
 *
 * @example
 * ```html
 * <asl-badge variant="success">Active</asl-badge>
 * <asl-badge variant="warning">Pending</asl-badge>
 * <asl-badge variant="error">Failed</asl-badge>
 * ```
 */
@customElement('asl-badge')
export class ASlBadge extends ASlElement {
	static override styles = [
		designTokens,
		css`
			:host {
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			.badge {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: var(--asl-spacing-xs) var(--asl-spacing-sm);
				border-radius: var(--asl-radius-full);
				font-family: var(--asl-font-family-sans);
				font-size: 0.75rem;
				font-weight: 600;
				line-height: 1.25;
				white-space: nowrap;
				transition: opacity var(--asl-transition-fast) ease-out;
			}

			:host([variant='success']) .badge {
				background-color: var(--asl-color-status-success);
				color: var(--asl-color-bg-primary);
			}

			:host([variant='warning']) .badge {
				background-color: var(--asl-color-status-warning);
				color: var(--asl-color-bg-primary);
			}

			:host([variant='error']) .badge {
				background-color: var(--asl-color-status-error);
				color: var(--asl-color-bg-primary);
			}

			:host([variant='info']) .badge {
				background-color: var(--asl-color-status-info);
				color: var(--asl-color-bg-primary);
			}

			:host([variant='neutral']) .badge {
				background-color: var(--asl-color-bg-hover);
				color: var(--asl-color-text-primary);
			}

			:host([outline]) .badge {
				background-color: transparent;
				border: 1px solid currentColor;
			}

			:host([size='sm']) .badge {
				padding: 2px var(--asl-spacing-xs);
				font-size: 10px;
			}

			:host([size='lg']) .badge {
				padding: var(--asl-spacing-sm) var(--asl-spacing-md);
				font-size: 0.875rem;
			}

			.badge-icon {
				display: inline-flex;
				align-items: center;
				margin-right: var(--asl-spacing-xs);
			}

			.badge-icon:last-child {
				margin-right: 0;
				margin-left: var(--asl-spacing-xs);
			}
		`,
	];

	@property({ type: String, reflect: true })
	variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';

	@property({ type: Boolean, reflect: true })
	outline = false;

	@property({ type: String, reflect: true })
	size: 'sm' | 'base' | 'lg' = 'base';

	@property({ type: String })
	icon?: string;

	override render() {
		return html`
			<span class="badge">
				${this.icon ? html`<span class="badge-icon">${this.icon}</span>` : ''}
				<slot></slot>
			</span>
		`;
	}
}
