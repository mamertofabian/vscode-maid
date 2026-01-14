/**
 * WebviewPanel provider for the Manifest History View.
 * Displays Git commit history and diffs for manifest files.
 */

import * as vscode from "vscode";
import * as path from "path";
import type { HistoryPanelData } from "../types";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { log } from "../utils";
import {
  getManifestHistory,
  getCommitDiff,
  getFileAtCommit,
  getDiffBetweenCommits,
} from "../gitHistory";

/**
 * Manages the History webview panel.
 */
export class HistoryPanel {
  public static currentPanel: HistoryPanel | undefined;
  public static readonly viewType = "maidHistory";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _manifestPath: string | undefined;
  private _historyData: HistoryPanelData | null = null;

  /**
   * Create or show the History panel.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    manifestPath?: string,
    commitHash?: string
  ): HistoryPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and update if needed
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel._panel.reveal(column);
      if (manifestPath) {
        HistoryPanel.currentPanel._manifestPath = manifestPath;
        void HistoryPanel.currentPanel._loadHistory(manifestPath, commitHash);
      }
      return HistoryPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      HistoryPanel.viewType,
      "MAID Manifest History",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, manifestPath, commitHash);
    return HistoryPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    manifestPath?: string,
    commitHash?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._manifestPath = manifestPath;

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

    // Load history if manifest path provided
    if (manifestPath) {
      void this._loadHistory(manifestPath, commitHash);
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
        log("[HistoryPanel] Webview ready");
        if (this._manifestPath) {
          await this._loadHistory(this._manifestPath);
        }
        break;

      case "refresh":
        log("[HistoryPanel] Refresh requested");
        if (this._manifestPath) {
          await this._loadHistory(this._manifestPath);
        }
        break;

      case "loadHistory":
        log(`[HistoryPanel] Loading history for: ${message.payload.manifestPath}`);
        this._manifestPath = message.payload.manifestPath;
        await this._loadHistory(message.payload.manifestPath);
        break;

      case "loadCommit":
        log(
          `[HistoryPanel] Loading commit: ${message.payload.commitHash} for ${message.payload.manifestPath}`
        );
        await this._loadCommit(message.payload.manifestPath, message.payload.commitHash);
        break;

      case "compareCommits":
        log(
          `[HistoryPanel] Comparing commits: ${message.payload.commitHash1} vs ${message.payload.commitHash2}`
        );
        await this._compareCommits(
          message.payload.manifestPath,
          message.payload.commitHash1,
          message.payload.commitHash2
        );
        break;

      case "openAtCommit":
        log(`[HistoryPanel] Opening file at commit: ${message.payload.commitHash}`);
        await this._openAtCommit(message.payload.manifestPath, message.payload.commitHash);
        break;
    }
  }

  /**
   * Load history for a manifest.
   */
  private async _loadHistory(manifestPath: string, selectedCommit?: string): Promise<void> {
    this._postMessage({ type: "loading", payload: { isLoading: true } });

    try {
      const config = vscode.workspace.getConfiguration("maid");
      const maxCommits = config.get<number>("history.maxCommits", 50);
      const commits = await getManifestHistory(manifestPath, maxCommits);

      // Convert Date objects to ISO strings for JSON serialization
      const serializedCommits = commits.map((commit) => ({
        ...commit,
        date: commit.date.toISOString(),
      }));

      this._historyData = {
        manifestPath,
        commits: serializedCommits,
        selectedCommit,
      };

      this._postMessage({
        type: "historyData",
        payload: this._historyData,
      });

      log(`[HistoryPanel] Loaded ${commits.length} commits`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[HistoryPanel] Error loading history: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load history: ${message}`,
        },
      });
    }
  }

  /**
   * Load commit diff.
   */
  private async _loadCommit(manifestPath: string, commitHash: string): Promise<void> {
    try {
      const diff = await getCommitDiff(manifestPath, commitHash);
      if (diff) {
        this._postMessage({
          type: "commitDiff",
          payload: {
            commitHash,
            diff,
          },
        });
      } else {
        this._postMessage({
          type: "error",
          payload: {
            message: `Could not load diff for commit ${commitHash.substring(0, 7)}`,
          },
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[HistoryPanel] Error loading commit: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load commit: ${message}`,
        },
      });
    }
  }

  /**
   * Compare two commits.
   */
  private async _compareCommits(
    manifestPath: string,
    commitHash1: string,
    commitHash2: string
  ): Promise<void> {
    try {
      const diff = await getDiffBetweenCommits(manifestPath, commitHash1, commitHash2);
      if (diff) {
        // Use VS Code's built-in diff viewer
        await this._showDiffInEditor(manifestPath, commitHash1, commitHash2, diff);
      } else {
        this._postMessage({
          type: "error",
          payload: {
            message: `Could not compare commits ${commitHash1.substring(0, 7)} and ${commitHash2.substring(0, 7)}`,
          },
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[HistoryPanel] Error comparing commits: ${message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to compare commits: ${message}`,
        },
      });
    }
  }

  /**
   * Open file at a specific commit.
   */
  private async _openAtCommit(manifestPath: string, commitHash: string): Promise<void> {
    try {
      const content = await getFileAtCommit(manifestPath, commitHash);
      if (content) {
        // Create a temporary document with the content
        const uri = vscode.Uri.parse(`maid-history:${manifestPath}?commit=${commitHash}`);
        const document = await vscode.workspace.openTextDocument(
          uri.with({
            scheme: "untitled",
            path: `${path.basename(manifestPath)} (${commitHash.substring(0, 7)})`,
          })
        );
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), content);
        await vscode.workspace.applyEdit(edit);
        await vscode.window.showTextDocument(document);
      } else {
        vscode.window.showErrorMessage(
          `Could not load file at commit ${commitHash.substring(0, 7)}`
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[HistoryPanel] Error opening at commit: ${message}`, "error");
      vscode.window.showErrorMessage(`Failed to open file at commit: ${message}`);
    }
  }

  /**
   * Show diff in VS Code's diff editor.
   */
  private async _showDiffInEditor(
    manifestPath: string,
    commitHash1: string,
    commitHash2: string,
    _diff: string
  ): Promise<void> {
    try {
      // Get file content at both commits
      const content1 = await getFileAtCommit(manifestPath, commitHash1);
      const content2 = await getFileAtCommit(manifestPath, commitHash2);

      if (!content1 || !content2) {
        vscode.window.showErrorMessage("Could not load file contents for comparison");
        return;
      }

      // Create temporary URIs for the diff
      const uri1 = vscode.Uri.parse(`maid-history:${manifestPath}?commit=${commitHash1}`);
      const uri2 = vscode.Uri.parse(`maid-history:${manifestPath}?commit=${commitHash2}`);

      // Use untitled scheme for temporary documents
      const doc1 = await vscode.workspace.openTextDocument(
        uri1.with({
          scheme: "untitled",
          path: `${path.basename(manifestPath)} (${commitHash1.substring(0, 7)})`,
        })
      );
      const doc2 = await vscode.workspace.openTextDocument(
        uri2.with({
          scheme: "untitled",
          path: `${path.basename(manifestPath)} (${commitHash2.substring(0, 7)})`,
        })
      );

      // Set content
      const edit1 = new vscode.WorkspaceEdit();
      edit1.insert(doc1.uri, new vscode.Position(0, 0), content1);
      await vscode.workspace.applyEdit(edit1);

      const edit2 = new vscode.WorkspaceEdit();
      edit2.insert(doc2.uri, new vscode.Position(0, 0), content2);
      await vscode.workspace.applyEdit(edit2);

      // Show diff
      await vscode.commands.executeCommand("vscode.diff", doc1.uri, doc2.uri);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[HistoryPanel] Error showing diff: ${message}`, "error");
      vscode.window.showErrorMessage(`Failed to show diff: ${message}`);
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
    <title>MAID Manifest History</title>
    <link href="${styleUri.toString()}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="history"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    HistoryPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[HistoryPanel] Disposed");
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
