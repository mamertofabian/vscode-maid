/**
 * File Manifests TreeView for the MAID VS Code extension.
 * Shows all manifests that reference the currently active file.
 */

import * as vscode from "vscode";
import * as path from "path";
import { log, debounce } from "./utils";
import { ManifestIndex } from "./manifestIndex";
import { FileReference, FileReferenceCategory } from "./types";

/**
 * Tree item for file manifests view.
 */
export class FileManifestTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: "file" | "category" | "manifest" | "empty",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly manifestPath?: string,
    public readonly fileReference?: FileReference,
    public readonly category?: FileReferenceCategory
  ) {
    super(label, collapsibleState);

    this.contextValue = this.getContextValue();
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
    this.description = this.getDescription();

    // Make manifest items openable
    if (manifestPath && itemType === "manifest") {
      this.resourceUri = vscode.Uri.file(manifestPath);
      this.command = {
        command: "vscode.open",
        title: "Open Manifest",
        arguments: [
          this.resourceUri,
          {
            selection: fileReference
              ? new vscode.Range(
                  fileReference.line,
                  fileReference.column,
                  fileReference.line,
                  fileReference.column
                )
              : undefined,
          },
        ],
      };
    }
  }

  private getContextValue(): string {
    switch (this.itemType) {
      case "file":
        return "maidFileManifestFile";
      case "category":
        return "maidFileManifestCategory";
      case "manifest":
        return "maidFileManifestManifest";
      case "empty":
        return "maidFileManifestEmpty";
      default:
        return "maidFileManifestItem";
    }
  }

  private getIcon(): vscode.ThemeIcon | undefined {
    switch (this.itemType) {
      case "file":
        return new vscode.ThemeIcon("file");
      case "category":
        return new vscode.ThemeIcon("folder");
      case "manifest":
        return new vscode.ThemeIcon("file-code");
      case "empty":
        return new vscode.ThemeIcon("info");
      default:
        return undefined;
    }
  }

  private getTooltip(): string {
    if (this.itemType === "manifest" && this.fileReference && this.category) {
      const categoryLabel = this.getCategoryLabel(this.category);
      return `${this.manifestPath}\nReferenced as: ${categoryLabel}\nLine: ${this.fileReference.line + 1}`;
    }
    if (this.itemType === "file" && this.label) {
      return this.label;
    }
    return this.label;
  }

  private getDescription(): string | undefined {
    if (this.itemType === "manifest" && this.category) {
      return this.getCategoryLabel(this.category);
    }
    return undefined;
  }

  private getCategoryLabel(category: FileReferenceCategory): string {
    switch (category) {
      case "creatable":
        return "Creatable";
      case "editable":
        return "Editable";
      case "readonly":
        return "Read-only";
      case "supersedes":
        return "Supersedes";
      case "expectedArtifact":
        return "Expected Artifact";
      default:
        return category;
    }
  }
}

/**
 * TreeDataProvider for file manifests view.
 */
export class FileManifestsTreeDataProvider implements vscode.TreeDataProvider<FileManifestTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    FileManifestTreeItem | undefined | null | void
  > = new vscode.EventEmitter<FileManifestTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileManifestTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private currentFile: string | undefined;
  private fileReferences: FileReference[] = [];
  private disposables: vscode.Disposable[] = [];
  private debouncedRefresh: () => void;

  constructor(private manifestIndex: ManifestIndex | undefined) {
    this.debouncedRefresh = debounce(() => this.refresh(), 300);

    // Watch for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && !editor.document.uri.fsPath.endsWith(".manifest.json")) {
          this.setCurrentFile(editor.document.uri.fsPath);
        } else {
          this.setCurrentFile(undefined);
        }
      })
    );

    // Watch for file changes
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    watcher.onDidChange(() => this.debouncedRefresh());
    watcher.onDidCreate(() => this.debouncedRefresh());
    watcher.onDidDelete(() => this.debouncedRefresh());
    this.disposables.push(watcher);

    // Initial load
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && !activeEditor.document.uri.fsPath.endsWith(".manifest.json")) {
      this.setCurrentFile(activeEditor.document.uri.fsPath);
    }
  }

  /**
   * Refresh the tree view.
   */
  refresh(): void {
    log("[FileManifests] Manual refresh triggered");
    this.updateFileReferences();
  }

  /**
   * Set the current file and update references.
   */
  setCurrentFile(filePath: string | undefined): void {
    if (this.currentFile !== filePath) {
      this.currentFile = filePath;
      this.updateFileReferences();
    }
  }

  /**
   * Update file references from manifest index.
   */
  private updateFileReferences(): void {
    if (!this.currentFile || !this.manifestIndex) {
      this.fileReferences = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    const normalizedPath = path.normalize(this.currentFile).replace(/\\/g, "/");
    this.fileReferences = this.manifestIndex.getManifestsReferencingFile(normalizedPath);
    log(
      `[FileManifests] Found ${this.fileReferences.length} manifest references for ${path.basename(this.currentFile)}`
    );
    this._onDidChangeTreeData.fire();
  }

  /**
   * Update manifest index reference.
   */
  setManifestIndex(manifestIndex: ManifestIndex): void {
    this.manifestIndex = manifestIndex;
    this.updateFileReferences();
  }

  getTreeItem(element: FileManifestTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileManifestTreeItem): FileManifestTreeItem[] {
    // Root level - show current file or empty state
    if (!element) {
      if (!this.currentFile) {
        return [
          new FileManifestTreeItem(
            "No file selected",
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      if (this.fileReferences.length === 0) {
        return [
          new FileManifestTreeItem(
            `No manifests reference "${path.basename(this.currentFile)}"`,
            "empty",
            vscode.TreeItemCollapsibleState.None
          ),
        ];
      }

      // Show file name as root
      const fileName = path.basename(this.currentFile);
      const fileItem = new FileManifestTreeItem(
        fileName,
        "file",
        vscode.TreeItemCollapsibleState.Expanded,
        this.currentFile
      );
      fileItem.resourceUri = vscode.Uri.file(this.currentFile);
      fileItem.description = `${this.fileReferences.length} reference(s)`;
      return [fileItem];
    }

    // File level - show categories
    if (element.itemType === "file") {
      // Group references by category
      const categories = new Map<FileReferenceCategory, FileReference[]>();
      for (const ref of this.fileReferences) {
        if (!categories.has(ref.category)) {
          categories.set(ref.category, []);
        }
        categories.get(ref.category)!.push(ref);
      }

      const categoryItems: FileManifestTreeItem[] = [];
      for (const [category, refs] of categories) {
        const categoryLabel = this.getCategoryLabel(category);
        const categoryItem = new FileManifestTreeItem(
          `${categoryLabel} (${refs.length})`,
          "category",
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          undefined,
          category
        );
        interface _ExtendedFileManifestTreeItem extends FileManifestTreeItem {
          categoryType?: string;
          references?: FileReference[];
        }
        const categoryItemExtended = categoryItem as _ExtendedFileManifestTreeItem;
        categoryItemExtended.categoryType = category;
        categoryItemExtended.references = refs;
        categoryItems.push(categoryItemExtended);
      }

      // Sort categories by label
      categoryItems.sort((a, b) => a.label.localeCompare(b.label));
      return categoryItems;
    }

    // Category level - show manifests
    if (element.itemType === "category") {
      interface _ExtendedFileManifestTreeItem extends FileManifestTreeItem {
        categoryType?: string;
        references?: FileReference[];
      }
      const extendedElement = element as _ExtendedFileManifestTreeItem;
      const references: FileReference[] = extendedElement.references || [];

      const manifestItems: FileManifestTreeItem[] = [];
      for (const ref of references) {
        const relativePath = vscode.workspace.asRelativePath(ref.manifestPath);
        const manifestItem = new FileManifestTreeItem(
          relativePath,
          "manifest",
          vscode.TreeItemCollapsibleState.None,
          ref.manifestPath,
          ref,
          ref.category
        );
        manifestItems.push(manifestItem);
      }

      // Sort by manifest name
      manifestItems.sort((a, b) => a.label.localeCompare(b.label));
      return manifestItems;
    }

    return [];
  }

  private getCategoryLabel(category: FileReferenceCategory): string {
    switch (category) {
      case "creatable":
        return "Creatable Files";
      case "editable":
        return "Editable Files";
      case "readonly":
        return "Read-only Files";
      case "supersedes":
        return "Supersedes";
      case "expectedArtifact":
        return "Expected Artifacts";
      default: {
        const _exhaustive: never = category;
        return String(_exhaustive);
      }
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.disposables.forEach((d: vscode.Disposable) => {
      d.dispose();
    });
    log("[FileManifests] Disposed");
  }
}
