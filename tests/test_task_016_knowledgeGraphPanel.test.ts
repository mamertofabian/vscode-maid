/**
 * Behavioral tests for src/webview/knowledgeGraphPanel.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { KnowledgeGraphPanel } from "../src/webview/knowledgeGraphPanel";

describe("KnowledgeGraphPanel", () => {
  beforeEach(() => {
    KnowledgeGraphPanel.currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = KnowledgeGraphPanel.createOrShow(mockUri);
    expect(panel).toBeDefined();
  });
});
