import pk from '../../package.json';

export function getExtensionId(): string {
    return `${getExtensionPublisher()}.${getExtensionName()}`;
}

export function getExtensionName(): string {
    const {name} = pk;
    return name;
}

export function getExtensionPublisher(): string {
    const {publisher} = pk;
    return publisher;
}
