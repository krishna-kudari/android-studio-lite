"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for adbParser utility.
 */
const adbParser_1 = require("../../../src/utils/adbParser");
describe('adbParser', () => {
    describe('parseDevicesOutput', () => {
        it('should parse valid adb devices output', () => {
            const output = `List of devices attached
emulator-5554    device
RZ8M123456       device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices).toHaveLength(2);
            expect(devices[0]).toEqual({
                id: 'emulator-5554',
                status: 'device',
                type: 'emulator',
            });
            expect(devices[1]).toEqual({
                id: 'RZ8M123456',
                status: 'device',
                type: 'physical',
            });
        });
        it('should handle empty output', () => {
            const output = `List of devices attached
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices).toHaveLength(0);
        });
        it('should handle offline devices', () => {
            const output = `List of devices attached
emulator-5554    offline
RZ8M123456       device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices).toHaveLength(2);
            expect(devices[0].status).toBe('offline');
            expect(devices[1].status).toBe('device');
        });
        it('should identify emulator devices by ID pattern', () => {
            const output = `List of devices attached
emulator-5554    device
emulator-5556    device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices.every(d => d.type === 'emulator')).toBe(true);
        });
        it('should identify physical devices', () => {
            const output = `List of devices attached
RZ8M123456       device
ABC123XYZ        device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices.every(d => d.type === 'physical')).toBe(true);
        });
        it('should skip header line', () => {
            const output = `List of devices attached
emulator-5554    device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices.find(d => d.id === 'List of devices attached')).toBeUndefined();
        });
        it('should handle devices with multiple spaces', () => {
            const output = `List of devices attached
emulator-5554          device
RZ8M123456             device
`;
            const devices = (0, adbParser_1.parseDevicesOutput)(output);
            expect(devices).toHaveLength(2);
            expect(devices[0].id).toBe('emulator-5554');
            expect(devices[1].id).toBe('RZ8M123456');
        });
    });
});
//# sourceMappingURL=adbParser.test.js.map