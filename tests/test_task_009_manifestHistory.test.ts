/**
 * Behavioral tests for src/manifestHistory.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import { ManifestHistoryTreeDataProvider } from "../src/manifestHistory";

describe("ManifestHistoryTreeDataProvider", () => {
  let provider: ManifestHistoryTreeDataProvider;

  beforeEach(() => {
    provider = new ManifestHistoryTreeDataProvider();
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
