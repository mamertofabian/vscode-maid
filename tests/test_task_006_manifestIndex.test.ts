/**
 * Behavioral tests for src/manifestIndex.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestIndex } from "../src/manifestIndex";

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

describe("ManifestIndex", () => {
  let manifestIndex: ManifestIndex;
  let mockChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;

    (vscode.workspace.findFiles as any) = vi.fn().mockResolvedValue([]);
    (vscode.workspace.openTextDocument as any) = vi.fn().mockResolvedValue({
      getText: vi.fn(() => "{}"),
      uri: { fsPath: "/test.manifest.json" },
    });

    manifestIndex = new ManifestIndex(mockContext);
  });

  it("should initialize and build index", async () => {
    await manifestIndex.initialize(mockChannel);
    expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
      "**/*.manifest.json",
      "**/node_modules/**"
    );
  });

  it("should return empty array when no manifests reference a file", async () => {
    await manifestIndex.initialize(mockChannel);
    const references = manifestIndex.getManifestsReferencingFile("/nonexistent.ts");
    expect(references).toEqual([]);
  });

  it("should return empty supersession chain when manifest not found", async () => {
    await manifestIndex.initialize(mockChannel);
    const chain = manifestIndex.getSupersessionChain("/nonexistent.manifest.json");
    expect(chain).toBeDefined();
    expect(chain.parents).toEqual([]);
    expect(chain.children).toEqual([]);
  });

  it("should dispose resources when dispose is called", async () => {
    await manifestIndex.initialize(mockChannel);
    manifestIndex.dispose();
    expect(() => manifestIndex.dispose()).not.toThrow();
  });
});
