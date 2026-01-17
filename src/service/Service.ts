import { injectable, inject } from 'tsyringe';
import { TYPES } from '../di/types';
import { Cache } from '../module/cache';
import { ConfigService, IConfig } from '../config';
import { Output } from '../module/output';

/**
 * Base service class with dependency injection support.
 *
 * Services extending this class receive their dependencies via DI,
 * making them easier to test and more loosely coupled.
 *
 * Note: Abstract classes cannot use @injectable() decorator.
 * Concrete service implementations should use @injectable().
 */
export abstract class Service {
    constructor(
        @inject(TYPES.Cache) protected readonly cache: Cache,
        @inject(TYPES.ConfigService) protected readonly configService: ConfigService,
        @inject(TYPES.Output) protected readonly output: Output
    ) {}

    /**
     * Get a value from cache.
     */
    protected getCache(key: string) {
        return this.cache.get(key);
    }

    /**
     * Set a value in cache.
     * @param key - The key to store the value.
     * @param value - The value to store.
     * @param expire - The time to live in seconds. If not provided, the value will be cached for 30 seconds.
     */
    protected setCache(key: string, value: any, expire?: number) {
        this.cache.set(key, value, expire);
    }

    /**
     * Get configuration.
     */
    protected getConfig(): IConfig {
        return this.configService.getConfig();
    }
}
