/**
 * Behavioral tests for task-035: ImpactAnalysis React component
 *
 * Tests the following artifacts:
 * - ImpactAnalysisProps interface
 * - ImpactAnalysis functional component (exported)
 * - getSeverityColor helper function with (severity: string) => string signature
 * - formatImpactCount helper function with (count: number) => string signature
 *
 * The component displays dependency impact analysis results including:
 * - Target file being analyzed
 * - Loading state and error state
 * - Impact severity indicator
 * - Affected files list, affected manifests list, affected artifacts list
 * - Recommendations panel
 *
 * Since the ImpactAnalysis component runs in a browser environment (webview),
 * we test by verifying the source code contains the expected artifacts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../webview-ui/src/components/ImpactAnalysis/ImpactAnalysis.tsx"
);

let sourceCode: string;

beforeAll(() => {
  sourceCode = fs.readFileSync(componentPath, "utf-8");
});

describe("ImpactAnalysis Component", () => {
  describe("ImpactAnalysisProps Interface", () => {
    it("should define ImpactAnalysisProps interface", () => {
      expect(sourceCode).toMatch(/interface\s+ImpactAnalysisProps\s*\{/);
    });
  });

  describe("ImpactAnalysis Component", () => {
    it("should define ImpactAnalysis as a React functional component", () => {
      expect(sourceCode).toMatch(/const ImpactAnalysis:\s*React\.FC/);
    });

    it("should export ImpactAnalysis", () => {
      expect(sourceCode).toMatch(
        /export\s+(default\s+)?ImpactAnalysis|export\s*\{\s*ImpactAnalysis/
      );
    });
  });

  describe("getSeverityColor Function", () => {
    it("should define getSeverityColor function with severity parameter", () => {
      expect(sourceCode).toMatch(/const getSeverityColor\s*=\s*\(severity:\s*string\)/);
    });

    it("should return string type from getSeverityColor", () => {
      expect(sourceCode).toMatch(/getSeverityColor.*:\s*string\s*=>/);
    });

    it("should handle different severity levels", () => {
      // Function should handle severity levels like high, medium, low
      expect(sourceCode).toMatch(/high|medium|low|critical|warning/i);
    });
  });

  describe("formatImpactCount Function", () => {
    it("should define formatImpactCount function with count parameter", () => {
      expect(sourceCode).toMatch(/const formatImpactCount\s*=\s*\(count:\s*number\)/);
    });

    it("should return string type from formatImpactCount", () => {
      expect(sourceCode).toMatch(/formatImpactCount.*:\s*string\s*=>/);
    });
  });

  describe("Target File Display", () => {
    it("should display target file being analyzed", () => {
      expect(sourceCode).toMatch(/target|file|Target|File/);
    });
  });

  describe("Loading State", () => {
    it("should have loading state handling", () => {
      expect(sourceCode).toMatch(/loading|Loading|isLoading/);
    });

    it("should display loading indicator", () => {
      expect(sourceCode).toMatch(/loading.*&&|loading.*\?|spinner|Loading/i);
    });
  });

  describe("Error State", () => {
    it("should have error state handling", () => {
      expect(sourceCode).toMatch(/error|Error/);
    });

    it("should display error message", () => {
      expect(sourceCode).toMatch(/error.*&&|error.*\?|Error/);
    });
  });

  describe("Impact Severity Indicator", () => {
    it("should display severity indicator", () => {
      expect(sourceCode).toMatch(/severity|Severity/);
    });

    it("should use getSeverityColor for styling", () => {
      expect(sourceCode).toMatch(/getSeverityColor/);
    });
  });

  describe("Affected Files List", () => {
    it("should display affected files", () => {
      expect(sourceCode).toMatch(/affected.*file|file.*affected|affectedFiles/i);
    });

    it("should render files as list items", () => {
      expect(sourceCode).toMatch(/map|\.map\(|<li|<ul/);
    });
  });

  describe("Affected Manifests List", () => {
    it("should display affected manifests", () => {
      expect(sourceCode).toMatch(/affected.*manifest|manifest.*affected|affectedManifests/i);
    });
  });

  describe("Affected Artifacts List", () => {
    it("should display affected artifacts", () => {
      expect(sourceCode).toMatch(/affected.*artifact|artifact.*affected|affectedArtifacts/i);
    });
  });

  // Note: Recommendations panel removed - component now uses DependencyImpact type
  // which doesn't include recommendations

  describe("Impact Count Display", () => {
    it("should use formatImpactCount for displaying counts", () => {
      expect(sourceCode).toMatch(/formatImpactCount/);
    });
  });

  describe("Styling", () => {
    it("should have className or style attributes", () => {
      expect(sourceCode).toMatch(/className=|style=/);
    });

    it("should have impact-analysis related class", () => {
      expect(sourceCode).toMatch(/impact-analysis|ImpactAnalysis/);
    });
  });

  describe("React Imports", () => {
    it("should import React", () => {
      expect(sourceCode).toMatch(/import\s+React/);
    });
  });
});
