import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import * as vscode from 'vscode';
import { TYPES } from './types';

// Core services
import { ConfigService } from '../config';
import { Output } from '../module/output';
import { Cache } from '../module/cache';

// Android services
import { AndroidService } from '../service/AndroidService';
import { AVDService } from '../service/AVDService';
import { BuildVariantService } from '../service/BuildVariantService';
import { GradleService } from '../service/GradleService';
import { SdkInstallerService } from '../service/SdkInstallerService';
import { LogcatService } from '../service/Logcat';

// Command registry
import { CommandRegistry } from '../commands/CommandRegistry';

// Event system
import { EventBus } from '../events/EventBus';

/**
 * Setup and configure the dependency injection container.
 *
 * This function registers all services and their dependencies in the container.
 * It should be called once during extension activation.
 *
 * @param context VS Code extension context
 * @returns Configured dependency container
 */
export function setupContainer(context: vscode.ExtensionContext): DependencyContainer {
    // Clear container to avoid conflicts during hot reload
    container.clearInstances();

    // Register VS Code Extension Context as singleton
    container.registerInstance<vscode.ExtensionContext>(TYPES.ExtensionContext, context);

    // Register core utilities as singletons
    container.registerSingleton<ConfigService>(TYPES.ConfigService, ConfigService);
    // Output needs to be a singleton to avoid creating multiple output channels
    const output = new Output('Android Studio Lite');
    container.registerInstance<Output>(TYPES.Output, output);
    container.registerSingleton<Cache>(TYPES.Cache, Cache);

    // Register EventBus as singleton (needed by services)
    const eventBus = EventBus.getInstance();
    container.registerInstance<EventBus>(TYPES.EventBus, eventBus);

    // Register Android services
    // AndroidService uses @injectable() decorator, so tsyringe can resolve dependencies automatically
    container.register<AndroidService>(TYPES.AndroidService, {
        useFactory: (dependencyContainer) => {
            const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
            const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            const sdkInstaller = dependencyContainer.resolve<SdkInstallerService>(TYPES.SdkInstallerService);
            return new AndroidService(cache, configService, output, sdkInstaller);
        },
    });

    // Register Android services with DI
    // These services use @injectable() decorator, so tsyringe can resolve dependencies automatically
    container.register<AVDService>(TYPES.AVDService, {
        useFactory: (dependencyContainer) => {
            const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
            const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            const androidService = dependencyContainer.resolve<AndroidService>(TYPES.AndroidService);
            const context = dependencyContainer.resolve<vscode.ExtensionContext>(TYPES.ExtensionContext);
            const eventBus = dependencyContainer.resolve<EventBus>(TYPES.EventBus);
            return new AVDService(cache, configService, output, androidService, context, eventBus);
        },
    });

    container.register<BuildVariantService>(TYPES.BuildVariantService, {
        useFactory: (dependencyContainer) => {
            const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
            const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            const context = dependencyContainer.resolve<vscode.ExtensionContext>(TYPES.ExtensionContext);
            const eventBus = dependencyContainer.resolve<EventBus>(TYPES.EventBus);
            return new BuildVariantService(cache, configService, output, context, eventBus);
        },
    });

    container.register<GradleService>(TYPES.GradleService, {
        useFactory: (dependencyContainer) => {
            const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
            const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            const eventBus = dependencyContainer.resolve<EventBus>(TYPES.EventBus);
            return new GradleService(cache, configService, output, eventBus);
        },
    });

    container.register<SdkInstallerService>(TYPES.SdkInstallerService, {
        useFactory: (dependencyContainer) => {
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            return new SdkInstallerService(output);
        },
    });

    // Register LogcatService (from Logcat.ts) - needs factory
    container.register<LogcatService>(TYPES.LogcatService, {
        useFactory: (dependencyContainer) => {
            const cache = dependencyContainer.resolve<Cache>(TYPES.Cache);
            const configService = dependencyContainer.resolve<ConfigService>(TYPES.ConfigService);
            const output = dependencyContainer.resolve<Output>(TYPES.Output);
            const avdService = dependencyContainer.resolve<AVDService>(TYPES.AVDService);
            const buildVariantService = dependencyContainer.resolve<BuildVariantService>(TYPES.BuildVariantService);
            const eventBus = dependencyContainer.resolve<EventBus>(TYPES.EventBus);
            return new LogcatService(cache, configService, output, avdService, buildVariantService, eventBus);
        },
    });

    // Register Command Registry as singleton
    container.registerSingleton<CommandRegistry>(TYPES.CommandRegistry, CommandRegistry);

    return container;
}

/**
 * Get the configured dependency container.
 *
 * @returns The global dependency container
 */
export function getContainer(): DependencyContainer {
    return container;
}

/**
 * Resolve a dependency from the container.
 *
 * @param token The dependency token (from TYPES)
 * @returns The resolved dependency instance
 */
export function resolve<T>(token: symbol): T {
    return container.resolve<T>(token);
}
