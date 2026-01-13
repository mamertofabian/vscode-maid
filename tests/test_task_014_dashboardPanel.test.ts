/**
 * Behavioral tests for src/webview/dashboardPanel.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { DashboardPanel } from "../src/webview/dashboardPanel";

describe("DashboardPanel", () => {
  beforeEach(() => {
    DashboardPanel.currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = DashboardPanel.createOrShow(mockUri);
    expect(panel).toBeDefined();
  });
});
