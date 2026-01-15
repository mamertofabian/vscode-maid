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
export interface _ManifestChainNode {
  id: string;
  label: string;
  path: string;
  goal?: string;
  level: number; // 0 = current, negative = parents, positive = children
}

/**
 * Manifest chain edge data structure
 */
export interface _ManifestChainEdge {
  from: string;
  to: string;
  arrows: string;
  label?: string;
}

/**
 * Manifest chain data structure
 */
export interface _ManifestChainData {
  nodes: _ManifestChainNode[];
  edges: _ManifestChainEdge[];
  currentManifest: string;
}

/**
 * Chain metrics for analyzing manifest chain health and structure
 */
export interface _ChainMetrics {
  depth: number;
  breadth: number;
  totalNodes: number;
  hasConflicts: boolean;
}

/**
 * Manages the Manifest Chain Visualizer webview panel.
 */
export class ManifestChainPanel {
  public static _currentPanel: ManifestChainPanel | undefined;
  public static readonly _viewType = "maidManifestChain";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _manifestIndex: ManifestIndex | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _currentManifestPath: string | undefined;
  private _chainData: _ManifestChainData | null = null;
  private _conflicts: Array<{ node1: string; node2: string; reason: string }> = [];

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
    if (ManifestChainPanel._currentPanel) {
      ManifestChainPanel._currentPanel._panel.reveal(column);
      if (manifestPath) {
        ManifestChainPanel._currentPanel.setManifest(manifestPath);
      }
      return ManifestChainPanel._currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ManifestChainPanel._viewType,
      "MAID Manifest Chain",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    ManifestChainPanel._currentPanel = new ManifestChainPanel(panel, extensionUri, manifestIndex);
    if (manifestPath) {
      ManifestChainPanel._currentPanel.setManifest(manifestPath);
    }
    return ManifestChainPanel._currentPanel;
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
      if (activeEditor && activeEditor.document.uri.fsPath.endsWith(".manifest.json")) {
        this.setManifest(activeEditor.document.uri.fsPath);
      }
    }
  }

  /**
   * Set the manifest to visualize.
   */
  public setManifest(manifestPath: string): void {
    this._currentManifestPath = manifestPath;
    void this._loadAndSendChainData();
  }

  /**
   * Auto-select the first manifest from the index when no manifest is provided.
   * This allows the panel to open from Command Palette without requiring a manifest to be open.
   */
  private _autoSelectFirstManifest(): void {
    if (this._currentManifestPath) {
      return; // Already have a manifest selected
    }

    if (!this._manifestIndex) {
      log("[ManifestChainPanel] Cannot auto-select: no manifest index available");
      return;
    }

    const allManifests = this._manifestIndex.getAllManifests();
    if (allManifests.length > 0) {
      this._currentManifestPath = allManifests[0];
      log(`[ManifestChainPanel] Auto-selected first manifest: ${allManifests[0]}`);
      void this._loadAndSendChainData();
    } else {
      log("[ManifestChainPanel] No manifests available to auto-select");
      this._postMessage({
        type: "error",
        payload: { message: "No manifests found in workspace. Create a manifest first." },
      });
    }
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
        // If no manifest is set, try to auto-select one
        if (!this._currentManifestPath) {
          this._autoSelectFirstManifest();
        } else {
          this._loadAndSendChainData();
        }
        break;

      case "refresh":
        log("[ManifestChainPanel] Refresh requested");
        this._loadAndSendChainData();
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[ManifestChainPanel] Error opening manifest: ${message}`, "error");
      vscode.window.showErrorMessage(`Could not open manifest: ${manifestPath}`);
    }
  }

  /**
   * Load chain data from manifest index and send to webview.
   */
  private _loadAndSendChainData(): void {
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
      const nodes: _ManifestChainNode[] = [];
      const edges: _ManifestChainEdge[] = [];

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
      // targetPath is the manifest that the parent supersedes
      const _addParents = (parentPaths: string[], level: number, targetPath: string): void => {
        for (const parentPath of parentPaths) {
          const parentEntry = this._manifestIndex!.getManifestEntry(parentPath);
          const parentLabel = path.basename(parentPath, ".manifest.json");

          // Avoid duplicate nodes
          if (!nodes.find((n) => n.id === parentPath)) {
            nodes.push({
              id: parentPath,
              label: parentLabel,
              path: parentPath,
              goal: parentEntry?.goal,
              level: level,
            });
          }

          // Add edge from parent to target (the manifest it supersedes)
          edges.push({
            from: parentPath,
            to: targetPath,
            arrows: "to",
            label: "supersedes",
          });

          // Recursively add grandparents, pointing to this parent
          if (parentEntry && parentEntry.supersededBy.length > 0) {
            _addParents(parentEntry.supersededBy, level - 1, parentPath);
          }
        }
      };

      // Child manifests (level 1, 2, etc.)
      // sourcePath is the manifest that supersedes the child
      const _addChildren = (childPaths: string[], level: number, sourcePath: string): void => {
        for (const childPath of childPaths) {
          const childEntry = this._manifestIndex!.getManifestEntry(childPath);
          const childLabel = path.basename(childPath, ".manifest.json");

          // Avoid duplicate nodes
          if (!nodes.find((n) => n.id === childPath)) {
            nodes.push({
              id: childPath,
              label: childLabel,
              path: childPath,
              goal: childEntry?.goal,
              level: level,
            });
          }

          // Add edge from source to child (source supersedes child)
          edges.push({
            from: sourcePath,
            to: childPath,
            arrows: "to",
            label: "supersedes",
          });

          // Recursively add grandchildren, with this child as the source
          if (childEntry && childEntry.supersedes.length > 0) {
            _addChildren(childEntry.supersedes, level + 1, childPath);
          }
        }
      };

      // Add parents and children
      if (chain.parents.length > 0) {
        _addParents(chain.parents, -1, currentManifestPath);
      }
      if (chain.children.length > 0) {
        _addChildren(chain.children, 1, currentManifestPath);
      }

      const chainData: _ManifestChainData = {
        nodes,
        edges,
        currentManifest: currentManifestPath,
      };

      // Store chain data for metrics computation
      this._chainData = chainData;

      log(`[ManifestChainPanel] Loaded chain: ${nodes.length} nodes, ${edges.length} edges`);

      this._postMessage({
        type: "chainData",
        payload: chainData,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[ManifestChainPanel] Error loading chain: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load manifest chain: ${message}`,
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
    <title>MAID Manifest Chain</title>
    <link href="${styleUri.toString()}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="manifestChain"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  /**
   * Load all relationship types beyond supersedes (file references, artifacts).
   */
  private _loadFullRelationships(): Promise<void> {
    if (!this._currentManifestPath || !this._manifestIndex) {
      this._postMessage({
        type: "error",
        payload: { message: "Cannot load relationships: manifest or index not available." },
      });
      return Promise.resolve();
    }

    this._postMessage({ type: "loading", payload: { isLoading: true } });

    try {
      const entry = this._manifestIndex.getManifestEntry(this._currentManifestPath);
      if (!entry) {
        this._postMessage({
          type: "error",
          payload: { message: "Manifest entry not found in index." },
        });
        return Promise.resolve();
      }

      // Load file references and artifacts from the manifest entry
      const fileRefs = entry.referencedFiles;
      const artifacts = entry.artifacts;

      log(
        `[ManifestChainPanel] Loaded relationships: ${fileRefs.size} files, ${artifacts.size} artifacts`
      );

      // After loading relationships, compute metrics and highlight conflicts
      this._highlightConflicts();

      this._postMessage({ type: "loading", payload: { isLoading: false } });
      return Promise.resolve();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[ManifestChainPanel] Error loading relationships: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: { message: `Failed to load relationships: ${message}` },
      });
      return Promise.resolve();
    }
  }

  /**
   * Calculate chain depth, breadth, total nodes, and conflict detection.
   */
  private _computeChainMetrics(): _ChainMetrics {
    if (!this._chainData || this._chainData.nodes.length === 0) {
      return {
        depth: 0,
        breadth: 0,
        totalNodes: 0,
        hasConflicts: false,
      };
    }

    const nodes = this._chainData.nodes;

    // Calculate depth: range of levels
    const levels = nodes.map((n) => n.level);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const depth = maxLevel - minLevel + 1;

    // Calculate breadth: maximum nodes at any single level
    const levelCounts = new Map<number, number>();
    for (const node of nodes) {
      const count = levelCounts.get(node.level) || 0;
      levelCounts.set(node.level, count + 1);
    }
    const breadth = Math.max(...levelCounts.values());

    // Total nodes
    const totalNodes = nodes.length;

    // Check for conflicts
    const hasConflicts = this._conflicts.length > 0;

    return {
      depth,
      breadth,
      totalNodes,
      hasConflicts,
    };
  }

  /**
   * Mark conflicting manifests in the chain.
   */
  private _highlightConflicts(): void {
    if (!this._chainData || !this._manifestIndex) {
      return;
    }

    this._conflicts = [];

    // Check for file overlap conflicts between manifests at the same level
    const nodesByLevel = new Map<number, _ManifestChainNode[]>();
    for (const node of this._chainData.nodes) {
      const levelNodes = nodesByLevel.get(node.level) || [];
      levelNodes.push(node);
      nodesByLevel.set(node.level, levelNodes);
    }

    // For each level with multiple nodes, check for file overlaps
    for (const [_level, levelNodes] of nodesByLevel) {
      if (levelNodes.length < 2) continue;

      for (let i = 0; i < levelNodes.length; i++) {
        for (let j = i + 1; j < levelNodes.length; j++) {
          const node1 = levelNodes[i];
          const node2 = levelNodes[j];

          const entry1 = this._manifestIndex.getManifestEntry(node1.path);
          const entry2 = this._manifestIndex.getManifestEntry(node2.path);

          if (entry1 && entry2) {
            // Check for file reference overlaps
            const files1 = new Set(entry1.referencedFiles.keys());
            const files2 = new Set(entry2.referencedFiles.keys());

            for (const file of files1) {
              if (files2.has(file)) {
                this._conflicts.push({
                  node1: node1.id,
                  node2: node2.id,
                  reason: `Both reference file: ${file}`,
                });
                break;
              }
            }
          }
        }
      }
    }

    // If conflicts were found, notify the webview
    if (this._conflicts.length > 0) {
      log(`[ManifestChainPanel] Found ${this._conflicts.length} conflicts in chain`);
      this._postMessage({
        type: "chainData",
        payload: {
          ...this._chainData,
          // Include metrics in the chain data
        },
      });
    }
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    ManifestChainPanel._currentPanel = undefined;

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
function _getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
