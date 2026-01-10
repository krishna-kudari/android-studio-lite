import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Generates HTML for a webview that uses Lit components.
 * This sets up the necessary script tags and imports for Lit elements.
 */
export function generateWebviewHtml(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
	title: string,
	bodyContent: string,
	additionalScripts?: string[],
	additionalStyles?: string[]
): string {
	// Get the path to the lit library in node_modules
	const litUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit', 'index.js')
	);

	// Get the path to the compiled webview components
	const avdDropdownUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'out', 'webviews', 'shared', 'components', 'avd-dropdown.js')
	);

	const scripts = [
		`<script type="module">
            console.log('[Webview HTML] Loading Lit from:', '${litUri}');
            import('${litUri}').then(() => {
                console.log('[Webview HTML] Lit loaded successfully');
            }).catch(err => {
                console.error('[Webview HTML] Failed to load Lit:', err);
            });
        </script>`,
		`<script type="module">
            console.log('[Webview HTML] Loading component from:', '${avdDropdownUri}');
            import('${avdDropdownUri}').then(() => {
                console.log('[Webview HTML] Component loaded successfully');
            }).catch(err => {
                console.error('[Webview HTML] Failed to load component:', err);
            });
        </script>`,
		...(additionalScripts || [])
	].join('\n');

	const styles = (additionalStyles || []).join('\n');

	// Get the path to lit library files
	const litIndexUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit', 'index.js')
	);
	const litDecoratorsUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit', 'decorators.js')
	);
	const litElementUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit', 'element.js')
	);

	// Get base path for lit subpath imports
	const litBaseUri = litIndexUri.toString().replace('/index.js', '');

	// Get paths for @lit packages (dependencies of lit)
	const reactiveElementUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', '@lit', 'reactive-element', 'reactive-element.js')
	);
	const reactiveElementBaseUri = reactiveElementUri.toString().replace('/reactive-element.js', '');

	// Get paths for lit-html (dependency of lit)
	const litHtmlUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit-html', 'lit-html.js')
	);
	const litHtmlBaseUri = litHtmlUri.toString().replace('/lit-html.js', '');
	const litHtmlIsServerUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit-html', 'is-server.js')
	);

	// Get paths for lit-element (dependency of lit)
	const litElementPkgUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'node_modules', 'lit-element', 'lit-element.js')
	);
	const litElementPkgBaseUri = litElementPkgUri.toString().replace('/lit-element.js', '');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';">
	<title>${title}</title>
	<script type="importmap">
	{
		"imports": {
			"lit": "${litIndexUri}",
			"lit/": "${litBaseUri}/",
			"lit/decorators.js": "${litDecoratorsUri}",
			"lit/element.js": "${litElementUri}",
			"lit-element": "${litElementPkgUri}",
			"lit-element/": "${litElementPkgBaseUri}/",
			"@lit/reactive-element": "${reactiveElementUri}",
			"@lit/reactive-element/": "${reactiveElementBaseUri}/",
			"lit-html": "${litHtmlUri}",
			"lit-html/": "${litHtmlBaseUri}/",
			"lit-html/is-server.js": "${litHtmlIsServerUri}",
			"@lit/reactive-element/css-tag.js": "${webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@lit', 'reactive-element', 'css-tag.js'))}"
		}
	}
	</script>
	<style>
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
			margin: 0;
			padding: 8px;
			box-sizing: border-box;
			min-height: 100vh;
		}
		/* Ensure element is visible even before Lit loads */
		avd-dropdown {
			display: block;
			width: 100%;
			min-height: 50px;
		}
		${styles}
	</style>
</head>
<body>
	${bodyContent}
	${scripts}
</body>
</html>`;
}

/**
 * Example usage template for a webview with panes
 */
export function getWebviewPaneExample(): string {
	return `
<webview-pane-group flexible>
	<webview-pane collapsable expanded>
		<span slot="title">AVD Manager</span>
		<span slot="subtitle">Android Virtual Devices</span>
		<div>
			<!-- Your content here -->
		</div>
	</webview-pane>

	<webview-pane collapsable expanded flexible>
		<span slot="title">Device Details</span>
		<div>
			<!-- Your content here -->
		</div>
	</webview-pane>
</webview-pane-group>
	`;
}
