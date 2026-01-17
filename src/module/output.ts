import { injectable } from 'tsyringe';
import { window, OutputChannel } from 'vscode';

@injectable()
export class Output {
    private output: OutputChannel;
    constructor(name: string = 'Android Studio Lite') {
        this.output = window.createOutputChannel(name);
    }
    public append(msg: string, level: string = "info") {
        let o = msg;
        if (msg === "") {
            return;
        }

        if (level === "error") {
            o = "[ERR] " + msg;
        }

        this.output.appendLine(o);
    }

    public appendTime() {
        let current = new Date();
        this.output.appendLine("\nCurrent: " + current + "\n");
    }
    public clear() {
        this.output.clear();
    }

    public show() {
        this.output.show(true);
    }
    public hide() {
        this.output.hide();
    }
}
