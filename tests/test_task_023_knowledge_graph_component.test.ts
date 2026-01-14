/**
 * Behavioral tests for KnowledgeGraph React component enhancements (task-023)
 *
 * Tests the following new artifacts:
 * - handleLayoutChange function for switching graph layouts
 * - handleExport function for exporting graph data
 * - Layout state management
 *
 * Since the KnowledgeGraph component runs in a browser environment (webview),
 * we test by verifying the source code contains the expected artifacts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../webview-ui/src/components/KnowledgeGraph/KnowledgeGraph.tsx"
);

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(componentPath, "utf-8");
});

describe("KnowledgeGraph Component Enhancements", () => {
  describe("Component Structure", () => {
    it("should export KnowledgeGraph as default export", () => {
      expect(sourceCode).toContain("export default KnowledgeGraph");
    });

    it("should define KnowledgeGraph as a React functional component", () => {
      expect(sourceCode).toMatch(/const KnowledgeGraph:\s*React\.FC/);
    });
  });

  describe("Existing Functions (preserved)", () => {
    it("should contain getNodeLabel function", () => {
      expect(sourceCode).toMatch(/const getNodeLabel\s*=\s*\(node:\s*GraphNode\)/);
    });

    it("should contain getNodeTooltip function", () => {
      expect(sourceCode).toMatch(/const getNodeTooltip\s*=\s*\(node:\s*GraphNode\)/);
    });

    it("should contain getEdgeColor function", () => {
      expect(sourceCode).toMatch(/const getEdgeColor\s*=\s*\(relation:/);
    });

    it("should contain handleFilterChange function", () => {
      expect(sourceCode).toMatch(/const handleFilterChange\s*=\s*\(newFilters:\s*GraphFilters\)/);
    });

    it("should contain handleRefresh function", () => {
      expect(sourceCode).toMatch(/const handleRefresh\s*=\s*\(\)/);
    });

    it("should contain handleOpenNode function", () => {
      expect(sourceCode).toMatch(/const handleOpenNode\s*=\s*\(node:\s*GraphNode\)/);
    });
  });

  describe("handleLayoutChange function", () => {
    it("should define handleLayoutChange function", () => {
      expect(sourceCode).toMatch(/const handleLayoutChange\s*=\s*\(layoutType:\s*string\)/);
    });

    it("should call setCurrentLayout with the new layout type", () => {
      expect(sourceCode).toContain("setCurrentLayout(layoutType)");
    });

    it("should send changeLayout message to extension", () => {
      // The function should send a message with type "changeLayout"
      expect(sourceCode).toMatch(/sendMessage\(\s*\{[^}]*type:\s*["']changeLayout["']/);
    });

    it("should include layout type in message payload", () => {
      // The message payload should include the layout type
      expect(sourceCode).toMatch(/type:\s*layoutType\s*as\s*any/);
    });

    it("should update vis.js network layout via networkRef", () => {
      // Should check networkRef.current and call setOptions
      expect(sourceCode).toMatch(/networkRef\.current.*setOptions/s);
    });
  });

  describe("handleExport function", () => {
    it("should define handleExport function", () => {
      expect(sourceCode).toMatch(/const handleExport\s*=\s*\(format:\s*string\)/);
    });

    it("should send exportGraph message to extension", () => {
      // The function should send a message with type "exportGraph"
      expect(sourceCode).toMatch(/sendMessage\(\s*\{[^}]*type:\s*["']exportGraph["']/);
    });

    it("should include format in message payload", () => {
      // The message payload should include the format
      expect(sourceCode).toMatch(/format:\s*format\s*as\s*any/);
    });
  });

  describe("Layout State", () => {
    it("should define currentLayout state with useState", () => {
      expect(sourceCode).toMatch(/\[currentLayout,\s*setCurrentLayout\]\s*=\s*useState<string>/);
    });

    it("should initialize currentLayout with force-directed as default", () => {
      expect(sourceCode).toMatch(/useState<string>\(["']force-directed["']\)/);
    });
  });

  describe("Layout Options Helper", () => {
    it("should define _getLayoutOptions private helper function", () => {
      expect(sourceCode).toMatch(/const _getLayoutOptions\s*=\s*\(layoutType:\s*string\)/);
    });

    it("should handle hierarchical layout type", () => {
      expect(sourceCode).toMatch(/case\s*["']hierarchical["']:/);
    });

    it("should configure hierarchical layout with direction", () => {
      expect(sourceCode).toMatch(/direction:\s*["']UD["']/);
    });

    it("should handle circular layout type", () => {
      expect(sourceCode).toMatch(/case\s*["']circular["']:/);
    });

    it("should have default case for force-directed layout", () => {
      // Default case should return non-hierarchical layout
      expect(sourceCode).toMatch(/default:\s*\n?\s*return\s*\{\s*hierarchical:\s*false\s*\}/);
    });
  });

  describe("GraphControls Integration", () => {
    it("should pass currentLayout prop to GraphControls", () => {
      expect(sourceCode).toMatch(/currentLayout=\{currentLayout\}/);
    });

    it("should pass onLayoutChange prop to GraphControls", () => {
      expect(sourceCode).toMatch(/onLayoutChange=\{handleLayoutChange\}/);
    });

    it("should pass onExport prop to GraphControls", () => {
      expect(sourceCode).toMatch(/onExport=\{handleExport\}/);
    });
  });

  describe("Supported Layouts", () => {
    it("should support hierarchical layout", () => {
      expect(sourceCode).toContain("hierarchical");
    });

    it("should support force-directed layout", () => {
      expect(sourceCode).toContain("force-directed");
    });

    it("should support circular layout", () => {
      expect(sourceCode).toContain("circular");
    });
  });

  describe("Export Formats", () => {
    it("should support export functionality via message", () => {
      // The handleExport function should accept format and send exportGraph message
      expect(sourceCode).toMatch(/type:\s*["']exportGraph["']/);
    });
  });
});
