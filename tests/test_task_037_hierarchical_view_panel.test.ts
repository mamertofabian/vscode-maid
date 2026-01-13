/**
 * Behavioral tests for task-037: HierarchicalViewPanel
 *
 * Tests the following artifacts:
 * - HierarchicalViewPanel class with static properties and methods
 * - Private methods for hierarchy building and navigation
 * - Message handling for webview communication
 * - getNonce utility function
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const panelPath = path.resolve(__dirname, "../src/webview/hierarchicalViewPanel.ts");

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(panelPath, "utf-8");
});

describe("HierarchicalViewPanel", () => {
  describe("Class Definition", () => {
    it("should define HierarchicalViewPanel class", () => {
      expect(sourceCode).toMatch(/export\s+class\s+HierarchicalViewPanel/);
    });

    it("should have static currentPanel property", () => {
      expect(sourceCode).toMatch(/static\s+currentPanel/);
    });

    it("should have static viewType property", () => {
      expect(sourceCode).toMatch(/static\s+(readonly\s+)?viewType/);
    });
  });

  describe("Static Methods", () => {
    it("should have createOrShow static method", () => {
      expect(sourceCode).toMatch(/static\s+createOrShow\s*\(/);
    });

    it("should accept extensionUri parameter in createOrShow", () => {
      expect(sourceCode).toMatch(/createOrShow\s*\(\s*extensionUri\s*:\s*vscode\.Uri/);
    });

    it("should return HierarchicalViewPanel from createOrShow", () => {
      expect(sourceCode).toMatch(/createOrShow\s*\([^)]*\)\s*:\s*HierarchicalViewPanel/);
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

    it("should have _currentLevel property", () => {
      expect(sourceCode).toMatch(/_currentLevel/);
    });
  });

  describe("Instance Methods", () => {
    it("should have dispose method", () => {
      expect(sourceCode).toMatch(/dispose\s*\(\s*\)/);
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

  describe("Hierarchy Methods", () => {
    it("should have _buildHierarchy method", () => {
      expect(sourceCode).toMatch(/_buildHierarchy\s*\(/);
    });

    it("should have _computeLevels method", () => {
      expect(sourceCode).toMatch(/_computeLevels\s*\(/);
    });

    it("should have _handleDrillDown method", () => {
      expect(sourceCode).toMatch(/_handleDrillDown\s*\(/);
    });

    it("should have _handleDrillDown accepting nodeId string parameter", () => {
      expect(sourceCode).toMatch(/_handleDrillDown\s*\(\s*nodeId\s*:\s*string/);
    });

    it("should have _handleDrillUp method", () => {
      expect(sourceCode).toMatch(/_handleDrillUp\s*\(/);
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
      expect(sourceCode).toMatch(/function\s+getNonce\s*\(/);
    });

    it("should return a string from getNonce", () => {
      expect(sourceCode).toMatch(/getNonce\s*\(\s*\)\s*:\s*string/);
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
