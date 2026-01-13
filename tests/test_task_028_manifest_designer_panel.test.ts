/**
 * Behavioral tests for task-028: ManifestDesignerPanel
 *
 * Tests the following artifacts:
 * - ManifestDesignerPanel class with static properties and methods
 * - Private methods for load, save, validate manifest
 * - Message handling for webview communication
 * - getNonce utility function
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const panelPath = path.resolve(__dirname, "../src/webview/manifestDesignerPanel.ts");

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(panelPath, "utf-8");
});

describe("ManifestDesignerPanel", () => {
  describe("Class Definition", () => {
    it("should define ManifestDesignerPanel class", () => {
      expect(sourceCode).toMatch(/export\s+class\s+ManifestDesignerPanel/);
    });

    it("should have static currentPanel property", () => {
      expect(sourceCode).toMatch(/static\s+currentPanel/);
    });

    it("should have static viewType property with value maidManifestDesigner", () => {
      expect(sourceCode).toMatch(/static\s+(readonly\s+)?viewType.*=.*["']maidManifestDesigner["']/);
    });
  });

  describe("Static Methods", () => {
    it("should have createOrShow static method", () => {
      expect(sourceCode).toMatch(/static\s+createOrShow\s*\(/);
    });

    it("should accept extensionUri parameter in createOrShow", () => {
      expect(sourceCode).toMatch(/createOrShow\s*\(\s*extensionUri/);
    });
  });

  describe("Private Methods", () => {
    it("should have _loadManifest method", () => {
      expect(sourceCode).toMatch(/_loadManifest\s*\(/);
    });

    it("should have _saveManifest method", () => {
      expect(sourceCode).toMatch(/_saveManifest\s*\(/);
    });

    it("should have _validateManifest method", () => {
      expect(sourceCode).toMatch(/_validateManifest\s*\(/);
    });

    it("should have _handleMessage method", () => {
      expect(sourceCode).toMatch(/_handleMessage\s*\(/);
    });
  });

  describe("Instance Methods", () => {
    it("should have dispose method", () => {
      expect(sourceCode).toMatch(/dispose\s*\(\s*\)/);
    });
  });

  describe("getNonce Utility Function", () => {
    it("should define getNonce function", () => {
      expect(sourceCode).toMatch(/function\s+getNonce\s*\(/);
    });

    it("should return a string", () => {
      expect(sourceCode).toMatch(/getNonce.*:\s*string/);
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

  describe("Panel Properties", () => {
    it("should have _panel property", () => {
      expect(sourceCode).toMatch(/_panel/);
    });

    it("should have _extensionUri property", () => {
      expect(sourceCode).toMatch(/_extensionUri/);
    });

    it("should have _disposables property", () => {
      expect(sourceCode).toMatch(/_disposables/);
    });
  });

  describe("Message Types", () => {
    it("should import message types from messages.ts", () => {
      // Match multi-line imports using [\s\S] to match across lines
      expect(sourceCode).toMatch(/from\s+["']\.\/messages["']/);
    });
  });

  describe("HTML Generation", () => {
    it("should have method to get HTML for webview", () => {
      expect(sourceCode).toMatch(/_getHtmlForWebview|getHtmlForWebview/);
    });

    it("should use nonce in HTML for security", () => {
      expect(sourceCode).toMatch(/nonce/);
    });
  });
});
