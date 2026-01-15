/**
 * WebviewPanel provider for the Hierarchical System View.
 * Displays a tree-based navigation with drill-down/drill-up capabilities.
 */

import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  HierarchicalViewData,
} from "./messages";
import type { HierarchicalNode } from "../types";
import type { ManifestIndex } from "../manifestIndex";
import { log } from "../utils";

// Module-level reference to ManifestIndex for singleton-like access
let _sharedManifestIndex: ManifestIndex | undefined;

/**
 * Set the shared ManifestIndex instance for all HierarchicalViewPanel instances.
 */
export function _setSharedManifestIndex(index: ManifestIndex): void {
  _sharedManifestIndex = index;
}

/**
 * Manages the Hierarchical System View webview panel.
 */
export class HierarchicalViewPanel {
  public static _currentPanel: HierarchicalViewPanel | undefined;
  public static readonly _viewType = "maidHierarchicalView";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentLevel: number = 0;
  private _hierarchyData: HierarchicalNode[] = [];
  private _selectedNodeId: string | null = null;
  private _navigationStack: string[] = [];

  /**
   * Create or show the Hierarchical View panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): HierarchicalViewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (HierarchicalViewPanel._currentPanel) {
      HierarchicalViewPanel._currentPanel._panel.reveal(column);
      return HierarchicalViewPanel._currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      HierarchicalViewPanel._viewType,
      "MAID Hierarchical View",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    HierarchicalViewPanel._currentPanel = new HierarchicalViewPanel(panel, extensionUri);
    return HierarchicalViewPanel._currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

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
        log("[HierarchicalViewPanel] Webview ready");
        this._buildHierarchy();
        this._sendHierarchicalData();
        break;

      case "refresh":
        log("[HierarchicalViewPanel] Refresh requested");
        this._buildHierarchy();
        this._sendHierarchicalData();
        break;

      case "selectHierarchyNode":
        log(`[HierarchicalViewPanel] Node selected: ${message.payload.nodeId}`);
        this._selectedNodeId = message.payload.nodeId;
        this._sendHierarchicalData();
        break;

      case "drillDown":
        log(`[HierarchicalViewPanel] Drill down to: ${message.payload.nodeId}`);
        this._handleDrillDown(message.payload.nodeId);
        break;

      case "drillUp":
        log("[HierarchicalViewPanel] Drill up requested");
        this._handleDrillUp();
        break;

      case "openFile":
        log(`[HierarchicalViewPanel] Opening file: ${message.payload.filePath}`);
        await this._openFile(message.payload.filePath);
        break;

      case "openManifest":
        log(`[HierarchicalViewPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._openFile(message.payload.manifestPath);
        break;
    }
  }

  /**
   * Update the webview HTML content.
   */
  private _update(): void {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  /**
   * Build hierarchy from ManifestIndex.
   */
  private _buildHierarchy(): void {
    try {
      const index = _sharedManifestIndex;
      if (index) {
        this._hierarchyData = index.getHierarchicalView();
        log(
          `[HierarchicalViewPanel] Built hierarchy with ${this._hierarchyData.length} root nodes`
        );
      } else {
        this._hierarchyData = [];
        log("[HierarchicalViewPanel] ManifestIndex not available");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[HierarchicalViewPanel] Error building hierarchy: ${errorMessage}`, "error");
      this._hierarchyData = [];
    }
  }

  /**
   * Compute level data for visualization.
   * Returns computed metrics and information for each level.
   */
  private _computeLevels(): {
    level: number;
    nodeCount: number;
    totalMetrics: HierarchicalNode["metrics"];
  }[] {
    const levels: Map<number, { nodes: HierarchicalNode[]; metrics: HierarchicalNode["metrics"] }> =
      new Map();

    const _traverseNodes = (nodes: HierarchicalNode[]) => {
      for (const node of nodes) {
        if (!levels.has(node.level)) {
          levels.set(node.level, {
            nodes: [],
            metrics: { manifestCount: 0, fileCount: 0, artifactCount: 0, errorCount: 0 },
          });
        }
        const levelData = levels.get(node.level)!;
        levelData.nodes.push(node);
        levelData.metrics.manifestCount += node.metrics.manifestCount;
        levelData.metrics.fileCount += node.metrics.fileCount;
        levelData.metrics.artifactCount += node.metrics.artifactCount;
        levelData.metrics.errorCount += node.metrics.errorCount;

        if (node.children.length > 0) {
          _traverseNodes(node.children);
        }
      }
    };

    _traverseNodes(this._hierarchyData);

    return Array.from(levels.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, data]) => ({
        level,
        nodeCount: data.nodes.length,
        totalMetrics: data.metrics,
      }));
  }

  /**
   * Handle drill-down navigation to a child node.
   */
  private _handleDrillDown(nodeId: string): void {
    const node = this._findNodeById(nodeId, this._hierarchyData);
    if (node && node.children.length > 0) {
      // Push current node to navigation stack for drill-up
      if (this._selectedNodeId) {
        this._navigationStack.push(this._selectedNodeId);
      }
      this._selectedNodeId = nodeId;
      this._currentLevel = node.level + 1;
      this._sendHierarchicalData();
    }
  }

  /**
   * Handle drill-up navigation back to parent level.
   */
  private _handleDrillUp(): void {
    if (this._navigationStack.length > 0) {
      const parentId = this._navigationStack.pop()!;
      const parentNode = this._findNodeById(parentId, this._hierarchyData);
      if (parentNode) {
        this._selectedNodeId = parentId;
        this._currentLevel = parentNode.level;
      } else {
        this._selectedNodeId = null;
        this._currentLevel = 0;
      }
    } else {
      // Go to root level
      this._selectedNodeId = null;
      this._currentLevel = 0;
    }
    this._sendHierarchicalData();
  }

  /**
   * Find a node by ID in the hierarchy.
   */
  private _findNodeById(nodeId: string, nodes: HierarchicalNode[]): HierarchicalNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children.length > 0) {
        const found = this._findNodeById(nodeId, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Send hierarchical data to the webview.
   */
  private _sendHierarchicalData(): void {
    const data: HierarchicalViewData = {
      nodes: this._hierarchyData,
      rootId: this._hierarchyData[0]?.id || "",
      currentLevel: this._currentLevel,
      selectedNodeId: this._selectedNodeId,
    };

    this._postMessage({
      type: "hierarchicalData",
      payload: data,
    });
  }

  /**
   * Open a file in the editor.
   */
  private async _openFile(filePath: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const path = await import("path");
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);

    try {
      const document = await vscode.workspace.openTextDocument(fullPath);
      await vscode.window.showTextDocument(document);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[HierarchicalViewPanel] Error opening file: ${errorMessage}`, "error");
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
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
    const nonce = _getNonce();

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
    <title>MAID Hierarchical View</title>
    <link href="${String(styleUri)}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="hierarchicalView"></div>
    <script nonce="${nonce}" src="${String(scriptUri)}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    HierarchicalViewPanel._currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[HierarchicalViewPanel] Disposed");
  }
}

/**
 * Generate a nonce for script security.
 */
function _getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
