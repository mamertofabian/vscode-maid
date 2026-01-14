/**
 * Behavioral tests for src/referenceProvider.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestReferenceProvider, FileReferenceProvider } from "../src/referenceProvider";
import { ManifestIndex } from "../src/manifestIndex";

const mockContext = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe("ReferenceProviders", () => {
  let manifestProvider: ManifestReferenceProvider;
  let fileProvider: FileReferenceProvider;
  let mockIndex: ManifestIndex;

  beforeEach(() => {
    mockIndex = new ManifestIndex(mockContext);
    manifestProvider = new ManifestReferenceProvider(mockIndex);
    fileProvider = new FileReferenceProvider(mockIndex);
  });

  it("should create ManifestReferenceProvider instance", () => {
    expect(manifestProvider).toBeDefined();
  });

  it("should create FileReferenceProvider instance", () => {
    expect(fileProvider).toBeDefined();
  });
});
