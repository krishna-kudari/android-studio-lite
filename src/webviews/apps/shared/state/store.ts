/**
 * Simple state management for webviews using reactive patterns.
 * Provides a lightweight store implementation for component state.
 * Uses Lit's @state decorator and reactive properties for reactivity.
 */

type Listener<T> = (state: T) => void;

/**
 * Base store class for managing reactive state.
 * Works with Lit components using @state decorator.
 */
export class Store<T extends Record<string, any>> {
	private _state: T;
	private _listeners: Set<Listener<T>> = new Set();
	private _computed: Map<string, () => any> = new Map();

	constructor(initialState: T) {
		this._state = { ...initialState };
	}

	/**
	 * Get the current value of a state property.
	 */
	getValue<K extends keyof T>(key: K): T[K] {
		return this._state[key];
	}

	/**
	 * Set the value of a state property.
	 */
	set<K extends keyof T>(key: K, value: T[K]): void {
		if (this._state[key] !== value) {
			this._state[key] = value;
			this._notify();
		}
	}

	/**
	 * Update multiple state properties at once.
	 */
	update(updates: Partial<T>): void {
		let changed = false;
		for (const key in updates) {
			if (this._state[key] !== updates[key]) {
				this._state[key] = updates[key] as T[Extract<keyof T, string>];
				changed = true;
			}
		}
		if (changed) {
			this._notify();
		}
	}

	/**
	 * Get a computed value based on state properties.
	 * Computed values are recalculated when state changes.
	 */
	computed<R>(name: string, computeFn: (state: T) => R): R {
		// Store the compute function for potential future optimization
		this._computed.set(name, () => computeFn(this._state));
		return computeFn(this._state);
	}

	/**
	 * Get the entire state object.
	 */
	getState(): T {
		return { ...this._state };
	}

	/**
	 * Subscribe to state changes.
	 * Returns an unsubscribe function.
	 */
	subscribe(callback: Listener<T>): () => void {
		this._listeners.add(callback);
		return () => {
			this._listeners.delete(callback);
		};
	}

	/**
	 * Reset state to initial values.
	 */
	reset(initialState: T): void {
		this._state = { ...initialState };
		this._notify();
	}

	/**
	 * Notify all listeners of state changes.
	 */
	private _notify(): void {
		const state = this.getState();
		this._listeners.forEach(listener => {
			try {
				listener(state);
			} catch (error) {
				console.error('Error in store listener:', error);
			}
		});
	}
}

/**
 * Create a new store instance.
 */
export function createStore<T extends Record<string, any>>(initialState: T): Store<T> {
	return new Store(initialState);
}

/**
 * Mixin for Lit components to easily integrate with stores.
 * Usage:
 * ```typescript
 * class MyComponent extends StoreMixin(ASlElement) {
 *   private store = createStore({ count: 0 });
 *
 *   connectedCallback() {
 *     super.connectedCallback();
 *     this.store.subscribe(() => this.requestUpdate());
 *   }
 * }
 * ```
 */
export function StoreMixin<T extends Constructor<HTMLElement>>(base: T) {
	return class extends base {
		// This mixin can be extended with store-related methods if needed
	};
}

type Constructor<T = {}> = new (...args: any[]) => T;
