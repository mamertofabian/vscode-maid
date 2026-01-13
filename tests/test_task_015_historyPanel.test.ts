/**
 * Behavioral tests for src/webview/historyPanel.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { HistoryPanel } from "../src/webview/historyPanel";

describe("HistoryPanel", () => {
  beforeEach(() => {
    HistoryPanel.currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = HistoryPanel.createOrShow(mockUri, "/test.manifest.json");
    expect(panel).toBeDefined();
  });
});
