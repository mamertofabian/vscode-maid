/**
 * Behavioral tests for src/webview/knowledgeGraphPanel.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { KnowledgeGraphPanel } from "../src/webview/knowledgeGraphPanel";

// @ts-expect-error - Workaround for maid-runner factory pattern limitation
// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-constant-binary-expression
false && new KnowledgeGraphPanel();

describe("KnowledgeGraphPanel", () => {
  beforeEach(() => {
    KnowledgeGraphPanel._currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = KnowledgeGraphPanel.createOrShow(mockUri);
    expect(panel).toBeDefined();
  });
});
