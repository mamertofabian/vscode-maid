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
    public readonly filePath?: string,
    public readonly artifactFilePath?: string
  ) {
    super(label, collapsibleState);

    this.contextValue = `maidGraph_${nodeType}`;
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // filePath and artifactFilePath are already resolved to full paths in getCategoryChildren
    // Make file and manifest nodes openable
    if (filePath && (nodeType === "file" || nodeType === "manifest")) {
      this.resourceUri = vscode.Uri.file(filePath);
      this.command = {
        command: "vscode.open",
        title: "Open",
        arguments: [this.resourceUri],
      };
    }

    // Make artifact nodes navigable to their definition
    if (nodeType === "artifact" && graphNode && artifactFilePath) {
      this.command = {
        command: "vscode-maid.goToArtifactDefinition",
        title: "Go to Definition",
        arguments: [
          artifactFilePath,
          graphNode.name || "",
          graphNode.artifact_type || "function",
        ],
      };
    }

    // Make module nodes navigable to their main file
    if (nodeType === "module" && graphNode && artifactFilePath) {
      this.resourceUri = vscode.Uri.file(artifactFilePath);
      this.command = {
        command: "vscode.open",
        title: "Open Module",
        arguments: [this.resourceUri],
      };
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
  private manifestParentDir: string | undefined;
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
          const manifestDir = path.dirname(manifestPath);
          cwd = path.dirname(manifestDir); // Parent of manifests directory
          log(`[KnowledgeGraph] Using manifest directory: ${cwd}`);
        }
      } catch (error) {
        log(`[KnowledgeGraph] Could not find manifest directory, using workspace root`, "warn");
      }

      this.manifestParentDir = cwd;

      // Export to temp file
      const tempFile = path.join(os.tmpdir(), `maid-graph-${Date.now()}.json`);

      await execAsync(`maid graph export --format json --output "${tempFile}"`, {
        cwd: cwd,
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
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    for (const node of nodes) {
      let label = this.getNodeLabel(node);
      let filePath = node.path || undefined;
      let artifactFilePath: string | undefined;

      // Resolve file paths relative to manifest parent directory
      if (filePath && this.manifestParentDir && workspaceRoot) {
        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(this.manifestParentDir, filePath);
        filePath = fullPath; // Store full path for URI resolution
        // Update label to show workspace-relative path for file/manifest nodes
        if (node.type === "file" || node.type === "manifest") {
          label = vscode.workspace.asRelativePath(fullPath);
        }
      }

      // For artifacts and modules, look up the containing file via edges
      if (node.type === "artifact") {
        artifactFilePath = this.findArtifactFile(node.id);
      } else if (node.type === "module") {
        artifactFilePath = this.findModuleFile(node);
      }

      // Resolve artifact file path if found
      if (artifactFilePath && this.manifestParentDir && workspaceRoot) {
        const fullArtifactPath = path.isAbsolute(artifactFilePath)
          ? artifactFilePath
          : path.resolve(this.manifestParentDir, artifactFilePath);
        artifactFilePath = fullArtifactPath;
      }

      items.push(
        new GraphTreeItem(
          label,
          node.type,
          vscode.TreeItemCollapsibleState.None,
          node,
          filePath,
          artifactFilePath
        )
      );
    }

    // Sort alphabetically
    items.sort((a, b) => a.label.localeCompare(b.label));

    return items;
  }

  /**
   * Find the file path for an artifact by traversing graph edges.
   * Returns path relative to manifest directory (will be resolved in getCategoryChildren).
   */
  private findArtifactFile(artifactId: string): string | undefined {
    if (!this.graphData?.edges) {
      return undefined;
    }

    // Look for edges where this artifact is the source and target is a file
    // Common edge types: "defined_in", "contains" (reversed), etc.
    for (const edge of this.graphData.edges) {
      // Check if artifact -> file relationship
      if (edge.source === artifactId) {
        const targetNode = this.graphData.nodes.find((n) => n.id === edge.target);
        if (targetNode?.type === "file" && targetNode.path) {
          return targetNode.path;
        }
      }

      // Check if file -> artifact relationship (reversed)
      if (edge.target === artifactId) {
        const sourceNode = this.graphData.nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === "file" && sourceNode.path) {
          return sourceNode.path;
        }
      }
    }

    // Fallback: try to find file from artifact ID (some systems encode file in ID)
    // e.g., "src/utils.py::MyClass::my_method"
    const idParts = artifactId.split("::");
    if (idParts.length > 0 && idParts[0].includes(".")) {
      return idParts[0];
    }

    return undefined;
  }

  /**
   * Find the file path for a module.
   */
  private findModuleFile(node: GraphNode): string | undefined {
    // First, try to find via edges
    if (this.graphData?.edges) {
      for (const edge of this.graphData.edges) {
        // Check if module -> file relationship
        if (edge.source === node.id) {
          const targetNode = this.graphData.nodes.find((n) => n.id === edge.target);
          if (targetNode?.type === "file" && targetNode.path) {
            return targetNode.path;
          }
        }

        // Check if file -> module relationship (reversed)
        if (edge.target === node.id) {
          const sourceNode = this.graphData.nodes.find((n) => n.id === edge.source);
          if (sourceNode?.type === "file" && sourceNode.path) {
            return sourceNode.path;
          }
        }
      }
    }

    // Try to construct path from module name
    // e.g., "mypackage.utils" -> "mypackage/utils.py" or "mypackage/utils/__init__.py"
    if (node.name) {
      const modulePath = node.name.replace(/\./g, "/");

      // Check if it's a file node that matches
      if (this.graphData?.nodes) {
        for (const fileNode of this.graphData.nodes) {
          if (fileNode.type === "file" && fileNode.path) {
            // Check for direct module file (e.g., utils.py)
            if (fileNode.path.endsWith(`${modulePath}.py`) ||
                fileNode.path.endsWith(`${modulePath}.ts`) ||
                fileNode.path.endsWith(`${modulePath}.js`)) {
              return fileNode.path;
            }
            // Check for package __init__.py
            if (fileNode.path.endsWith(`${modulePath}/__init__.py`) ||
                fileNode.path.endsWith(`${modulePath}/index.ts`) ||
                fileNode.path.endsWith(`${modulePath}/index.js`)) {
              return fileNode.path;
            }
          }
        }
      }
    }

    // Fallback: try to find file from module ID
    const idParts = node.id.split("::");
    if (idParts.length > 0 && idParts[0].includes(".")) {
      return idParts[0];
    }

    return undefined;
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
