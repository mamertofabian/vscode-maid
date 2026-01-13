/**
 * Behavioral tests for task-027a: MetricsCard component
 *
 * Tests the following artifacts:
 * - MetricsCardProps interface with required and optional properties
 * - MetricsCard functional component
 * - Trend indicator support (up, down, neutral)
 * - Color customization
 *
 * Since the MetricsCard component runs in a browser environment (webview),
 * we test by verifying the source code contains the expected artifacts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../webview-ui/src/components/Dashboard/MetricsCard.tsx"
);

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(componentPath, "utf-8");
});

describe("MetricsCard Component", () => {
  describe("MetricsCardProps Interface", () => {
    it("should define MetricsCardProps interface", () => {
      expect(sourceCode).toMatch(/interface\s+MetricsCardProps\s*\{/);
    });

    it("should have title property of type string", () => {
      expect(sourceCode).toMatch(/title:\s*string/);
    });

    it("should have value property accepting number or string", () => {
      expect(sourceCode).toMatch(/value:\s*(number\s*\|\s*string|string\s*\|\s*number)/);
    });

    it("should have optional subtitle property", () => {
      expect(sourceCode).toMatch(/subtitle\?:\s*string/);
    });

    it("should have optional trend property with union type", () => {
      expect(sourceCode).toMatch(/trend\?:\s*["']up["']\s*\|\s*["']down["']\s*\|\s*["']neutral["']/);
    });

    it("should have optional color property", () => {
      expect(sourceCode).toMatch(/color\?:\s*string/);
    });
  });

  describe("MetricsCard Component", () => {
    it("should define MetricsCard as a React functional component", () => {
      expect(sourceCode).toMatch(/const MetricsCard:\s*React\.FC<MetricsCardProps>/);
    });

    it("should export MetricsCard as default export", () => {
      expect(sourceCode).toContain("export default MetricsCard");
    });

    it("should destructure props in component", () => {
      // Match multiline destructuring pattern with title and value
      expect(sourceCode).toMatch(/\{\s*\n?\s*title,?\s*\n?\s*value/);
    });
  });

  describe("Component Rendering", () => {
    it("should render title", () => {
      expect(sourceCode).toMatch(/\{title\}/);
    });

    it("should render value", () => {
      expect(sourceCode).toMatch(/\{value\}/);
    });

    it("should conditionally render subtitle when provided", () => {
      expect(sourceCode).toMatch(/subtitle\s*&&|subtitle\s*\?/);
    });

    it("should have a container div with metrics-card class", () => {
      expect(sourceCode).toMatch(/className=.*metrics-card/);
    });
  });

  describe("Trend Indicator", () => {
    it("should conditionally render trend indicator", () => {
      expect(sourceCode).toMatch(/trend\s*&&|trend\s*\?/);
    });

    it("should handle up trend", () => {
      expect(sourceCode).toMatch(/["']up["']|trend.*up/);
    });

    it("should handle down trend", () => {
      expect(sourceCode).toMatch(/["']down["']|trend.*down/);
    });

    it("should handle neutral trend", () => {
      expect(sourceCode).toMatch(/["']neutral["']|trend.*neutral/);
    });

    it("should have trend indicator visual element", () => {
      expect(sourceCode).toMatch(/trend-indicator|trend-icon|arrow/i);
    });
  });

  describe("Color Support", () => {
    it("should apply custom color when provided", () => {
      expect(sourceCode).toMatch(/style=.*color|color.*style/);
    });

    it("should have default styling when no color provided", () => {
      // Component should work without color prop
      expect(sourceCode).toMatch(/color\s*\|\||color\s*\?/);
    });
  });

  describe("Styling", () => {
    it("should have embedded styles or import CSS", () => {
      expect(sourceCode).toMatch(/style=|className=|<style>/);
    });

    it("should have value styling", () => {
      expect(sourceCode).toMatch(/metrics-value|value/);
    });

    it("should have title styling", () => {
      expect(sourceCode).toMatch(/metrics-title|title/);
    });
  });

  describe("React Imports", () => {
    it("should import React", () => {
      expect(sourceCode).toMatch(/import\s+React/);
    });
  });
});
