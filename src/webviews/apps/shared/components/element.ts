import type { PropertyValues } from 'lit';
import { LitElement } from 'lit';

export abstract class ASlElement extends LitElement {
    emit<T extends keyof HTMLElementEventMap>(
        name: T,
        detail?: any,
        options?: CustomEventInit,
    ): CustomEvent {
        const event = new CustomEvent(name as string, {
            bubbles: true,
            cancelable: false,
            composed: true,
            ...options,
            detail: detail,
        });

        this.dispatchEvent(event);

        return event as CustomEvent;
    }

    override update(changedProperties: PropertyValues): void {
        super.update(changedProperties);
    }
}
