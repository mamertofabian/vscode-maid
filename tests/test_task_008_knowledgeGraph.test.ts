/**
 * Behavioral tests for src/knowledgeGraph.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import { KnowledgeGraphTreeDataProvider } from "../src/knowledgeGraph";

describe("KnowledgeGraphTreeDataProvider", () => {
  let provider: KnowledgeGraphTreeDataProvider;

  beforeEach(() => {
    provider = new KnowledgeGraphTreeDataProvider();
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
