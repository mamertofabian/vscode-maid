/**
 * Behavioral tests for src/knowledgeGraph.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { KnowledgeGraphTreeDataProvider, GraphTreeItem } from "../src/knowledgeGraph";

describe("KnowledgeGraphTreeDataProvider", () => {
  let graphProvider: KnowledgeGraphTreeDataProvider;

  beforeEach(() => {
    graphProvider = new KnowledgeGraphTreeDataProvider();
  });

  it("should create provider instance", () => {
    expect(graphProvider).toBeDefined();
  });

  it("should refresh without errors", () => {
    graphProvider.refresh();
    expect(true).toBe(true);
  });

  it("should dispose without errors", () => {
    graphProvider.dispose();
    expect(true).toBe(true);
  });

  it("should return tree items via getTreeItem", () => {
    const graphItem = new GraphTreeItem("test", "category", vscode.TreeItemCollapsibleState.None);
    const result = graphProvider.getTreeItem(graphItem);
    expect(result).toBeDefined();
  });

  it("should return children via getChildren", () => {
    const children = graphProvider.getChildren();
    expect(Array.isArray(children)).toBe(true);
  });

  it("should have onDidChangeTreeData event that can be subscribed to", () => {
    const disposable = graphProvider.onDidChangeTreeData(() => {});
    expect(disposable).toBeDefined();
    disposable.dispose();
  });
});

describe("GraphTreeItem", () => {
  it("should create tree item instance", () => {
    const graphItem = new GraphTreeItem("test", "category", vscode.TreeItemCollapsibleState.None);
    expect(graphItem).toBeDefined();
  });
});
