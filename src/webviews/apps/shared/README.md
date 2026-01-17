# Android Studio Lite - Shared Webview Components

This directory contains shared components, design tokens, and utilities for Android Studio Lite webviews.

## Structure

```
shared/
├── components/          # Reusable Lit components
│   ├── element.ts      # Base element class
│   ├── button.ts       # Button component
│   ├── card.ts         # Card component
│   ├── badge.ts        # Badge component
│   ├── input.ts        # Input component
│   ├── dropdown.ts     # Dropdown component
│   ├── toggle-button.ts # Toggle button component
│   └── index.ts         # Component exports
├── design/             # Design tokens
│   └── tokens.ts       # Design tokens (spacing, colors, typography, etc.)
├── state/              # State management
│   ├── store.ts        # Lightweight store implementation
│   └── index.ts        # State exports
└── styles/             # Shared styles
    └── base.css.ts     # Base styles and scrollbar utilities
```

## Design Tokens

The design token system provides consistent theming, spacing, typography, and component styles.

### Usage

```typescript
import { designTokens, spacing, colors, typography } from '../shared/design/tokens.js';

@customElement('my-component')
export class MyComponent extends ASlElement {
    static override styles = [
        designTokens, // Include design tokens
        css`
            .my-element {
                padding: var(--asl-spacing-lg);
                color: var(--asl-color-text-primary);
                font-family: var(--asl-font-family-sans);
            }
        `,
    ];
}
```

### Available Tokens

- **Spacing**: `xs`, `sm`, `md`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`
- **Colors**: Text, background, border, button, and status colors (VS Code theme-aware)
- **Typography**: Font families, sizes, weights, line heights
- **Shadows**: `sm`, `base`, `md`, `lg`, `xl`
- **Border Radius**: `sm`, `base`, `md`, `lg`, `xl`, `full`
- **Transitions**: Duration and easing functions

## Components

### Card Component

Display content in a contained, elevated container.

```html
<asl-card elevated hoverable>
  <h2 slot="header">Card Title</h2>
  <p>Card content goes here</p>
  <div slot="footer">
    <asl-button>Action</asl-button>
  </div>
</asl-card>
```

**Properties**:
- `elevated` - Adds elevated shadow
- `hoverable` - Adds hover effects
- `compact` - Reduces padding

### Badge Component

Display status, labels, or counts.

```html
<asl-badge variant="success">Active</asl-badge>
<asl-badge variant="warning" outline>Pending</asl-badge>
<asl-badge variant="error" size="lg">Failed</asl-badge>
```

**Properties**:
- `variant` - `success` | `warning` | `error` | `info` | `neutral`
- `outline` - Outline style
- `size` - `sm` | `base` | `lg`
- `icon` - Optional icon

### Input Component

Text input fields with labels and validation.

```html
<asl-input
  label="SDK Path"
  placeholder="Enter SDK path"
  value="/path/to/sdk"
  helper-text="Path to Android SDK"
  @input=${this.handleInput}
></asl-input>
```

**Properties**:
- `label` - Input label
- `placeholder` - Placeholder text
- `value` - Input value
- `type` - Input type (`text`, `password`, `email`, `number`, `url`)
- `disabled` - Disabled state
- `required` - Required field
- `helper-text` - Helper text
- `error-text` - Error message
- `error` - Error state

**Events**:
- `input` - Fired on input
- `change` - Fired on change

### Button Component

Button component with variants.

```html
<asl-button variant="primary" @button-click=${this.handleClick}>
  Click Me
</asl-button>
```

**Properties**:
- `variant` - `primary` | `secondary` | `icon`
- `disabled` - Disabled state
- `icon` - Optional icon
- `label` - Button label

## State Management

Simple state management using reactive patterns.

### Usage

```typescript
import { createStore } from '../shared/state/store.js';

// Create a store
const store = createStore({
    count: 0,
    name: 'Android Studio Lite',
});

// Subscribe to changes
const unsubscribe = store.subscribe((state) => {
    console.log('State changed:', state);
    // Trigger component update
    this.requestUpdate();
});

// Update state
store.set('count', 1);
store.update({ count: 2, name: 'Updated' });

// Get state
const count = store.getValue('count');
const state = store.getState();

// Cleanup
unsubscribe();
```

### With Lit Components

```typescript
import { ASlElement } from '../shared/components/element.js';
import { createStore } from '../shared/state/store.js';

@customElement('my-component')
export class MyComponent extends ASlElement {
    private store = createStore({ count: 0 });

    connectedCallback() {
        super.connectedCallback();
        // Subscribe to store changes
        this.store.subscribe(() => this.requestUpdate());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Cleanup subscriptions if needed
    }

    render() {
        return html`
            <div>Count: ${this.store.getValue('count')}</div>
            <button @click=${() => this.store.set('count', this.store.getValue('count') + 1)}>
                Increment
            </button>
        `;
    }
}
```

## Best Practices

1. **Always use design tokens** - Don't hardcode spacing, colors, or typography values
2. **Use shared components** - Prefer shared components over custom implementations
3. **Follow VS Code theming** - Use VS Code CSS variables for theme-aware colors
4. **Keep components simple** - Each component should have a single responsibility
5. **Use state management** - For complex state, use the store instead of component state
6. **Accessibility** - Always include proper ARIA labels and keyboard navigation

## Examples

See the onboarding and AVD selector webviews for examples of using these components.
