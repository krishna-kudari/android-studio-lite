import { css } from 'lit';

/**
 * Design tokens for Android Studio Lite webviews.
 * Provides consistent theming, spacing, typography, and component styles.
 */

// Spacing scale (8px base unit)
export const spacing = {
	xs: '0.25rem',    // 4px
	sm: '0.5rem',     // 8px
	md: '0.75rem',    // 12px
	base: '1rem',     // 16px
	lg: '1.5rem',     // 24px
	xl: '2rem',       // 32px
	'2xl': '2.5rem',  // 40px
	'3xl': '3rem',    // 48px
	'4xl': '4rem',    // 64px
} as const;

// Border radius scale
export const borderRadius = {
	none: '0',
	sm: '0.25rem',    // 4px
	base: '0.5rem',   // 8px
	md: '0.75rem',    // 12px
	lg: '1rem',       // 16px
	xl: '1.5rem',     // 24px
	full: '9999px',
} as const;

// Shadow scale
export const shadows = {
	none: 'none',
	sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
	base: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
	md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
	lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
	xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
} as const;

// Typography scale
export const typography = {
	fontFamily: {
		sans: "-apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
		mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
	},
	fontSize: {
		xs: '0.75rem',    // 12px
		sm: '0.875rem',   // 14px
		base: '1rem',     // 16px
		lg: '1.125rem',   // 18px
		xl: '1.25rem',    // 20px
		'2xl': '1.5rem',  // 24px
		'3xl': '1.875rem', // 30px
		'4xl': '2.25rem',  // 36px
		'5xl': '3rem',     // 48px
	},
	fontWeight: {
		normal: '400',
		medium: '500',
		semibold: '600',
		bold: '700',
	},
	lineHeight: {
		tight: '1.25',
		snug: '1.375',
		normal: '1.5',
		relaxed: '1.625',
		loose: '2',
	},
} as const;

// Animation durations
export const transitions = {
	duration: {
		fast: '0.15s',
		base: '0.2s',
		slow: '0.3s',
		slower: '0.5s',
	},
	easing: {
		easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
		easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
		easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
	},
} as const;

// Z-index scale
export const zIndex = {
	base: 0,
	docked: 10,
	dropdown: 1000,
	sticky: 1100,
	fixed: 1200,
	modalBackdrop: 1300,
	modal: 1400,
	popover: 1500,
	tooltip: 1600,
} as const;

/**
 * VS Code theme-aware color tokens.
 * These use VS Code CSS variables for automatic theme adaptation.
 */
export const colors = {
	// Text colors
	text: {
		primary: 'var(--vscode-foreground)',
		secondary: 'var(--vscode-descriptionForeground)',
		disabled: 'var(--vscode-disabledForeground)',
		link: 'var(--vscode-textLink-foreground)',
		linkHover: 'var(--vscode-textLink-activeForeground)',
	},
	// Background colors
	bg: {
		primary: 'var(--vscode-editor-background)',
		secondary: 'var(--vscode-sideBar-background)',
		tertiary: 'var(--vscode-panel-background)',
		hover: 'var(--vscode-list-hoverBackground)',
		active: 'var(--vscode-list-activeSelectionBackground)',
	},
	// Border colors
	border: {
		default: 'var(--vscode-panel-border)',
		divider: 'var(--vscode-panel-border)',
		input: 'var(--vscode-input-border)',
		focus: 'var(--vscode-focusBorder)',
	},
	// Button colors
	button: {
		primary: {
			bg: 'var(--vscode-button-background)',
			text: 'var(--vscode-button-foreground)',
			hover: 'var(--vscode-button-hoverBackground)',
		},
		secondary: {
			bg: 'var(--vscode-button-secondaryBackground)',
			text: 'var(--vscode-button-secondaryForeground)',
			hover: 'var(--vscode-button-secondaryHoverBackground)',
		},
	},
	// Status colors (using VS Code theme colors where available)
	status: {
		success: 'var(--vscode-testing-iconPassed)',
		warning: 'var(--vscode-testing-iconQueued)',
		error: 'var(--vscode-testing-iconFailed)',
		info: 'var(--vscode-textLink-foreground)',
	},
} as const;

/**
 * Base CSS styles using design tokens.
 * Import this in components for consistent styling.
 *
 * Note: We use string values directly instead of interpolation to avoid TypeScript errors
 * with Lit's css template tag, which expects CSSResultGroup types.
 */
export const designTokens = css`
	:host {
		--asl-spacing-xs: 0.25rem;
		--asl-spacing-sm: 0.5rem;
		--asl-spacing-md: 0.75rem;
		--asl-spacing-base: 1rem;
		--asl-spacing-lg: 1.5rem;
		--asl-spacing-xl: 2rem;
		--asl-spacing-2xl: 2.5rem;
		--asl-spacing-3xl: 3rem;
		--asl-spacing-4xl: 4rem;

		--asl-radius-sm: 0.25rem;
		--asl-radius-base: 0.5rem;
		--asl-radius-md: 0.75rem;
		--asl-radius-lg: 1rem;
		--asl-radius-xl: 1.5rem;
		--asl-radius-full: 9999px;

		--asl-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
		--asl-shadow-base: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
		--asl-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
		--asl-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
		--asl-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);

		--asl-font-family-sans: -apple-system, BlinkMacSystemFont, 'SF Pro', 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		--asl-font-family-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

		--asl-transition-fast: 0.15s;
		--asl-transition-base: 0.2s;
		--asl-transition-slow: 0.3s;

		--asl-color-text-primary: var(--vscode-foreground);
		--asl-color-text-secondary: var(--vscode-descriptionForeground);
		--asl-color-text-disabled: var(--vscode-disabledForeground);
		--asl-color-text-link: var(--vscode-textLink-foreground);

		--asl-color-bg-primary: var(--vscode-editor-background);
		--asl-color-bg-secondary: var(--vscode-sideBar-background);
		--asl-color-bg-hover: var(--vscode-list-hoverBackground);
		--asl-color-bg-active: var(--vscode-list-activeSelectionBackground);

		--asl-color-border-default: var(--vscode-panel-border);
		--asl-color-border-focus: var(--vscode-focusBorder);
	}
`;

/**
 * Utility CSS classes for common patterns.
 */
export const utilityClasses = css`
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.fade-in {
		animation: fadeIn 0.3s ease-out;
	}

	.fade-in-up {
		animation: fadeInUp 0.4s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.focus-ring {
		outline: 2px solid var(--asl-color-border-focus);
		outline-offset: 2px;
	}

	.focus-ring:focus-visible {
		outline: 2px solid var(--asl-color-border-focus);
		outline-offset: 2px;
	}
`;
