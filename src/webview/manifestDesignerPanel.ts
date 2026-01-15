/**
 * WebviewPanel provider for the Visual Manifest Designer.
 * Provides a form-based interface for creating and editing MAID manifests.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  ManifestDesignerData,
} from "./messages";
import type { ManifestDesignerState, ExpectedArtifact } from "../types";
import { log } from "../utils";

/**
 * Type for parsed manifest JSON structure
 */
interface _ParsedManifest {
  goal?: string;
  taskType?: string;
  creatableFiles?: string[];
  editableFiles?: string[];
  readonlyFiles?: string[];
  expectedArtifacts?: unknown;
  validationCommand?: string[];
}

/**
 * Manages the Manifest Designer webview panel.
 */
export class ManifestDesignerPanel {
  public static _currentPanel: ManifestDesignerPanel | undefined;
  public static readonly _viewType = "maidManifestDesigner";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentManifestPath: string | undefined;
  private _state: ManifestDesignerState;

  /**
   * Create or show the Manifest Designer panel.
   */
  public static createOrShow(extensionUri: vscode.Uri): ManifestDesignerPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ManifestDesignerPanel._currentPanel) {
      ManifestDesignerPanel._currentPanel._panel.reveal(column);
      return ManifestDesignerPanel._currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ManifestDesignerPanel._viewType,
      "MAID Manifest Designer",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out", "webview")],
      }
    );

    ManifestDesignerPanel._currentPanel = new ManifestDesignerPanel(panel, extensionUri);
    return ManifestDesignerPanel._currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._state = this._getDefaultState();

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
   * Get default state for a new manifest.
   */
  private _getDefaultState(): ManifestDesignerState {
    return {
      goal: "",
      taskType: "create",
      creatableFiles: [],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: false,
      validationErrors: [],
    };
  }

  /**
   * Post a message to the webview.
   */
  private _postMessage(message: ExtensionToWebviewMessage): void {
    this._panel.webview.postMessage(message);
  }

  /**
   * Load a manifest from disk.
   */
  private async _loadManifest(manifestPath: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const fullPath = path.isAbsolute(manifestPath)
      ? manifestPath
      : path.join(workspaceRoot, manifestPath);

    try {
      const content = await fs.promises.readFile(fullPath, "utf-8");
      const manifest = JSON.parse(content) as _ParsedManifest;

      this._currentManifestPath = manifestPath;

      // Validate taskType is a valid literal type
      const validTaskTypes = ["create", "edit", "refactor", "snapshot"] as const;
      const taskType = manifest.taskType;
      const validatedTaskType: "create" | "edit" | "refactor" | "snapshot" =
        taskType && validTaskTypes.includes(taskType as (typeof validTaskTypes)[number])
          ? (taskType as (typeof validTaskTypes)[number])
          : "create";

      // Validate expectedArtifacts structure
      let parsedArtifacts: ExpectedArtifact[] = [];
      if (manifest.expectedArtifacts) {
        if (
          typeof manifest.expectedArtifacts === "object" &&
          manifest.expectedArtifacts !== null &&
          "file" in manifest.expectedArtifacts &&
          typeof manifest.expectedArtifacts.file === "string"
        ) {
          parsedArtifacts = this._parseExpectedArtifacts(
            manifest.expectedArtifacts as { file: string; contains: unknown[] }
          );
        }
      }

      this._state = {
        goal: manifest.goal || "",
        taskType: validatedTaskType,
        creatableFiles: manifest.creatableFiles || [],
        editableFiles: manifest.editableFiles || [],
        readonlyFiles: manifest.readonlyFiles || [],
        expectedArtifacts: parsedArtifacts,
        validationCommand: manifest.validationCommand || [],
        isDirty: false,
        validationErrors: [],
      };

      await this._sendDesignerData();
      log(`[ManifestDesignerPanel] Loaded manifest: ${manifestPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[ManifestDesignerPanel] Error loading manifest: ${errorMessage}`, "error");
      vscode.window.showErrorMessage(`Failed to load manifest: ${errorMessage}`);
    }
  }

  /**
   * Parse expectedArtifacts from manifest JSON format.
   */
  private _parseExpectedArtifacts(
    artifacts: { file: string; contains: unknown[] } | undefined
  ): ExpectedArtifact[] {
    if (!artifacts || !artifacts.file) {
      return [];
    }
    return [
      {
        file: artifacts.file,
        contains: (artifacts.contains || []).map((c: unknown) => {
          const item = c as Record<string, unknown>;
          return {
            type: (item.type as "function" | "class" | "attribute" | "method") || "function",
            name: (item.name as string) || "",
            description: item.description as string | undefined,
            args: item.args as Array<{ name: string; type: string }> | undefined,
            returns: item.returns as { type: string } | undefined,
          };
        }),
      },
    ];
  }

  /**
   * Save the current manifest to disk.
   */
  private async _saveManifest(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    // If no current path, prompt for filename
    if (!this._currentManifestPath) {
      const name = await vscode.window.showInputBox({
        prompt: "Enter manifest filename (without extension)",
        placeHolder: "task-XXX-description",
        validateInput: _validateFilename,
      });

      if (!name) {
        return;
      }

      this._currentManifestPath = `manifests/${name}.manifest.json`;
    }

    const fullPath = path.join(workspaceRoot, this._currentManifestPath);

    // Build manifest object
    const manifest: Record<string, unknown> = {
      goal: this._state.goal,
      taskType: this._state.taskType,
      supersedes: [],
      creatableFiles: this._state.creatableFiles,
      editableFiles: this._state.editableFiles,
      readonlyFiles: this._state.readonlyFiles,
    };

    // Add expectedArtifacts if present
    if (this._state.expectedArtifacts.length > 0) {
      const artifact = this._state.expectedArtifacts[0];
      manifest.expectedArtifacts = {
        file: artifact.file,
        contains: artifact.contains.map((c) => {
          const item: Record<string, unknown> = {
            type: c.type,
            name: c.name,
          };
          if (c.description) item.description = c.description;
          if (c.args) item.args = c.args;
          if (c.returns) item.returns = c.returns;
          return item;
        }),
      };
    }

    if (this._state.validationCommand.length > 0) {
      manifest.validationCommand = this._state.validationCommand;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Write file
      await fs.promises.writeFile(fullPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

      this._state.isDirty = false;
      await this._sendDesignerData();

      log(`[ManifestDesignerPanel] Saved manifest: ${this._currentManifestPath}`);
      vscode.window.showInformationMessage(`Manifest saved: ${this._currentManifestPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[ManifestDesignerPanel] Error saving manifest: ${errorMessage}`, "error");
      vscode.window.showErrorMessage(`Failed to save manifest: ${errorMessage}`);
    }
  }

  /**
   * Validate the current manifest state.
   */
  private async _validateManifest(): Promise<void> {
    const errors: { code: string; message: string; severity: "error" | "warning" | "info" }[] = [];

    // Basic validation
    if (!this._state.goal || this._state.goal.trim() === "") {
      errors.push({
        code: "E001",
        message: "Goal is required",
        severity: "error",
      });
    }

    // Check for files based on task type
    if (this._state.taskType === "create" && this._state.creatableFiles.length === 0) {
      errors.push({
        code: "E002",
        message: "Create task requires at least one creatable file",
        severity: "error",
      });
    }

    if (this._state.taskType === "edit" && this._state.editableFiles.length === 0) {
      errors.push({
        code: "E003",
        message: "Edit task requires at least one editable file",
        severity: "warning",
      });
    }

    // Check expectedArtifacts
    if (this._state.expectedArtifacts.length > 0) {
      const artifact = this._state.expectedArtifacts[0];
      if (!artifact.file || artifact.file.trim() === "") {
        errors.push({
          code: "E004",
          message: "Expected artifacts must have a file path",
          severity: "error",
        });
      }
      if (artifact.contains.length === 0) {
        errors.push({
          code: "E005",
          message: "Expected artifacts should contain at least one artifact definition",
          severity: "warning",
        });
      }
    }

    this._state.validationErrors = errors;
    await this._sendDesignerData();

    if (errors.filter((e) => e.severity === "error").length === 0) {
      vscode.window.showInformationMessage("Manifest validation passed");
    } else {
      vscode.window.showWarningMessage(
        `Manifest has ${errors.filter((e) => e.severity === "error").length} error(s)`
      );
    }
  }

  /**
   * Handle messages from the webview.
   */
  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        log("[ManifestDesignerPanel] Webview ready");
        await this._sendDesignerData();
        break;

      case "refresh":
        log("[ManifestDesignerPanel] Refresh requested");
        await this._sendDesignerData();
        break;

      case "openManifest":
        log(`[ManifestDesignerPanel] Opening manifest: ${message.payload.manifestPath}`);
        await this._loadManifest(message.payload.manifestPath);
        break;

      case "saveManifest":
        log("[ManifestDesignerPanel] Save requested");
        if (message.payload && message.payload.state) {
          this._state = message.payload.state;
        }
        await this._saveManifest();
        break;

      case "validateDesigner":
        log("[ManifestDesignerPanel] Validation requested");
        if (message.payload && message.payload.state) {
          this._state = message.payload.state;
        }
        await this._validateManifest();
        break;
    }
  }

  /**
   * Send designer data to the webview.
   */
  private async _sendDesignerData(): Promise<void> {
    const availableFiles = await this._getAvailableFiles();
    const recentManifests = await this._getRecentManifests();

    const data: ManifestDesignerData = {
      state: this._state,
      availableFiles,
      recentManifests,
    };

    this._postMessage({
      type: "designerData",
      payload: data,
    });
  }

  /**
   * Get list of available files in the workspace.
   */
  private async _getAvailableFiles(): Promise<string[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return [];
    }

    const files = await vscode.workspace.findFiles(
      "**/*.{ts,tsx,js,jsx,py,json}",
      "**/node_modules/**"
    );

    return files.map((f) => vscode.workspace.asRelativePath(f)).sort();
  }

  /**
   * Get list of recent manifests.
   */
  private async _getRecentManifests(): Promise<string[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return [];
    }

    const manifests = await vscode.workspace.findFiles("**/*.manifest.json", "**/node_modules/**");

    return manifests
      .map((f) => vscode.workspace.asRelativePath(f))
      .sort()
      .slice(0, 10);
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
    <title>MAID Manifest Designer</title>
    <link href="${styleUri.toString()}" rel="stylesheet">
</head>
<body>
    <div id="root" data-view="manifestDesigner"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel and its resources.
   */
  public dispose(): void {
    ManifestDesignerPanel._currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    log("[ManifestDesignerPanel] Disposed");
  }
}

/**
 * Validate filename input for manifest save dialog.
 */
function _validateFilename(value: string): string | null {
  if (!value || value.trim() === "") {
    return "Filename is required";
  }
  if (!/^[\w-]+$/.test(value)) {
    return "Filename can only contain letters, numbers, hyphens, and underscores";
  }
  return null;
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
