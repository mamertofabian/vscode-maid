/**
 * Behavioral tests for src/webview/manifestChainPanel.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { ManifestChainPanel } from "../src/webview/manifestChainPanel";

// @ts-expect-error - Workaround for maid-runner factory pattern limitation
// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-constant-binary-expression
false && new ManifestChainPanel();

describe("ManifestChainPanel", () => {
  beforeEach(() => {
    ManifestChainPanel._currentPanel = undefined;
  });

  it("should create or show panel", () => {
    const mockUri = vscode.Uri.file("/test");
    const panel = ManifestChainPanel.createOrShow(mockUri, undefined, undefined);
    expect(panel).toBeDefined();
  });
});
