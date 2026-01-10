/**
 * WebviewPanel provider for the Manifest Chain Visualizer.
 * Displays an interactive vis.js network diagram showing manifest supersession relationships.
 */

import * as vscode from "vscode";
import * as path from "path";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { log } from "../utils";
import { ManifestIndex } from "../manifestIndex";

/**
 * Manifest chain node data structure
 */
export interface ManifestChainNode {
  id: string;
  label: string;
  path: string;
  goal?: string;
  level: number; // 0 = current, negative = parents, positive = children
}

/**
 * Manifest chain edge data structure
 */
export interface ManifestChainEdge {
  from: string;
  to: string;
  arrows: string;
  label?: string;
}

/**
 * Manifest chain data structure
 */
export interface ManifestChainData {
  nodes: ManifestChainNode[];
  edges: ManifestChainEdge[];
  currentManifest: string;
}

/**
 * Manages the Manifest Chain Visualizer webview panel.
 */
export class ManifestChainPanel {
  public static currentPanel: ManifestChainPanel | undefined;
  public static readonly viewType = "maidManifestChain";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _manifestIndex: ManifestIndex | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _currentManifestPath: string | undefined;

  /**
   * Create or show the Manifest Chain panel.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    manifestPath?: string,
    manifestIndex?: ManifestIndex
  ): ManifestChainPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and update manifest if provided
    if (ManifestChainPanel.currentPanel) {
      ManifestChainPanel.currentPanel._panel.reveal(column);
      if (manifestPath) {
        ManifestChainPanel.currentPanel.setManifest(manifestPath);
      }
      return ManifestChainPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ManifestChainPanel.viewType,
      "MAID Manifest Chain",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    ManifestChainPanel.currentPanel = new ManifestChainPanel(
      panel,
      extensionUri,
      manifestIndex
    );
    if (manifestPath) {
      ManifestChainPanel.currentPanel.setManifest(manifestPath);
    }
    return ManifestChainPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    manifestIndex?: ManifestIndex
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._manifestIndex = manifestIndex;

    // Set the webview's initial HTML content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Watch for theme changes
    vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        this._postMessage({
          type: "themeChanged",
          payload: {
            kind:
              theme.kind === vscode.ColorThemeKind.Light
                ? "light"
                : theme.kind === vscode.ColorThemeKind.HighContrast ||
                  theme.kind === vscode.ColorThemeKind.HighContrastLight
                ? "high-contrast"
                : "dark",
          },
        });
      },
      null,
      this._disposables
    );

    // Try to get manifest from active editor if not provided
    if (!this._currentManifestPath) {
      const activeEditor = vscode.window.activeTextEditor;
      if (
        activeEditor &&
        activeEditor.document.uri.fsPath.endsWith(".manifest.json")
      ) {
        this.setManifest(activeEditor.document.uri.fsPath);
      }
    }
  }

  /**
   * Set the manifest to visualize.
   */
  public setManifest(manifestPath: string): void {
    this._currentManifestPath = manifestPath;
    this._loadAndSendChainData();
  }

  /**
   * Post a message to the webview.
   */
  private _postMessage(message: ExtensionToWebviewMessage): void {
    this._panel.webview.postMessage(message);
  }

  /**
   * Handle messages from the webview.
   */
  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        log("[ManifestChainPanel] Webview ready, loading data...");
        await this._loadAndSendChainData();
        break;

      case "refresh":
        log("[ManifestChainPanel] Refresh requested");
        await this._loadAndSendChainData();
        break;

      case "openManifest":
        log(`[ManifestChainPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._openManifest(message.payload.manifestPath);
        break;

      case "setManifest":
        log(`[ManifestChainPanel] Setting manifest: ${message.payload.manifestPath}`);
        this.setManifest(message.payload.manifestPath);
        break;
    }
  }

  /**
   * Open a manifest file in the editor.
   */
  private async _openManifest(manifestPath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(manifestPath);
      await vscode.window.showTextDocument(document);
      // Update the panel to show the new manifest's chain
      this.setManifest(manifestPath);
    } catch (error: any) {
      log(`[ManifestChainPanel] Error opening manifest: ${error.message}`, "error");
      vscode.window.showErrorMessage(`Could not open manifest: ${manifestPath}`);
    }
  }

  /**
   * Load chain data from manifest index and send to webview.
   */
  private async _loadAndSendChainData(): Promise<void> {
    if (!this._currentManifestPath) {
      this._postMessage({
        type: "error",
        payload: { message: "No manifest selected. Please open a manifest file." },
      });
      return;
    }

    if (!this._manifestIndex) {
      this._postMessage({
        type: "error",
        payload: { message: "Manifest index not available. Please wait for initialization." },
      });
      return;
    }

    this._postMessage({ type: "loading", payload: { isLoading: true } });

    try {
      // Store current manifest path in local variable to ensure it's defined
      const currentManifestPath = this._currentManifestPath;
      if (!currentManifestPath) {
        throw new Error("Current manifest path is not set");
      }

      const chain = this._manifestIndex.getSupersessionChain(currentManifestPath);
      const entry = this._manifestIndex.getManifestEntry(currentManifestPath);

      // Build nodes
      const nodes: ManifestChainNode[] = [];
      const edges: ManifestChainEdge[] = [];

      // Current manifest (level 0)
      const currentLabel = path.basename(currentManifestPath, ".manifest.json");
      nodes.push({
        id: currentManifestPath,
        label: currentLabel,
        path: currentManifestPath,
        goal: entry?.goal,
        level: 0,
      });

      // Parent manifests (level -1, -2, etc.)
      const addParents = (parentPaths: string[], level: number): void => {
        for (const parentPath of parentPaths) {
          const parentEntry = this._manifestIndex!.getManifestEntry(parentPath);
          const parentLabel = path.basename(parentPath, ".manifest.json");
          nodes.push({
            id: parentPath,
            label: parentLabel,
            path: parentPath,
            goal: parentEntry?.goal,
            level: level,
          });

          // Add edge from parent to current
          edges.push({
            from: parentPath,
            to: currentManifestPath,
            arrows: "to",
            label: "supersedes",
          });

          // Recursively add grandparents
          if (parentEntry && parentEntry.supersededBy.length > 0) {
            addParents(parentEntry.supersededBy, level - 1);
          }
        }
      };

      // Child manifests (level 1, 2, etc.)
      const addChildren = (childPaths: string[], level: number): void => {
        for (const childPath of childPaths) {
          const childEntry = this._manifestIndex!.getManifestEntry(childPath);
          const childLabel = path.basename(childPath, ".manifest.json");
          nodes.push({
            id: childPath,
            label: childLabel,
            path: childPath,
            goal: childEntry?.goal,
            level: level,
          });

          // Add edge from current to child
          edges.push({
            from: currentManifestPath,
            to: childPath,
            arrows: "to",
            label: "supersedes",
          });

          // Recursively add grandchildren
          if (childEntry && childEntry.supersedes.length > 0) {
            addChildren(childEntry.supersedes, level + 1);
          }
        }
      };

      // Add parents and children
      if (chain.parents.length > 0) {
        addParents(chain.parents, -1);
      }
      if (chain.children.length > 0) {
        addChildren(chain.children, 1);
      }

      const chainData: ManifestChainData = {
        nodes,
        edges,
        currentManifest: currentManifestPath,
      };

      log(
        `[ManifestChainPanel] Loaded chain: ${nodes.length} nodes, ${edges.length} edges`
      );

      this._postMessage({
        type: "chainData",
        payload: chainData,
      });
    } catch (error: any) {
      log(`[ManifestChainPanel] Error loading chain: ${error.message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load manifest chain: ${error.message}`,
        },
      });
    }
  }

  /**
   * Update the webview HTML content.
   */
  private _update(): void {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  /**
   * Generate the HTML content for the webview.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the URIs for the webview resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "main.css")
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data:;
        font-src ${webview.cspSource};
    ">
    <title>MAID Manifest Chain</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="manifestChain"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    ManifestChainPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[ManifestChainPanel] Disposed");
  }
}

/**
 * Generate a nonce for script security.
 */
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
