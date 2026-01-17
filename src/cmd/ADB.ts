import { Output } from "../module/output";
import { CommandType, Executable, ICommandProp } from "./Executable";

export enum Command {
    logcat = "logcat",
    devices = "devices",
    shellGetprop = "shellGetprop",
    emuAvdName = "emuAvdName",
}

let commands: { [key in Command]?: ICommandProp } = {
    // adb -s emulator-5554 logcat --pid=$(adb -s emulator-5554 shell pidof com.example.androidstudio-lite) -v threadtime '*:W'
    [Command.logcat]: {
        log: true,
        command: '{{exe}} -s {{0}} logcat --pid=$({{exe}} -s {{0}} shell pidof {{1}}) -v threadtime {{2}}',
        type: CommandType.spawn,
        msg: "Starting logcat...",
        successMsg: "Logcat started successfully.",
        failureMsg: "Failed to start logcat.",
    },
    // adb devices
    [Command.devices]: {
        log: false,
        command: '{{exe}} devices',
        type: CommandType.runOnly,
    },
    // adb -s {deviceId} shell getprop {property}
    [Command.shellGetprop]: {
        log: false,
        command: '{{exe}} -s {{0}} shell getprop {{1}}',
        type: CommandType.runOnly,
    },
    // adb -s {deviceId} emu avd name
    [Command.emuAvdName]: {
        log: false,
        command: '{{exe}} -s {{0}} emu avd name',
        type: CommandType.runOnly,
    },
};

export class ADBExecutable extends Executable {
    constructor(output: Output, adbPath?: string) {
        super(output, adbPath || "adb", commands);
    }
}
