/**
 * Behavioral tests for src/webview/manifestChainPanel.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestChainPanel } from "../src/webview/manifestChainPanel";

describe("ManifestChainPanel", () => {
  beforeEach(() => {
    ManifestChainPanel.currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = ManifestChainPanel.createOrShow(mockUri, undefined, undefined);
    expect(panel).toBeDefined();
  });
});
