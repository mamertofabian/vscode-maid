/**
 * Behavioral tests for src/fileManifestsProvider.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import { FileManifestsTreeDataProvider } from "../src/fileManifestsProvider";

describe("FileManifestsTreeDataProvider", () => {
  let provider: FileManifestsTreeDataProvider;

  beforeEach(() => {
    provider = new FileManifestsTreeDataProvider(undefined);
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
