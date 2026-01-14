/**
 * Behavioral tests for src/manifestExplorer.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestTreeDataProvider } from "../src/manifestExplorer";

describe("ManifestTreeDataProvider", () => {
  let provider: ManifestTreeDataProvider;

  beforeEach(() => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
    provider = new ManifestTreeDataProvider();
  });

  it("should create provider instance", () => {
    expect(provider).toBeDefined();
  });

  it("should refresh without errors", () => {
    expect(() => provider.refresh()).not.toThrow();
  });

  it("should dispose without errors", () => {
    expect(() => provider.dispose()).not.toThrow();
  });
});
