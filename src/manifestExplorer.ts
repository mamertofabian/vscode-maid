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
  ArtifactContains,
  ParsedManifestJson,
  ChainInfo,
  ExpectedArtifact,
} from "./types";
import { log, findManifestFiles, isManifestPath, debounce } from "./utils";
import type { ManifestIndex } from "./manifestIndex";

/**
 * Extended properties for ManifestTreeItem when used as a category
 */
interface _ExtendedManifestTreeItem extends ManifestTreeItem {
  categoryType?:
    | "chain"
    | "supersedes"
    | "creatableFiles"
    | "editableFiles"
    | "readonlyFiles"
    | "expectedArtifacts"
    | "artifactContains"
    | "testFiles"
    | "tasks"
    | "chainManifests";
  chain?: {
    parents: string[];
    children: string[];
  };
  items?: string[] | ExpectedArtifact[] | ArtifactContains[];
  tasks?: ManifestTask[];
  parentUri?: vscode.Uri;
  workspaceRoot?: string;
  maidRoot?: string;
}

/**
 * Extended ManifestInfo with chain information
 */
interface _ManifestInfoWithChain extends ManifestInfo {
  chainInfo?: ChainInfo;
}

/**
 * Extended properties for TrackedFileTreeItem when used as a category
 */
interface _ExtendedTrackedFileTreeItem extends TrackedFileTreeItem {
  categoryType?: "undeclared" | "registered" | "tracked" | "private_impl";
  files?: string[] | Array<{ file: string; issues: string[] }>;
}

/**
 * Extracts the file path from a string that may contain command prefixes.
 * For example: "pytest tests/test.py" -> "tests/test.py"
 */
function _extractFilePath(arg: string): string {
  // Common test command prefixes to strip
  const commandPrefixes = [
    /^pytest\s+/,
    /^python\s+-m\s+pytest\s+/,
    /^python\s+pytest\s+/,
    /^npm\s+test\s+--\s+/,
    /^npm\s+run\s+test\s+--\s+/,
    /^yarn\s+test\s+--\s+/,
    /^node\s+/,
    /^cargo\s+test\s+--\s+/,
  ];

  let cleaned = arg.trim();

  // Try to strip command prefixes
  for (const prefix of commandPrefixes) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, "").trim();
      break;
    }
  }

  return cleaned;
}

/**
 * Type guard to check if a value is a valid ParsedManifestJson
 */
function _isParsedManifestJson(value: unknown): value is ParsedManifestJson {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Safely parses JSON content into a ParsedManifestJson
 * This function handles the unsafe JSON.parse result and validates it
 */
function _parseManifestJson(content: Uint8Array): ParsedManifestJson {
  try {
    const jsonString = Buffer.from(content).toString();
    const parsedContent: unknown = JSON.parse(jsonString);
    if (_isParsedManifestJson(parsedContent)) {
      // Type guard ensures parsedContent is ParsedManifestJson
      // The type guard narrows the type correctly, so we can return it directly
      // TypeScript's type system recognizes the type guard
      return parsedContent;
    }
  } catch {
    // Fall through to return empty object
  }
  return {};
}

/**
 * Safely gets a property from a ParsedManifestJson object
 */
function _getManifestProperty<T>(
  manifest: ParsedManifestJson,
  property: keyof ParsedManifestJson
): T | undefined {
  // Use Object.prototype.hasOwnProperty to safely access the property
  if (Object.prototype.hasOwnProperty.call(manifest, property)) {
    const value: unknown = (manifest as Record<string, unknown>)[property];
    return value as T | undefined;
  }
  return undefined;
}

/**
 * Resolves a file path relative to the MAID root directory and returns
 * both the full path and the display path (relative to workspace root).
 */
function _resolveFilePath(
  filePath: string,
  maidRoot: string | undefined,
  workspaceRoot: string | undefined
): { fullPath: string; displayPath: string } {
  if (path.isAbsolute(filePath)) {
    // Already absolute, use as-is
    const fullPath = filePath;
    const displayPath = workspaceRoot ? vscode.workspace.asRelativePath(fullPath) : filePath;
    return { fullPath, displayPath };
  } else if (maidRoot) {
    // Resolve relative to MAID root directory
    const fullPath = path.resolve(maidRoot, filePath);
    const displayPath = workspaceRoot ? vscode.workspace.asRelativePath(fullPath) : filePath;
    return { fullPath, displayPath };
  } else {
    // Fallback: resolve relative to workspace root
    const fullPath = workspaceRoot ? path.join(workspaceRoot, filePath) : filePath;
    return { fullPath, displayPath: filePath };
  }
}

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
          return new vscode.ThemeIcon("file-code", new vscode.ThemeColor("errorForeground"));
        }
        if (this.manifestInfo?.warningCount && this.manifestInfo.warningCount > 0) {
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
          const parts: string[] = [];

          if (errors > 0) {
            parts.push(`${errors} errors`);
          } else if (warnings > 0) {
            parts.push(`${warnings} warnings`);
          } else {
            parts.push("valid");
          }

          // Add chain info if available
          if (this.manifestInfo && "chainInfo" in this.manifestInfo) {
            const manifestInfoWithChain = this.manifestInfo as _ManifestInfoWithChain;
            const chainInfo: unknown = manifestInfoWithChain.chainInfo;
            if (chainInfo) {
              // Type guard to ensure chainInfo has the expected structure
              const chainInfoObj =
                typeof chainInfo === "object" && chainInfo !== null ? chainInfo : null;
              if (chainInfoObj && "parents" in chainInfoObj && "children" in chainInfoObj) {
                const parentsValue = (chainInfoObj as { parents: unknown }).parents;
                const childrenValue = (chainInfoObj as { children: unknown }).children;
                if (typeof parentsValue === "number" && typeof childrenValue === "number") {
                  const chainParts: string[] = [];
                  if (parentsValue > 0) {
                    chainParts.push(`↑${parentsValue}`);
                  }
                  if (childrenValue > 0) {
                    chainParts.push(`↓${childrenValue}`);
                  }
                  if (chainParts.length > 0) {
                    parts.push(`[${chainParts.join(" ")}]`);
                  }
                }
              }
            }
          }

          return parts.join(" • ");
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
export class ManifestTreeDataProvider implements vscode.TreeDataProvider<ManifestTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ManifestTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ManifestTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ManifestTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private manifests: Map<string, ManifestInfo> = new Map();
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;
  private manifestIndex: ManifestIndex | undefined = undefined;

  constructor() {
    this.debouncedRefresh = debounce(() => this.refresh(), 500);

    // Watch for file system changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.manifest.json");
    watcher.onDidCreate(() => this.debouncedRefresh());
    watcher.onDidChange(() => this.debouncedRefresh());
    watcher.onDidDelete(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Watch for diagnostics changes to update validation status
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics((event) => {
        const hasManifestChanges = event.uris.some((uri) => isManifestPath(uri.fsPath));
        if (hasManifestChanges) {
          this.updateDiagnostics(event.uris);
        }
      })
    );

    // Initial load
    void this.loadManifests();
  }

  /**
   * Set the manifest index for chain lookups.
   */
  setManifestIndex(manifestIndex: ManifestIndex): void {
    this.manifestIndex = manifestIndex;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[ManifestExplorer] Refreshing tree view");
    void this.loadManifests();
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

        // Add chain information if manifest index is available
        if (this.manifestIndex) {
          try {
            const chain = this.manifestIndex.getSupersessionChain(file.fsPath);
            const infoWithChain: _ManifestInfoWithChain = {
              ...info,
              chainInfo: {
                parents: chain.parents.length,
                children: chain.children.length,
              },
            };
            this.manifests.set(file.fsPath, infoWithChain);
            continue;
          } catch {
            // Ignore errors getting chain info
          }
        }

        this.manifests.set(file.fsPath, info);
      }

      this._onDidChangeTreeData.fire();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[ManifestExplorer] Error loading manifests: ${message}`, "error");
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

        if (info.errorCount !== newErrorCount || info.warningCount !== newWarningCount) {
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
        return await this.getManifestChildren(element);
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

  private async getManifestChildren(element: ManifestTreeItem): Promise<ManifestTreeItem[]> {
    const items: ManifestTreeItem[] = [];

    // Read and parse the manifest file
    if (element.resourceUri) {
      try {
        const content = await vscode.workspace.fs.readFile(element.resourceUri);
        // _parseManifestJson returns ParsedManifestJson, which is safe to assign
        // The function handles all type safety internally with proper type guards
        // The return type is explicitly ParsedManifestJson, so the assignment is type-safe
        const manifest: ParsedManifestJson = _parseManifestJson(content);
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        // Get MAID root (where the manifests/ folder is located)
        // This is the root directory for all MAID CLI operations
        const manifestFileDir = path.dirname(element.resourceUri.fsPath);
        const maidRoot = path.dirname(manifestFileDir);

        // Show chain information if available
        if (this.manifestIndex) {
          try {
            const chain = this.manifestIndex.getSupersessionChain(element.resourceUri.fsPath);
            const hasChain = chain.parents.length > 0 || chain.children.length > 0;

            if (hasChain) {
              const chainCategory = new ManifestTreeItem(
                `Chain (${chain.parents.length} parent${chain.parents.length !== 1 ? "s" : ""}, ${chain.children.length} child${chain.children.length !== 1 ? "ren" : ""})`,
                "category",
                vscode.TreeItemCollapsibleState.Collapsed
              );
              chainCategory.iconPath = new vscode.ThemeIcon(
                "git-branch",
                new vscode.ThemeColor("charts.blue")
              );
              const chainCategoryExtended = chainCategory as _ExtendedManifestTreeItem;
              chainCategoryExtended.categoryType = "chain";
              chainCategoryExtended.chain = chain;
              chainCategoryExtended.workspaceRoot = workspaceRoot;
              items.push(chainCategoryExtended);
            }
          } catch {
            // Ignore errors getting chain info
          }
        }

        // Show supersedes if present
        const supersedes = _getManifestProperty<string[]>(manifest, "supersedes");
        if (supersedes && Array.isArray(supersedes) && supersedes.length > 0) {
          const supersedesCategory = new ManifestTreeItem(
            `Supersedes (${supersedes.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          supersedesCategory.iconPath = new vscode.ThemeIcon(
            "references",
            new vscode.ThemeColor("charts.red")
          );
          const supersedesCategoryExtended = supersedesCategory as _ExtendedManifestTreeItem;
          supersedesCategoryExtended.categoryType = "supersedes";
          supersedesCategoryExtended.items = supersedes;
          supersedesCategoryExtended.workspaceRoot = workspaceRoot;
          supersedesCategoryExtended.maidRoot = maidRoot;
          items.push(supersedesCategoryExtended);
        }

        // Show creatable files
        const creatableFiles = _getManifestProperty<string[]>(manifest, "creatableFiles");
        if (creatableFiles && Array.isArray(creatableFiles) && creatableFiles.length > 0) {
          const creatableCategory = new ManifestTreeItem(
            `Creatable Files (${creatableFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          creatableCategory.iconPath = new vscode.ThemeIcon(
            "new-file",
            new vscode.ThemeColor("charts.green")
          );
          const creatableCategoryExtended = creatableCategory as _ExtendedManifestTreeItem;
          creatableCategoryExtended.categoryType = "creatableFiles";
          creatableCategoryExtended.items = creatableFiles;
          creatableCategoryExtended.workspaceRoot = workspaceRoot;
          creatableCategoryExtended.maidRoot = maidRoot;
          items.push(creatableCategoryExtended);
        }

        // Show editable files
        const editableFiles = _getManifestProperty<string[]>(manifest, "editableFiles");
        if (editableFiles && Array.isArray(editableFiles) && editableFiles.length > 0) {
          const editableCategory = new ManifestTreeItem(
            `Editable Files (${editableFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          editableCategory.iconPath = new vscode.ThemeIcon(
            "edit",
            new vscode.ThemeColor("charts.blue")
          );
          const editableCategoryExtended = editableCategory as _ExtendedManifestTreeItem;
          editableCategoryExtended.categoryType = "editableFiles";
          editableCategoryExtended.items = editableFiles;
          editableCategoryExtended.workspaceRoot = workspaceRoot;
          editableCategoryExtended.maidRoot = maidRoot;
          items.push(editableCategoryExtended);
        }

        // Show readonly files
        const readonlyFiles = _getManifestProperty<string[]>(manifest, "readonlyFiles");
        if (readonlyFiles && Array.isArray(readonlyFiles) && readonlyFiles.length > 0) {
          const readonlyCategory = new ManifestTreeItem(
            `Read-only Files (${readonlyFiles.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          readonlyCategory.iconPath = new vscode.ThemeIcon(
            "lock",
            new vscode.ThemeColor("charts.yellow")
          );
          const readonlyCategoryExtended = readonlyCategory as _ExtendedManifestTreeItem;
          readonlyCategoryExtended.categoryType = "readonlyFiles";
          readonlyCategoryExtended.items = readonlyFiles;
          readonlyCategoryExtended.workspaceRoot = workspaceRoot;
          readonlyCategoryExtended.maidRoot = maidRoot;
          items.push(readonlyCategoryExtended);
        }

        // Show expected artifacts
        const expectedArtifacts = _getManifestProperty<ExpectedArtifact | ExpectedArtifact[]>(
          manifest,
          "expectedArtifacts"
        );
        if (expectedArtifacts) {
          const artifacts = Array.isArray(expectedArtifacts)
            ? expectedArtifacts
            : [expectedArtifacts];

          if (artifacts.length > 0 && artifacts[0]) {
            const artifactsCategory = new ManifestTreeItem(
              `Expected Artifacts (${artifacts.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            artifactsCategory.iconPath = new vscode.ThemeIcon(
              "symbol-file",
              new vscode.ThemeColor("charts.purple")
            );
            const artifactsCategoryExtended = artifactsCategory as _ExtendedManifestTreeItem;
            artifactsCategoryExtended.categoryType = "expectedArtifacts";
            artifactsCategoryExtended.items = artifacts;
            artifactsCategoryExtended.workspaceRoot = workspaceRoot;
            artifactsCategoryExtended.maidRoot = maidRoot;
            items.push(artifactsCategoryExtended);
          }
        }

        // Show test files from validation command
        const validationCommand = _getManifestProperty<string[]>(manifest, "validationCommand");
        if (validationCommand && Array.isArray(validationCommand) && validationCommand.length > 0) {
          // Extract test files from validation command (files that look like paths)
          const testFiles = validationCommand
            .filter((arg): arg is string => typeof arg === "string")
            .map((arg: string) => _extractFilePath(arg))
            .filter((filePath: string) => {
              // Look for arguments that look like file paths (contain / or \ or end with test extensions)
              return (
                (filePath.includes("/") || filePath.includes("\\")) &&
                (filePath.endsWith(".ts") ||
                  filePath.endsWith(".tsx") ||
                  filePath.endsWith(".js") ||
                  filePath.endsWith(".jsx") ||
                  filePath.endsWith(".py") ||
                  filePath.endsWith(".rs") ||
                  filePath.endsWith(".spec.ts") ||
                  filePath.endsWith(".spec.tsx") ||
                  filePath.endsWith(".test.ts") ||
                  filePath.endsWith(".test.tsx") ||
                  filePath.endsWith(".spec.js") ||
                  filePath.endsWith(".spec.jsx") ||
                  filePath.endsWith(".test.js") ||
                  filePath.endsWith(".test.jsx"))
              );
            });

          if (testFiles.length > 0) {
            const testFilesCategory = new ManifestTreeItem(
              `Test Files (${testFiles.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            testFilesCategory.iconPath = new vscode.ThemeIcon(
              "beaker",
              new vscode.ThemeColor("terminal.ansiCyan")
            );
            const testFilesCategoryExtended = testFilesCategory as _ExtendedManifestTreeItem;
            testFilesCategoryExtended.categoryType = "testFiles";
            testFilesCategoryExtended.items = testFiles;
            testFilesCategoryExtended.workspaceRoot = workspaceRoot;
            testFilesCategoryExtended.maidRoot = maidRoot;
            items.push(testFilesCategoryExtended);
          }
        }

        // Legacy support: Show tasks if available (for older manifest formats)
        const tasks = _getManifestProperty<ManifestTask[]>(manifest, "tasks");
        if (tasks && Array.isArray(tasks)) {
          const tasksCategory = new ManifestTreeItem(
            `Tasks (${tasks.length})`,
            "category",
            vscode.TreeItemCollapsibleState.Collapsed
          );
          const tasksCategoryExtended = tasksCategory as _ExtendedManifestTreeItem;
          tasksCategoryExtended.categoryType = "tasks";
          tasksCategoryExtended.tasks = tasks;
          tasksCategoryExtended.parentUri = element.resourceUri;
          items.push(tasksCategoryExtended);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[ManifestExplorer] Error parsing manifest: ${message}`, "error");
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

  private getCategoryChildren(element: ManifestTreeItem): ManifestTreeItem[] {
    const items: ManifestTreeItem[] = [];
    const extendedElement = element as _ExtendedManifestTreeItem;
    const categoryType = extendedElement.categoryType;
    const categoryItems = extendedElement.items;

    // Handle different category types
    switch (categoryType) {
      case "chain":
        if (extendedElement.chain) {
          const chain = extendedElement.chain;
          const chainWorkspaceRoot = extendedElement.workspaceRoot;

          // Show parents
          if (chain.parents && chain.parents.length > 0) {
            const parentsCategory = new ManifestTreeItem(
              `Parents (${chain.parents.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            parentsCategory.iconPath = new vscode.ThemeIcon(
              "arrow-up",
              new vscode.ThemeColor("charts.green")
            );
            const parentsCategoryExtended = parentsCategory as _ExtendedManifestTreeItem;
            parentsCategoryExtended.categoryType = "chainManifests";
            parentsCategoryExtended.items = chain.parents;
            parentsCategoryExtended.workspaceRoot = chainWorkspaceRoot;
            items.push(parentsCategoryExtended);
          }

          // Show children
          if (chain.children && chain.children.length > 0) {
            const childrenCategory = new ManifestTreeItem(
              `Children (${chain.children.length})`,
              "category",
              vscode.TreeItemCollapsibleState.Collapsed
            );
            childrenCategory.iconPath = new vscode.ThemeIcon(
              "arrow-down",
              new vscode.ThemeColor("charts.orange")
            );
            const childrenCategoryExtended = childrenCategory as _ExtendedManifestTreeItem;
            childrenCategoryExtended.categoryType = "chainManifests";
            childrenCategoryExtended.items = chain.children;
            childrenCategoryExtended.workspaceRoot = chainWorkspaceRoot;
            items.push(childrenCategoryExtended);
          }
        }
        break;

      case "chainManifests":
        if (categoryItems && Array.isArray(categoryItems)) {
          const chainManifestsWorkspaceRoot = extendedElement.workspaceRoot;
          for (const manifestPath of categoryItems) {
            if (typeof manifestPath !== "string") continue;
            const uri = vscode.Uri.file(manifestPath);
            const relativePath = chainManifestsWorkspaceRoot
              ? vscode.workspace.asRelativePath(manifestPath)
              : path.basename(manifestPath);
            const manifestItem = new ManifestTreeItem(
              relativePath,
              "manifest",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(manifestItem);
          }
        }
        break;

      case "supersedes":
        if (categoryItems && Array.isArray(categoryItems)) {
          const supersedesMaidRoot = extendedElement.maidRoot;
          const supersedesWorkspaceRoot = extendedElement.workspaceRoot;
          for (const superseded of categoryItems) {
            if (typeof superseded !== "string") continue;
            const { fullPath, displayPath } = _resolveFilePath(
              superseded,
              supersedesMaidRoot,
              supersedesWorkspaceRoot
            );
            const uri = vscode.Uri.file(fullPath);
            const supersedesItem = new ManifestTreeItem(
              displayPath,
              "supersedes",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(supersedesItem);
          }
        }
        break;

      case "creatableFiles":
        if (categoryItems && Array.isArray(categoryItems)) {
          const creatableMaidRoot = extendedElement.maidRoot;
          const creatableWorkspaceRoot = extendedElement.workspaceRoot;
          for (const file of categoryItems) {
            if (typeof file !== "string") continue;
            const { fullPath, displayPath } = _resolveFilePath(
              file,
              creatableMaidRoot,
              creatableWorkspaceRoot
            );
            const uri = vscode.Uri.file(fullPath);
            const fileItem = new ManifestTreeItem(
              displayPath,
              "creatableFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "editableFiles":
        if (categoryItems && Array.isArray(categoryItems)) {
          const editableMaidRoot = extendedElement.maidRoot;
          const editableWorkspaceRoot = extendedElement.workspaceRoot;
          for (const file of categoryItems) {
            if (typeof file !== "string") continue;
            const { fullPath, displayPath } = _resolveFilePath(
              file,
              editableMaidRoot,
              editableWorkspaceRoot
            );
            const uri = vscode.Uri.file(fullPath);
            const fileItem = new ManifestTreeItem(
              displayPath,
              "editableFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "readonlyFiles":
        if (categoryItems && Array.isArray(categoryItems)) {
          const readonlyMaidRoot = extendedElement.maidRoot;
          const readonlyWorkspaceRoot = extendedElement.workspaceRoot;
          for (const file of categoryItems) {
            if (typeof file !== "string") continue;
            const { fullPath, displayPath } = _resolveFilePath(
              file,
              readonlyMaidRoot,
              readonlyWorkspaceRoot
            );
            const uri = vscode.Uri.file(fullPath);
            const fileItem = new ManifestTreeItem(
              displayPath,
              "readonlyFile",
              vscode.TreeItemCollapsibleState.None,
              uri
            );
            items.push(fileItem);
          }
        }
        break;

      case "expectedArtifacts":
        if (categoryItems && Array.isArray(categoryItems)) {
          const artifactsMaidRoot = extendedElement.maidRoot;
          const artifactsWorkspaceRoot = extendedElement.workspaceRoot;
          for (const artifact of categoryItems) {
            if (typeof artifact !== "object" || artifact === null) continue;
            // Type guard to ensure it's an ExpectedArtifact
            if (!("file" in artifact)) continue;
            const expectedArtifact = artifact;
            const hasContains =
              expectedArtifact.contains &&
              Array.isArray(expectedArtifact.contains) &&
              expectedArtifact.contains.length > 0;
            let uri: vscode.Uri | undefined;
            let displayPath = "Unknown file";

            if (expectedArtifact.file) {
              const { fullPath, displayPath: dp } = _resolveFilePath(
                expectedArtifact.file,
                artifactsMaidRoot,
                artifactsWorkspaceRoot
              );
              uri = vscode.Uri.file(fullPath);
              displayPath = dp;
            }

            const artifactItem = new ManifestTreeItem(
              displayPath,
              "expectedArtifact",
              hasContains
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              uri
            );
            // Store contains for child expansion
            if (hasContains && expectedArtifact.contains) {
              const artifactItemExtended = artifactItem as _ExtendedManifestTreeItem;
              artifactItemExtended.categoryType = "artifactContains";
              artifactItemExtended.items = expectedArtifact.contains;
            }
            items.push(artifactItem);
          }
        }
        break;

      case "artifactContains":
        if (categoryItems && Array.isArray(categoryItems)) {
          for (const contained of categoryItems) {
            if (typeof contained !== "object" || contained === null) continue;
            // Type guard to ensure it's an ArtifactContains
            if (!("type" in contained) || !("name" in contained)) continue;
            const artifactContains = contained;
            const typeIcon = this.getArtifactTypeIcon(artifactContains.type);
            const label = this.formatArtifactContains(artifactContains);
            const containsItem = new ManifestTreeItem(
              label,
              "artifactContains",
              vscode.TreeItemCollapsibleState.None
            );
            containsItem.iconPath = typeIcon;
            containsItem.tooltip = this.formatArtifactTooltip(artifactContains);
            items.push(containsItem);
          }
        }
        break;

      case "testFiles":
        if (categoryItems && Array.isArray(categoryItems)) {
          const testFilesMaidRoot = extendedElement.maidRoot;
          const testFilesWorkspaceRoot = extendedElement.workspaceRoot;
          for (const file of categoryItems) {
            if (typeof file !== "string") continue;
            // Extract clean file path (in case it still contains command prefixes)
            const cleanPath = _extractFilePath(file);
            const { fullPath, displayPath } = _resolveFilePath(
              cleanPath,
              testFilesMaidRoot,
              testFilesWorkspaceRoot
            );
            const uri = vscode.Uri.file(fullPath);
            const fileItem = new ManifestTreeItem(
              displayPath,
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
        if (extendedElement.tasks && Array.isArray(extendedElement.tasks)) {
          for (const task of extendedElement.tasks) {
            const taskItem = new ManifestTreeItem(
              task.id || "Unnamed Task",
              "task",
              vscode.TreeItemCollapsibleState.None,
              extendedElement.parentUri,
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
        return new vscode.ThemeIcon(
          "symbol-class",
          new vscode.ThemeColor("symbolIcon.classForeground")
        );
      case "function":
        return new vscode.ThemeIcon(
          "symbol-function",
          new vscode.ThemeColor("symbolIcon.functionForeground")
        );
      case "method":
        return new vscode.ThemeIcon(
          "symbol-method",
          new vscode.ThemeColor("symbolIcon.methodForeground")
        );
      case "attribute":
        return new vscode.ThemeIcon(
          "symbol-field",
          new vscode.ThemeColor("symbolIcon.fieldForeground")
        );
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
      if (contained.args && Array.isArray(contained.args) && contained.args.length > 0) {
        const args = contained.args
          .filter(
            (a): a is { name: string; type: string } =>
              a !== null && typeof a === "object" && "name" in a && "type" in a
          )
          .map((a) => `${a.name}: ${a.type}`)
          .join(", ");
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
    if (contained.args && Array.isArray(contained.args) && contained.args.length > 0) {
      lines.push("");
      lines.push("Arguments:");
      for (const arg of contained.args) {
        if (arg && typeof arg === "object" && "name" in arg && "type" in arg) {
          lines.push(`  ${arg.name}: ${arg.type}`);
        }
      }
    }
    if (contained.returns && typeof contained.returns === "object" && "type" in contained.returns) {
      lines.push("");
      const returnsType =
        typeof contained.returns.type === "string"
          ? contained.returns.type
          : String(contained.returns.type);
      lines.push(`Returns: ${returnsType}`);
    }
    return lines.join("\n");
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disposables.forEach((d) => {
      d.dispose();
    });
    log("[ManifestExplorer] Disposed");
  }
}

/**
 * Tree item for tracked files view.
 */
export class TrackedFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileStatus:
      | "undeclared"
      | "registered"
      | "tracked"
      | "private_impl"
      | "category",
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
    // filePath is already resolved to full path in getCategoryChildren
    if (filePath && fileStatus !== "category") {
      this.resourceUri = vscode.Uri.file(filePath);
      this.command = {
        command: "vscode.open",
        title: "Open",
        arguments: [this.resourceUri],
      };
    }
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.fileStatus) {
      case "undeclared":
        return new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
      case "registered":
        return new vscode.ThemeIcon(
          "circle-outline",
          new vscode.ThemeColor("editorInfo.foreground")
        );
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
      return `${this.filePath}\n\nIssues:\n${this.issues.map((i) => `- ${i}`).join("\n")}`;
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
export class TrackedFilesTreeDataProvider implements vscode.TreeDataProvider<TrackedFileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TrackedFileTreeItem | undefined | null | void> =
    new vscode.EventEmitter<TrackedFileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TrackedFileTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private filesData: {
    undeclared: { file: string; issues: string[] }[];
    registered: { file: string; issues: string[] }[];
    tracked: string[];
    private_impl: string[];
  } | null = null;

  private maidRoot: string | undefined;
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;
  private isLoading = false;

  constructor() {
    this.debouncedRefresh = debounce(() => {
      void this.loadFiles();
    }, 1000);

    // Watch for file system changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    watcher.onDidCreate(() => {
      this.debouncedRefresh();
    });
    watcher.onDidDelete(() => {
      this.debouncedRefresh();
    });
    this.disposables.push(watcher);

    // Initial load
    void this.loadFiles();
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[TrackedFiles] Manual refresh triggered");
    void this.loadFiles();
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

      // Find the MAID root directory (where manifests/ folder is located)
      let cwd = workspaceRoot;
      try {
        // Only search for manifests inside manifests/ directories (ignore system.manifest.json in root)
        const manifestFiles = await vscode.workspace.findFiles(
          "**/manifests/*.manifest.json",
          "**/node_modules/**",
          1
        );
        if (manifestFiles.length > 0) {
          const manifestPath = manifestFiles[0].fsPath;
          const manifestDir = path.dirname(manifestPath);
          cwd = path.dirname(manifestDir); // MAID root (parent of manifests/)
          log(`[TrackedFiles] Using MAID root: ${cwd}`);
        }
      } catch {
        log(`[TrackedFiles] Could not find MAID root, using workspace root`, "warn");
      }

      this.maidRoot = cwd;

      const { stdout } = await execAsync("maid files --json", {
        cwd: cwd,
        timeout: 30000,
      });

      interface _FilesData {
        undeclared: { file: string; issues: string[] }[];
        registered: { file: string; issues: string[] }[];
        tracked: string[];
        private_impl: string[];
      }
      this.filesData = JSON.parse(stdout) as _FilesData;
      log(
        `[TrackedFiles] Loaded from ${cwd}: undeclared=${this.filesData?.undeclared?.length || 0}, registered=${this.filesData?.registered?.length || 0}, tracked=${this.filesData?.tracked?.length || 0}, private_impl=${this.filesData?.private_impl?.length || 0}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[TrackedFiles] Error loading files: ${message}`, "error");
      this.filesData = null;
    }

    this._onDidChangeTreeData.fire();
    this.isLoading = false;
  }

  getTreeItem(element: TrackedFileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TrackedFileTreeItem): TrackedFileTreeItem[] {
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
      undeclaredCategory.iconPath = new vscode.ThemeIcon(
        "warning",
        new vscode.ThemeColor("editorWarning.foreground")
      );
      const undeclaredCategoryExtended = undeclaredCategory as _ExtendedTrackedFileTreeItem;
      undeclaredCategoryExtended.categoryType = "undeclared";
      undeclaredCategoryExtended.files = this.filesData.undeclared;
      items.push(undeclaredCategoryExtended);
    }

    // Registered files
    if (this.filesData.registered.length > 0) {
      const registeredCategory = new TrackedFileTreeItem(
        `Registered (${this.filesData.registered.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      registeredCategory.iconPath = new vscode.ThemeIcon(
        "circle-outline",
        new vscode.ThemeColor("editorInfo.foreground")
      );
      const registeredCategoryExtended = registeredCategory as _ExtendedTrackedFileTreeItem;
      registeredCategoryExtended.categoryType = "registered";
      registeredCategoryExtended.files = this.filesData.registered;
      items.push(registeredCategoryExtended);
    }

    // Tracked files
    if (this.filesData.tracked.length > 0) {
      const trackedCategory = new TrackedFileTreeItem(
        `Tracked (${this.filesData.tracked.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      trackedCategory.iconPath = new vscode.ThemeIcon(
        "check",
        new vscode.ThemeColor("testing.iconPassed")
      );
      const trackedCategoryExtended = trackedCategory as _ExtendedTrackedFileTreeItem;
      trackedCategoryExtended.categoryType = "tracked";
      trackedCategoryExtended.files = this.filesData.tracked;
      items.push(trackedCategoryExtended);
    }

    // Private implementation files
    if (this.filesData.private_impl.length > 0) {
      const privateCategory = new TrackedFileTreeItem(
        `Private (${this.filesData.private_impl.length})`,
        "category",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      privateCategory.iconPath = new vscode.ThemeIcon("lock");
      const privateCategoryExtended = privateCategory as _ExtendedTrackedFileTreeItem;
      privateCategoryExtended.categoryType = "private_impl";
      privateCategoryExtended.files = this.filesData.private_impl;
      items.push(privateCategoryExtended);
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
    const extendedElement = element as _ExtendedTrackedFileTreeItem;
    const categoryType = extendedElement.categoryType;
    const files = extendedElement.files;

    if (!files || !Array.isArray(files)) {
      return [];
    }

    const items: TrackedFileTreeItem[] = [];
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    for (const file of files) {
      let filePath: string;
      let displayPath: string;

      if (typeof file === "string") {
        filePath = file;
      } else if (file && typeof file === "object") {
        filePath = file.file;
      } else {
        continue;
      }

      // Resolve file path relative to MAID root
      if (this.maidRoot && workspaceRoot) {
        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(this.maidRoot, filePath);
        displayPath = vscode.workspace.asRelativePath(fullPath);
      } else {
        displayPath = filePath;
      }

      // Resolve full path for URI
      let fullPathForUri: string;
      if (this.maidRoot) {
        fullPathForUri = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(this.maidRoot, filePath);
      } else if (workspaceRoot) {
        fullPathForUri = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
      } else {
        fullPathForUri = filePath;
      }

      if (typeof file === "string") {
        // Simple string (tracked or private_impl)
        const fileStatus: "tracked" | "private_impl" =
          categoryType === "private_impl" ? "private_impl" : "tracked";
        items.push(
          new TrackedFileTreeItem(
            displayPath,
            fileStatus,
            vscode.TreeItemCollapsibleState.None,
            fullPathForUri // Store resolved path for URI resolution
          )
        );
      } else if (file && typeof file === "object" && "file" in file) {
        // Object with issues (undeclared or registered)
        const fileWithIssues = file as { file: string; issues: string[] };
        const fileStatus: "undeclared" | "registered" =
          categoryType === "undeclared" ? "undeclared" : "registered";
        items.push(
          new TrackedFileTreeItem(
            displayPath,
            fileStatus,
            vscode.TreeItemCollapsibleState.None,
            fullPathForUri, // Store resolved path for URI resolution
            fileWithIssues.issues
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
    this.disposables.forEach((d) => {
      d.dispose();
    });
    log("[TrackedFiles] Disposed");
  }
}
