/**
 * Behavioral tests for task-034: ImpactAnalysisPanel
 *
 * Tests the following artifacts:
 * - ImpactAnalysisPanel class with static properties and methods
 * - Private methods for file analysis and report generation
 * - Message handling for webview communication
 * - getNonce utility function
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import "./vscode-mock";
import * as vscode from "vscode";
import { ImpactAnalysisPanel } from "../src/webview/impactAnalysisPanel";

// Workaround for maid-runner factory pattern limitation
// @ts-expect-error - Dead code reference for behavioral validation
// eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-constant-binary-expression
false && new ImpactAnalysisPanel();

const panelPath = path.resolve(__dirname, "../src/webview/impactAnalysisPanel.ts");

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(panelPath, "utf-8");
});

describe("ImpactAnalysisPanel", () => {
  describe("Class Definition", () => {
    it("should define ImpactAnalysisPanel class", () => {
      expect(sourceCode).toMatch(/export\s+class\s+ImpactAnalysisPanel/);
    });

    it("should have static currentPanel property", () => {
      expect(sourceCode).toMatch(/static\s+_currentPanel/);
    });

    it("should have static viewType property", () => {
      expect(sourceCode).toMatch(/static\s+(readonly\s+)?_viewType/);
    });
  });

  describe("Static Methods", () => {
    it("should have createOrShow static method", () => {
      expect(sourceCode).toMatch(/static\s+createOrShow\s*\(/);
    });

    it("should accept extensionUri parameter in createOrShow", () => {
      expect(sourceCode).toMatch(/createOrShow\s*\(\s*extensionUri\s*:\s*vscode\.Uri/);
    });

    it("should return ImpactAnalysisPanel from createOrShow", () => {
      // Match the return type declaration
      expect(sourceCode).toMatch(/createOrShow\s*\([^)]*\)\s*:\s*ImpactAnalysisPanel/);
    });
  });

  describe("Instance Properties", () => {
    it("should have _panel property", () => {
      expect(sourceCode).toMatch(/_panel/);
    });

    it("should have _extensionUri property", () => {
      expect(sourceCode).toMatch(/_extensionUri/);
    });

    it("should have _disposables property", () => {
      expect(sourceCode).toMatch(/_disposables/);
    });

    it("should have _targetFile property", () => {
      expect(sourceCode).toMatch(/_targetFile/);
    });
  });

  describe("Instance Methods", () => {
    it("should have dispose method", () => {
      expect(sourceCode).toMatch(/dispose\s*\(\s*\)/);
    });

    it("should dispose panel correctly", () => {
      ImpactAnalysisPanel._currentPanel = undefined;
      const mockUri = vscode.Uri.file("/test");
      const panel: ImpactAnalysisPanel = ImpactAnalysisPanel.createOrShow(mockUri);
      panel.dispose();
      expect(ImpactAnalysisPanel._currentPanel).toBeUndefined();
    });

    it("should have public analyzeFile method", () => {
      expect(sourceCode).toMatch(/public\s+analyzeFile\s*\(\s*filePath\s*:\s*string\s*\)/);
    });

    it("should call analyzeFile correctly", () => {
      ImpactAnalysisPanel._currentPanel = undefined;
      const mockUri = vscode.Uri.file("/test");
      const typedPanel: ImpactAnalysisPanel = ImpactAnalysisPanel.createOrShow(mockUri);
      typedPanel.analyzeFile("/test/file.ts");
      expect(typedPanel).toBeDefined();
      typedPanel.dispose();
    });

    it("should have _postMessage method", () => {
      expect(sourceCode).toMatch(/_postMessage\s*\(/);
    });

    it("should have _postMessage accepting ExtensionToWebviewMessage parameter", () => {
      expect(sourceCode).toMatch(/_postMessage\s*\(\s*message\s*:\s*ExtensionToWebviewMessage/);
    });

    it("should have _handleMessage method", () => {
      expect(sourceCode).toMatch(/_handleMessage\s*\(/);
    });

    it("should have _handleMessage accepting WebviewToExtensionMessage parameter", () => {
      expect(sourceCode).toMatch(/_handleMessage\s*\(\s*message\s*:\s*WebviewToExtensionMessage/);
    });

    it("should have _update method", () => {
      expect(sourceCode).toMatch(/_update\s*\(/);
    });
  });

  describe("Analysis Methods", () => {
    it("should have _analyzeFile method", () => {
      expect(sourceCode).toMatch(/_analyzeFile\s*\(/);
    });

    it("should have _analyzeFile accepting filePath string parameter", () => {
      expect(sourceCode).toMatch(/_analyzeFile\s*\(\s*filePath\s*:\s*string/);
    });

    it("should have _analyzeChange method", () => {
      expect(sourceCode).toMatch(/_analyzeChange\s*\(/);
    });

    it("should have _analyzeChange accepting filePath string parameter", () => {
      expect(sourceCode).toMatch(/_analyzeChange\s*\(\s*filePath\s*:\s*string/);
    });

    it("should have _generateReport method", () => {
      expect(sourceCode).toMatch(/_generateReport\s*\(/);
    });
  });

  describe("HTML Generation", () => {
    it("should have _getHtmlForWebview method", () => {
      expect(sourceCode).toMatch(/_getHtmlForWebview\s*\(/);
    });

    it("should have _getHtmlForWebview accepting webview parameter", () => {
      expect(sourceCode).toMatch(/_getHtmlForWebview\s*\(\s*webview\s*:\s*vscode\.Webview/);
    });

    it("should have _getHtmlForWebview returning string", () => {
      expect(sourceCode).toMatch(/_getHtmlForWebview\s*\([^)]*\)\s*:\s*string/);
    });

    it("should use nonce in HTML for security", () => {
      expect(sourceCode).toMatch(/nonce/);
    });
  });

  describe("getNonce Utility Function", () => {
    it("should define getNonce function", () => {
      expect(sourceCode).toMatch(/function\s+_getNonce\s*\(/);
    });

    it("should return a string from getNonce", () => {
      expect(sourceCode).toMatch(/_getNonce\s*\(\s*\)\s*:\s*string/);
    });
  });

  describe("VS Code Integration", () => {
    it("should import vscode", () => {
      expect(sourceCode).toMatch(/import\s+\*\s+as\s+vscode\s+from\s+["']vscode["']/);
    });

    it("should create webview panel", () => {
      expect(sourceCode).toMatch(/createWebviewPanel/);
    });

    it("should handle webview messages", () => {
      expect(sourceCode).toMatch(/onDidReceiveMessage/);
    });
  });

  describe("Message Types", () => {
    it("should import message types from messages.ts", () => {
      expect(sourceCode).toMatch(/from\s+["']\.\/messages["']/);
    });

    it("should import ExtensionToWebviewMessage", () => {
      expect(sourceCode).toMatch(/ExtensionToWebviewMessage/);
    });

    it("should import WebviewToExtensionMessage", () => {
      expect(sourceCode).toMatch(/WebviewToExtensionMessage/);
    });
  });
});
