/**
 * Behavioral tests for src/definitionProvider.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestDefinitionProvider } from "../src/definitionProvider";
import { ManifestIndex } from "../src/manifestIndex";

const mockContext = {
  subscriptions: [],
} as unknown as vscode.ExtensionContext;

describe("ManifestDefinitionProvider", () => {
  let provider: ManifestDefinitionProvider;
  let mockIndex: ManifestIndex;

  beforeEach(() => {
    mockIndex = new ManifestIndex(mockContext);
    provider = new ManifestDefinitionProvider(mockIndex);
  });

  it("should create provider instance", () => {
    expect(provider).toBeDefined();
  });
});
