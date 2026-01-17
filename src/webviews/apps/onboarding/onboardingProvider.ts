import { WebviewHost, WebviewProvider, WebviewShowingArgs } from "../../webviewProvider";
import { OnboardingState } from "../../protocol";
import { Disposable } from "vscode";
import { AndroidSdkDetector } from "../../../utils/androidSdkDetector";

export class OnboardingWebviewProvider implements WebviewProvider<OnboardingState> {
    constructor(private readonly host: WebviewHost) {}

	getTelemetryContext() {
		return { 'webview.id': this.host.id };
	}

	includeBootstrap(): OnboardingState {
		const platform = process.platform as 'darwin' | 'win32' | 'linux';
		const detectedSdkPath = AndroidSdkDetector.detectSdkPath();
		const hasSdk = !!detectedSdkPath;

		let sdkInfo;
		if (detectedSdkPath) {
			const analyzed = AndroidSdkDetector.analyzeSdk(detectedSdkPath);
			sdkInfo = {
				hasCommandLineTools: analyzed.hasCommandLineTools,
				hasPlatformTools: analyzed.hasPlatformTools,
				hasBuildTools: analyzed.hasBuildTools,
				hasEmulator: analyzed.hasEmulator,
			};
		}

		return {
			...this.host.baseWebviewState,
			hasSdk,
			sdkPath: detectedSdkPath || undefined,
			platform,
			sdkInfo,
		};
	}

	onReady(): void {
		console.log('Onboarding webview ready');
	}

	dispose(): void {}
}
