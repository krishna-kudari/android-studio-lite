export enum LogLevel {
    VERBOSE = 'V',
    DEBUG = 'D',
    INFO = 'I',
    WARN = 'W',
    ERROR = 'E',
    FATAL = 'F',
    SILENT = 'S'
}

export interface LogcatLine {
    timestamp?: string;
    pid?: string;
    tid?: string;
    level: LogLevel;
    tag: string;
    message: string;
    raw: string;
    packageName?: string;
}

/**
 * Parse a single logcat line
 * Format: <timestamp> <pid> <tid> <level> <tag>: <message>
 * Example: "12-25 10:30:45.123  1234  5678 I MyTag: This is a log message"
 */
export function parseLogcatLine(line: string): LogcatLine | null {
    const trimmed = line.trim();
    if (!trimmed) {
        return null;
    }

    // Try to match standard logcat format: timestamp pid tid level tag: message
    // Format: MM-DD HH:MM:SS.mmm  pid  tid level tag: message
    const standardFormat = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEFS])\s+([^:]+):\s+(.+)$/;
    const match = trimmed.match(standardFormat);

    if (match) {
        return {
            timestamp: match[1],
            pid: match[2],
            tid: match[3],
            level: match[4] as LogLevel,
            tag: match[5].trim(),
            message: match[6],
            raw: trimmed
        };
    }

    // Try simpler format: level/tag: message
    const simpleFormat = /^([VDIWEFS])\/([^:]+):\s+(.+)$/;
    const simpleMatch = trimmed.match(simpleFormat);

    if (simpleMatch) {
        return {
            level: simpleMatch[1] as LogLevel,
            tag: simpleMatch[2].trim(),
            message: simpleMatch[3],
            raw: trimmed
        };
    }

    // If no format matches, return as-is with INFO level
    return {
        level: LogLevel.INFO,
        tag: 'System',
        message: trimmed,
        raw: trimmed
    };
}

/**
 * Get ANSI color code for log level
 * Uses colors similar to Android Studio's logcat viewer
 */
export function getLogLevelColor(level: LogLevel): string {
    switch (level) {
        case LogLevel.ERROR:
        case LogLevel.FATAL:
            return '\x1b[31m'; // Red - for errors
        case LogLevel.WARN:
            return '\x1b[33m'; // Yellow/Orange - for warnings
        case LogLevel.INFO:
            return '\x1b[36m'; // Cyan/Blue - for info
        case LogLevel.DEBUG:
            return '\x1b[90m'; // Gray - for debug
        case LogLevel.VERBOSE:
            return '\x1b[37m'; // Light Gray/White - for verbose
        default:
            return '\x1b[0m'; // Reset
    }
}

/**
 * Format logcat line to match Android Studio format with colors
 * Format: YYYY-MM-DD HH:MM:SS.mmm  PID-TID  Tag(padded)  Package(padded)  Level  Message
 */
export function formatLogcatLine(logLine: LogcatLine, showTimestamp: boolean = true, showPid: boolean = false, useColors: boolean = true): string {
    // Convert timestamp to full date format (YYYY-MM-DD HH:MM:SS.mmm)
    let timestampStr = '';
    if (showTimestamp && logLine.timestamp) {
        // Parse MM-DD HH:MM:SS.mmm and convert to YYYY-MM-DD HH:MM:SS.mmm
        const now = new Date();
        const year = now.getFullYear();
        const timestampMatch = logLine.timestamp.match(/^(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d{3})$/);
        if (timestampMatch) {
            const month = timestampMatch[1];
            const day = timestampMatch[2];
            const time = timestampMatch[3];
            timestampStr = `${year}-${month}-${day} ${time}`;
        } else {
            timestampStr = logLine.timestamp;
        }
    }

    // Format PID-TID
    let pidTidStr = '';
    if (logLine.pid && logLine.tid) {
        pidTidStr = `${logLine.pid}-${logLine.tid}`;
    } else if (logLine.pid) {
        pidTidStr = logLine.pid;
    }

    // Pad tag to 24 characters (Android Studio uses ~24)
    const tagPadded = logLine.tag.padEnd(24).substring(0, 24);

    // Pad package name to 30 characters (Android Studio uses ~30)
    const packagePadded = (logLine.packageName || '').padEnd(30).substring(0, 30);

    // Level is single letter - apply color
    const levelColor = useColors ? getLogLevelColor(logLine.level) : '';
    const resetColor = useColors ? '\x1b[0m' : '';
    const levelStr = `${levelColor}${logLine.level}${resetColor}`;

    // Build the formatted line with colors
    const parts: string[] = [];
    if (timestampStr) parts.push(timestampStr);
    if (pidTidStr) parts.push(` ${pidTidStr.padStart(11)}`); // Pad PID-TID to 11 chars
    if (tagPadded) parts.push(` ${tagPadded}`);
    if (packagePadded) parts.push(` ${packagePadded}`);
    if (levelStr) parts.push(` ${levelStr}`);
    if (logLine.message) {
        // Optionally color the message based on level (lighter color)
        if (useColors && (logLine.level === LogLevel.ERROR || logLine.level === LogLevel.FATAL)) {
            parts.push(` ${levelColor}${logLine.message}${resetColor}`);
        } else {
            parts.push(` ${logLine.message}`);
        }
    }

    return parts.join('');
}

