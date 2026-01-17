"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for logcatParser utility.
 */
const logcatParser_1 = require("../../../src/utils/logcatParser");
describe('logcatParser', () => {
    describe('parseLogcatLine', () => {
        it('should parse standard logcat format', () => {
            const line = '12-25 10:30:45.123  1234  5678 I MyTag: This is a log message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result).not.toBeNull();
            expect(result?.timestamp).toBe('12-25 10:30:45.123');
            expect(result?.pid).toBe('1234');
            expect(result?.tid).toBe('5678');
            expect(result?.level).toBe(logcatParser_1.LogLevel.INFO);
            expect(result?.tag).toBe('MyTag');
            expect(result?.message).toBe('This is a log message');
        });
        it('should parse simple format', () => {
            const line = 'I/MyTag: Simple log message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result).not.toBeNull();
            expect(result?.level).toBe(logcatParser_1.LogLevel.INFO);
            expect(result?.tag).toBe('MyTag');
            expect(result?.message).toBe('Simple log message');
        });
        it('should handle verbose level', () => {
            const line = 'V/MyTag: Verbose message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result?.level).toBe(logcatParser_1.LogLevel.VERBOSE);
        });
        it('should handle debug level', () => {
            const line = 'D/MyTag: Debug message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result?.level).toBe(logcatParser_1.LogLevel.DEBUG);
        });
        it('should handle warn level', () => {
            const line = 'W/MyTag: Warning message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result?.level).toBe(logcatParser_1.LogLevel.WARN);
        });
        it('should handle error level', () => {
            const line = 'E/MyTag: Error message';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result?.level).toBe(logcatParser_1.LogLevel.ERROR);
        });
        it('should return null for empty lines', () => {
            const result = (0, logcatParser_1.parseLogcatLine)('');
            expect(result).toBeNull();
        });
        it('should return default INFO level for unrecognized format', () => {
            const line = 'Some unrecognized log format';
            const result = (0, logcatParser_1.parseLogcatLine)(line);
            expect(result).not.toBeNull();
            expect(result?.level).toBe(logcatParser_1.LogLevel.INFO);
            expect(result?.tag).toBe('System');
        });
    });
    describe('formatLogcatLine', () => {
        it('should format logcat line with all fields', () => {
            const logLine = {
                timestamp: '12-25 10:30:45.123',
                pid: '1234',
                tid: '5678',
                level: logcatParser_1.LogLevel.INFO,
                tag: 'MyTag',
                message: 'Test message',
                raw: '12-25 10:30:45.123  1234  5678 I MyTag: Test message',
            };
            const formatted = (0, logcatParser_1.formatLogcatLine)(logLine, true, true, true);
            expect(formatted).toContain('2024-12-25 10:30:45.123');
            expect(formatted).toContain('1234-5678');
            expect(formatted).toContain('MyTag');
            expect(formatted).toContain('I');
            expect(formatted).toContain('Test message');
        });
        it('should handle missing timestamp', () => {
            const logLine = {
                level: logcatParser_1.LogLevel.INFO,
                tag: 'MyTag',
                message: 'Test message',
                raw: 'I/MyTag: Test message',
            };
            const formatted = (0, logcatParser_1.formatLogcatLine)(logLine, false, false, false);
            expect(formatted).toBe('Test message');
        });
    });
});
//# sourceMappingURL=logcatParser.test.js.map