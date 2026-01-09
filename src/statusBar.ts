/**
 * Status bar management for the MAID VS Code extension.
 * Shows real-time validation status for manifest files.
 */

import * as vscode from "vscode";
import { StatusBarState } from "./types";
import { log, isManifestFile } from "./utils";

/**
 * Manages the MAID status bar item.
 */
export class MaidStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: StatusBarState = "hidden";
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "workbench.action.problems.focus";
    this.hide();

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.updateVisibility(editor);
      })
    );

    // Initial visibility check
    this.updateVisibility(vscode.window.activeTextEditor);
  }

  /**
   * Update visibility based on the active editor.
   */
  private updateVisibility(editor: vscode.TextEditor | undefined): void {
    if (editor && isManifestFile(editor.document.uri)) {
      if (this.currentState === "hidden") {
        // Show with last known state or default to validating
        this.setValidating();
      }
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Update the status bar with validation results.
   */
  updateStatus(errorCount: number, warningCount: number): void {
    if (errorCount > 0) {
      this.setErrors(errorCount);
    } else if (warningCount > 0) {
      this.setWarnings(warningCount);
    } else {
      this.setValid();
    }
  }

  /**
   * Set status to valid (no errors or warnings).
   */
  setValid(): void {
    this.currentState = "valid";
    this.statusBarItem.text = "$(check) MAID: Valid";
    this.statusBarItem.tooltip = "Manifest validation passed";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.foreground"
    );
    log("[StatusBar] Set to valid");
  }

  /**
   * Set status to show errors.
   */
  setErrors(count: number): void {
    this.currentState = "errors";
    const plural = count === 1 ? "error" : "errors";
    this.statusBarItem.text = `$(error) MAID: ${count} ${plural}`;
    this.statusBarItem.tooltip = `Manifest has ${count} validation ${plural}. Click to view problems.`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.errorForeground"
    );
    log(`[StatusBar] Set to errors: ${count}`);
  }

  /**
   * Set status to show warnings.
   */
  setWarnings(count: number): void {
    this.currentState = "warnings";
    const plural = count === 1 ? "warning" : "warnings";
    this.statusBarItem.text = `$(warning) MAID: ${count} ${plural}`;
    this.statusBarItem.tooltip = `Manifest has ${count} ${plural}. Click to view problems.`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.warningForeground"
    );
    log(`[StatusBar] Set to warnings: ${count}`);
  }

  /**
   * Set status to validating (spinner).
   */
  setValidating(): void {
    this.currentState = "validating";
    this.statusBarItem.text = "$(sync~spin) MAID: Validating...";
    this.statusBarItem.tooltip = "Validating manifest...";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.foreground"
    );
    log("[StatusBar] Set to validating");
  }

  /**
   * Set status to not installed.
   */
  setNotInstalled(): void {
    this.currentState = "not-installed";
    this.statusBarItem.text = "$(question) MAID: Not Installed";
    this.statusBarItem.tooltip =
      "maid-lsp is not installed. Click to install.";
    this.statusBarItem.command = "vscode-maid.checkInstallation";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.foreground"
    );
    log("[StatusBar] Set to not-installed");
  }

  /**
   * Show the status bar item.
   */
  show(): void {
    this.statusBarItem.show();
    log("[StatusBar] Shown");
  }

  /**
   * Hide the status bar item.
   */
  hide(): void {
    this.currentState = "hidden";
    this.statusBarItem.hide();
    log("[StatusBar] Hidden");
  }

  /**
   * Get the current state.
   */
  getState(): StatusBarState {
    return this.currentState;
  }

  /**
   * Dispose of the status bar item and listeners.
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach((d) => d.dispose());
    log("[StatusBar] Disposed");
  }
}
