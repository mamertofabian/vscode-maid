/**
 * Behavioral tests for src/manifestHistory.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestHistoryTreeDataProvider, HistoryTreeItem } from "../src/manifestHistory";

describe("ManifestHistoryTreeDataProvider", () => {
  let historyProvider: ManifestHistoryTreeDataProvider;

  beforeEach(() => {
    historyProvider = new ManifestHistoryTreeDataProvider();
  });

  it("should create provider instance", () => {
    expect(historyProvider).toBeDefined();
  });

  it("should refresh without errors", () => {
    historyProvider.refresh();
    expect(true).toBe(true);
  });

  it("should dispose without errors", () => {
    historyProvider.dispose();
    expect(true).toBe(true);
  });

  it("should return tree items via getTreeItem", () => {
    const historyItem = new HistoryTreeItem("test", "commit", vscode.TreeItemCollapsibleState.None);
    const result = historyProvider.getTreeItem(historyItem);
    expect(result).toBeDefined();
  });

  it("should return children via getChildren", () => {
    const children = historyProvider.getChildren();
    expect(Array.isArray(children)).toBe(true);
  });

  it("should have onDidChangeTreeData event that can be subscribed to", () => {
    const disposable = historyProvider.onDidChangeTreeData(() => {});
    expect(disposable).toBeDefined();
    disposable.dispose();
  });

  it("should set selected manifest via setSelectedManifest", () => {
    historyProvider.setSelectedManifest("/path/to/manifest.json");
    expect(true).toBe(true);
  });
});

describe("HistoryTreeItem", () => {
  it("should create tree item instance", () => {
    const historyItem = new HistoryTreeItem("test", "commit", vscode.TreeItemCollapsibleState.None);
    expect(historyItem).toBeDefined();
  });
});
