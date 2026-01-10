import * as ModuleCmd from "../module/cmd";
import { Manager } from "../core";
import * as util from "../module/util";

export interface ICommandPathform {
    linux: string,
    window: string,
    macOS: string,
}

export enum CommandType {
    runOnly,
    progress,
    spawn,
    spawnSync,
}

export interface ICommandProp {
    log?: boolean,
    type?: CommandType;
    command: ICommandPathform | string;
    msg?: string;
    successMsg?: string;
    failureMsg?: string;
    parser?: Function;
}

export abstract class Executable {
    constructor(
        protected manager: Manager,
        protected executable: string,
        protected commands: { [key: string]: ICommandProp }
    ) {
    }

    getCommand(name: string): ICommandProp {
        return this.commands[name];
    }

    getCmd(prop: ICommandProp, ...params: string[]) {
        if (prop.command === "") {
            console.error("exec not found", prop);
            return "";
        }

        let cmd = (typeof prop.command === "string") ?
            prop.command :
            prop.command[this.manager.getPlatform()];

        cmd = util.strformatNamed((cmd ?? ""), { "exe": this.executable });
        return util.strformat(cmd, ...params);
    }

    async exec<T>(name: string, ...params: (string | { cwd?: string })[]): Promise<T | undefined> {
        let prop = this.getCommand(name) ?? { command: "" };
        if (prop.command === "") {
            console.error("exec not found", prop);
            return undefined;
        }

        // Extract cwd from params if the last param is an options object
        let cwd: string | undefined = undefined;
        let actualParams: string[] = [];

        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            if (typeof param === 'object' && param !== null && 'cwd' in param) {
                // This is an options object
                cwd = (param as { cwd?: string }).cwd;
            } else if (typeof param === 'string') {
                // This is a regular string parameter
                actualParams.push(param);
            }
        }

        let cmd = this.getCmd(prop, ...actualParams);
        let msg = util.strformat(prop.msg ?? "", ...actualParams);
        let successMsg = util.strformat(prop.successMsg ?? "", ...actualParams);
        let failureMsg = util.strformat(prop.failureMsg ?? "", ...actualParams);

        let showLog = prop.log || false;
        if (showLog) {
            this.manager.output.show();
            this.manager.output.appendTime();
            this.manager.output.append("exec: " + cmd);
            if (cwd) {
                this.manager.output.append("cwd: " + cwd);
            }
        }

        console.log("exec:", cmd);
        if (cwd) {
            console.log("cwd:", cwd);
        }

        const exectype = prop.type ?? CommandType.progress;

        const exec = {
            [CommandType.runOnly]: ModuleCmd.execWithMsg,
            [CommandType.progress]: ModuleCmd.execWithProgress,
            [CommandType.spawn]: ModuleCmd.spawn,
            [CommandType.spawnSync]: ModuleCmd.spawnSync,
        };
        let next = exec[exectype](this.manager, showLog, cmd, msg, successMsg, failureMsg, cwd);
        return next.then((out) => (typeof prop.parser === "function") ? prop.parser(out) : out);
    }
}
