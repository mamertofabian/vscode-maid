/**
 * Manifest Index - Cross-manifest indexing for Go to Definition and Find References
 *
 * This module builds and maintains an in-memory index of all manifests in the workspace,
 * enabling fast lookups for:
 * - Files referenced by manifests
 * - Artifacts expected by manifests
 * - Supersession relationships between manifests
 */

import * as vscode from "vscode";
import * as path from "path";
import * as jsonc from "jsonc-parser";
import {
  FileReference,
  ArtifactReference,
  ManifestIndexEntry,
  FileReferenceCategory,
} from "./types";

/**
 * ManifestIndex maintains a cross-manifest index for fast lookups.
 */
export class ManifestIndex {
  private index: Map<string, ManifestIndexEntry> = new Map();
  private fileToManifests: Map<string, FileReference[]> = new Map();
  private artifactToManifests: Map<string, ArtifactReference[]> = new Map();
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private debounceTimer: NodeJS.Timeout | undefined;
  private outputChannel: vscode.OutputChannel | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Initialize the index by scanning all manifests in the workspace.
   */
  async initialize(
    outputChannel?: vscode.OutputChannel
  ): Promise<void> {
    this.outputChannel = outputChannel;
    await this.buildIndex();
    this.setupFileWatcher();
  }

  /**
   * Build the complete index from all manifests in the workspace.
   */
  async buildIndex(): Promise<void> {
    this.log("Building manifest index...");
    this.index.clear();
    this.fileToManifests.clear();
    this.artifactToManifests.clear();

    const manifestFiles = await vscode.workspace.findFiles(
      "**/*.manifest.json",
      "**/node_modules/**"
    );

    for (const uri of manifestFiles) {
      await this.indexManifest(uri.fsPath);
    }

    // Build supersededBy relationships after all manifests are indexed
    this.buildSupersededByRelationships();

    this.log(
      `Index built: ${this.index.size} manifests, ${this.fileToManifests.size} files, ${this.artifactToManifests.size} artifacts`
    );
  }

  /**
   * Index a single manifest file.
   */
  private async indexManifest(manifestPath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(manifestPath);
      const content = document.getText();

      const entry: ManifestIndexEntry = {
        manifestPath,
        referencedFiles: new Map(),
        artifacts: new Map(),
        supersedes: [],
        supersededBy: [],
      };

      // Parse JSON with position information
      const rootNode = jsonc.parseTree(content);
      if (!rootNode) {
        return;
      }

      // Extract goal
      const goalNode = jsonc.findNodeAtLocation(rootNode, ["goal"]);
      if (goalNode && goalNode.type === "string") {
        entry.goal = goalNode.value as string;
      }

      // Index file references
      this.indexFileArray(content, rootNode, manifestPath, "creatableFiles", "creatable", entry);
      this.indexFileArray(content, rootNode, manifestPath, "editableFiles", "editable", entry);
      this.indexFileArray(content, rootNode, manifestPath, "readonlyFiles", "readonly", entry);
      this.indexFileArray(content, rootNode, manifestPath, "supersedes", "supersedes", entry);

      // Index expected artifacts
      this.indexExpectedArtifacts(content, rootNode, manifestPath, entry);

      this.index.set(manifestPath, entry);
    } catch (error) {
      this.log(`Error indexing manifest ${manifestPath}: ${error}`);
    }
  }

  /**
   * Index an array of file paths from a manifest property.
   */
  private indexFileArray(
    content: string,
    rootNode: jsonc.Node,
    manifestPath: string,
    propertyName: string,
    category: FileReferenceCategory,
    entry: ManifestIndexEntry
  ): void {
    const arrayNode = jsonc.findNodeAtLocation(rootNode, [propertyName]);
    if (!arrayNode || arrayNode.type !== "array" || !arrayNode.children) {
      return;
    }

    for (const itemNode of arrayNode.children) {
      if (itemNode.type !== "string") continue;

      const filePath = itemNode.value as string;
      const position = this.offsetToPosition(content, itemNode.offset);
      const resolvedPath = this.resolveFilePath(filePath, manifestPath);

      const ref: FileReference = {
        manifestPath,
        category,
        line: position.line,
        column: position.character,
      };

      // Add to entry's referenced files
      if (!entry.referencedFiles.has(resolvedPath)) {
        entry.referencedFiles.set(resolvedPath, []);
      }
      entry.referencedFiles.get(resolvedPath)!.push(ref);

      // Add to global file-to-manifests map
      if (!this.fileToManifests.has(resolvedPath)) {
        this.fileToManifests.set(resolvedPath, []);
      }
      this.fileToManifests.get(resolvedPath)!.push(ref);

      // Track supersedes relationships
      if (category === "supersedes") {
        entry.supersedes.push(resolvedPath);
      }
    }
  }

  /**
   * Index expected artifacts from a manifest.
   */
  private indexExpectedArtifacts(
    content: string,
    rootNode: jsonc.Node,
    manifestPath: string,
    entry: ManifestIndexEntry
  ): void {
    const artifactsNode = jsonc.findNodeAtLocation(rootNode, ["expectedArtifacts"]);
    if (!artifactsNode || artifactsNode.type !== "array" || !artifactsNode.children) {
      return;
    }

    for (const artifactNode of artifactsNode.children) {
      if (artifactNode.type !== "object") continue;

      // Get the file path for this artifact group
      const fileNode = jsonc.findNodeAtLocation(artifactNode, ["file"]);
      if (!fileNode || fileNode.type !== "string") continue;

      const filePath = fileNode.value as string;
      const resolvedFilePath = this.resolveFilePath(filePath, manifestPath);

      // Index the file reference
      const filePosition = this.offsetToPosition(content, fileNode.offset);
      const fileRef: FileReference = {
        manifestPath,
        category: "expectedArtifact",
        line: filePosition.line,
        column: filePosition.character,
      };

      if (!entry.referencedFiles.has(resolvedFilePath)) {
        entry.referencedFiles.set(resolvedFilePath, []);
      }
      entry.referencedFiles.get(resolvedFilePath)!.push(fileRef);

      if (!this.fileToManifests.has(resolvedFilePath)) {
        this.fileToManifests.set(resolvedFilePath, []);
      }
      this.fileToManifests.get(resolvedFilePath)!.push(fileRef);

      // Index the contains array
      const containsNode = jsonc.findNodeAtLocation(artifactNode, ["contains"]);
      if (!containsNode || containsNode.type !== "array" || !containsNode.children) {
        continue;
      }

      for (const containsItemNode of containsNode.children) {
        if (containsItemNode.type !== "object") continue;

        const nameNode = jsonc.findNodeAtLocation(containsItemNode, ["name"]);
        const typeNode = jsonc.findNodeAtLocation(containsItemNode, ["type"]);

        if (!nameNode || nameNode.type !== "string") continue;

        const artifactName = nameNode.value as string;
        const artifactType = (typeNode?.value as string) || "function";
        const position = this.offsetToPosition(content, nameNode.offset);

        const artifactRef: ArtifactReference = {
          manifestPath,
          filePath: resolvedFilePath,
          artifactType: artifactType as "function" | "class" | "method" | "attribute",
          artifactName,
          line: position.line,
          column: position.character,
        };

        // Add to entry's artifacts
        if (!entry.artifacts.has(artifactName)) {
          entry.artifacts.set(artifactName, []);
        }
        entry.artifacts.get(artifactName)!.push(artifactRef);

        // Add to global artifact-to-manifests map
        if (!this.artifactToManifests.has(artifactName)) {
          this.artifactToManifests.set(artifactName, []);
        }
        this.artifactToManifests.get(artifactName)!.push(artifactRef);
      }
    }
  }

  /**
   * Build supersededBy relationships after all manifests are indexed.
   */
  private buildSupersededByRelationships(): void {
    for (const [manifestPath, entry] of this.index) {
      for (const supersededPath of entry.supersedes) {
        const supersededEntry = this.index.get(supersededPath);
        if (supersededEntry) {
          supersededEntry.supersededBy.push(manifestPath);
        }
      }
    }
  }

  /**
   * Set up file watcher for manifest changes.
   */
  private setupFileWatcher(): void {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.manifest.json"
    );

    this.fileWatcher.onDidChange((uri) => this.onManifestChanged(uri.fsPath));
    this.fileWatcher.onDidCreate((uri) => this.onManifestChanged(uri.fsPath));
    this.fileWatcher.onDidDelete((uri) => this.onManifestDeleted(uri.fsPath));

    this.context.subscriptions.push(this.fileWatcher);
  }

  /**
   * Handle manifest file change with debouncing.
   */
  private onManifestChanged(manifestPath: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      this.log(`Re-indexing manifest: ${manifestPath}`);
      // Remove old index entry
      this.removeManifestFromIndex(manifestPath);
      // Re-index the manifest
      await this.indexManifest(manifestPath);
      // Rebuild supersededBy relationships
      this.buildSupersededByRelationships();
    }, 500);
  }

  /**
   * Handle manifest file deletion.
   */
  private onManifestDeleted(manifestPath: string): void {
    this.log(`Removing manifest from index: ${manifestPath}`);
    this.removeManifestFromIndex(manifestPath);
  }

  /**
   * Remove a manifest from the index.
   */
  private removeManifestFromIndex(manifestPath: string): void {
    const entry = this.index.get(manifestPath);
    if (!entry) return;

    // Remove file references
    for (const [filePath, refs] of entry.referencedFiles) {
      const globalRefs = this.fileToManifests.get(filePath);
      if (globalRefs) {
        const filtered = globalRefs.filter((r) => r.manifestPath !== manifestPath);
        if (filtered.length > 0) {
          this.fileToManifests.set(filePath, filtered);
        } else {
          this.fileToManifests.delete(filePath);
        }
      }
    }

    // Remove artifact references
    for (const [artifactName, refs] of entry.artifacts) {
      const globalRefs = this.artifactToManifests.get(artifactName);
      if (globalRefs) {
        const filtered = globalRefs.filter((r) => r.manifestPath !== manifestPath);
        if (filtered.length > 0) {
          this.artifactToManifests.set(artifactName, filtered);
        } else {
          this.artifactToManifests.delete(artifactName);
        }
      }
    }

    // Remove supersededBy references from other manifests
    for (const supersededPath of entry.supersedes) {
      const supersededEntry = this.index.get(supersededPath);
      if (supersededEntry) {
        supersededEntry.supersededBy = supersededEntry.supersededBy.filter(
          (p) => p !== manifestPath
        );
      }
    }

    this.index.delete(manifestPath);
  }

  /**
   * Get all manifests that reference a given file path.
   */
  getManifestsReferencingFile(filePath: string): FileReference[] {
    const normalizedPath = this.normalizePath(filePath);
    return this.fileToManifests.get(normalizedPath) || [];
  }

  /**
   * Get all manifests that expect a given artifact.
   */
  getManifestsReferencingArtifact(artifactName: string): ArtifactReference[] {
    return this.artifactToManifests.get(artifactName) || [];
  }

  /**
   * Get the supersession chain for a manifest.
   */
  getSupersessionChain(manifestPath: string): {
    parents: string[];
    children: string[];
  } {
    const entry = this.index.get(manifestPath);
    if (!entry) {
      return { parents: [], children: [] };
    }

    return {
      parents: entry.supersededBy,
      children: entry.supersedes,
    };
  }

  /**
   * Get the index entry for a manifest.
   */
  getManifestEntry(manifestPath: string): ManifestIndexEntry | undefined {
    return this.index.get(manifestPath);
  }

  /**
   * Get all indexed manifests.
   */
  getAllManifests(): string[] {
    return Array.from(this.index.keys());
  }

  /**
   * Convert byte offset to line/character position.
   */
  private offsetToPosition(content: string, offset: number): vscode.Position {
    const lines = content.substring(0, offset).split("\n");
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return new vscode.Position(line, character);
  }

  /**
   * Resolve a file path relative to a manifest.
   */
  private resolveFilePath(filePath: string, manifestPath: string): string {
    if (path.isAbsolute(filePath)) {
      return this.normalizePath(filePath);
    }

    const manifestDir = path.dirname(manifestPath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(manifestPath)
    );

    if (workspaceFolder) {
      // Resolve relative to workspace root
      return this.normalizePath(
        path.join(workspaceFolder.uri.fsPath, filePath)
      );
    }

    // Fallback: resolve relative to manifest directory
    return this.normalizePath(path.join(manifestDir, filePath));
  }

  /**
   * Normalize a file path for consistent lookups.
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, "/");
  }

  /**
   * Log a message to the output channel.
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[ManifestIndex] ${message}`);
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
