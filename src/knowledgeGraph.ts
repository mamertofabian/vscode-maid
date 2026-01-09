/**
 * Knowledge Graph TreeView for the MAID VS Code extension.
 * Shows the knowledge graph built from manifests using `maid graph export`.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { GraphNode, GraphNodeType, KnowledgeGraphResult } from "./types";
import { log, debounce } from "./utils";

/**
 * Tree item for knowledge graph view.
 */
export class GraphTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly nodeType: GraphNodeType | "category" | "edge",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly graphNode?: GraphNode,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);

    this.contextValue = `maidGraph_${nodeType}`;
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // Make file nodes openable
    if (filePath && (nodeType === "file" || nodeType === "manifest")) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceRoot) {
        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(workspaceRoot, filePath);
        this.resourceUri = vscode.Uri.file(fullPath);
        this.command = {
          command: "vscode.open",
          title: "Open",
          arguments: [this.resourceUri],
        };
      }
    }
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.nodeType) {
      case "manifest":
        return new vscode.ThemeIcon("file-code", new vscode.ThemeColor("charts.blue"));
      case "file":
        return new vscode.ThemeIcon("file");
      case "module":
        return new vscode.ThemeIcon("package", new vscode.ThemeColor("charts.purple"));
      case "artifact":
        const artifactType = this.graphNode?.artifact_type;
        if (artifactType === "class") {
          return new vscode.ThemeIcon("symbol-class", new vscode.ThemeColor("charts.orange"));
        } else if (artifactType === "function") {
          return new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.green"));
        } else if (artifactType === "attribute") {
          return new vscode.ThemeIcon("symbol-field", new vscode.ThemeColor("charts.yellow"));
        }
        return new vscode.ThemeIcon("symbol-misc");
      case "category":
        return new vscode.ThemeIcon("folder");
      case "edge":
        return new vscode.ThemeIcon("arrow-right");
      default:
        return new vscode.ThemeIcon("circle-outline");
    }
  }

  private getTooltip(): string {
    if (!this.graphNode) {
      return this.label;
    }

    const lines: string[] = [];
    lines.push(`Type: ${this.graphNode.type}`);

    if (this.graphNode.path) {
      lines.push(`Path: ${this.graphNode.path}`);
    }
    if (this.graphNode.goal) {
      lines.push(`Goal: ${this.graphNode.goal}`);
    }
    if (this.graphNode.name) {
      lines.push(`Name: ${this.graphNode.name}`);
    }
    if (this.graphNode.package) {
      lines.push(`Package: ${this.graphNode.package}`);
    }
    if (this.graphNode.artifact_type) {
      lines.push(`Artifact Type: ${this.graphNode.artifact_type}`);
    }
    if (this.graphNode.signature) {
      lines.push(`Signature: ${this.graphNode.signature}`);
    }
    if (this.graphNode.parent_class) {
      lines.push(`Parent Class: ${this.graphNode.parent_class}`);
    }

    return lines.join("\n");
  }

  private getDescription(): string | undefined {
    if (!this.graphNode) {
      return undefined;
    }

    switch (this.nodeType) {
      case "manifest":
        return this.graphNode.task_type || undefined;
      case "file":
        return this.graphNode.status || undefined;
      case "module":
        return this.graphNode.package || undefined;
      case "artifact":
        return this.graphNode.artifact_type || undefined;
      default:
        return undefined;
    }
  }
}

/**
 * TreeDataProvider for knowledge graph using `maid graph export`.
 */
export class KnowledgeGraphTreeDataProvider
  implements vscode.TreeDataProvider<GraphTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    GraphTreeItem | undefined | null | void
  > = new vscode.EventEmitter<GraphTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    GraphTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private graphData: KnowledgeGraphResult | null = null;
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;
  private isLoading = false;

  constructor() {
    this.debouncedRefresh = debounce(() => this.loadGraph(), 2000);

    // Watch for manifest changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.manifest.json");
    watcher.onDidCreate(() => this.debouncedRefresh());
    watcher.onDidChange(() => this.debouncedRefresh());
    watcher.onDidDelete(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Initial load
    this.loadGraph();
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[KnowledgeGraph] Manual refresh triggered");
    this.loadGraph();
  }

  /**
   * Load graph data from maid CLI.
   */
  private async loadGraph(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.graphData = null;
      this._onDidChangeTreeData.fire();
      this.isLoading = false;
      return;
    }

    try {
      log("[KnowledgeGraph] Loading graph from maid CLI...");
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const fs = await import("fs/promises");
      const execAsync = promisify(exec);

      // Export to temp file
      const tempFile = path.join(os.tmpdir(), `maid-graph-${Date.now()}.json`);

      await execAsync(`maid graph export --format json --output "${tempFile}"`, {
        cwd: workspaceRoot,
        timeout: 60000,
      });

      // Read and parse
      const content = await fs.readFile(tempFile, "utf-8");
      this.graphData = JSON.parse(content);

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      log(`[KnowledgeGraph] Loaded: ${this.graphData?.nodes.length || 0} nodes, ${this.graphData?.edges?.length || 0} edges`);
    } catch (error: any) {
      log(`[KnowledgeGraph] Error loading graph: ${error.message}`, "error");
      this.graphData = null;
    }

    this._onDidChangeTreeData.fire();
    this.isLoading = false;
  }

  getTreeItem(element: GraphTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GraphTreeItem): Promise<GraphTreeItem[]> {
    if (!element) {
      // Root level - show categories by node type
      return this.getRootCategories();
    }

    // Children of a category
    return this.getCategoryChildren(element);
  }

  private getRootCategories(): GraphTreeItem[] {
    if (!this.graphData || !this.graphData.nodes) {
      const item = new GraphTreeItem(
        "Run 'maid graph export' to see the knowledge graph",
        "category",
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon("info");
      return [item];
    }

    const items: GraphTreeItem[] = [];

    // Group nodes by type
    const manifests = this.graphData.nodes.filter((n) => n.type === "manifest");
    const files = this.graphData.nodes.filter((n) => n.type === "file");
    const modules = this.graphData.nodes.filter((n) => n.type === "module");
    const artifacts = this.graphData.nodes.filter((n) => n.type === "artifact");

    // Manifests
    if (manifests.length > 0) {
      const manifestCategory = new GraphTreeItem(
        `Manifests (${manifests.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Expanded
      );
      manifestCategory.iconPath = new vscode.ThemeIcon("file-code", new vscode.ThemeColor("charts.blue"));
      (manifestCategory as any).categoryType = "manifest";
      (manifestCategory as any).nodes = manifests;
      items.push(manifestCategory);
    }

    // Files
    if (files.length > 0) {
      const fileCategory = new GraphTreeItem(
        `Files (${files.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      fileCategory.iconPath = new vscode.ThemeIcon("files");
      (fileCategory as any).categoryType = "file";
      (fileCategory as any).nodes = files;
      items.push(fileCategory);
    }

    // Modules
    if (modules.length > 0) {
      const moduleCategory = new GraphTreeItem(
        `Modules (${modules.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      moduleCategory.iconPath = new vscode.ThemeIcon("package", new vscode.ThemeColor("charts.purple"));
      (moduleCategory as any).categoryType = "module";
      (moduleCategory as any).nodes = modules;
      items.push(moduleCategory);
    }

    // Artifacts
    if (artifacts.length > 0) {
      const artifactCategory = new GraphTreeItem(
        `Artifacts (${artifacts.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      artifactCategory.iconPath = new vscode.ThemeIcon("symbol-misc", new vscode.ThemeColor("charts.green"));
      (artifactCategory as any).categoryType = "artifact";
      (artifactCategory as any).nodes = artifacts;
      items.push(artifactCategory);
    }

    if (items.length === 0) {
      const item = new GraphTreeItem(
        "No graph data found",
        "category",
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon("info");
      return [item];
    }

    return items;
  }

  private getCategoryChildren(element: GraphTreeItem): GraphTreeItem[] {
    const anyElement = element as any;
    const nodes: GraphNode[] = anyElement.nodes;

    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }

    const items: GraphTreeItem[] = [];

    for (const node of nodes) {
      const label = this.getNodeLabel(node);
      const filePath = node.path || undefined;

      items.push(
        new GraphTreeItem(
          label,
          node.type,
          vscode.TreeItemCollapsibleState.None,
          node,
          filePath
        )
      );
    }

    // Sort alphabetically
    items.sort((a, b) => a.label.localeCompare(b.label));

    return items;
  }

  private getNodeLabel(node: GraphNode): string {
    switch (node.type) {
      case "manifest":
        // Show filename without full path
        return node.path ? path.basename(node.path) : node.id;
      case "file":
        return node.path || node.id;
      case "module":
        return node.name || node.id;
      case "artifact":
        if (node.parent_class) {
          return `${node.parent_class}.${node.name}`;
        }
        return node.name || node.id;
      default:
        return node.id;
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    log("[KnowledgeGraph] Disposed");
  }
}
