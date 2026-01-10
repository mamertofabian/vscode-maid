/**
 * Manifest History TreeView for the MAID VS Code extension.
 * Shows Git commit history for manifest files.
 */

import * as vscode from "vscode";
import * as path from "path";
import { log, isManifestPath, debounce } from "./utils";
import { getManifestHistory, isGitRepository } from "./gitHistory";
import type { CommitHistory } from "./types";

/**
 * Tree item for manifest history view.
 */
export class HistoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: "manifest" | "category" | "commit" | "empty",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly manifestPath?: string,
    public readonly commitHistory?: CommitHistory
  ) {
    super(label, collapsibleState);

    this.contextValue = this.getContextValue();
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // Make commit items clickable to show details
    if (itemType === "commit" && commitHistory && manifestPath) {
      this.command = {
        command: "vscode-maid.showManifestHistory",
        title: "View History",
        arguments: [manifestPath, commitHistory.hash],
      };
    }
  }

  private getContextValue(): string {
    switch (this.itemType) {
      case "manifest":
        return "maidHistoryManifest";
      case "category":
        return "maidHistoryCategory";
      case "commit":
        return "maidHistoryCommit";
      case "empty":
        return "maidHistoryEmpty";
      default:
        return "maidHistoryItem";
    }
  }

  private getIcon(): vscode.ThemeIcon | undefined {
    switch (this.itemType) {
      case "manifest":
        return new vscode.ThemeIcon("file-code");
      case "category":
        return new vscode.ThemeIcon("history");
      case "commit":
        return new vscode.ThemeIcon("git-commit");
      case "empty":
        return new vscode.ThemeIcon("info");
      default:
        return undefined;
    }
  }

  private getTooltip(): string {
    if (this.itemType === "commit" && this.commitHistory) {
      const commit = this.commitHistory;
      const dateStr = commit.date.toLocaleString();
      const changes = commit.changes;
      return [
        `Commit: ${commit.shortHash}`,
        `Author: ${commit.author} <${commit.email}>`,
        `Date: ${dateStr}`,
        `Message: ${commit.message}`,
        `Changes: +${changes.added} -${changes.removed}`,
      ].join("\n");
    }
    if (this.itemType === "manifest" && this.manifestPath) {
      return this.manifestPath;
    }
    return this.label;
  }

  private getDescription(): string | undefined {
    if (this.itemType === "commit" && this.commitHistory) {
      const commit = this.commitHistory;
      const dateStr = commit.date.toLocaleDateString();
      return `${dateStr} • ${commit.author}`;
    }
    return undefined;
  }
}

/**
 * TreeDataProvider for manifest history.
 */
export class ManifestHistoryTreeDataProvider
  implements vscode.TreeDataProvider<HistoryTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    HistoryTreeItem | undefined | null | void
  > = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    HistoryTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private selectedManifest: string | undefined;
  private commitHistory: CommitHistory[] = [];
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;
  private isLoading = false;
  private isGitRepo: boolean = false;

  constructor() {
    this.debouncedRefresh = debounce(() => this.checkGitAndRefresh(), 500);

    // Watch for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isManifestPath(editor.document.uri.fsPath)) {
          this.setSelectedManifest(editor.document.uri.fsPath);
        } else {
          this.setSelectedManifest(undefined);
        }
      })
    );

    // Watch for manifest file changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.manifest.json");
    watcher.onDidChange(() => this.debouncedRefresh());
    watcher.onDidCreate(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Check initial selection
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && isManifestPath(activeEditor.document.uri.fsPath)) {
      this.selectedManifest = activeEditor.document.uri.fsPath;
      this.checkGitAndRefresh();
    }
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[ManifestHistory] Manual refresh triggered");
    this.checkGitAndRefresh();
  }

  /**
   * Check if Git repository and refresh.
   */
  private async checkGitAndRefresh(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.isGitRepo = false;
      this._onDidChangeTreeData.fire();
      return;
    }

    this.isGitRepo = await isGitRepository(workspaceRoot);
    await this.loadHistory();
  }

  /**
   * Load history for the selected manifest.
   */
  private async loadHistory(): Promise<void> {
    if (this.isLoading) return;
    if (!this.selectedManifest) {
      this.commitHistory = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    if (!this.isGitRepo) {
      this.commitHistory = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    this.isLoading = true;
    log(`[ManifestHistory] Loading history for: ${this.selectedManifest}`);

    try {
      const config = vscode.workspace.getConfiguration("maid");
      const maxCommits = config.get<number>("history.maxCommits", 50);
      this.commitHistory = await getManifestHistory(
        this.selectedManifest,
        maxCommits
      );
      log(`[ManifestHistory] Loaded ${this.commitHistory.length} commits`);
    } catch (error) {
      log(`[ManifestHistory] Error loading history: ${error}`, "error");
      this.commitHistory = [];
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Set the selected manifest.
   */
  setSelectedManifest(manifestPath: string | undefined): void {
    if (this.selectedManifest !== manifestPath) {
      this.selectedManifest = manifestPath;
      this.loadHistory();
    }
  }

  /**
   * Get tree item children.
   */
  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a tree item.
   */
  async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
    // Root level: show selected manifest or empty state
    if (!element) {
      if (!this.selectedManifest) {
        return [
          new HistoryTreeItem(
            "No manifest selected",
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      if (!this.isGitRepo) {
        return [
          new HistoryTreeItem(
            "Not a Git repository",
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      const manifestName = path.basename(this.selectedManifest);
      return [
        new HistoryTreeItem(
          manifestName,
          "manifest",
          vscode.TreeItemCollapsibleState.Expanded,
          this.selectedManifest
        ),
      ];
    }

    // Manifest level: show history category
    if (element.itemType === "manifest") {
      if (this.isLoading) {
        return [
          new HistoryTreeItem(
            "Loading history...",
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      if (this.commitHistory.length === 0) {
        return [
          new HistoryTreeItem(
            "No history found",
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      return [
        new HistoryTreeItem(
          "History",
          "category",
          vscode.TreeItemCollapsibleState.Expanded
        ),
      ];
    }

    // Category level: show commits
    if (element.itemType === "category") {
      return this.commitHistory.map(
        (commit) =>
          new HistoryTreeItem(
            commit.shortHash,
            "commit",
            vscode.TreeItemCollapsibleState.None,
            this.selectedManifest,
            commit
          )
      );
    }

    return [];
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
