/**
 * Definition Provider for MAID Manifest Files
 *
 * Enables Ctrl+Click navigation for:
 * - File paths in creatableFiles, editableFiles, readonlyFiles, supersedes
 * - Artifact names in expectedArtifacts[].contains[].name
 * - File paths in expectedArtifacts[].file
 */

import * as vscode from "vscode";
import * as path from "path";
import * as jsonc from "jsonc-parser";
import { ManifestIndex } from "./manifestIndex";
import { getMaidRoot } from "./utils";

/**
 * Provides go-to-definition for manifest files.
 */
export class ManifestDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private manifestIndex: ManifestIndex) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const content = document.getText();
    const offset = document.offsetAt(position);

    // Get JSON path at cursor position
    const location = jsonc.getLocation(content, offset);
    if (!location.isAtPropertyKey) {
      // We're in a value, check what kind of value
      const jsonPath = location.path;

      // Handle file paths
      if (this.isFilePath(jsonPath)) {
        return this.provideFileDefinition(document, content, offset);
      }

      // Handle artifact names
      if (this.isArtifactName(jsonPath)) {
        return this.provideArtifactDefinition(document, content, offset, jsonPath);
      }
    }

    return undefined;
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
   * Provide definition for a file path.
   */
  private async provideFileDefinition(
    document: vscode.TextDocument,
    content: string,
    offset: number
  ): Promise<vscode.Location | undefined> {
    // Find the string node at this position
    const rootNode = jsonc.parseTree(content);
    if (!rootNode) return undefined;

    const node = jsonc.findNodeAtOffset(rootNode, offset);
    if (!node || node.type !== "string") return undefined;

    const filePath = node.value as string;
    const resolvedPath = this.resolveFilePath(filePath, document.uri.fsPath);

    // Check if file exists
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(resolvedPath));
      return new vscode.Location(vscode.Uri.file(resolvedPath), new vscode.Position(0, 0));
    } catch {
      // File doesn't exist - still return location, VS Code will show an error
      return new vscode.Location(vscode.Uri.file(resolvedPath), new vscode.Position(0, 0));
    }
  }

  /**
   * Provide definition for an artifact name - jumps to implementation.
   */
  private async provideArtifactDefinition(
    document: vscode.TextDocument,
    content: string,
    offset: number,
    jsonPath: jsonc.Segment[]
  ): Promise<vscode.Location | undefined> {
    const rootNode = jsonc.parseTree(content);
    if (!rootNode) return undefined;

    // Get the artifact name
    const node = jsonc.findNodeAtOffset(rootNode, offset);
    if (!node || node.type !== "string") return undefined;

    const artifactName = node.value as string;

    // Get the artifact type
    const artifactIndex = jsonPath[1] as number;
    const containsIndex = jsonPath[3] as number;
    const typeNode = jsonc.findNodeAtLocation(rootNode, [
      "expectedArtifacts",
      artifactIndex,
      "contains",
      containsIndex,
      "type",
    ]);
    const artifactType = (typeNode?.value as string) || "function";

    // Get the target file path
    const fileNode = jsonc.findNodeAtLocation(rootNode, [
      "expectedArtifacts",
      artifactIndex,
      "file",
    ]);
    if (!fileNode || fileNode.type !== "string") return undefined;

    const filePath = fileNode.value as string;
    const resolvedPath = this.resolveFilePath(filePath, document.uri.fsPath);

    // Search for the artifact in the target file
    return this.findArtifactInFile(resolvedPath, artifactName, artifactType);
  }

  /**
   * Search for an artifact definition in a file.
   */
  private async findArtifactInFile(
    filePath: string,
    artifactName: string,
    artifactType: string
  ): Promise<vscode.Location | undefined> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const content = document.getText();

      // Get file extension to determine language
      const ext = path.extname(filePath).toLowerCase();
      const patterns = this.getSearchPatterns(artifactName, artifactType, ext);

      for (const pattern of patterns) {
        const match = pattern.exec(content);
        if (match) {
          const position = document.positionAt(match.index);
          return new vscode.Location(uri, position);
        }
      }

      // Fallback: search for just the name
      const simplePattern = new RegExp(`\\b${this.escapeRegex(artifactName)}\\b`);
      const match = simplePattern.exec(content);
      if (match) {
        const position = document.positionAt(match.index);
        return new vscode.Location(uri, position);
      }
    } catch {
      // File doesn't exist or can't be opened
    }

    return undefined;
  }

  /**
   * Get regex patterns for finding artifact definitions.
   */
  private getSearchPatterns(name: string, type: string, ext: string): RegExp[] {
    const escapedName = this.escapeRegex(name);
    const patterns: RegExp[] = [];

    // Python patterns
    if (ext === ".py") {
      switch (type) {
        case "class":
          patterns.push(new RegExp(`^\\s*class\\s+${escapedName}\\s*[:\\(]`, "m"));
          break;
        case "function":
          patterns.push(new RegExp(`^\\s*(?:async\\s+)?def\\s+${escapedName}\\s*\\(`, "m"));
          break;
        case "method":
          patterns.push(new RegExp(`^\\s+(?:async\\s+)?def\\s+${escapedName}\\s*\\(self`, "m"));
          break;
        case "attribute":
          patterns.push(new RegExp(`^\\s*${escapedName}\\s*[:=]`, "m"));
          patterns.push(new RegExp(`self\\.${escapedName}\\s*=`, "m"));
          break;
      }
    }

    // TypeScript/JavaScript patterns
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
      switch (type) {
        case "class":
          patterns.push(new RegExp(`^\\s*(?:export\\s+)?class\\s+${escapedName}\\s*[{<]`, "m"));
          break;
        case "function":
          patterns.push(
            new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escapedName}\\s*[<(]`, "m")
          );
          patterns.push(
            new RegExp(
              `^\\s*(?:export\\s+)?const\\s+${escapedName}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|[^=])\\s*=>`,
              "m"
            )
          );
          patterns.push(
            new RegExp(`^\\s*(?:export\\s+)?const\\s+${escapedName}\\s*=\\s*function`, "m")
          );
          break;
        case "method":
          patterns.push(new RegExp(`^\\s+(?:async\\s+)?${escapedName}\\s*\\(`, "m"));
          break;
        case "attribute":
          patterns.push(
            new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+${escapedName}\\s*[:=]`, "m")
          );
          patterns.push(new RegExp(`^\\s+${escapedName}\\s*[:=]`, "m"));
          break;
      }
    }

    // Go patterns
    if (ext === ".go") {
      switch (type) {
        case "function":
          patterns.push(new RegExp(`^func\\s+${escapedName}\\s*\\(`, "m"));
          break;
        case "method":
          patterns.push(new RegExp(`^func\\s+\\([^)]+\\)\\s+${escapedName}\\s*\\(`, "m"));
          break;
        case "class": // struct in Go
          patterns.push(new RegExp(`^type\\s+${escapedName}\\s+struct`, "m"));
          break;
        case "attribute":
          patterns.push(new RegExp(`^\\s+${escapedName}\\s+\\w`, "m"));
          break;
      }
    }

    // Rust patterns
    if (ext === ".rs") {
      switch (type) {
        case "function":
          patterns.push(
            new RegExp(`^\\s*(?:pub\\s+)?(?:async\\s+)?fn\\s+${escapedName}\\s*[<(]`, "m")
          );
          break;
        case "class": // struct in Rust
          patterns.push(new RegExp(`^\\s*(?:pub\\s+)?struct\\s+${escapedName}\\s*[{<]`, "m"));
          break;
        case "attribute":
          patterns.push(new RegExp(`^\\s+${escapedName}\\s*:`, "m"));
          break;
      }
    }

    return patterns;
  }

  /**
   * Escape special regex characters.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Resolve a file path relative to the manifest.
   */
  private resolveFilePath(filePath: string, manifestPath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Use getMaidRoot to find the MAID root directory (parent of manifests/)
    const maidRoot = getMaidRoot(manifestPath);
    return path.join(maidRoot, filePath);
  }
}
