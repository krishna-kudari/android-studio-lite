import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import * as vscode from 'vscode';
import { TYPES } from './types';

// Core services
import { Manager } from '../core';
import { ConfigService } from '../config';
import { Output } from '../module/ui';
import { Cache } from '../module/cache';

// Android services
import { AndroidService } from '../service/AndroidService';
import { AVDService } from '../service/AVDService';
import { BuildVariantService } from '../service/BuildVariantService';
import { GradleService } from '../service/GradleService';
import { SdkInstallerService } from '../service/SdkInstallerService';

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
    container.registerSingleton<Output>(TYPES.Output, Output);
    container.registerSingleton<Cache>(TYPES.Cache, Cache);

    // Register Manager instance (it's a singleton with private constructor)
    // We use registerInstance to register the singleton instance directly
    const managerInstance = Manager.getInstance();
    container.registerInstance<Manager>(TYPES.Manager, managerInstance);

    // Register Android services
    // These will be resolved with their dependencies injected
    container.register<AndroidService>(TYPES.AndroidService, {
        useFactory: (dependencyContainer) => {
            const manager = dependencyContainer.resolve<Manager>(TYPES.Manager);
            return new AndroidService(manager);
        },
    });

    container.register<AVDService>(TYPES.AVDService, {
        useFactory: (dependencyContainer) => {
            const manager = dependencyContainer.resolve<Manager>(TYPES.Manager);
            return new AVDService(manager);
        },
    });

    container.register<BuildVariantService>(TYPES.BuildVariantService, {
        useFactory: (dependencyContainer) => {
            const manager = dependencyContainer.resolve<Manager>(TYPES.Manager);
            return new BuildVariantService(manager);
        },
    });

    container.register<GradleService>(TYPES.GradleService, {
        useFactory: (dependencyContainer) => {
            const manager = dependencyContainer.resolve<Manager>(TYPES.Manager);
            return new GradleService(manager);
        },
    });

    container.register<SdkInstallerService>(TYPES.SdkInstallerService, {
        useFactory: (dependencyContainer) => {
            const manager = dependencyContainer.resolve<Manager>(TYPES.Manager);
            return new SdkInstallerService(manager);
        },
    });

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
