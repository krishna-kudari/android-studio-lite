import * as vscode from 'vscode';
import * as path from 'path';
import { AVD } from '../cmd/AVDManager';
import { AVDService } from '../service/AVDService';
import { generateWebviewHtml } from './webview-html';

export class AVDDropdownViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'android-studio-lite-avd-dropdown';

    private _view?: vscode.WebviewView;
    private _selectedAVD: AVD | null = null;
    private _avdTreeViewProvider?: { refresh: () => void };

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _avdService: AVDService
    ) { }

    public setAVDTreeViewProvider(provider: { refresh: () => void }) {
        this._avdTreeViewProvider = provider;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('[AVDDropdown] resolveWebviewView called!');
        this._view = webviewView;

        const extensionUri = this._context.extensionUri;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        };

        console.log('[AVDDropdown] Setting webview HTML...');
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, extensionUri);
        console.log('[AVDDropdown] Webview HTML set');

        // Set up message handler
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                console.log('[AVDDropdown] Received message:', message.command);
                switch (message.command) {
                    case 'getAVDList':
                        console.log('[AVDDropdown] Handling getAVDList request');
                        await this._sendAVDList();
                        break;
                    case 'selectAVD':
                        console.log('[AVDDropdown] Handling selectAVD request:', message.avdName);
                        await this._selectAVD(message.avdName);
                        break;
                    case 'webview-ready':
                        console.log('[AVDDropdown] Webview is ready, sending initial data');
                        await this._sendAVDList();
                        break;
                }
            },
            undefined,
            this._context.subscriptions
        );

        // Load initial data when webview becomes visible
        webviewView.onDidChangeVisibility(() => {
            console.log('[AVDDropdown] Visibility changed, visible:', webviewView.visible);
            if (webviewView.visible) {
                void this._loadInitialData();
            }
        });

        // Load initial data if already visible
        if (webviewView.visible) {
            console.log('[AVDDropdown] Webview already visible, loading initial data');
            void this._loadInitialData();
        } else {
            console.log('[AVDDropdown] Webview not visible yet, will load when visible');
        }
    }

    private async _loadInitialData() {
        console.log('[AVDDropdown] _loadInitialData called');
        try {
            // Load selected AVD from AVDService
            const savedAVDName = this._avdService.getSelectedAVDName();
            console.log('[AVDDropdown] Saved AVD name:', savedAVDName);

            // Get AVD list from cache (don't refetch)
            await this._sendAVDList();

            // If there's a saved selection, restore it
            if (savedAVDName) {
                const avds = await this._avdService.getAVDList(); // Use cached data
                console.log('[AVDDropdown] Found', avds?.length || 0, 'AVDs, looking for:', savedAVDName);
                if (avds) {
                    const avd = avds.find((a: AVD) => a.name === savedAVDName);
                    if (avd) {
                        console.log('[AVDDropdown] Restoring saved AVD:', avd.name);
                        this._selectedAVD = avd;
                        await this._updateSelectedAVD();
                    }
                }
            } else {
                // Select first AVD by default if available
                const avds = await this._avdService.getAVDList(); // Use cached data
                console.log('[AVDDropdown] No saved AVD, found', avds?.length || 0, 'AVDs');
                if (avds && avds.length > 0) {
                    console.log('[AVDDropdown] Selecting first AVD:', avds[0].name);
                    await this._selectAVD(avds[0].name);
                }
            }
        } catch (error) {
            console.error('[AVDDropdown] Error in _loadInitialData:', error);
        }
    }

    private async _sendAVDList() {
        if (!this._view) {
            console.log('[AVDDropdown] _sendAVDList: No view available');
            return;
        }

        if (!this._view.visible) {
            console.log('[AVDDropdown] _sendAVDList: View not visible, skipping');
            return;
        }

        try {
            console.log('[AVDDropdown] _sendAVDList: Fetching AVD list from cache...');
            // Use cached AVD list (don't refetch)
            const avds = await this._avdService.getAVDList();
            const avdList = avds || [];
            console.log('[AVDDropdown] _sendAVDList: Found', avdList.length, 'AVDs, selected:', this._selectedAVD?.name || 'none');

            this._view.webview.postMessage({
                command: 'updateAVDList',
                avds: avdList,
                selectedAVD: this._selectedAVD
            });
            console.log('[AVDDropdown] _sendAVDList: Message sent to webview');
        } catch (error) {
            console.error('[AVDDropdown] Error loading AVD list:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateAVDList',
                    avds: [],
                    selectedAVD: null,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }

    private async _selectAVD(avdName: string) {
        // Use cached AVD list (don't refetch)
        const avds = await this._avdService.getAVDList();
        if (!avds) {
            return;
        }

        const avd = avds.find((a: AVD) => a.name === avdName);
        if (avd) {
            this._selectedAVD = avd;
            await this._avdService.setSelectedAVDName(avdName);
            await this._updateSelectedAVD();
        }
    }

    private async _updateSelectedAVD() {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({
            command: 'updateSelectedAVD',
            selectedAVD: this._selectedAVD
        });
    }

    public async refresh() {
        console.log('[AVDDropdown] refresh called');
        try {
            // Refresh the AVD list in cache (this will be called by AVDTreeView when it refreshes)
            await this._avdService.getAVDList(true);
            console.log('[AVDDropdown] Cache refreshed, sending to webview');
            // Send updated list to webview
            await this._sendAVDList();
        } catch (error) {
            console.error('[AVDDropdown] Error in refresh:', error);
        }
    }

    public getSelectedAVD(): AVD | null {
        return this._selectedAVD;
    }

    private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // Use Lit-based webview components
        // Add fallback content that shows immediately
        const bodyContent = `
            <div id="fallback-content" style="padding: 8px; color: var(--vscode-foreground);">
                <div style="font-size: 11px; margin-bottom: 4px; color: var(--vscode-descriptionForeground); text-transform: uppercase;">AVD / Emulator</div>
                <div style="padding: 3px 8px; background-color: var(--vscode-dropdown-background); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px; font-size: 12px; min-height: 22px; display: flex; align-items: center;">
                    <span style="color: var(--vscode-input-placeholderForeground);">Loading...</span>
                </div>
            </div>
            <avd-dropdown id="avdDropdown" style="display: none;"></avd-dropdown>
        `;

        // Add cache-busting query parameter to ensure fresh load
        const avdDropdownPath = vscode.Uri.joinPath(extensionUri, 'out', 'webviews', 'shared', 'components', 'avd-dropdown.js');
        const avdDropdownUri = webview.asWebviewUri(avdDropdownPath).with({ query: `v=${Date.now()}` });

        const scriptContent = `<script>
            // Immediate test to verify script execution
            console.log('[AVDDropdown Webview] INLINE SCRIPT EXECUTING!');
            console.log('[AVDDropdown Webview] Document ready state:', document.readyState);
            console.log('[AVDDropdown Webview] Body exists:', !!document.body);
        </script>
        <script type="module">
            (async () => {
                try {
                    console.log('[AVDDropdown Webview] MODULE SCRIPT loading...');
                    console.log('[AVDDropdown Webview] Component URI:', '${avdDropdownUri}');

                    const vscode = acquireVsCodeApi();
                    console.log('[AVDDropdown Webview] VS Code API acquired');

                    // Store messages until component is ready
                    let pendingMessages = [];

                    // Set up message handler immediately (before component loads)
                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.log('[AVDDropdown Webview] Received message:', message.command, message);

                        const dropdown = document.getElementById('avdDropdown');
                        if (!dropdown) {
                            console.warn('[AVDDropdown Webview] Dropdown element not found, storing message');
                            pendingMessages.push(message);
                            return;
                        }

                        // Process message
                        processMessage(dropdown, message);
                    });

                    function processMessage(dropdown, message) {
                        switch (message.command) {
                            case 'updateAVDList':
                                console.log('[AVDDropdown Webview] Updating AVD list:', message.avds?.length || 0, 'items');
                                try {
                                    // Use update methods if available, otherwise set properties directly
                                    if (dropdown.updateAVDs) {
                                        dropdown.updateAVDs(message.avds || []);
                                    } else {
                                        dropdown.avds = message.avds || [];
                                    }

                                    if (dropdown.updateSelectedAVD) {
                                        dropdown.updateSelectedAVD(message.selectedAVD || null);
                                    } else {
                                        dropdown.selectedAVD = message.selectedAVD || null;
                                    }

                                    if (message.error) {
                                        console.error('[AVDDropdown Webview] Error:', message.error);
                                        if (dropdown.setError) {
                                            dropdown.setError(message.error);
                                        }
                                    } else {
                                        if (dropdown.setError) {
                                            dropdown.setError(null);
                                        }
                                        if (dropdown.setLoading) {
                                            dropdown.setLoading(false);
                                        }
                                    }

                                    // Force update
                                    if (dropdown.requestUpdate) {
                                        dropdown.requestUpdate();
                                    }
                                    console.log('[AVDDropdown Webview] Component updated, avds:', dropdown.avds?.length || 0);
                                } catch (err) {
                                    console.error('[AVDDropdown Webview] Error updating component:', err);
                                }
                                break;
                            case 'updateSelectedAVD':
                                console.log('[AVDDropdown Webview] Updating selected AVD:', message.selectedAVD?.name || 'none');
                                try {
                                    if (dropdown.updateSelectedAVD) {
                                        dropdown.updateSelectedAVD(message.selectedAVD || null);
                                    } else {
                                        dropdown.selectedAVD = message.selectedAVD || null;
                                    }
                                    if (dropdown.requestUpdate) {
                                        dropdown.requestUpdate();
                                    }
                                } catch (err) {
                                    console.error('[AVDDropdown Webview] Error updating selected AVD:', err);
                                }
                                break;
                        }
                    }

                    // Hide fallback and show component when ready
                    const showComponent = () => {
                        const fallback = document.getElementById('fallback-content');
                        const dropdown = document.getElementById('avdDropdown');
                        if (fallback) {
                            fallback.style.display = 'none';
                        }
                        if (dropdown) {
                            dropdown.style.display = 'block';
                        }
                    };

                    // Try to import the component
                    try {
                        console.log('[AVDDropdown Webview] Importing component from:', '${avdDropdownUri}');
                        const componentModule = await import('${avdDropdownUri}');
                        console.log('[AVDDropdown Webview] Component imported successfully:', Object.keys(componentModule));
                    } catch (importError) {
                        console.error('[AVDDropdown Webview] Failed to import component:', importError);
                        console.error('[AVDDropdown Webview] Import error details:', {
                            name: importError.name,
                            message: importError.message,
                            stack: importError.stack,
                            cause: importError.cause
                        });
                        throw importError;
                    }

                    // Wait for custom element to be defined
                    console.log('[AVDDropdown Webview] Waiting for custom element...');
                    await customElements.whenDefined('avd-dropdown');
                    console.log('[AVDDropdown Webview] Custom element defined!');

                    const dropdown = document.getElementById('avdDropdown');
                    if (!dropdown) {
                        console.error('[AVDDropdown Webview] Dropdown element not found after custom element defined');
                        return;
                    }

                    console.log('[AVDDropdown Webview] Dropdown element found, setting up listeners');
                    showComponent();

                    // Process any pending messages
                    if (pendingMessages.length > 0) {
                        console.log('[AVDDropdown Webview] Processing', pendingMessages.length, 'pending messages');
                        pendingMessages.forEach(msg => processMessage(dropdown, msg));
                        pendingMessages = [];
                    }

                    // Listen for AVD selection
                    dropdown.addEventListener('avd-selected', (e) => {
                        console.log('[AVDDropdown Webview] AVD selected:', e.detail.avd.name);
                        vscode.postMessage({
                            command: 'selectAVD',
                            avdName: e.detail.avd.name
                        });
                    });

                    // Listen for request to get AVD list
                    window.addEventListener('request-avd-list', () => {
                        console.log('[AVDDropdown Webview] Request for AVD list received');
                        vscode.postMessage({ command: 'getAVDList' });
                    });

                    // Notify extension that webview is ready
                    console.log('[AVDDropdown Webview] Notifying extension that webview is ready');
                    vscode.postMessage({ command: 'webview-ready' });

                    // Also request initial data
                    console.log('[AVDDropdown Webview] Requesting initial AVD list');
                    vscode.postMessage({ command: 'getAVDList' });
                } catch (err) {
                    console.error('[AVDDropdown Webview] Fatal error:', err);
                    console.error('[AVDDropdown Webview] Error stack:', err.stack);
                    console.error('[AVDDropdown Webview] Error name:', err.name);
                    const fallback = document.getElementById('fallback-content');
                    if (fallback) {
                        const errorMsg = err.message || String(err);
                        const errorStack = err.stack ? '<br><pre style="font-size: 10px; opacity: 0.7;">' + err.stack + '</pre>' : '';
                        fallback.innerHTML = '<div style="color: var(--vscode-errorForeground); padding: 8px;">Error loading component: ' + errorMsg + errorStack + '</div>';
                    }
                }
            })();
        </script>`;

        return generateWebviewHtml(webview, extensionUri, 'AVD Selector', bodyContent, [scriptContent]);
    }
}
