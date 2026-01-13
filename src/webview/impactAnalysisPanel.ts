/**
 * WebviewPanel provider for the Impact Analysis view.
 * Analyzes how changes to files impact other manifests, artifacts, and files.
 */

import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  ImpactAnalysisData,
} from "./messages";
import type { DependencyImpact } from "../types";
import type { ManifestIndex } from "../manifestIndex";
import { log } from "../utils";

// Module-level reference to ManifestIndex for singleton-like access
let _sharedManifestIndex: ManifestIndex | undefined;

/**
 * Set the shared ManifestIndex instance for all ImpactAnalysisPanel instances.
 */
export function setSharedManifestIndex(index: ManifestIndex): void {
  _sharedManifestIndex = index;
}

/**
 * Manages the Impact Analysis webview panel.
 */
export class ImpactAnalysisPanel {
  public static currentPanel: ImpactAnalysisPanel | undefined;
  public static readonly viewType = "maidImpactAnalysis";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _targetFile: string | undefined;
  private _manifestIndex: ManifestIndex | undefined;

  /**
   * Create or show the Impact Analysis panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): ImpactAnalysisPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ImpactAnalysisPanel.currentPanel) {
      ImpactAnalysisPanel.currentPanel._panel.reveal(column);
      return ImpactAnalysisPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ImpactAnalysisPanel.viewType,
      "MAID Impact Analysis",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    ImpactAnalysisPanel.currentPanel = new ImpactAnalysisPanel(panel, extensionUri);
    return ImpactAnalysisPanel.currentPanel;
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
        log("[ImpactAnalysisPanel] Webview ready");
        this._sendInitialData();
        break;

      case "refresh":
        log("[ImpactAnalysisPanel] Refresh requested");
        if (this._targetFile) {
          this._analyzeFile(this._targetFile);
        }
        break;

      case "analyzeImpact":
        log(`[ImpactAnalysisPanel] Analyzing impact for: ${message.payload.filePath}`);
        this._analyzeFile(message.payload.filePath);
        break;

      case "openFile":
        log(`[ImpactAnalysisPanel] Opening file: ${message.payload.filePath}`);
        await this._openFile(message.payload.filePath);
        break;

      case "openManifest":
        log(`[ImpactAnalysisPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._openFile(message.payload.manifestPath);
        break;
    }
  }

  /**
   * Send initial data to the webview.
   */
  private _sendInitialData(): void {
    const data: ImpactAnalysisData = {
      targetFile: this._targetFile || "",
      impact: null,
      loading: false,
      error: null,
    };

    this._postMessage({
      type: "impactData",
      payload: data,
    });
  }

  /**
   * Analyze the impact of changes to a file.
   */
  private _analyzeFile(filePath: string): void {
    this._targetFile = filePath;

    // Show loading state
    this._postMessage({
      type: "impactData",
      payload: {
        targetFile: filePath,
        impact: null,
        loading: true,
        error: null,
      },
    });

    try {
      // Get the manifest index instance
      const index = this._manifestIndex || _sharedManifestIndex;
      if (!index) {
        throw new Error("ManifestIndex not available. Please wait for initialization.");
      }

      // Get dependency impact from the index
      const impact = index.getDependencyImpact(filePath);

      log(
        `[ImpactAnalysisPanel] Impact analysis: ${impact.affectedManifests.length} manifests, ${impact.affectedFiles.length} files, ${impact.affectedArtifacts.length} artifacts`
      );

      // Send the impact data to the webview
      this._postMessage({
        type: "impactData",
        payload: {
          targetFile: filePath,
          impact,
          loading: false,
          error: null,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[ImpactAnalysisPanel] Error analyzing impact: ${errorMessage}`, "error");

      this._postMessage({
        type: "impactData",
        payload: {
          targetFile: filePath,
          impact: null,
          loading: false,
          error: errorMessage,
        },
      });
    }
  }

  /**
   * Analyze the change impact for a file.
   * This computes what would be affected if the file is modified.
   */
  private _analyzeChange(filePath: string): DependencyImpact | null {
    try {
      const index = this._manifestIndex || _sharedManifestIndex;
      if (!index) {
        return null;
      }
      return index.getDependencyImpact(filePath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[ImpactAnalysisPanel] Error in _analyzeChange: ${errorMessage}`, "error");
      return null;
    }
  }

  /**
   * Generate a report summarizing the impact analysis.
   */
  private _generateReport(): string {
    if (!this._targetFile) {
      return "No file selected for analysis.";
    }

    try {
      const index = this._manifestIndex || _sharedManifestIndex;
      if (!index) {
        return "ManifestIndex not available.";
      }
      const impact = index.getDependencyImpact(this._targetFile);

      const lines: string[] = [
        `# Impact Analysis Report`,
        ``,
        `## Target File`,
        `${this._targetFile}`,
        ``,
        `## Summary`,
        `- Severity: ${impact.severity}`,
        `- Total Impact Score: ${impact.totalImpact}`,
        ``,
        `## Affected Manifests (${impact.affectedManifests.length})`,
      ];

      if (impact.affectedManifests.length > 0) {
        for (const manifest of impact.affectedManifests) {
          lines.push(`- ${manifest}`);
        }
      } else {
        lines.push("- None");
      }

      lines.push("");
      lines.push(`## Affected Files (${impact.affectedFiles.length})`);

      if (impact.affectedFiles.length > 0) {
        for (const file of impact.affectedFiles) {
          lines.push(`- ${file}`);
        }
      } else {
        lines.push("- None");
      }

      lines.push("");
      lines.push(`## Affected Artifacts (${impact.affectedArtifacts.length})`);

      if (impact.affectedArtifacts.length > 0) {
        for (const artifact of impact.affectedArtifacts) {
          lines.push(`- ${artifact}`);
        }
      } else {
        lines.push("- None");
      }

      return lines.join("\n");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error generating report: ${errorMessage}`;
    }
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
      log(`[ImpactAnalysisPanel] Error opening file: ${errorMessage}`, "error");
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
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
    <title>MAID Impact Analysis</title>
    <link href="${String(styleUri)}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="impactAnalysis"></div>
    <script nonce="${nonce}" src="${String(scriptUri)}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    ImpactAnalysisPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[ImpactAnalysisPanel] Disposed");
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
