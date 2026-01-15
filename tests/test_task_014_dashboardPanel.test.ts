/**
 * Behavioral tests for src/webview/dashboardPanel.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { DashboardPanel } from "../src/webview/dashboardPanel";

describe("DashboardPanel", () => {
  let dashboardPanel: DashboardPanel;

  beforeEach(() => {
    DashboardPanel._currentPanel = undefined;
  });

  afterEach(() => {
    if (DashboardPanel._currentPanel) {
      DashboardPanel._currentPanel.dispose();
    }
  });

  it("should create or show panel via createOrShow", () => {
    const mockUri = vscode.Uri.file("/test");
    dashboardPanel = DashboardPanel.createOrShow(mockUri);
    expect(dashboardPanel).toBeDefined();
  });

  it("should dispose without errors", () => {
    const mockUri = vscode.Uri.file("/test");
    dashboardPanel = DashboardPanel.createOrShow(mockUri);
    dashboardPanel.dispose();
    expect(true).toBe(true);
  });
});
