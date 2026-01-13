/**
 * WebviewPanel provider for the Project Dashboard.
 * Displays an overview of MAID project health, validation status, and activity.
 */

import * as vscode from "vscode";
import * as path from "path";
import type {
  DashboardData,
  ManifestSummary,
  TestCoverageSummary,
  ActivityItem,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "./messages";
import { log } from "../utils";

/**
 * Manages the Dashboard webview panel.
 */
export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  public static readonly viewType = "maidDashboard";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _activityHistory: ActivityItem[] = [];

  /**
   * Create or show the Dashboard panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      return DashboardPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      DashboardPanel.viewType,
      "MAID Dashboard",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    return DashboardPanel.currentPanel;
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

    // Watch for manifest file changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.manifest.json");
    watcher.onDidCreate((uri) => {
      this._addActivity("created", `Created ${path.basename(uri.fsPath)}`, uri.fsPath);
      this._loadAndSendDashboardData();
    });
    watcher.onDidChange((uri) => {
      this._addActivity("modified", `Modified ${path.basename(uri.fsPath)}`, uri.fsPath);
    });
    watcher.onDidDelete((uri) => {
      this._addActivity("modified", `Deleted ${path.basename(uri.fsPath)}`);
      this._loadAndSendDashboardData();
    });
    this._disposables.push(watcher);

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
   * Add an activity item to the history.
   */
  private _addActivity(type: ActivityItem["type"], message: string, manifestPath?: string): void {
    this._activityHistory.unshift({
      type,
      message,
      manifestPath,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 50 activities
    if (this._activityHistory.length > 50) {
      this._activityHistory = this._activityHistory.slice(0, 50);
    }
  }

  /**
   * Handle messages from the webview.
   */
  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        log("[DashboardPanel] Webview ready, loading data...");
        await this._loadAndSendDashboardData();
        break;

      case "refresh":
        log("[DashboardPanel] Refresh requested");
        await this._loadAndSendDashboardData();
        break;

      case "openManifest":
        log(`[DashboardPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._openFile(message.payload.manifestPath);
        break;

      case "runValidation":
        log(`[DashboardPanel] Running validation: ${message.payload.manifestPath || "all"}`);
        await this._runValidation(message.payload.manifestPath);
        break;

      case "runTests":
        log(`[DashboardPanel] Running tests: ${message.payload.manifestPath || "all"}`);
        await this._runTests(message.payload.manifestPath);
        break;
    }
  }

  /**
   * Open a file in the editor.
   */
  private async _openFile(filePath: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);

    try {
      const document = await vscode.workspace.openTextDocument(fullPath);
      await vscode.window.showTextDocument(document);
    } catch (error: any) {
      log(`[DashboardPanel] Error opening file: ${error.message}`, "error");
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
    }
  }

  /**
   * Run validation for a specific manifest or all manifests.
   */
  private async _runValidation(manifestPath?: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    try {
      if (manifestPath) {
        await vscode.commands.executeCommand("vscode-maid.validateManifest", manifestPath);
        this._addActivity("validated", `Validated ${path.basename(manifestPath)}`, manifestPath);
      } else {
        // Validate all - trigger refresh which re-validates
        await this._loadAndSendDashboardData();
        this._addActivity("validated", "Validated all manifests");
      }
    } catch (error: any) {
      log(`[DashboardPanel] Validation error: ${error.message}`, "error");
      this._addActivity("error", `Validation failed: ${error.message}`);
    }

    // Reload dashboard data
    await this._loadAndSendDashboardData();
  }

  /**
   * Run tests for a specific manifest or all manifests.
   */
  private async _runTests(manifestPath?: string): Promise<void> {
    try {
      if (manifestPath) {
        await vscode.commands.executeCommand("vscode-maid.runTestsForManifest", manifestPath);
        this._addActivity(
          "validated",
          `Ran tests for ${path.basename(manifestPath)}`,
          manifestPath
        );
      } else {
        await vscode.commands.executeCommand("vscode-maid.runTests");
        this._addActivity("validated", "Ran all tests");
      }
    } catch (error: any) {
      log(`[DashboardPanel] Test error: ${error.message}`, "error");
      this._addActivity("error", `Tests failed: ${error.message}`);
    }

    // Reload dashboard data
    setTimeout(() => this._loadAndSendDashboardData(), 1000);
  }

  /**
   * Load dashboard data and send to webview.
   */
  private async _loadAndSendDashboardData(): Promise<void> {
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
      // Get manifest list
      const manifests = await this._getManifestData(workspaceRoot);

      // Calculate totals
      const totalErrors = manifests.reduce((sum, m) => sum + m.errorCount, 0);
      const totalWarnings = manifests.reduce((sum, m) => sum + m.warningCount, 0);

      // Calculate test coverage
      const testCoverage = this._calculateTestCoverage(manifests);

      const dashboardData: DashboardData = {
        manifests,
        totalErrors,
        totalWarnings,
        testCoverage,
        recentActivity: this._activityHistory,
      };

      this._postMessage({
        type: "dashboardData",
        payload: dashboardData,
      });

      log(`[DashboardPanel] Loaded ${manifests.length} manifests`);
    } catch (error: any) {
      log(`[DashboardPanel] Error loading data: ${error.message}`, "error");
      this._postMessage({
        type: "error",
        payload: {
          message: `Failed to load dashboard data: ${error.message}`,
        },
      });
    }
  }

  /**
   * Get manifest data by scanning workspace and optionally validating.
   */
  private async _getManifestData(workspaceRoot: string): Promise<ManifestSummary[]> {
    // Find all manifest files in the workspace
    const manifestFiles = await vscode.workspace.findFiles(
      "**/*.manifest.json",
      "**/node_modules/**"
    );

    const manifests: ManifestSummary[] = [];

    for (const uri of manifestFiles) {
      const relativePath = vscode.workspace.asRelativePath(uri);
      const name = path.basename(uri.fsPath).replace(".manifest.json", "");

      // Try to read the manifest to get the goal
      let goal: string | undefined;
      try {
        const content = await vscode.workspace.fs.readFile(uri);
        const json = JSON.parse(content.toString());
        goal = json.goal;
      } catch {
        // Ignore parse errors
      }

      // Get diagnostics for this file if available
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const errorCount = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      ).length;
      const warningCount = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Warning
      ).length;

      manifests.push({
        path: relativePath,
        name,
        goal,
        errorCount,
        warningCount,
        isValid: errorCount === 0,
      });
    }

    return manifests;
  }

  /**
   * Calculate test coverage summary.
   */
  private _calculateTestCoverage(manifests: ManifestSummary[]): TestCoverageSummary {
    const validManifests = manifests.filter((m) => m.isValid).length;
    const coveragePercent = manifests.length > 0 ? (validManifests / manifests.length) * 100 : 0;

    return {
      totalManifests: manifests.length,
      validManifests,
      passingTests: validManifests,
      failingTests: manifests.length - validManifests,
      coverage: coveragePercent,
    };
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
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "main.css")
    );

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
    <title>MAID Dashboard</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="dashboard"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    DashboardPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[DashboardPanel] Disposed");
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
