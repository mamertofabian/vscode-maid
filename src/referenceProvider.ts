/**
 * Reference Provider for MAID Manifest Files
 *
 * Enables "Find All References" for:
 * - Files: Shows all manifests that reference a given file
 * - Artifacts: Shows all manifests that expect a given artifact
 * - Works both from manifest files and from source files
 */

import * as vscode from "vscode";
import * as path from "path";
import * as jsonc from "jsonc-parser";
import { ManifestIndex } from "./manifestIndex";

/**
 * Provides references for manifest files - finds all manifests referencing a file/artifact.
 */
export class ManifestReferenceProvider implements vscode.ReferenceProvider {
  constructor(private manifestIndex: ManifestIndex) {}

  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    const content = document.getText();
    const offset = document.offsetAt(position);

    // Get JSON path at cursor position
    const location = jsonc.getLocation(content, offset);
    if (location.isAtPropertyKey) {
      return [];
    }

    const jsonPath = location.path;
    const rootNode = jsonc.parseTree(content);
    if (!rootNode) return [];

    const node = jsonc.findNodeAtOffset(rootNode, offset);
    if (!node || node.type !== "string") return [];

    const value = node.value as string;

    // Check if this is a file path
    if (this.isFilePath(jsonPath)) {
      return this.findFileReferences(value, document.uri.fsPath, context.includeDeclaration);
    }

    // Check if this is an artifact name
    if (this.isArtifactName(jsonPath)) {
      return this.findArtifactReferences(value, context.includeDeclaration);
    }

    return [];
  }

  /**
   * Check if the JSON path points to a file path property.
   */
  private isFilePath(jsonPath: jsonc.Segment[]): boolean {
    if (jsonPath.length === 0) return false;

    const firstSegment = jsonPath[0];

    // Direct file arrays
    if (
      firstSegment === "creatableFiles" ||
      firstSegment === "editableFiles" ||
      firstSegment === "readonlyFiles" ||
      firstSegment === "supersedes"
    ) {
      return jsonPath.length === 2 && typeof jsonPath[1] === "number";
    }

    // expectedArtifacts[n].file
    if (firstSegment === "expectedArtifacts" && jsonPath.length === 3) {
      return jsonPath[2] === "file";
    }

    return false;
  }

  /**
   * Check if the JSON path points to an artifact name.
   */
  private isArtifactName(jsonPath: jsonc.Segment[]): boolean {
    // expectedArtifacts[n].contains[m].name
    if (jsonPath.length === 5) {
      return (
        jsonPath[0] === "expectedArtifacts" &&
        typeof jsonPath[1] === "number" &&
        jsonPath[2] === "contains" &&
        typeof jsonPath[3] === "number" &&
        jsonPath[4] === "name"
      );
    }
    return false;
  }

  /**
   * Find all manifests that reference a file.
   */
  private async findFileReferences(
    filePath: string,
    manifestPath: string,
    includeDeclaration: boolean
  ): Promise<vscode.Location[]> {
    const resolvedPath = this.resolveFilePath(filePath, manifestPath);
    const references = this.manifestIndex.getManifestsReferencingFile(resolvedPath);

    const locations: vscode.Location[] = [];

    for (const ref of references) {
      // Skip the current location if includeDeclaration is false
      if (!includeDeclaration && ref.manifestPath === manifestPath) {
        continue;
      }

      try {
        const uri = vscode.Uri.file(ref.manifestPath);
        const position = new vscode.Position(ref.line, ref.column);
        locations.push(new vscode.Location(uri, position));
      } catch {
        // Skip invalid locations
      }
    }

    return locations;
  }

  /**
   * Find all manifests that expect an artifact.
   */
  private async findArtifactReferences(
    artifactName: string,
    includeDeclaration: boolean
  ): Promise<vscode.Location[]> {
    const references = this.manifestIndex.getManifestsReferencingArtifact(artifactName);

    const locations: vscode.Location[] = [];

    for (const ref of references) {
      try {
        const uri = vscode.Uri.file(ref.manifestPath);
        const position = new vscode.Position(ref.line, ref.column);
        locations.push(new vscode.Location(uri, position));
      } catch {
        // Skip invalid locations
      }
    }

    return locations;
  }

  /**
   * Resolve a file path relative to the manifest.
   */
  private resolveFilePath(filePath: string, manifestPath: string): string {
    if (path.isAbsolute(filePath)) {
      return path.normalize(filePath).replace(/\\/g, "/");
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(manifestPath)
    );

    if (workspaceFolder) {
      return path.normalize(
        path.join(workspaceFolder.uri.fsPath, filePath)
      ).replace(/\\/g, "/");
    }

    return path.normalize(
      path.join(path.dirname(manifestPath), filePath)
    ).replace(/\\/g, "/");
  }
}

/**
 * Provides references for any file - shows which manifests reference this file.
 */
export class FileReferenceProvider implements vscode.ReferenceProvider {
  constructor(private manifestIndex: ManifestIndex) {}

  async provideReferences(
    document: vscode.TextDocument,
    _position: vscode.Position,
    _context: vscode.ReferenceContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.Location[]> {
    // Don't provide references for manifest files (handled by ManifestReferenceProvider)
    if (document.uri.fsPath.endsWith(".manifest.json")) {
      return [];
    }

    const filePath = path.normalize(document.uri.fsPath).replace(/\\/g, "/");
    const references = this.manifestIndex.getManifestsReferencingFile(filePath);

    const locations: vscode.Location[] = [];

    for (const ref of references) {
      try {
        const uri = vscode.Uri.file(ref.manifestPath);
        const position = new vscode.Position(ref.line, ref.column);
        locations.push(new vscode.Location(uri, position));
      } catch {
        // Skip invalid locations
      }
    }

    return locations;
  }
}
