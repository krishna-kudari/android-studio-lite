export enum Platform {
    linux = "linux",
    window = "window",
    macOS = "macOS",
}

/**
 * Get the current platform.
 */
export function getPlatform(): Platform {
    switch (process.platform) {
        case 'linux':
            return Platform.linux;
        case 'darwin':
            return Platform.macOS;
        case 'win32':
            return Platform.window;
        default:
            return Platform.linux;
    }
}
