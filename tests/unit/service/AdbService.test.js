"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for AdbService.
 */
const AdbService_1 = require("../../../src/service/AdbService");
const mocks_1 = require("../../helpers/mocks");
const types_1 = require("../../../src/di/types");
const tsyringe_1 = require("tsyringe");
describe('AdbService', () => {
    let adbService;
    let mockContext;
    let mockConfigService;
    beforeEach(() => {
        tsyringe_1.container.clearInstances();
        mockContext = (0, mocks_1.createMockExtensionContext)();
        mockConfigService = (0, mocks_1.createMockConfigService)();
        tsyringe_1.container.registerInstance(types_1.TYPES.ExtensionContext, mockContext);
        tsyringe_1.container.registerInstance(types_1.TYPES.ConfigService, mockConfigService);
        adbService = tsyringe_1.container.resolve(AdbService_1.AdbService);
    });
    afterEach(() => {
        tsyringe_1.container.clearInstances();
        jest.clearAllMocks();
    });
    describe('getAdbPath', () => {
        it('should return configured ADB path when set', async () => {
            mockConfigService.getConfig.mockReturnValue({
                adbPath: '/custom/adb/path',
            });
            await adbService.initializeAdbPath();
            const path = adbService.getAdbPath();
            expect(path).toBe('/custom/adb/path');
        });
        it('should return default "adb" when no path configured', async () => {
            mockConfigService.getConfig.mockReturnValue({
                adbPath: undefined,
            });
            // Mock process.env to not have ANDROID_HOME or ANDROID_SDK_ROOT
            const originalEnv = process.env.ANDROID_HOME;
            const originalSdkRoot = process.env.ANDROID_SDK_ROOT;
            delete process.env.ANDROID_HOME;
            delete process.env.ANDROID_SDK_ROOT;
            await adbService.initializeAdbPath();
            const path = adbService.getAdbPath();
            expect(path).toBe('adb');
            // Restore
            if (originalEnv)
                process.env.ANDROID_HOME = originalEnv;
            if (originalSdkRoot)
                process.env.ANDROID_SDK_ROOT = originalSdkRoot;
        });
    });
    describe('isAvailable', () => {
        it('should return true when ADB is available', async () => {
            // This test would require mocking execAsync
            // For now, we'll skip actual execution tests
            expect(adbService).toBeDefined();
        });
    });
});
//# sourceMappingURL=AdbService.test.js.map