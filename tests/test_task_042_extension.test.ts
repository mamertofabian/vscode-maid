/**
 * Behavioral tests for src/extension.ts - validation runner integration
 *
 * Tests verify that extension.ts uses MaidValidationRunner for validation commands.
 * Since extension.ts doesn't export these functions directly, we test that
 * MaidValidationRunner can be imported and used as expected.
 */

import { describe, it, expect } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { MaidValidationRunner } from "../src/validationRunner";

describe("Extension - Validation Runner Integration", () => {
  describe("MaidValidationRunner import and usage", () => {
    it("should import MaidValidationRunner class", () => {
      // Arrange & Act: Import is done at top level
      // Assert: Class should be available
      expect(MaidValidationRunner).toBeDefined();
      expect(typeof MaidValidationRunner).toBe("function");
    });

    it("should instantiate MaidValidationRunner", () => {
      // Arrange & Act
      const validationRunner = new MaidValidationRunner();

      // Assert: Instance should have all validation methods
      expect(validationRunner).toBeDefined();
      expect(typeof validationRunner.runAllValidation).toBe("function");
      expect(typeof validationRunner.runValidation).toBe("function");
      expect(typeof validationRunner.runCoherenceValidation).toBe("function");
      expect(typeof validationRunner.runChainValidation).toBe("function");
      expect(typeof validationRunner.dispose).toBe("function");
    });

    it("should be able to call runAllValidation method", () => {
      // Arrange
      const validationRunner = new MaidValidationRunner();

      // Act & Assert: Method should be callable without errors
      expect(() => validationRunner.runAllValidation()).not.toThrow();
    });

    it("should be able to call runValidation with URI argument", () => {
      // Arrange
      const validationRunner = new MaidValidationRunner();
      const mockArg = vscode.Uri.file("/test.manifest.json");

      // Act & Assert: Method should accept URI argument
      expect(() => validationRunner.runValidation(mockArg)).not.toThrow();
    });

    it("should be able to call runCoherenceValidation with URI argument", () => {
      // Arrange
      const validationRunner = new MaidValidationRunner();
      const mockArg = vscode.Uri.file("/test.manifest.json");

      // Act & Assert: Method should accept URI argument
      expect(() => validationRunner.runCoherenceValidation(mockArg)).not.toThrow();
    });

    it("should be able to call runChainValidation with URI argument", () => {
      // Arrange
      const validationRunner = new MaidValidationRunner();
      const mockArg = vscode.Uri.file("/test.manifest.json");

      // Act & Assert: Method should accept URI argument
      expect(() => validationRunner.runChainValidation(mockArg)).not.toThrow();
    });
  });
});
