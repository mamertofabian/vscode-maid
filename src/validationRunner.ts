/**
 * Validation Runner for the MAID VS Code extension.
 * Executes MAID validation operations from VS Code.
 */

import * as vscode from "vscode";
import * as path from "path";
import { log, getWorkspaceRoot, isManifestFile, getMaidRoot } from "./utils";
import { ManifestTreeItem } from "./manifestExplorer";

/**
 * Manages validation execution for MAID manifests.
 */
export class MaidValidationRunner {
  private _terminal: vscode.Terminal | undefined;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    // Clean up terminal when it's closed
    this._disposables.push(
      vscode.window.onDidCloseTerminal((t) => {
        if (t === this._terminal) {
          this._terminal = undefined;
        }
      })
    );
  }

  /**
   * Get or create the MAID validation terminal.
   */
  private _getTerminal(): vscode.Terminal {
    if (this._terminal && this._terminal.exitStatus === undefined) {
      return this._terminal;
    }

    this._terminal = vscode.window.createTerminal({
      name: "MAID Validation",
      cwd: getWorkspaceRoot(),
    });

    return this._terminal;
  }

  /**
   * Extract URI from various argument types.
   * Commands can receive:
   * - vscode.Uri (from explorer context menu)
   * - ManifestTreeItem (from tree view)
   * - undefined (from command palette)
   */
  private _extractUri(arg: unknown): vscode.Uri | undefined {
    // Check if it's a URI (check for URI-like properties instead of instanceof)
    if (arg && typeof arg === "object" && "fsPath" in arg && "scheme" in arg) {
      return arg as vscode.Uri;
    }

    // Check if it's a ManifestTreeItem
    if (arg && typeof arg === "object" && "resourceUri" in arg) {
      const treeItem = arg as ManifestTreeItem;
      return treeItem.resourceUri;
    }

    // Check if it's an object with uri property (some VS Code contexts)
    if (arg && typeof arg === "object" && "uri" in arg) {
      const obj = arg as { uri: vscode.Uri };
      if (obj.uri && typeof obj.uri === "object" && "fsPath" in obj.uri) {
        return obj.uri;
      }
    }

    // Check if it's an object with fsPath (file system path)
    if (arg && typeof arg === "object" && "fsPath" in arg) {
      const obj = arg as { fsPath: string };
      if (typeof obj.fsPath === "string") {
        return vscode.Uri.file(obj.fsPath);
      }
    }

    return undefined;
  }

  /**
   * Run validation for all manifests in the workspace.
   */
  runAllValidation(): void {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage(
        "No workspace folder open. Please open a folder with MAID manifests."
      );
      return;
    }

    log("[ValidationRunner] Running validation for all manifests");
    const terminal = this._getTerminal();
    terminal.sendText("maid validate");
    terminal.show();
  }

  /**
   * Run validation for a specific manifest.
   */
  runValidation(arg?: unknown): void {
    // Try to extract URI from argument
    let manifestUri = this._extractUri(arg);

    // If no URI provided, try to get from active editor
    if (!manifestUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && isManifestFile(activeEditor.document.uri)) {
        manifestUri = activeEditor.document.uri;
      }
    }

    if (!manifestUri) {
      vscode.window.showErrorMessage(
        "No manifest file selected. Please open or select a .manifest.json file."
      );
      return;
    }

    const manifestPath = manifestUri.fsPath;
    const maidRoot = getMaidRoot(manifestPath);
    // Get relative path from MAID root
    const relativeManifestPath = path.relative(maidRoot, manifestPath);

    log(`[ValidationRunner] Running validation from MAID root: ${maidRoot}`);
    log(`[ValidationRunner] Running validation for manifest: ${relativeManifestPath}`);

    const terminal = this._getTerminal();
    // Change to MAID root, then run the command with relative path
    terminal.sendText(
      `cd "${maidRoot}" && maid validate "${relativeManifestPath}" --use-manifest-chain`
    );
    terminal.show();
  }

  /**
   * Run coherence validation for a specific manifest.
   */
  runCoherenceValidation(arg?: unknown): void {
    // Try to extract URI from argument
    let manifestUri = this._extractUri(arg);

    // If no URI provided, try to get from active editor
    if (!manifestUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && isManifestFile(activeEditor.document.uri)) {
        manifestUri = activeEditor.document.uri;
      }
    }

    if (!manifestUri) {
      vscode.window.showErrorMessage(
        "No manifest file selected. Please open or select a .manifest.json file."
      );
      return;
    }

    const manifestPath = manifestUri.fsPath;
    const maidRoot = getMaidRoot(manifestPath);
    // Get relative path from MAID root
    const relativeManifestPath = path.relative(maidRoot, manifestPath);

    log(`[ValidationRunner] Running coherence validation from MAID root: ${maidRoot}`);
    log(`[ValidationRunner] Running coherence validation for manifest: ${relativeManifestPath}`);

    const terminal = this._getTerminal();
    // Change to MAID root, then run the command with relative path
    terminal.sendText(
      `cd "${maidRoot}" && maid validate "${relativeManifestPath}" --coherence --json-output`
    );
    terminal.show();
  }

  /**
   * Run manifest chain validation for a specific manifest.
   */
  runChainValidation(arg?: unknown): void {
    // Try to extract URI from argument
    let manifestUri = this._extractUri(arg);

    // If no URI provided, try to get from active editor
    if (!manifestUri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && isManifestFile(activeEditor.document.uri)) {
        manifestUri = activeEditor.document.uri;
      }
    }

    if (!manifestUri) {
      vscode.window.showErrorMessage(
        "No manifest file selected. Please open or select a .manifest.json file."
      );
      return;
    }

    const manifestPath = manifestUri.fsPath;
    const maidRoot = getMaidRoot(manifestPath);
    // Get relative path from MAID root
    const relativeManifestPath = path.relative(maidRoot, manifestPath);

    log(`[ValidationRunner] Running chain validation from MAID root: ${maidRoot}`);
    log(`[ValidationRunner] Running chain validation for manifest: ${relativeManifestPath}`);

    const terminal = this._getTerminal();
    // Change to MAID root, then run the command with relative path
    terminal.sendText(
      `cd "${maidRoot}" && maid validate "${relativeManifestPath}" --use-manifest-chain --json-output`
    );
    terminal.show();
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    if (this._terminal) {
      this._terminal.dispose();
    }
    this._disposables.forEach((d: vscode.Disposable) => {
      d.dispose();
    });
    log("[ValidationRunner] Disposed");
  }
}
