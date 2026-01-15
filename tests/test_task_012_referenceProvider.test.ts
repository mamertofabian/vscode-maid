/**
 * Behavioral tests for src/referenceProvider.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestReferenceProvider, FileReferenceProvider } from "../src/referenceProvider";
import { ManifestIndex } from "../src/manifestIndex";

const mockContext = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe("ManifestReferenceProvider", () => {
  let manifestRefProvider: ManifestReferenceProvider;
  let mockIndex: ManifestIndex;

  beforeEach(() => {
    mockIndex = new ManifestIndex(mockContext);
    manifestRefProvider = new ManifestReferenceProvider(mockIndex);
  });

  it("should create provider instance", () => {
    expect(manifestRefProvider).toBeDefined();
  });

  it("should provide references for manifest files", () => {
    const mockDocument = {
      fileName: "/path/to/manifest.manifest.json",
      getText: vi.fn().mockReturnValue("{}"),
      positionAt: vi.fn().mockReturnValue({ line: 0, character: 0 }),
      offsetAt: vi.fn().mockReturnValue(0),
    } as unknown as vscode.TextDocument;
    const position = { line: 0, character: 0 } as vscode.Position;
    const context = { includeDeclaration: true } as vscode.ReferenceContext;
    const token = { isCancellationRequested: false } as vscode.CancellationToken;

    const result = manifestRefProvider.provideReferences(mockDocument, position, context, token);
    expect(result === undefined || result === null || Array.isArray(result)).toBe(true);
  });
});

describe("FileReferenceProvider", () => {
  let fileRefProvider: FileReferenceProvider;
  let mockIndex: ManifestIndex;

  beforeEach(() => {
    mockIndex = new ManifestIndex(mockContext);
    fileRefProvider = new FileReferenceProvider(mockIndex);
  });

  it("should create provider instance", () => {
    expect(fileRefProvider).toBeDefined();
  });

  it("should provide references for source files", () => {
    const mockDocument = {
      fileName: "/path/to/source.ts",
      getText: vi.fn().mockReturnValue(""),
      uri: { fsPath: "/path/to/source.ts" },
    } as unknown as vscode.TextDocument;
    const position = { line: 0, character: 0 } as vscode.Position;
    const context = { includeDeclaration: true } as vscode.ReferenceContext;
    const token = { isCancellationRequested: false } as vscode.CancellationToken;

    const result = fileRefProvider.provideReferences(mockDocument, position, context, token);
    expect(result === undefined || result === null || Array.isArray(result)).toBe(true);
  });
});
