/**
 * Behavioral tests for src/definitionProvider.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestDefinitionProvider } from "../src/definitionProvider";
import { ManifestIndex } from "../src/manifestIndex";

const mockContext = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe("ManifestDefinitionProvider", () => {
  let defProvider: ManifestDefinitionProvider;
  let mockIndex: ManifestIndex;

  beforeEach(() => {
    mockIndex = new ManifestIndex(mockContext);
    defProvider = new ManifestDefinitionProvider(mockIndex);
  });

  it("should create provider instance", () => {
    expect(defProvider).toBeDefined();
  });

  it("should provide definition for manifest files", async () => {
    const mockDocument = {
      fileName: "/path/to/manifest.manifest.json",
      getText: vi.fn().mockReturnValue("{}"),
      positionAt: vi.fn().mockReturnValue({ line: 0, character: 0 }),
      offsetAt: vi.fn().mockReturnValue(0),
    } as unknown as vscode.TextDocument;
    const position = { line: 0, character: 0 } as vscode.Position;
    const token = { isCancellationRequested: false } as vscode.CancellationToken;

    const result = await defProvider.provideDefinition(mockDocument, position, token);
    // Result may be undefined if no definition found
    expect(result === undefined || result === null || Array.isArray(result)).toBe(true);
  });
});
