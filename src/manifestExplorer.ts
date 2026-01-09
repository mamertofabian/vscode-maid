/**
 * Manifest Explorer TreeView for the MAID VS Code extension.
 * Shows all manifest files in the workspace with their structure and status.
 */

import * as vscode from "vscode";
import * as path from "path";
import {
  ManifestTreeItemType,
  ManifestTreeItemContext,
  ManifestInfo,
  ManifestTask,
  ExpectedArtifact,
  ArtifactContains,
} from "./types";
import { log, findManifestFiles, isManifestPath, debounce } from "./utils";

/**
 * TreeItem for manifest explorer.
 */
export class ManifestTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: ManifestTreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resourceUri?: vscode.Uri,
    public readonly manifestInfo?: ManifestInfo,
    public readonly task?: ManifestTask
  ) {
    super(label, collapsibleState);

    this.contextValue = this.getContextValue();
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // Make items openable
    if (resourceUri && itemType !== "category") {
      this.command = {
        command: "vscode.open",
        title: "Open",
        arguments: [resourceUri],
      };
    }
  }

  private getContextValue(): ManifestTreeItemContext {
    switch (this.itemType) {
      case "manifest":
        return "maidManifest";
      case "task":
        return "maidTask";
      case "artifact":
      case "expectedArtifact":
        return "maidExpectedArtifact";
      case "file":
        return "maidFile";
      case "creatableFile":
        return "maidCreatableFile";
      case "editableFile":
        return "maidEditableFile";
      case "readonlyFile":
        return "maidReadonlyFile";
      case "validationCommand":
        return "maidValidationCommand";
      case "testFile":
        return "maidTestFile";
      case "category":
        return "maidCategory";
      default:
        return "maidFile";
    }
  }

  private getIcon(): vscode.ThemeIcon | undefined {
    switch (this.itemType) {
      case "manifest":
        if (this.manifestInfo?.errorCount && this.manifestInfo.errorCount > 0) {
          return new vscode.ThemeIcon(
            "file-code",
            new vscode.ThemeColor("errorForeground")
          );
        }
        if (
          this.manifestInfo?.warningCount &&
          this.manifestInfo.warningCount > 0
        ) {
          return new vscode.ThemeIcon(
            "file-code",
            new vscode.ThemeColor("editorWarning.foreground")
          );
        }
        return new vscode.ThemeIcon("file-code");
      case "task":
        return new vscode.ThemeIcon("symbol-method");
      case "artifact":
        return new vscode.ThemeIcon("file");
      case "file":
        return new vscode.ThemeIcon("file");
      case "creatableFile":
        return new vscode.ThemeIcon("new-file", new vscode.ThemeColor("charts.green"));
      case "editableFile":
        return new vscode.ThemeIcon("edit", new vscode.ThemeColor("charts.blue"));
      case "readonlyFile":
        return new vscode.ThemeIcon("lock", new vscode.ThemeColor("charts.yellow"));
      case "expectedArtifact":
        return new vscode.ThemeIcon("symbol-file", new vscode.ThemeColor("charts.purple"));
      case "artifactContains":
        return new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.orange"));
      case "supersedes":
        return new vscode.ThemeIcon("references", new vscode.ThemeColor("charts.red"));
      case "validationCommand":
        return new vscode.ThemeIcon("terminal", new vscode.ThemeColor("terminal.ansiCyan"));
      case "testFile":
        return new vscode.ThemeIcon("beaker", new vscode.ThemeColor("terminal.ansiCyan"));
      case "category":
        return new vscode.ThemeIcon("folder");
      default:
        return undefined;
    }
  }

  private getTooltip(): string {
    switch (this.itemType) {
      case "manifest":
        if (this.manifestInfo) {
          const errors = this.manifestInfo.errorCount || 0;
          const warnings = this.manifestInfo.warningCount || 0;
          if (errors > 0) {
            return `${this.resourceUri?.fsPath}\n${errors} error(s), ${warnings} warning(s)`;
          }
          if (warnings > 0) {
            return `${this.resourceUri?.fsPath}\n${warnings} warning(s)`;
          }
          return `${this.resourceUri?.fsPath}\nValid`;
        }
        return this.resourceUri?.fsPath || this.label;
      case "task":
        return this.task?.description || this.label;
      default:
        return this.resourceUri?.fsPath || this.label;
    }
  }

  private getDescription(): string | undefined {
    switch (this.itemType) {
      case "manifest":
        if (this.manifestInfo) {
          const errors = this.manifestInfo.errorCount || 0;
          const warnings = this.manifestInfo.warningCount || 0;
          if (errors > 0) {
            return `${errors} errors`;
          }
          if (warnings > 0) {
            return `${warnings} warnings`;
          }
          return "valid";
        }
        return undefined;
      case "task":
        return this.task?.status;
      default:
        return undefined;
    }
  }
}

/**
 * TreeDataProvider for the manifest explorer.
 */
export class ManifestTreeDataProvider
  implements vscode.TreeDataProvider<ManifestTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ManifestTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ManifestTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ManifestTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private manifests: Map<string, ManifestInfo> = new Map();
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;

  constructor() {
    this.debouncedRefresh = debounce(() => this.refresh(), 500);

    // Watch for file system changes
    const watcher = vscode.workspace.createFileSystemWatcher(
      "**/*.manifest.json"
    );
    watcher.onDidCreate(() => this.debouncedRefresh());
    watcher.onDidChange(() => this.debouncedRefresh());
    watcher.onDidDelete(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Watch for diagnostics changes to update validation status
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics((event) => {
        const hasManifestChanges = event.uris.some((uri) =>
          isManifestPath(uri.fsPath)
        );
        if (hasManifestChanges) {
          this.updateDiagnostics(event.uris);
        }
      })
    );

    // Initial load
    this.loadManifests();
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[ManifestExplorer] Refreshing tree view");
    this.loadManifests();
  }

  /**
   * Load all manifest files from the workspace.
   */
  private async loadManifests(): Promise<void> {
    try {
      const files = await findManifestFiles();
      log(`[ManifestExplorer] Found ${files.length} manifest files`);

      this.manifests.clear();
      for (const file of files) {
        const info: ManifestInfo = {
          path: file.fsPath,
          name: path.basename(file.fsPath, ".manifest.json"),
          errorCount: 0,
          warningCount: 0,
        };

        // Get current diagnostics
        const diagnostics = vscode.languages.getDiagnostics(file);
        info.errorCount = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Error
        ).length;
        info.warningCount = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Warning
        ).length;

        this.manifests.set(file.fsPath, info);
      }

      this._onDidChangeTreeData.fire();
    } catch (error) {
      log(`[ManifestExplorer] Error loading manifests: ${error}`, "error");
    }
  }

  /**
   * Update diagnostics for changed URIs.
   */
  private updateDiagnostics(uris: readonly vscode.Uri[]): void {
    let changed = false;
    for (const uri of uris) {
      if (!isManifestPath(uri.fsPath)) continue;

      const info = this.manifests.get(uri.fsPath);
      if (info) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const newErrorCount = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Error
        ).length;
        const newWarningCount = diagnostics.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Warning
        ).length;

        if (
          info.errorCount !== newErrorCount ||
          info.warningCount !== newWarningCount
        ) {
          info.errorCount = newErrorCount;
          info.warningCount = newWarningCount;
          changed = true;
        }
      }
    }

    if (changed) {
      this._onDidChangeTreeData.fire();
    }
  }

  getTreeItem(element: ManifestTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ManifestTreeItem): Promise<ManifestTreeItem[]> {
    if (!element) {
      // Root level - show all manifests
      return this.getManifestItems();
    }

    // Children of a manifest or category
    switch (element.itemType) {
      case "manifest":
        return this.getManifestChildren(element);
      case "category":
        return this.getCategoryChildren(element);
      default:
        return [];
    }
  }

  private getManifestItems(): ManifestTreeItem[] {
    const items: ManifestTreeItem[] = [];

    // Sort by name
    const sorted = Array.from(this.manifests.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    for (const info of sorted) {
      const uri = vscode.Uri.file(info.path);
      const relativePath = vscode.workspace.asRelativePath(info.path);
      const item = new ManifestTreeItem(
        relativePath,
        "manifest",
        vscode.TreeItemCollapsibleState.Collapsed,
        uri,
        info
      );
      items.push(item);
    }

    if (items.length === 0) {
      // Show a message when no manifests found
      const noManifestsItem = new ManifestTreeItem(
        "No manifest files found",
        "category",
        vscode.TreeItemCollapsibleState.None
      );
      noManifestsItem.iconPath = new vscode.ThemeIcon("info");
      items.push(noManifestsItem);
    }

    return items;
  }

  private async getManifestChildren(
    element: ManifestTreeItem
  ): Promise<ManifestTreeItem[]> {
    const items: ManifestTreeItem[] = [];

    // Read and parse the manifest file
    if (element.resourceUri) {
      try {
        const content = await vscode.workspace.fs.readFile(element.resourceUri);
        const manifest = JSON.parse(Buffer.from(content).toString());
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        // Show supersedes if present
        if (manifest.supersedes && Array.isArray(manifest.supersedes) && manifest.supersedes.length > 0) {
          const supersedesCategory = new ManifestTreeItem(
            `Supersedes (${manifest.supersedes.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          supersedesCategory.iconPath = new vscode.ThemeIcon("references", new vscode.ThemeColor("charts.red"));
          (supersedesCategory as any).categoryType = "supersedes";
          (supersedesCategory as any).items = manifest.supersedes;
          (supersedesCategory as any).workspaceRoot = workspaceRoot;
          items.push(supersedesCategory);
        }

        // Show creatable files
        if (manifest.creatableFiles && Array.isArray(manifest.creatableFiles) && manifest.creatableFiles.length > 0) {
          const creatableCategory = new ManifestTreeItem(
            `Creatable Files (${manifest.creatableFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          creatableCategory.iconPath = new vscode.ThemeIcon("new-file", new vscode.ThemeColor("charts.green"));
          (creatableCategory as any).categoryType = "creatableFiles";
          (creatableCategory as any).items = manifest.creatableFiles;
          (creatableCategory as any).workspaceRoot = workspaceRoot;
          items.push(creatableCategory);
        }

        // Show editable files
        if (manifest.editableFiles && Array.isArray(manifest.editableFiles) && manifest.editableFiles.length > 0) {
          const editableCategory = new ManifestTreeItem(
            `Editable Files (${manifest.editableFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          editableCategory.iconPath = new vscode.ThemeIcon("edit", new vscode.ThemeColor("charts.blue"));
          (editableCategory as any).categoryType = "editableFiles";
          (editableCategory as any).items = manifest.editableFiles;
          (editableCategory as any).workspaceRoot = workspaceRoot;
          items.push(editableCategory);
        }

        // Show readonly files
        if (manifest.readonlyFiles && Array.isArray(manifest.readonlyFiles) && manifest.readonlyFiles.length > 0) {
          const readonlyCategory = new ManifestTreeItem(
            `Read-only Files (${manifest.readonlyFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          readonlyCategory.iconPath = new vscode.ThemeIcon("lock", new vscode.ThemeColor("charts.yellow"));
          (readonlyCategory as any).categoryType = "readonlyFiles";
          (readonlyCategory as any).items = manifest.readonlyFiles;
          (readonlyCategory as any).workspaceRoot = workspaceRoot;
          items.push(readonlyCategory);
        }

        // Show expected artifacts
        if (manifest.expectedArtifacts) {
          const artifacts = Array.isArray(manifest.expectedArtifacts)
            ? manifest.expectedArtifacts
            : [manifest.expectedArtifacts];

          if (artifacts.length > 0 && artifacts[0]) {
            const artifactsCategory = new ManifestTreeItem(
              `Expected Artifacts (${artifacts.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            artifactsCategory.iconPath = new vscode.ThemeIcon("symbol-file", new vscode.ThemeColor("charts.purple"));
            (artifactsCategory as any).categoryType = "expectedArtifacts";
            (artifactsCategory as any).items = artifacts;
            (artifactsCategory as any).workspaceRoot = workspaceRoot;
            items.push(artifactsCategory);
          }
        }

        // Show test files from validation command
        if (manifest.validationCommand && Array.isArray(manifest.validationCommand) && manifest.validationCommand.length > 0) {
          // Extract test files from validation command (files that look like paths)
          const testFiles = manifest.validationCommand.filter((arg: string) => {
            // Look for arguments that look like file paths (contain / or \ or end with test extensions)
            return (
              (arg.includes("/") || arg.includes("\\")) &&
              (arg.endsWith(".ts") || arg.endsWith(".tsx") || arg.endsWith(".js") ||
               arg.endsWith(".jsx") || arg.endsWith(".py") || arg.endsWith(".rs") ||
               arg.endsWith(".spec.ts") || arg.endsWith(".spec.tsx") ||
               arg.endsWith(".test.ts") || arg.endsWith(".test.tsx") ||
               arg.endsWith(".spec.js") || arg.endsWith(".spec.jsx") ||
               arg.endsWith(".test.js") || arg.endsWith(".test.jsx"))
            );
          });

          if (testFiles.length > 0) {
            const testFilesCategory = new ManifestTreeItem(
              `Test Files (${testFiles.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            testFilesCategory.iconPath = new vscode.ThemeIcon("beaker", new vscode.ThemeColor("terminal.ansiCyan"));
            (testFilesCategory as any).categoryType = "testFiles";
            (testFilesCategory as any).items = testFiles;
            (testFilesCategory as any).workspaceRoot = workspaceRoot;
            items.push(testFilesCategory);
          }
        }

        // Legacy support: Show tasks if available (for older manifest formats)
        if (manifest.tasks && Array.isArray(manifest.tasks)) {
          const tasksCategory = new ManifestTreeItem(
            `Tasks (${manifest.tasks.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          (tasksCategory as any).categoryType = "tasks";
          (tasksCategory as any).tasks = manifest.tasks;
          (tasksCategory as any).parentUri = element.resourceUri;
          items.push(tasksCategory);
        }

      } catch (error) {
        log(`[ManifestExplorer] Error parsing manifest: ${error}`, "error");
        const errorItem = new ManifestTreeItem(
          "Error parsing manifest",
          "category",
          vscode.TreeItemCollapsibleState.None
        );
        errorItem.iconPath = new vscode.ThemeIcon("error");
        items.push(errorItem);
      }
    }

    return items;
  }

  private getCategoryChildren(
    element: ManifestTreeItem
  ): ManifestTreeItem[] {
    const items: ManifestTreeItem[] = [];
    const anyElement = element as any;
    const categoryType = anyElement.categoryType;
    const categoryItems = anyElement.items;
    const workspaceRoot = anyElement.workspaceRoot;

    // Handle different category types
    switch (categoryType) {
      case "supersedes":
        if (categoryItems) {
          for (const superseded of categoryItems) {
            let uri: vscode.Uri | undefined;
            if (workspaceRoot && superseded) {
              const fullPath = path.isAbsolute(superseded)
                ? superseded
                : path.join(workspaceRoot, superseded);
              uri = vscode.Uri.file(fullPath);
            }
            const supersedesItem = new ManifestTreeItem(
              superseded,
              "supersedes",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(supersedesItem);
          }
        }
        break;

      case "creatableFiles":
        if (categoryItems) {
          for (const file of categoryItems) {
            let uri: vscode.Uri | undefined;
            if (workspaceRoot) {
              const fullPath = path.isAbsolute(file)
                ? file
                : path.join(workspaceRoot, file);
              uri = vscode.Uri.file(fullPath);
            }
            const fileItem = new ManifestTreeItem(
              file,
              "creatableFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "editableFiles":
        if (categoryItems) {
          for (const file of categoryItems) {
            let uri: vscode.Uri | undefined;
            if (workspaceRoot) {
              const fullPath = path.isAbsolute(file)
                ? file
                : path.join(workspaceRoot, file);
              uri = vscode.Uri.file(fullPath);
            }
            const fileItem = new ManifestTreeItem(
              file,
              "editableFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "readonlyFiles":
        if (categoryItems) {
          for (const file of categoryItems) {
            let uri: vscode.Uri | undefined;
            if (workspaceRoot) {
              const fullPath = path.isAbsolute(file)
                ? file
                : path.join(workspaceRoot, file);
              uri = vscode.Uri.file(fullPath);
            }
            const fileItem = new ManifestTreeItem(
              file,
              "readonlyFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "expectedArtifacts":
        if (categoryItems) {
          for (const artifact of categoryItems) {
            const hasContains = artifact.contains && Array.isArray(artifact.contains) && artifact.contains.length > 0;
            let uri: vscode.Uri | undefined;
            if (workspaceRoot && artifact.file) {
              const fullPath = path.isAbsolute(artifact.file)
                ? artifact.file
                : path.join(workspaceRoot, artifact.file);
              uri = vscode.Uri.file(fullPath);
            }
            const artifactItem = new ManifestTreeItem(
              artifact.file || "Unknown file",
              "expectedArtifact",
              hasContains ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              uri
            );
            // Store contains for child expansion
            if (hasContains) {
              (artifactItem as any).categoryType = "artifactContains";
              (artifactItem as any).items = artifact.contains;
            }
            items.push(artifactItem);
          }
        }
        break;

      case "artifactContains":
        if (categoryItems) {
          for (const contained of categoryItems) {
            const typeIcon = this.getArtifactTypeIcon(contained.type);
            const label = this.formatArtifactContains(contained);
            const containsItem = new ManifestTreeItem(
              label,
              "artifactContains",
              vscode.TreeItemCollapsibleState.None
            );
            containsItem.iconPath = typeIcon;
            containsItem.tooltip = this.formatArtifactTooltip(contained);
            items.push(containsItem);
          }
        }
        break;

      case "testFiles":
        if (categoryItems) {
          for (const file of categoryItems) {
            let uri: vscode.Uri | undefined;
            if (workspaceRoot) {
              const fullPath = path.isAbsolute(file)
                ? file
                : path.join(workspaceRoot, file);
              uri = vscode.Uri.file(fullPath);
            }
            const fileItem = new ManifestTreeItem(
              file,
              "testFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "tasks":
        // Legacy tasks support
        if (anyElement.tasks) {
          for (const task of anyElement.tasks) {
            const taskItem = new ManifestTreeItem(
              task.id || task.name || "Unnamed Task",
              "task",
              vscode.TreeItemCollapsibleState.None,
              anyElement.parentUri,
              undefined,
              task
            );
            items.push(taskItem);
          }
        }
        break;
    }

    return items;
  }

  /**
   * Get icon for artifact type.
   */
  private getArtifactTypeIcon(type: string): vscode.ThemeIcon {
    switch (type) {
      case "class":
        return new vscode.ThemeIcon("symbol-class", new vscode.ThemeColor("symbolIcon.classForeground"));
      case "function":
        return new vscode.ThemeIcon("symbol-function", new vscode.ThemeColor("symbolIcon.functionForeground"));
      case "method":
        return new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("symbolIcon.methodForeground"));
      case "attribute":
        return new vscode.ThemeIcon("symbol-field", new vscode.ThemeColor("symbolIcon.fieldForeground"));
      default:
        return new vscode.ThemeIcon("symbol-misc");
    }
  }

  /**
   * Format artifact contains for display.
   */
  private formatArtifactContains(contained: ArtifactContains): string {
    let label = contained.name;
    if (contained.type === "function" || contained.type === "method") {
      if (contained.args && contained.args.length > 0) {
        const args = contained.args.map(a => `${a.name}: ${a.type}`).join(", ");
        label += `(${args})`;
      } else {
        label += "()";
      }
      if (contained.returns) {
        label += ` -> ${contained.returns.type}`;
      }
    }
    return label;
  }

  /**
   * Format artifact tooltip.
   */
  private formatArtifactTooltip(contained: ArtifactContains): string {
    const lines: string[] = [];
    lines.push(`${contained.type}: ${contained.name}`);
    if (contained.description) {
      lines.push("");
      lines.push(contained.description);
    }
    if (contained.args && contained.args.length > 0) {
      lines.push("");
      lines.push("Arguments:");
      for (const arg of contained.args) {
        lines.push(`  ${arg.name}: ${arg.type}`);
      }
    }
    if (contained.returns) {
      lines.push("");
      lines.push(`Returns: ${contained.returns.type}`);
    }
    return lines.join("\n");
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    log("[ManifestExplorer] Disposed");
  }
}

/**
 * Tree item for tracked files view.
 */
export class TrackedFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileStatus: "undeclared" | "registered" | "tracked" | "private_impl" | "category",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath?: string,
    public readonly issues?: string[]
  ) {
    super(label, collapsibleState);

    this.contextValue = `maidFile_${fileStatus}`;
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // Make file items openable
    if (filePath && fileStatus !== "category") {
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
    switch (this.fileStatus) {
      case "undeclared":
        return new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
      case "registered":
        return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("editorInfo.foreground"));
      case "tracked":
        return new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
      case "private_impl":
        return new vscode.ThemeIcon("lock", new vscode.ThemeColor("descriptionForeground"));
      case "category":
        return new vscode.ThemeIcon("folder");
      default:
        return new vscode.ThemeIcon("file");
    }
  }

  private getTooltip(): string {
    if (this.issues && this.issues.length > 0) {
      return `${this.filePath}\n\nIssues:\n${this.issues.map(i => `- ${i}`).join("\n")}`;
    }
    return this.filePath || this.label;
  }

  private getDescription(): string | undefined {
    switch (this.fileStatus) {
      case "undeclared":
        return "not in any manifest";
      case "registered":
        return "registered but not tracked";
      case "private_impl":
        return "private implementation";
      default:
        return undefined;
    }
  }
}

/**
 * TreeDataProvider for tracked files using `maid files --json`.
 */
export class TrackedFilesTreeDataProvider
  implements vscode.TreeDataProvider<TrackedFileTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TrackedFileTreeItem | undefined | null | void
  > = new vscode.EventEmitter<TrackedFileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TrackedFileTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private filesData: {
    undeclared: { file: string; issues: string[] }[];
    registered: { file: string; issues: string[] }[];
    tracked: string[];
    private_impl: string[];
  } | null = null;

  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;
  private isLoading = false;

  constructor() {
    this.debouncedRefresh = debounce(() => this.loadFiles(), 1000);

    // Watch for file system changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    watcher.onDidCreate(() => this.debouncedRefresh());
    watcher.onDidDelete(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Initial load
    this.loadFiles();
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[TrackedFiles] Manual refresh triggered");
    this.loadFiles();
  }

  /**
   * Load files data from maid CLI.
   */
  private async loadFiles(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.filesData = null;
      this._onDidChangeTreeData.fire();
      this.isLoading = false;
      return;
    }

    try {
      log("[TrackedFiles] Loading files from maid CLI...");
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const { stdout } = await execAsync("maid files --json", {
        cwd: workspaceRoot,
        timeout: 30000,
      });

      this.filesData = JSON.parse(stdout);
      log(`[TrackedFiles] Loaded: ${this.filesData?.tracked.length || 0} tracked, ${this.filesData?.undeclared.length || 0} undeclared`);
    } catch (error: any) {
      log(`[TrackedFiles] Error loading files: ${error.message}`, "error");
      this.filesData = null;
    }

    this._onDidChangeTreeData.fire();
    this.isLoading = false;
  }

  getTreeItem(element: TrackedFileTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TrackedFileTreeItem): Promise<TrackedFileTreeItem[]> {
    if (!element) {
      // Root level - show categories
      return this.getRootCategories();
    }

    // Children of a category
    return this.getCategoryChildren(element);
  }

  private getRootCategories(): TrackedFileTreeItem[] {
    if (!this.filesData) {
      const item = new TrackedFileTreeItem(
        "Run 'maid files' to see tracked files",
        "category",
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon("info");
      return [item];
    }

    const items: TrackedFileTreeItem[] = [];

    // Undeclared files (issues)
    if (this.filesData.undeclared.length > 0) {
      const undeclaredCategory = new TrackedFileTreeItem(
        `Undeclared (${this.filesData.undeclared.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Expanded
      );
      undeclaredCategory.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
      (undeclaredCategory as any).categoryType = "undeclared";
      (undeclaredCategory as any).files = this.filesData.undeclared;
      items.push(undeclaredCategory);
    }

    // Registered files
    if (this.filesData.registered.length > 0) {
      const registeredCategory = new TrackedFileTreeItem(
        `Registered (${this.filesData.registered.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      registeredCategory.iconPath = new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("editorInfo.foreground"));
      (registeredCategory as any).categoryType = "registered";
      (registeredCategory as any).files = this.filesData.registered;
      items.push(registeredCategory);
    }

    // Tracked files
    if (this.filesData.tracked.length > 0) {
      const trackedCategory = new TrackedFileTreeItem(
        `Tracked (${this.filesData.tracked.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      trackedCategory.iconPath = new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
      (trackedCategory as any).categoryType = "tracked";
      (trackedCategory as any).files = this.filesData.tracked;
      items.push(trackedCategory);
    }

    // Private implementation files
    if (this.filesData.private_impl.length > 0) {
      const privateCategory = new TrackedFileTreeItem(
        `Private (${this.filesData.private_impl.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      privateCategory.iconPath = new vscode.ThemeIcon("lock");
      (privateCategory as any).categoryType = "private_impl";
      (privateCategory as any).files = this.filesData.private_impl;
      items.push(privateCategory);
    }

    if (items.length === 0) {
      const item = new TrackedFileTreeItem(
        "No files found",
        "category",
        vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon("info");
      return [item];
    }

    return items;
  }

  private getCategoryChildren(element: TrackedFileTreeItem): TrackedFileTreeItem[] {
    const anyElement = element as any;
    const categoryType = anyElement.categoryType;
    const files = anyElement.files;

    if (!files || !Array.isArray(files)) {
      return [];
    }

    const items: TrackedFileTreeItem[] = [];

    for (const file of files) {
      if (typeof file === "string") {
        // Simple string (tracked or private_impl)
        items.push(
          new TrackedFileTreeItem(
            file,
            categoryType === "private_impl" ? "private_impl" : "tracked",
            vscode.TreeItemCollapsibleState.None,
            file
          )
        );
      } else if (file && typeof file === "object") {
        // Object with issues (undeclared or registered)
        items.push(
          new TrackedFileTreeItem(
            file.file,
            categoryType,
            vscode.TreeItemCollapsibleState.None,
            file.file,
            file.issues
          )
        );
      }
    }

    return items;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    log("[TrackedFiles] Disposed");
  }
}
