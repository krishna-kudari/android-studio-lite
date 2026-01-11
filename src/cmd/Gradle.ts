import { Manager } from '../core';
import { Executable, CommandType, ICommandProp } from './Executable';

export enum Command {
    install = "install",
    assemble = "assemble",
}

let commands: { [key in Command]?: ICommandProp } = {
    [Command.install]: {
        log: true,
        command: {
            linux: "./gradlew {{0}}",
            window: "gradlew.bat {{0}}",
            macOS: "./gradlew {{0}}",
        },
        type: CommandType.progress,
        msg: "Installing {{0}}...",
        successMsg: "{{0}} installed successfully.",
        failureMsg: "Failed to install {{0}}.",
    },
    [Command.assemble]: {
        log: true,
        command: {
            linux: "./gradlew {{0}}",
            window: "gradlew.bat {{0}}",
            macOS: "./gradlew {{0}}",
        },
        type: CommandType.progress,
        msg: "Assembling {{0}}...",
        successMsg: "{{0}} assembled successfully.",
        failureMsg: "Failed to assemble {{0}}.",
    },
};

export class GradleExecutable extends Executable {
    constructor(manager: Manager) {
        super(manager, "gradlew", commands);
    }
}
