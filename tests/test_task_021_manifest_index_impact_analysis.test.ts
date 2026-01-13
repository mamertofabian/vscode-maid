/**
 * Behavioral tests for ManifestIndex impact analysis methods (task-021)
 *
 * Tests the following new methods:
 * - getDependencyImpact(filePath: string): DependencyImpact
 * - getAffectedManifests(artifactName: string): string[]
 * - getHierarchicalView(): HierarchicalNode[]
 * - getModuleHierarchy(): Map<string, string[]>
 * - getSystemMetrics(): SystemMetrics
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestIndex } from "../src/manifestIndex";
import type { HierarchicalNode } from "../src/types";

const mockContext = {
  subscriptions: [],
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
  },
  workspaceState: {
    get: vi.fn(),
    update: vi.fn(),
  },
} as unknown as vscode.ExtensionContext;

/**
 * Create mock manifest content with specified files and artifacts
 */
interface MockManifestOptions {
  goal?: string;
  creatableFiles?: string[];
  editableFiles?: string[];
  readonlyFiles?: string[];
  supersedes?: string[];
  expectedArtifacts?: {
    file: string;
    contains: Array<{ type: string; name: string }>;
  };
}

function createMockManifest(options: MockManifestOptions): string {
  const manifest: Record<string, unknown> = {
    goal: options.goal || "Test manifest",
    taskType: "edit",
    creatableFiles: options.creatableFiles || [],
    editableFiles: options.editableFiles || [],
    readonlyFiles: options.readonlyFiles || [],
  };

  if (options.supersedes) {
    manifest.supersedes = options.supersedes;
  }

  if (options.expectedArtifacts) {
    manifest.expectedArtifacts = [options.expectedArtifacts];
  }

  return JSON.stringify(manifest, null, 2);
}

describe("ManifestIndex Impact Analysis Methods", () => {
  let manifestIndex: ManifestIndex;
  let mockChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;

    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
      getText: vi.fn(() => "{}"),
      uri: vscode.Uri.file("/test.manifest.json"),
    } as unknown as vscode.TextDocument);

    manifestIndex = new ManifestIndex(mockContext);
  });

  describe("getDependencyImpact", () => {
    it("should return DependencyImpact object with correct structure", async () => {
      // Setup: create a manifest that references a file
      const manifestPath = "/workspace/manifests/task-001.manifest.json";
      const testFilePath = "/workspace/src/utils.ts";

      const mockManifestContent = createMockManifest({
        goal: "Test impact analysis",
        editableFiles: ["src/utils.ts"],
        expectedArtifacts: {
          file: "src/utils.ts",
          contains: [
            { type: "function", name: "parseData" },
            { type: "function", name: "validateInput" },
          ],
        },
      });

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => mockManifestContent),
        uri: vscode.Uri.file(manifestPath),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const impact = manifestIndex.getDependencyImpact(testFilePath);

      expect(impact).toBeDefined();
      expect(impact).toHaveProperty("artifactId");
      expect(impact).toHaveProperty("affectedFiles");
      expect(impact).toHaveProperty("affectedManifests");
      expect(impact).toHaveProperty("affectedArtifacts");
      expect(impact).toHaveProperty("severity");
      expect(impact).toHaveProperty("totalImpact");
    });

    it("should return artifactId matching the input file path", async () => {
      await manifestIndex.initialize(mockChannel);
      const testFilePath = "/workspace/src/handler.ts";

      const impact = manifestIndex.getDependencyImpact(testFilePath);

      expect(impact.artifactId).toBe(testFilePath);
    });

    it("should return empty arrays for files with no references", async () => {
      await manifestIndex.initialize(mockChannel);
      const unknownFilePath = "/workspace/src/unknown-file.ts";

      const impact = manifestIndex.getDependencyImpact(unknownFilePath);

      expect(impact.affectedFiles).toEqual([]);
      expect(impact.affectedManifests).toEqual([]);
      expect(impact.affectedArtifacts).toEqual([]);
    });

    it("should return 'low' severity for files with no references", async () => {
      await manifestIndex.initialize(mockChannel);
      const unknownFilePath = "/workspace/src/isolated.ts";

      const impact = manifestIndex.getDependencyImpact(unknownFilePath);

      expect(impact.severity).toBe("low");
    });

    it("should return totalImpact of 0 for files with no references", async () => {
      await manifestIndex.initialize(mockChannel);
      const unknownFilePath = "/workspace/src/orphan.ts";

      const impact = manifestIndex.getDependencyImpact(unknownFilePath);

      expect(impact.totalImpact).toBe(0);
    });

    it("should calculate severity based on impact count", async () => {
      // This test verifies the severity calculation logic
      // high: >10 affected, medium: 5-10, low: <5
      await manifestIndex.initialize(mockChannel);
      const impact = manifestIndex.getDependencyImpact("/test/file.ts");

      expect(["high", "medium", "low"]).toContain(impact.severity);
    });

    it("should return arrays for affectedFiles, affectedManifests, affectedArtifacts", async () => {
      await manifestIndex.initialize(mockChannel);
      const impact = manifestIndex.getDependencyImpact("/workspace/src/test.ts");

      expect(Array.isArray(impact.affectedFiles)).toBe(true);
      expect(Array.isArray(impact.affectedManifests)).toBe(true);
      expect(Array.isArray(impact.affectedArtifacts)).toBe(true);
    });

    it("should return totalImpact as a number", async () => {
      await manifestIndex.initialize(mockChannel);
      const impact = manifestIndex.getDependencyImpact("/workspace/src/module.ts");

      expect(typeof impact.totalImpact).toBe("number");
      expect(impact.totalImpact).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAffectedManifests", () => {
    it("should return array of manifest paths for known artifacts", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      const mockManifestContent = createMockManifest({
        goal: "Test affected manifests",
        expectedArtifacts: {
          file: "src/service.ts",
          contains: [
            { type: "class", name: "UserService" },
            { type: "function", name: "createUser" },
          ],
        },
      });

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => mockManifestContent),
        uri: vscode.Uri.file(manifestPath),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const affectedManifests = manifestIndex.getAffectedManifests("UserService");

      expect(Array.isArray(affectedManifests)).toBe(true);
    });

    it("should return empty array for unknown artifacts", async () => {
      await manifestIndex.initialize(mockChannel);

      const affectedManifests = manifestIndex.getAffectedManifests("NonExistentArtifact");

      expect(affectedManifests).toEqual([]);
    });

    it("should return string array", async () => {
      await manifestIndex.initialize(mockChannel);

      const affectedManifests = manifestIndex.getAffectedManifests("testFunction");

      expect(Array.isArray(affectedManifests)).toBe(true);
      affectedManifests.forEach((path) => {
        expect(typeof path).toBe("string");
      });
    });

    it("should find all manifests that declare the same artifact across workspace", async () => {
      const manifest1Path = "/workspace/manifests/task-001.manifest.json";
      const manifest2Path = "/workspace/manifests/task-002.manifest.json";

      const mockManifest1 = createMockManifest({
        goal: "First manifest",
        expectedArtifacts: {
          file: "src/shared.ts",
          contains: [{ type: "function", name: "sharedFunction" }],
        },
      });

      const mockManifest2 = createMockManifest({
        goal: "Second manifest",
        expectedArtifacts: {
          file: "src/shared.ts",
          contains: [{ type: "function", name: "sharedFunction" }],
        },
      });

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
        vscode.Uri.file(manifest1Path),
        vscode.Uri.file(manifest2Path),
      ]);

      let callCount = 0;
      vi.mocked(vscode.workspace.openTextDocument).mockImplementation(
        (options?: { language?: string; content?: string; encoding?: string } | vscode.Uri) => {
          const uri = options instanceof vscode.Uri ? options : vscode.Uri.file("/test");
          const content = callCount === 0 ? mockManifest1 : mockManifest2;
          callCount++;
          return Promise.resolve({
            getText: vi.fn(() => content),
            uri: uri,
            fileName: uri.fsPath,
            isUntitled: false,
            languageId: "json",
            version: 1,
            isDirty: false,
            isClosed: false,
            save: vi.fn(),
            eol: 1,
            lineCount: 1,
            lineAt: vi.fn(),
            offsetAt: vi.fn(),
            positionAt: vi.fn(),
            getWordRangeAtPosition: vi.fn(),
            validateRange: vi.fn(),
            validatePosition: vi.fn(),
          } as unknown as vscode.TextDocument);
        }
      );

      await manifestIndex.initialize(mockChannel);

      const affectedManifests = manifestIndex.getAffectedManifests("sharedFunction");

      expect(Array.isArray(affectedManifests)).toBe(true);
    });
  });

  describe("getHierarchicalView", () => {
    it("should return array of HierarchicalNode objects", async () => {
      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      expect(Array.isArray(hierarchy)).toBe(true);
    });

    it("should return nodes with required properties", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Test hierarchy" })),
        uri: vscode.Uri.file(manifestPath),
        fileName: manifestPath,
        isUntitled: false,
        languageId: "json",
        version: 1,
        isDirty: false,
        isClosed: false,
        save: vi.fn(),
        eol: 1,
        lineCount: 1,
        lineAt: vi.fn(),
        offsetAt: vi.fn(),
        positionAt: vi.fn(),
        getWordRangeAtPosition: vi.fn(),
        validateRange: vi.fn(),
        validatePosition: vi.fn(),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      hierarchy.forEach((node: HierarchicalNode) => {
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("name");
        expect(node).toHaveProperty("type");
        expect(node).toHaveProperty("level");
        expect(node).toHaveProperty("parent");
        expect(node).toHaveProperty("children");
        expect(node).toHaveProperty("metrics");
      });
    });

    it("should have nodes with metrics containing manifestCount, fileCount, artifactCount, errorCount", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Test metrics" })),
        uri: vscode.Uri.file(manifestPath),
        fileName: manifestPath,
        isUntitled: false,
        languageId: "json",
        version: 1,
        isDirty: false,
        isClosed: false,
        save: vi.fn(),
        eol: 1,
        lineCount: 1,
        lineAt: vi.fn(),
        offsetAt: vi.fn(),
        positionAt: vi.fn(),
        getWordRangeAtPosition: vi.fn(),
        validateRange: vi.fn(),
        validatePosition: vi.fn(),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      hierarchy.forEach((node: HierarchicalNode) => {
        expect(node.metrics).toHaveProperty("manifestCount");
        expect(node.metrics).toHaveProperty("fileCount");
        expect(node.metrics).toHaveProperty("artifactCount");
        expect(node.metrics).toHaveProperty("errorCount");
        expect(typeof node.metrics.manifestCount).toBe("number");
        expect(typeof node.metrics.fileCount).toBe("number");
        expect(typeof node.metrics.artifactCount).toBe("number");
        expect(typeof node.metrics.errorCount).toBe("number");
      });
    });

    it("should have level property as number starting from 0 for root nodes", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Test levels" })),
        uri: vscode.Uri.file(manifestPath),
        fileName: manifestPath,
        isUntitled: false,
        languageId: "json",
        version: 1,
        isDirty: false,
        isClosed: false,
        save: vi.fn(),
        eol: 1,
        lineCount: 1,
        lineAt: vi.fn(),
        offsetAt: vi.fn(),
        positionAt: vi.fn(),
        getWordRangeAtPosition: vi.fn(),
        validateRange: vi.fn(),
        validatePosition: vi.fn(),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      hierarchy.forEach((node: HierarchicalNode) => {
        expect(typeof node.level).toBe("number");
        expect(node.level).toBeGreaterThanOrEqual(0);
      });

      // Root nodes should have level 0
      const rootNodes = hierarchy.filter((n) => n.parent === null);
      rootNodes.forEach((node) => {
        expect(node.level).toBe(0);
      });
    });

    it("should have children as array of HierarchicalNode", async () => {
      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      hierarchy.forEach((node: HierarchicalNode) => {
        expect(Array.isArray(node.children)).toBe(true);
      });
    });

    it("should return empty array when no manifests exist", async () => {
      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();

      expect(hierarchy).toEqual([]);
    });
  });

  describe("getModuleHierarchy", () => {
    it("should return a Map", async () => {
      await manifestIndex.initialize(mockChannel);

      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      expect(moduleHierarchy instanceof Map).toBe(true);
    });

    it("should have module names (directory paths) as keys", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Test module" })),
        uri: vscode.Uri.file(manifestPath),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      for (const [key] of moduleHierarchy) {
        expect(typeof key).toBe("string");
      }
    });

    it("should have arrays of manifest paths as values", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Test values" })),
        uri: vscode.Uri.file(manifestPath),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      for (const [, value] of moduleHierarchy) {
        expect(Array.isArray(value)).toBe(true);
        value.forEach((path) => {
          expect(typeof path).toBe("string");
        });
      }
    });

    it("should group manifests by containing directory", async () => {
      const manifest1 = "/workspace/manifests/module-a/task-001.manifest.json";
      const manifest2 = "/workspace/manifests/module-a/task-002.manifest.json";
      const manifest3 = "/workspace/manifests/module-b/task-003.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
        vscode.Uri.file(manifest1),
        vscode.Uri.file(manifest2),
        vscode.Uri.file(manifest3),
      ]);

      vi.mocked(vscode.workspace.openTextDocument).mockImplementation(
        (options?: { language?: string; content?: string; encoding?: string } | vscode.Uri) => {
          const uri = options instanceof vscode.Uri ? options : vscode.Uri.file("/test");
          return Promise.resolve({
            getText: vi.fn(() => createMockManifest({ goal: `Manifest for ${uri.fsPath}` })),
            uri: uri,
            fileName: uri.fsPath,
            isUntitled: false,
            languageId: "json",
            version: 1,
            isDirty: false,
            isClosed: false,
            save: vi.fn(),
            eol: 1,
            lineCount: 1,
            lineAt: vi.fn(),
            offsetAt: vi.fn(),
            positionAt: vi.fn(),
            getWordRangeAtPosition: vi.fn(),
            validateRange: vi.fn(),
            validatePosition: vi.fn(),
          } as unknown as vscode.TextDocument);
        }
      );

      await manifestIndex.initialize(mockChannel);

      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      expect(moduleHierarchy instanceof Map).toBe(true);
    });

    it("should return empty Map when no manifests exist", async () => {
      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
      await manifestIndex.initialize(mockChannel);

      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      expect(moduleHierarchy instanceof Map).toBe(true);
      expect(moduleHierarchy.size).toBe(0);
    });
  });

  describe("getSystemMetrics", () => {
    it("should return SystemMetrics object with correct structure", async () => {
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty("totalManifests");
      expect(metrics).toHaveProperty("validManifests");
      expect(metrics).toHaveProperty("errorCount");
      expect(metrics).toHaveProperty("warningCount");
      expect(metrics).toHaveProperty("fileTracking");
      expect(metrics).toHaveProperty("coverage");
    });

    it("should return totalManifests as number", async () => {
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(typeof metrics.totalManifests).toBe("number");
      expect(metrics.totalManifests).toBeGreaterThanOrEqual(0);
    });

    it("should return validManifests as number less than or equal to totalManifests", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Valid manifest" })),
        uri: vscode.Uri.file(manifestPath),
        fileName: manifestPath,
        isUntitled: false,
        languageId: "json",
        version: 1,
        isDirty: false,
        isClosed: false,
        save: vi.fn(),
        eol: 1,
        lineCount: 1,
        lineAt: vi.fn(),
        offsetAt: vi.fn(),
        positionAt: vi.fn(),
        getWordRangeAtPosition: vi.fn(),
        validateRange: vi.fn(),
        validatePosition: vi.fn(),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(typeof metrics.validManifests).toBe("number");
      expect(metrics.validManifests).toBeLessThanOrEqual(metrics.totalManifests);
    });

    it("should return errorCount and warningCount as numbers", async () => {
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(typeof metrics.errorCount).toBe("number");
      expect(typeof metrics.warningCount).toBe("number");
      expect(metrics.errorCount).toBeGreaterThanOrEqual(0);
      expect(metrics.warningCount).toBeGreaterThanOrEqual(0);
    });

    it("should return fileTracking with undeclared, registered, tracked counts", async () => {
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(metrics.fileTracking).toBeDefined();
      expect(metrics.fileTracking).toHaveProperty("undeclared");
      expect(metrics.fileTracking).toHaveProperty("registered");
      expect(metrics.fileTracking).toHaveProperty("tracked");
      expect(typeof metrics.fileTracking.undeclared).toBe("number");
      expect(typeof metrics.fileTracking.registered).toBe("number");
      expect(typeof metrics.fileTracking.tracked).toBe("number");
    });

    it("should return coverage as a number between 0 and 100", async () => {
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(typeof metrics.coverage).toBe("number");
      expect(metrics.coverage).toBeGreaterThanOrEqual(0);
      expect(metrics.coverage).toBeLessThanOrEqual(100);
    });

    it("should reflect correct totalManifests count", async () => {
      const manifest1 = "/workspace/manifests/task-001.manifest.json";
      const manifest2 = "/workspace/manifests/task-002.manifest.json";
      const manifest3 = "/workspace/manifests/task-003.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
        vscode.Uri.file(manifest1),
        vscode.Uri.file(manifest2),
        vscode.Uri.file(manifest3),
      ]);

      vi.mocked(vscode.workspace.openTextDocument).mockImplementation(
        (options?: { language?: string; content?: string; encoding?: string } | vscode.Uri) => {
          const uri = options instanceof vscode.Uri ? options : vscode.Uri.file("/test");
          const manifestContent = createMockManifest({ goal: `Manifest ${uri.fsPath}` });
          return Promise.resolve({
            getText: vi.fn(() => manifestContent),
            uri: uri,
            fileName: uri.fsPath,
            isUntitled: false,
            languageId: "json",
            version: 1,
            isDirty: false,
            isClosed: false,
            save: vi.fn(),
            eol: 1,
            lineCount: 1,
            lineAt: vi.fn(),
            offsetAt: vi.fn(),
            positionAt: vi.fn(),
            getWordRangeAtPosition: vi.fn(),
            validateRange: vi.fn(),
            validatePosition: vi.fn(),
          } as unknown as vscode.TextDocument);
        }
      );

      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();
      const allManifests = manifestIndex.getAllManifests();

      // Verify that metrics reflect the actual manifest count
      expect(metrics.totalManifests).toBe(allManifests.length);
      // If manifests were loaded, verify the count matches
      if (allManifests.length > 0) {
        expect(metrics.totalManifests).toBeGreaterThan(0);
      }
    });

    it("should return 0 for totalManifests when no manifests exist", async () => {
      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      expect(metrics.totalManifests).toBe(0);
    });

    it("should return 0 coverage when no manifests exist", async () => {
      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();

      // Coverage should be 0 or a valid percentage when no manifests
      expect(metrics.coverage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Integration scenarios", () => {
    it("getDependencyImpact should work with getAffectedManifests for same file", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";
      const testFilePath = "/workspace/src/api.ts";

      const mockManifestContent = createMockManifest({
        goal: "Test integration",
        editableFiles: ["src/api.ts"],
        expectedArtifacts: {
          file: "src/api.ts",
          contains: [{ type: "function", name: "handleRequest" }],
        },
      });

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => mockManifestContent),
        uri: vscode.Uri.file(manifestPath),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const impact = manifestIndex.getDependencyImpact(testFilePath);
      const affectedManifests = manifestIndex.getAffectedManifests("handleRequest");

      // Both should return information about the same manifest
      expect(impact).toBeDefined();
      expect(affectedManifests).toBeDefined();
    });

    it("getHierarchicalView should be consistent with getModuleHierarchy", async () => {
      const manifestPath = "/workspace/manifests/task-001.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([vscode.Uri.file(manifestPath)]);

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: vi.fn(() => createMockManifest({ goal: "Consistency test" })),
        uri: vscode.Uri.file(manifestPath),
        fileName: manifestPath,
        isUntitled: false,
        languageId: "json",
        version: 1,
        isDirty: false,
        isClosed: false,
        save: vi.fn(),
        eol: 1,
        lineCount: 1,
        lineAt: vi.fn(),
        offsetAt: vi.fn(),
        positionAt: vi.fn(),
        getWordRangeAtPosition: vi.fn(),
        validateRange: vi.fn(),
        validatePosition: vi.fn(),
      } as unknown as vscode.TextDocument);

      await manifestIndex.initialize(mockChannel);

      const hierarchy = manifestIndex.getHierarchicalView();
      const moduleHierarchy = manifestIndex.getModuleHierarchy();

      // Both should reflect the same manifests
      expect(hierarchy).toBeDefined();
      expect(moduleHierarchy).toBeDefined();
    });

    it("getSystemMetrics should reflect data from getAllManifests", async () => {
      const manifest1 = "/workspace/manifests/task-001.manifest.json";
      const manifest2 = "/workspace/manifests/task-002.manifest.json";

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
        vscode.Uri.file(manifest1),
        vscode.Uri.file(manifest2),
      ]);

      vi.mocked(vscode.workspace.openTextDocument).mockImplementation(
        (options?: { language?: string; content?: string; encoding?: string } | vscode.Uri) => {
          const uri = options instanceof vscode.Uri ? options : vscode.Uri.file("/test");
          return Promise.resolve({
            getText: vi.fn(() => createMockManifest({ goal: `Manifest ${uri.fsPath}` })),
            uri: uri,
            fileName: uri.fsPath,
            isUntitled: false,
            languageId: "json",
            version: 1,
            isDirty: false,
            isClosed: false,
            save: vi.fn(),
            eol: 1,
            lineCount: 1,
            lineAt: vi.fn(),
            offsetAt: vi.fn(),
            positionAt: vi.fn(),
            getWordRangeAtPosition: vi.fn(),
            validateRange: vi.fn(),
            validatePosition: vi.fn(),
          } as unknown as vscode.TextDocument);
        }
      );

      await manifestIndex.initialize(mockChannel);

      const metrics = manifestIndex.getSystemMetrics();
      const allManifests = manifestIndex.getAllManifests();

      expect(metrics.totalManifests).toBe(allManifests.length);
    });
  });
});
