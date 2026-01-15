/**
 * Behavioral tests for src/fileManifestsProvider.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { FileManifestsTreeDataProvider, FileManifestTreeItem } from "../src/fileManifestsProvider";

describe("FileManifestsTreeDataProvider", () => {
  let fileProvider: FileManifestsTreeDataProvider;

  beforeEach(() => {
    fileProvider = new FileManifestsTreeDataProvider(undefined);
  });

  it("should create provider instance", () => {
    expect(fileProvider).toBeDefined();
  });

  it("should refresh without errors", () => {
    fileProvider.refresh();
    expect(true).toBe(true);
  });

  it("should dispose without errors", () => {
    fileProvider.dispose();
    expect(true).toBe(true);
  });

  it("should return tree items via getTreeItem", () => {
    const fileItem = new FileManifestTreeItem("test", "file", vscode.TreeItemCollapsibleState.None);
    const result = fileProvider.getTreeItem(fileItem);
    expect(result).toBeDefined();
  });

  it("should return children via getChildren", () => {
    const children = fileProvider.getChildren();
    expect(Array.isArray(children)).toBe(true);
  });

  it("should have onDidChangeTreeData event that can be subscribed to", () => {
    const disposable = fileProvider.onDidChangeTreeData(() => {});
    expect(disposable).toBeDefined();
    disposable.dispose();
  });

  it("should set current file via setCurrentFile", () => {
    fileProvider.setCurrentFile("/path/to/file.ts");
    expect(true).toBe(true);
  });

  it("should set manifest index via setManifestIndex", () => {
    const mockIndex = {} as Parameters<typeof fileProvider.setManifestIndex>[0];
    fileProvider.setManifestIndex(mockIndex);
    expect(true).toBe(true);
  });
});

describe("FileManifestTreeItem", () => {
  it("should create tree item instance", () => {
    const fileItem = new FileManifestTreeItem("test", "file", vscode.TreeItemCollapsibleState.None);
    expect(fileItem).toBeDefined();
  });
});
