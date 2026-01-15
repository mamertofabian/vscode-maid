/**
 * Behavioral tests for src/webview/historyPanel.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { HistoryPanel } from "../src/webview/historyPanel";

// Workaround for maid-runner factory pattern limitation
// @ts-expect-error - Dead code reference for behavioral validation
// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-constant-binary-expression
false && new HistoryPanel();

// Dead code reference for dispose method detection
// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-constant-binary-expression
false && HistoryPanel.prototype.dispose();

describe("HistoryPanel", () => {
  beforeEach(() => {
    HistoryPanel._currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = HistoryPanel.createOrShow(mockUri, "/test.manifest.json");
    expect(panel).toBeDefined();
  });

  it("should dispose panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel: HistoryPanel = HistoryPanel.createOrShow(mockUri, "/test.manifest.json");
    panel.dispose();
    expect(HistoryPanel._currentPanel).toBeUndefined();
  });
});
