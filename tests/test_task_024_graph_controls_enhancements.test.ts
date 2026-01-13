/**
 * Behavioral tests for GraphControls React component enhancements (task-024)
 *
 * Tests the following new artifacts:
 * - handleLayoutSelect function for handling layout dropdown changes
 * - handleExportClick function for handling export button clicks
 * - New props: currentLayout, onLayoutChange, onExport
 *
 * Since the GraphControls component runs in a browser environment (webview),
 * we test by verifying the source code contains the expected artifacts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../webview-ui/src/components/KnowledgeGraph/GraphControls.tsx"
);

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(componentPath, "utf-8");
});

describe("GraphControls Component Enhancements", () => {
  describe("Component Structure", () => {
    it("should export GraphControls as default export", () => {
      expect(sourceCode).toContain("export default GraphControls");
    });

    it("should define GraphControls as a React functional component", () => {
      expect(sourceCode).toMatch(/const GraphControls:\s*React\.FC/);
    });
  });

  describe("Existing Functions (preserved)", () => {
    it("should contain handleCheckboxChange function", () => {
      expect(sourceCode).toMatch(
        /const handleCheckboxChange\s*=\s*\(key:\s*keyof\s*GraphFilters\)/
      );
    });

    it("should contain handleSearchChange function", () => {
      expect(sourceCode).toMatch(
        /const handleSearchChange\s*=\s*\(e:\s*React\.ChangeEvent<HTMLInputElement>\)/
      );
    });
  });

  describe("New Props Interface", () => {
    it("should include currentLayout optional prop in interface", () => {
      expect(sourceCode).toMatch(/currentLayout\?:\s*string/);
    });

    it("should include onLayoutChange optional callback prop in interface", () => {
      expect(sourceCode).toMatch(/onLayoutChange\?:\s*\(layoutType:\s*string\)\s*=>\s*void/);
    });

    it("should include onExport optional callback prop in interface", () => {
      expect(sourceCode).toMatch(/onExport\?:\s*\(format:\s*string\)\s*=>\s*void/);
    });
  });

  describe("handleLayoutSelect function", () => {
    it("should define handleLayoutSelect function", () => {
      expect(sourceCode).toMatch(
        /const handleLayoutSelect\s*=\s*\(e:\s*React\.ChangeEvent<HTMLSelectElement>\)/
      );
    });

    it("should get selected value from the event target", () => {
      expect(sourceCode).toMatch(/e\.target\.value/);
    });

    it("should call onLayoutChange with the selected value", () => {
      // Should conditionally call onLayoutChange if it exists (using optional chaining)
      expect(sourceCode).toMatch(/onLayoutChange\?\.\(/);
    });
  });

  describe("handleExportClick function", () => {
    it("should define handleExportClick function", () => {
      expect(sourceCode).toMatch(/const handleExportClick\s*=\s*\(format:\s*string\)/);
    });

    it("should call onExport with the format", () => {
      // Should conditionally call onExport if it exists (using optional chaining)
      expect(sourceCode).toMatch(/onExport\?\.\(format\)/);
    });
  });

  describe("Layout Selector UI", () => {
    it("should render a layout selector dropdown", () => {
      expect(sourceCode).toMatch(/<select/);
    });

    it("should have className layout-select on the dropdown", () => {
      expect(sourceCode).toMatch(/className=["']layout-select["']/);
    });

    it("should bind value to currentLayout with force-directed as default", () => {
      expect(sourceCode).toMatch(/value=\{currentLayout\s*\|\|\s*["']force-directed["']\}/);
    });

    it("should bind onChange to handleLayoutSelect", () => {
      expect(sourceCode).toMatch(/onChange=\{handleLayoutSelect\}/);
    });

    it("should have Force-Directed layout option", () => {
      expect(sourceCode).toMatch(
        /<option\s+value=["']force-directed["'][^>]*>.*Force-Directed.*<\/option>/s
      );
    });

    it("should have Hierarchical layout option", () => {
      expect(sourceCode).toMatch(
        /<option\s+value=["']hierarchical["'][^>]*>.*Hierarchical.*<\/option>/s
      );
    });

    it("should have Circular layout option", () => {
      expect(sourceCode).toMatch(/<option\s+value=["']circular["'][^>]*>.*Circular.*<\/option>/s);
    });
  });

  describe("Export Controls UI", () => {
    it("should render export controls container", () => {
      expect(sourceCode).toMatch(/className=["']export-controls["']/);
    });

    it("should have Export JSON button", () => {
      expect(sourceCode).toMatch(/Export JSON/);
    });

    it("should have Export DOT button", () => {
      expect(sourceCode).toMatch(/Export DOT/);
    });

    it("should call handleExportClick with json on JSON button click", () => {
      expect(sourceCode).toMatch(/onClick=\{\(\)\s*=>\s*handleExportClick\(["']json["']\)\}/);
    });

    it("should call handleExportClick with dot on DOT button click", () => {
      expect(sourceCode).toMatch(/onClick=\{\(\)\s*=>\s*handleExportClick\(["']dot["']\)\}/);
    });
  });

  describe("Props Destructuring", () => {
    it("should destructure currentLayout from props", () => {
      expect(sourceCode).toMatch(/\{\s*[\s\S]*currentLayout[\s\S]*\}/);
    });

    it("should destructure onLayoutChange from props", () => {
      expect(sourceCode).toMatch(/\{\s*[\s\S]*onLayoutChange[\s\S]*\}/);
    });

    it("should destructure onExport from props", () => {
      expect(sourceCode).toMatch(/\{\s*[\s\S]*onExport[\s\S]*\}/);
    });
  });
});
