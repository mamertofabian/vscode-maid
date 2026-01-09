/**
 * Test Runner for the MAID VS Code extension.
 * Executes MAID tests from VS Code.
 */

import * as vscode from "vscode";
import { log, getWorkspaceRoot, isManifestFile } from "./utils";
import { ManifestTreeItem } from "./manifestExplorer";

/**
 * Manages test execution for MAID manifests.
 */
export class MaidTestRunner {
  private terminal: vscode.Terminal | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Clean up terminal when it's closed
    this.disposables.push(
      vscode.window.onDidCloseTerminal((t) => {
        if (t === this.terminal) {
          this.terminal = undefined;
        }
      })
    );
  }

  /**
   * Get or create the MAID test terminal.
   */
  private getTerminal(): vscode.Terminal {
    if (this.terminal && this.terminal.exitStatus === undefined) {
      return this.terminal;
    }

    this.terminal = vscode.window.createTerminal({
      name: "MAID Tests",
      cwd: getWorkspaceRoot(),
    });

    return this.terminal;
  }

  /**
   * Extract URI from various argument types.
   * Commands can receive:
   * - vscode.Uri (from explorer context menu)
   * - ManifestTreeItem (from tree view)
   * - undefined (from command palette)
   */
  private extractUri(arg: unknown): vscode.Uri | undefined {
    // Check if it's a URI
    if (arg instanceof vscode.Uri) {
      return arg;
    }

    // Check if it's a ManifestTreeItem
    if (arg && typeof arg === "object" && "resourceUri" in arg) {
      const treeItem = arg as ManifestTreeItem;
      return treeItem.resourceUri;
    }

    // Check if it's an object with uri property (some VS Code contexts)
    if (arg && typeof arg === "object" && "uri" in arg) {
      const obj = arg as { uri: vscode.Uri };
      if (obj.uri instanceof vscode.Uri) {
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
   * Run all tests in the workspace.
   */
  async runAllTests(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage(
        "No workspace folder open. Please open a folder with MAID manifests."
      );
      return;
    }

    log("[TestRunner] Running all tests");
    const terminal = this.getTerminal();
    terminal.sendText("maid test");
    terminal.show();
  }

  /**
   * Run tests in watch mode for all manifests.
   */
  async runTestsWatch(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage(
        "No workspace folder open. Please open a folder with MAID manifests."
      );
      return;
    }

    log("[TestRunner] Running tests in watch-all mode");
    const terminal = this.getTerminal();
    terminal.sendText("maid test --watch-all");
    terminal.show();
  }

  /**
   * Run tests for a specific manifest file.
   */
  async runTestsForManifest(arg?: unknown): Promise<void> {
    // Try to extract URI from argument
    let manifestUri = this.extractUri(arg);

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
    log(`[TestRunner] Running tests for manifest: ${manifestPath}`);

    const terminal = this.getTerminal();
    // Use --manifest flag as per maid test --help
    terminal.sendText(`maid test --manifest "${manifestPath}"`);
    terminal.show();
  }

  /**
   * Run validation for a specific manifest.
   */
  async runValidation(arg?: unknown): Promise<void> {
    // Try to extract URI from argument
    let manifestUri = this.extractUri(arg);

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
    log(`[TestRunner] Running validation for manifest: ${manifestPath}`);

    const terminal = this.getTerminal();
    terminal.sendText(`maid validate "${manifestPath}" --use-manifest-chain`);
    terminal.show();
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    if (this.terminal) {
      this.terminal.dispose();
    }
    this.disposables.forEach((d) => d.dispose());
    log("[TestRunner] Disposed");
  }
}
