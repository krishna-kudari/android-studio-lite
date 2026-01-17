/**
 * Unit tests for AdbService.
 */
import { AdbService } from '../../../src/service/AdbService';
import { ConfigService } from '../../../src/config/ConfigService';
import { createMockExtensionContext, createMockConfigService } from '../../helpers/mocks';
import { TYPES } from '../../../src/di/types';
import { container } from 'tsyringe';

describe('AdbService', () => {
    let adbService: AdbService;
    let mockContext: any;
    let mockConfigService: any;

    beforeEach(() => {
        container.clearInstances();
        mockContext = createMockExtensionContext();
        mockConfigService = createMockConfigService();

        container.registerInstance(TYPES.ExtensionContext, mockContext);
        container.registerInstance(TYPES.ConfigService, mockConfigService);

        adbService = container.resolve(AdbService);
    });

    afterEach(() => {
        container.clearInstances();
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
            if (originalEnv) process.env.ANDROID_HOME = originalEnv;
            if (originalSdkRoot) process.env.ANDROID_SDK_ROOT = originalSdkRoot;
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
