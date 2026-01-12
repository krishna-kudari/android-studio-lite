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
 * Format logcat line to match Android Studio format exactly
 * Format: YYYY-MM-DD HH:MM:SS.mmm  PID-TID  Tag(padded)  Package(padded)  Level  Message
 * Example: "2026-01-12 20:35:22.617 13781-13781 _fastlane_ci_c          com.krishna.github_fastlane_ci_cd    W  Accessing hidden method..."
 */
export function formatLogcatLine(logLine: LogcatLine, showTimestamp: boolean = true, showPid: boolean = false, useColors: boolean = false): string {
    // If no timestamp, return message as-is (for lines like "--------- beginning of main")
    if (!logLine.timestamp && !showTimestamp) {
        return logLine.message || logLine.raw;
    }

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

    // If no timestamp after processing, return message as-is
    if (!timestampStr) {
        return logLine.message || logLine.raw;
    }

    // Format PID-TID (pad to 11 characters, right-aligned with spaces)
    let pidTidStr = '';
    if (logLine.pid && logLine.tid) {
        pidTidStr = `${logLine.pid}-${logLine.tid}`;
    } else if (logLine.pid) {
        pidTidStr = logLine.pid;
    }
    // Pad to 11 characters (Android Studio format) - right align
    const pidTidPadded = pidTidStr.padStart(11);

    // Pad tag to 24 characters (Android Studio uses 24) - left align
    const tagPadded = logLine.tag.padEnd(24).substring(0, 24);

    // Pad package name to 30 characters (Android Studio uses 30) - left align
    const packagePadded = (logLine.packageName || '').padEnd(30).substring(0, 30);

    // Build the formatted line exactly like Android Studio
    // Format: timestamp pid-tid tag package level message
    const parts: string[] = [];

    // Timestamp column (no leading space)
    parts.push(timestampStr);

    // PID-TID column (space before, padded to 11 chars, right-aligned)
    parts.push(` ${pidTidPadded}`);

    // Tag column (space before, padded to 24 chars, left-aligned)
    parts.push(` ${tagPadded}`);

    // Package column (space before, padded to 30 chars, left-aligned)
    parts.push(` ${packagePadded}`);

    // Level column (space before, single character)
    parts.push(` ${logLine.level}`);

    // Message column (space before, no padding)
    if (logLine.message) {
        parts.push(` ${logLine.message}`);
    }

    return parts.join('');
}

