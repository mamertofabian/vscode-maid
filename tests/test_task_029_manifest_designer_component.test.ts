/**
 * Behavioral tests for task-029: ManifestDesigner React component
 *
 * Tests the following artifacts:
 * - ManifestDesignerProps interface
 * - ManifestDesigner functional component
 * - Form inputs for manifest properties
 * - Save and validate buttons
 * - State management for manifest data
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../webview-ui/src/components/ManifestDesigner/ManifestDesigner.tsx"
);

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(componentPath, "utf-8");
});

describe("ManifestDesigner Component", () => {
  describe("ManifestDesignerProps Interface", () => {
    it("should define ManifestDesignerProps interface", () => {
      expect(sourceCode).toMatch(/interface\s+ManifestDesignerProps\s*\{/);
    });
  });

  describe("ManifestDesigner Component", () => {
    it("should define ManifestDesigner as a React functional component", () => {
      expect(sourceCode).toMatch(/const ManifestDesigner:\s*React\.FC/);
    });

    it("should export ManifestDesigner", () => {
      expect(sourceCode).toMatch(/export\s+(default\s+)?ManifestDesigner|export\s*\{\s*ManifestDesigner/);
    });
  });

  describe("State Management", () => {
    it("should have state for goal", () => {
      expect(sourceCode).toMatch(/goal|Goal/);
    });

    it("should have state for taskType", () => {
      expect(sourceCode).toMatch(/taskType|TaskType/);
    });

    it("should have state for files", () => {
      expect(sourceCode).toMatch(/files|Files|creatableFiles|editableFiles|readonlyFiles/);
    });

    it("should have state for artifacts", () => {
      expect(sourceCode).toMatch(/artifacts|Artifacts|expectedArtifacts/);
    });

    it("should use React useState or state management", () => {
      expect(sourceCode).toMatch(/useState|useReducer|state/);
    });
  });

  describe("Form Inputs", () => {
    it("should have input for goal", () => {
      expect(sourceCode).toMatch(/input.*goal|goal.*input|<input|<textarea/i);
    });

    it("should have task type selection", () => {
      expect(sourceCode).toMatch(/select.*taskType|taskType.*select|create|edit|refactor/i);
    });
  });

  describe("Buttons", () => {
    it("should have save button", () => {
      expect(sourceCode).toMatch(/save|Save/i);
    });

    it("should have validate button", () => {
      expect(sourceCode).toMatch(/validate|Validate/i);
    });

    it("should use button elements", () => {
      expect(sourceCode).toMatch(/<button/);
    });
  });

  describe("Validation Feedback", () => {
    it("should display validation errors or status", () => {
      expect(sourceCode).toMatch(/error|Error|validation|Validation|status|Status/);
    });
  });

  describe("React Imports", () => {
    it("should import React", () => {
      expect(sourceCode).toMatch(/import\s+React/);
    });

    it("should import useState or useReducer", () => {
      expect(sourceCode).toMatch(/useState|useReducer/);
    });
  });

  describe("VS Code Webview Communication", () => {
    it("should have mechanism for sending messages to extension", () => {
      expect(sourceCode).toMatch(/postMessage|vscode|acquireVsCodeApi/);
    });
  });

  describe("Styling", () => {
    it("should have className or style attributes", () => {
      expect(sourceCode).toMatch(/className=|style=/);
    });

    it("should have manifest-designer related class", () => {
      expect(sourceCode).toMatch(/manifest-designer|ManifestDesigner/);
    });
  });
});
