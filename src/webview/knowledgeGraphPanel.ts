/**
 * WebviewPanel provider for the Knowledge Graph Visualizer.
 * Displays an interactive vis.js network diagram of the MAID knowledge graph.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import type { KnowledgeGraphResult, GraphLayout, HierarchicalNode } from "../types";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { log, getMaidRoot } from "../utils";

/**
 * Manages the Knowledge Graph Visualizer webview panel.
 */
export class KnowledgeGraphPanel {
  public static currentPanel: KnowledgeGraphPanel | undefined;
  public static readonly viewType = "maidKnowledgeGraph";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _graphData: KnowledgeGraphResult | null = null;
  private _hierarchicalData: HierarchicalNode[] | null = null;

  /**
   * Create or show the Knowledge Graph panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): KnowledgeGraphPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (KnowledgeGraphPanel.currentPanel) {
      KnowledgeGraphPanel.currentPanel._panel.reveal(column);
      return KnowledgeGraphPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      KnowledgeGraphPanel.viewType,
      "MAID Knowledge Graph",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    KnowledgeGraphPanel.currentPanel = new KnowledgeGraphPanel(panel, extensionUri);
    return KnowledgeGraphPanel.currentPanel;
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

    // Note: We don't call _update() on visibility change because
    // retainContextWhenHidden: true keeps the webview content intact

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
        log("[KnowledgeGraphPanel] Webview ready, loading data...");
        await this._loadAndSendGraphData();
        break;

      case "refresh":
        log("[KnowledgeGraphPanel] Refresh requested");
        await this._loadAndSendGraphData();
        break;

      case "nodeClick":
        log(
          `[KnowledgeGraphPanel] Node clicked: ${message.payload.nodeId} (${message.payload.nodeType})`
        );
        break;

      case "openFile":
        log(`[KnowledgeGraphPanel] Opening file: ${message.payload.filePath}`);
        await this._openFile(message.payload.filePath);
        break;

      case "openManifest":
        log(`[KnowledgeGraphPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._openFile(message.payload.manifestPath);
        break;

      case "filterChange":
        log("[KnowledgeGraphPanel] Filters changed");
        break;

      case "changeLayout":
        this._handleLayoutChange(message.payload.layout);
        break;

      case "exportGraph":
        void this._handleExportGraph(message.payload.format, message.payload.filename);
        break;
    }
  }

  /**
   * Open a file in the editor.
   */
  private async _openFile(filePath: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    // filePath is already workspace-relative from _resolveGraphPaths
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);

    try {
      const document = await vscode.workspace.openTextDocument(fullPath);
      await vscode.window.showTextDocument(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[KnowledgeGraphPanel] Error opening file: ${message}`, "error");
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
  }

  /**
   * Load graph data from maid CLI and send to webview.
   */
  private async _loadAndSendGraphData(): Promise<void> {
    this._postMessage({ type: "loading", payload: { isLoading: true } });

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this._postMessage({
        type: "error",
        payload: { message: "No workspace folder open" },
      });
      return;
    }

    try {
      // Find the first manifest directory to use as working directory
      let cwd = workspaceRoot;
      try {
        const manifestFiles = await vscode.workspace.findFiles(
          "**/*.manifest.json",
          "**/node_modules/**",
          1
        );
        if (manifestFiles.length > 0) {
          const manifestPath = manifestFiles[0].fsPath;
          cwd = getMaidRoot(manifestPath);
          log(`[KnowledgeGraphPanel] Using MAID root: ${cwd}`);
        }
      } catch {
        log(
          `[KnowledgeGraphPanel] Could not find manifest directory, using workspace root`,
          "warn"
        );
      }

      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const fs = await import("fs/promises");
      const execAsync = promisify(exec);

      // Export to temp file
      const tempFile = path.join(os.tmpdir(), `maid-graph-panel-${Date.now()}.json`);

      await execAsync(`maid graph export --format json --output "${tempFile}"`, {
        cwd: cwd,
        timeout: 60000,
      });

      // Read and parse
      const content = await fs.readFile(tempFile, "utf-8");
      this._graphData = JSON.parse(content) as KnowledgeGraphResult;

      // Resolve file paths relative to MAID root
      if (this._graphData && cwd !== workspaceRoot) {
        this._graphData = this._resolveGraphPaths(this._graphData, cwd, workspaceRoot);
      }

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      log(
        `[KnowledgeGraphPanel] Loaded: ${this._graphData?.nodes.length || 0} nodes, ${this._graphData?.edges?.length || 0} edges`
      );

      this._postMessage({
        type: "graphData",
        payload: this._graphData || { nodes: [], edges: [] },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[KnowledgeGraphPanel] Error loading graph: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load knowledge graph: ${message}. Make sure 'maid' CLI is installed and you have manifest files in your workspace.`,
        },
      });
    }
  }

  /**
   * Resolve file paths in graph data relative to MAID root.
   */
  private _resolveGraphPaths(
    graphData: KnowledgeGraphResult,
    maidRoot: string,
    _workspaceRoot: string
  ): KnowledgeGraphResult {
    const resolvedNodes = graphData.nodes.map((node) => {
      if (node.path) {
        const fullPath = path.isAbsolute(node.path) ? node.path : path.resolve(maidRoot, node.path);
        // Store workspace-relative path for display
        return {
          ...node,
          path: vscode.workspace.asRelativePath(fullPath),
        };
      }
      return node;
    });

    return {
      ...graphData,
      nodes: resolvedNodes,
    };
  }

  /**
   * Load hierarchical data and send to webview.
   */
  private _loadHierarchicalData(): Promise<void> {
    this._postMessage({ type: "loading", payload: { isLoading: true } });

    try {
      // For now, create hierarchical view from graph data
      // In full implementation, would use ManifestIndex.getHierarchicalView()
      const nodes: HierarchicalNode[] = [];

      if (this._graphData) {
        // Group manifests by module (directory)
        const moduleMap = new Map<string, (typeof this._graphData.nodes)[number][]>();

        for (const node of this._graphData.nodes) {
          if (node.type === "manifest" && node.path) {
            const dir = node.path.split("/").slice(0, -1).join("/") || "root";
            if (!moduleMap.has(dir)) {
              moduleMap.set(dir, []);
            }
            moduleMap.get(dir)!.push(node);
          }
        }

        // Create hierarchical nodes
        for (const [moduleName, manifestNodes] of moduleMap) {
          nodes.push({
            id: moduleName,
            name: moduleName || "root",
            type: "module",
            level: 0,
            parent: null,
            children: manifestNodes.map((m) => ({
              id: m.id,
              name: m.path?.split("/").pop() || m.id,
              type: "manifest" as const,
              level: 1,
              parent: moduleName,
              children: [],
              metrics: { manifestCount: 1, fileCount: 0, artifactCount: 0, errorCount: 0 },
            })),
            metrics: {
              manifestCount: manifestNodes.length,
              fileCount: 0,
              artifactCount: 0,
              errorCount: 0,
            },
          });
        }
      }

      this._hierarchicalData = nodes;
      this._postMessage({
        type: "hierarchicalData",
        payload: {
          nodes,
          rootId: nodes[0]?.id || "",
          currentLevel: 0,
          selectedNodeId: null,
        },
      });
      return Promise.resolve();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this._postMessage({
        type: "error",
        payload: { message: `Failed to load hierarchical data: ${message}` },
      });
      return Promise.resolve();
    }
  }

  /**
   * Compute and send graph metrics to webview.
   */
  private _computeMetrics(): void {
    if (!this._graphData) {
      return;
    }

    const metrics = {
      totalNodes: this._graphData.nodes.length,
      totalEdges: this._graphData.edges?.length || 0,
      nodesByType: {
        manifest: 0,
        file: 0,
        module: 0,
        artifact: 0,
      },
    };

    for (const node of this._graphData.nodes) {
      if (node.type in metrics.nodesByType) {
        metrics.nodesByType[node.type as keyof typeof metrics.nodesByType]++;
      }
    }

    // Send metrics as part of graph data or separate message
    log(`[KnowledgeGraphPanel] Metrics: ${JSON.stringify(metrics)}`);
  }

  /**
   * Handle layout change requests from webview.
   */
  private _handleLayoutChange(layout: GraphLayout): void {
    log(`[KnowledgeGraphPanel] Layout changed to: ${layout.type}`);
    this._postMessage({
      type: "layoutChanged",
      payload: { layout },
    });
  }

  /**
   * Handle graph export requests.
   */
  private _handleExportGraph(format: string, _filename: string | null): Promise<void> {
    log(`[KnowledgeGraphPanel] Exporting graph as ${format}`);

    try {
      let data: string;

      if (format === "json") {
        data = JSON.stringify(this._graphData || { nodes: [], edges: [] }, null, 2);
      } else if (format === "dot") {
        // Generate DOT format for Graphviz
        const nodes = this._graphData?.nodes || [];
        const edges = this._graphData?.edges || [];
        const dotNodes = nodes.map((n) => `  "${n.id}" [label="${n.name || n.id}"];`).join("\n");
        const dotEdges = edges.map((e) => `  "${e.source}" -> "${e.target}";`).join("\n");
        data = `digraph MAID {\n${dotNodes}\n${dotEdges}\n}`;
      } else {
        // For PNG/SVG, would need canvas rendering - return placeholder
        data = `Export to ${format} requires canvas rendering (not implemented in backend)`;
      }

      this._postMessage({
        type: "exportReady",
        payload: { format, data },
      });
      return Promise.resolve();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this._postMessage({
        type: "error",
        payload: { message: `Export failed: ${message}` },
      });
      return Promise.resolve();
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
    <title>MAID Knowledge Graph</title>
    <link href="${styleUri.toString()}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="knowledgeGraph"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    KnowledgeGraphPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[KnowledgeGraphPanel] Disposed");
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
