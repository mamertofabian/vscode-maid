/**
 * Behavioral tests for src/manifestExplorer.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import {
  ManifestTreeDataProvider,
  ManifestTreeItem,
  TrackedFilesTreeDataProvider,
  TrackedFileTreeItem,
} from "../src/manifestExplorer";

describe("ManifestTreeDataProvider", () => {
  let manifestProvider: ManifestTreeDataProvider;

  beforeEach(() => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
    manifestProvider = new ManifestTreeDataProvider();
  });

  it("should create provider instance", () => {
    expect(manifestProvider).toBeDefined();
  });

  it("should refresh without errors", () => {
    manifestProvider.refresh();
    expect(true).toBe(true);
  });

  it("should dispose without errors", () => {
    manifestProvider.dispose();
    expect(true).toBe(true);
  });

  it("should return tree items via getTreeItem", () => {
    const manifestItem = new ManifestTreeItem(
      "test",
      "manifest",
      vscode.TreeItemCollapsibleState.None
    );
    const result = manifestProvider.getTreeItem(manifestItem);
    expect(result).toBeDefined();
  });

  it("should return children via getChildren", async () => {
    const children = await manifestProvider.getChildren();
    expect(Array.isArray(children)).toBe(true);
  });

  it("should have onDidChangeTreeData event that can be subscribed to", () => {
    const disposable = manifestProvider.onDidChangeTreeData(() => {});
    expect(disposable).toBeDefined();
    disposable.dispose();
  });

  it("should set manifest index via setManifestIndex", () => {
    const mockIndex = {} as Parameters<typeof manifestProvider.setManifestIndex>[0];
    manifestProvider.setManifestIndex(mockIndex);
    expect(true).toBe(true);
  });
});

describe("ManifestTreeItem", () => {
  it("should create tree item instance", () => {
    const manifestItem = new ManifestTreeItem(
      "test",
      "manifest",
      vscode.TreeItemCollapsibleState.None
    );
    expect(manifestItem).toBeDefined();
  });
});

describe("TrackedFilesTreeDataProvider", () => {
  let trackedProvider: TrackedFilesTreeDataProvider;

  beforeEach(() => {
    trackedProvider = new TrackedFilesTreeDataProvider();
  });

  it("should create provider instance", () => {
    expect(trackedProvider).toBeDefined();
  });

  it("should refresh without errors", () => {
    trackedProvider.refresh();
    expect(true).toBe(true);
  });

  it("should dispose without errors", () => {
    trackedProvider.dispose();
    expect(true).toBe(true);
  });

  it("should return tree items via getTreeItem", () => {
    const trackedItem = new TrackedFileTreeItem(
      "test",
      "tracked",
      vscode.TreeItemCollapsibleState.None
    );
    const result = trackedProvider.getTreeItem(trackedItem);
    expect(result).toBeDefined();
  });

  it("should return children via getChildren", () => {
    const children = trackedProvider.getChildren();
    expect(Array.isArray(children)).toBe(true);
  });

  it("should have onDidChangeTreeData event that can be subscribed to", () => {
    const disposable = trackedProvider.onDidChangeTreeData(() => {});
    expect(disposable).toBeDefined();
    disposable.dispose();
  });
});

describe("TrackedFileTreeItem", () => {
  it("should create tree item instance", () => {
    const trackedItem = new TrackedFileTreeItem(
      "test",
      "tracked",
      vscode.TreeItemCollapsibleState.None
    );
    expect(trackedItem).toBeDefined();
  });
});
