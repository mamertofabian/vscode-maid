/**
 * Behavioral tests for task-019-visual-architecture-types.manifest
 *
 * Goal: Add Visual Architecture Studio type definitions for hierarchical views,
 * impact analysis, graph layouts, filtering, system metrics, and manifest designer state.
 *
 * These tests verify that the 6 new interfaces are properly defined and usable.
 * TypeScript compilation ensures type safety; these tests verify structure and behavior.
 */

import { describe, it, expect } from "vitest";
import type {
  HierarchicalNode,
  DependencyImpact,
  GraphLayout,
  FilterConfig,
  SystemMetrics,
  ManifestDesignerState,
  GraphNodeType,
  ExpectedArtifact,
  ValidationError,
} from "../src/types";

describe("HierarchicalNode", () => {
  it("should create a valid HierarchicalNode with all required properties", () => {
    const node: HierarchicalNode = {
      id: "node-1",
      name: "Root Module",
      type: "module",
      level: 0,
      parent: null,
      children: [],
      metrics: {
        manifestCount: 5,
        fileCount: 10,
        artifactCount: 25,
        errorCount: 0,
      },
    };

    expect(node.id).toBe("node-1");
    expect(node.name).toBe("Root Module");
    expect(node.type).toBe("module");
    expect(node.level).toBe(0);
    expect(node.parent).toBeNull();
    expect(node.children).toEqual([]);
    expect(node.metrics.manifestCount).toBe(5);
    expect(node.metrics.fileCount).toBe(10);
    expect(node.metrics.artifactCount).toBe(25);
    expect(node.metrics.errorCount).toBe(0);
  });

  it("should support nested children hierarchy", () => {
    const childNode: HierarchicalNode = {
      id: "child-1",
      name: "Child Module",
      type: "file",
      level: 1,
      parent: "parent-1",
      children: [],
      metrics: {
        manifestCount: 1,
        fileCount: 2,
        artifactCount: 5,
        errorCount: 1,
      },
    };

    const parentNode: HierarchicalNode = {
      id: "parent-1",
      name: "Parent Module",
      type: "manifest",
      level: 0,
      parent: null,
      children: [childNode],
      metrics: {
        manifestCount: 2,
        fileCount: 3,
        artifactCount: 10,
        errorCount: 1,
      },
    };

    expect(parentNode.children).toHaveLength(1);
    expect(parentNode.children[0].id).toBe("child-1");
    expect(parentNode.children[0].parent).toBe("parent-1");
    expect(parentNode.children[0].level).toBe(1);
  });

  it("should support all GraphNodeType values for type property", () => {
    const nodeTypes: GraphNodeType[] = ["manifest", "file", "module", "artifact"];

    nodeTypes.forEach((nodeType, index) => {
      const node: HierarchicalNode = {
        id: `node-${index}`,
        name: `Node ${index}`,
        type: nodeType,
        level: index,
        parent: null,
        children: [],
        metrics: {
          manifestCount: 0,
          fileCount: 0,
          artifactCount: 0,
          errorCount: 0,
        },
      };
      expect(node.type).toBe(nodeType);
    });
  });
});

describe("DependencyImpact", () => {
  it("should create a valid DependencyImpact with all required properties", () => {
    const impact: DependencyImpact = {
      artifactId: "src/utils.ts::formatDate",
      affectedFiles: ["src/components/DatePicker.ts", "src/views/Calendar.ts"],
      affectedManifests: ["manifests/task-001.manifest.json"],
      affectedArtifacts: ["DatePicker::formatDisplay", "Calendar::renderDate"],
      severity: "high",
      totalImpact: 5,
    };

    expect(impact.artifactId).toBe("src/utils.ts::formatDate");
    expect(impact.affectedFiles).toHaveLength(2);
    expect(impact.affectedManifests).toHaveLength(1);
    expect(impact.affectedArtifacts).toHaveLength(2);
    expect(impact.severity).toBe("high");
    expect(impact.totalImpact).toBe(5);
  });

  it("should support all severity levels", () => {
    const severities: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

    severities.forEach((sev) => {
      const impact: DependencyImpact = {
        artifactId: "test-artifact",
        affectedFiles: [],
        affectedManifests: [],
        affectedArtifacts: [],
        severity: sev,
        totalImpact: 0,
      };
      expect(impact.severity).toBe(sev);
    });
  });

  it("should handle empty arrays for no dependencies", () => {
    const impact: DependencyImpact = {
      artifactId: "isolated-artifact",
      affectedFiles: [],
      affectedManifests: [],
      affectedArtifacts: [],
      severity: "low",
      totalImpact: 0,
    };

    expect(impact.affectedFiles).toEqual([]);
    expect(impact.affectedManifests).toEqual([]);
    expect(impact.affectedArtifacts).toEqual([]);
    expect(impact.totalImpact).toBe(0);
  });
});

describe("GraphLayout", () => {
  it("should create a valid GraphLayout with hierarchical type", () => {
    const layout: GraphLayout = {
      type: "hierarchical",
      options: {
        direction: "TB",
        levelSeparation: 100,
        nodeSpacing: 50,
      },
    };

    expect(layout.type).toBe("hierarchical");
    expect(layout.options).toBeDefined();
    expect(layout.options.direction).toBe("TB");
    expect(layout.options.levelSeparation).toBe(100);
  });

  it("should support all layout types", () => {
    const layoutTypes: Array<"hierarchical" | "force-directed" | "circular" | "timeline"> = [
      "hierarchical",
      "force-directed",
      "circular",
      "timeline",
    ];

    layoutTypes.forEach((layoutType) => {
      const layout: GraphLayout = {
        type: layoutType,
        options: {},
      };
      expect(layout.type).toBe(layoutType);
    });
  });

  it("should allow empty options object", () => {
    const layout: GraphLayout = {
      type: "force-directed",
      options: {},
    };

    expect(layout.type).toBe("force-directed");
    expect(layout.options).toEqual({});
  });

  it("should allow arbitrary options for different layout types", () => {
    const forceDirectedLayout: GraphLayout = {
      type: "force-directed",
      options: {
        strength: -100,
        distance: 200,
        center: { x: 0, y: 0 },
      },
    };

    const timelineLayout: GraphLayout = {
      type: "timeline",
      options: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        groupBy: "month",
      },
    };

    expect(forceDirectedLayout.options.strength).toBe(-100);
    expect(timelineLayout.options.groupBy).toBe("month");
  });
});

describe("FilterConfig", () => {
  it("should create a valid FilterConfig with all properties", () => {
    const filter: FilterConfig = {
      nodeTypes: ["manifest", "file"],
      searchQuery: "utils",
      moduleFilter: "src/components",
      taskTypeFilter: "edit",
      filePatternFilter: "*.ts",
    };

    expect(filter.nodeTypes).toEqual(["manifest", "file"]);
    expect(filter.searchQuery).toBe("utils");
    expect(filter.moduleFilter).toBe("src/components");
    expect(filter.taskTypeFilter).toBe("edit");
    expect(filter.filePatternFilter).toBe("*.ts");
  });

  it("should support null values for optional filters", () => {
    const filter: FilterConfig = {
      nodeTypes: ["artifact"],
      searchQuery: "",
      moduleFilter: null,
      taskTypeFilter: null,
      filePatternFilter: null,
    };

    expect(filter.nodeTypes).toEqual(["artifact"]);
    expect(filter.searchQuery).toBe("");
    expect(filter.moduleFilter).toBeNull();
    expect(filter.taskTypeFilter).toBeNull();
    expect(filter.filePatternFilter).toBeNull();
  });

  it("should support all GraphNodeType values in nodeTypes array", () => {
    const allNodeTypes: GraphNodeType[] = ["manifest", "file", "module", "artifact"];

    const filter: FilterConfig = {
      nodeTypes: allNodeTypes,
      searchQuery: "",
      moduleFilter: null,
      taskTypeFilter: null,
      filePatternFilter: null,
    };

    expect(filter.nodeTypes).toHaveLength(4);
    expect(filter.nodeTypes).toContain("manifest");
    expect(filter.nodeTypes).toContain("file");
    expect(filter.nodeTypes).toContain("module");
    expect(filter.nodeTypes).toContain("artifact");
  });

  it("should allow empty nodeTypes array", () => {
    const filter: FilterConfig = {
      nodeTypes: [],
      searchQuery: "",
      moduleFilter: null,
      taskTypeFilter: null,
      filePatternFilter: null,
    };

    expect(filter.nodeTypes).toEqual([]);
  });
});

describe("SystemMetrics", () => {
  it("should create a valid SystemMetrics with all required properties", () => {
    const metrics: SystemMetrics = {
      totalManifests: 50,
      validManifests: 45,
      errorCount: 5,
      warningCount: 10,
      fileTracking: {
        undeclared: 3,
        registered: 7,
        tracked: 40,
      },
      coverage: 0.85,
    };

    expect(metrics.totalManifests).toBe(50);
    expect(metrics.validManifests).toBe(45);
    expect(metrics.errorCount).toBe(5);
    expect(metrics.warningCount).toBe(10);
    expect(metrics.fileTracking.undeclared).toBe(3);
    expect(metrics.fileTracking.registered).toBe(7);
    expect(metrics.fileTracking.tracked).toBe(40);
    expect(metrics.coverage).toBe(0.85);
  });

  it("should calculate correct coverage ratio", () => {
    const metrics: SystemMetrics = {
      totalManifests: 100,
      validManifests: 75,
      errorCount: 25,
      warningCount: 0,
      fileTracking: {
        undeclared: 0,
        registered: 0,
        tracked: 100,
      },
      coverage: 0.75,
    };

    expect(metrics.coverage).toBe(metrics.validManifests / metrics.totalManifests);
  });

  it("should handle zero values for empty project", () => {
    const metrics: SystemMetrics = {
      totalManifests: 0,
      validManifests: 0,
      errorCount: 0,
      warningCount: 0,
      fileTracking: {
        undeclared: 0,
        registered: 0,
        tracked: 0,
      },
      coverage: 0,
    };

    expect(metrics.totalManifests).toBe(0);
    expect(metrics.coverage).toBe(0);
  });

  it("should allow coverage values between 0 and 1", () => {
    const fullCoverage: SystemMetrics = {
      totalManifests: 10,
      validManifests: 10,
      errorCount: 0,
      warningCount: 0,
      fileTracking: { undeclared: 0, registered: 0, tracked: 10 },
      coverage: 1.0,
    };

    const noCoverage: SystemMetrics = {
      totalManifests: 10,
      validManifests: 0,
      errorCount: 10,
      warningCount: 5,
      fileTracking: { undeclared: 10, registered: 0, tracked: 0 },
      coverage: 0,
    };

    expect(fullCoverage.coverage).toBe(1.0);
    expect(noCoverage.coverage).toBe(0);
  });
});

describe("ManifestDesignerState", () => {
  it("should create a valid ManifestDesignerState with all required properties", () => {
    const artifact: ExpectedArtifact = {
      file: "src/utils.ts",
      contains: [{ type: "function", name: "formatDate" }],
    };

    const validationError: ValidationError = {
      code: "E301",
      message: "Artifact not found",
      severity: "error",
    };

    const state: ManifestDesignerState = {
      goal: "Implement date formatting utilities",
      taskType: "create",
      creatableFiles: ["src/utils.ts"],
      editableFiles: [],
      readonlyFiles: ["src/types.ts"],
      expectedArtifacts: [artifact],
      validationCommand: ["npm", "test", "--", "tests/utils.test.ts"],
      isDirty: true,
      validationErrors: [validationError],
    };

    expect(state.goal).toBe("Implement date formatting utilities");
    expect(state.taskType).toBe("create");
    expect(state.creatableFiles).toEqual(["src/utils.ts"]);
    expect(state.editableFiles).toEqual([]);
    expect(state.readonlyFiles).toEqual(["src/types.ts"]);
    expect(state.expectedArtifacts).toHaveLength(1);
    expect(state.validationCommand).toEqual(["npm", "test", "--", "tests/utils.test.ts"]);
    expect(state.isDirty).toBe(true);
    expect(state.validationErrors).toHaveLength(1);
  });

  it("should support different taskType values", () => {
    const taskTypes = ["create", "edit", "refactor"];

    taskTypes.forEach((taskType) => {
      const state: ManifestDesignerState = {
        goal: "Test goal",
        taskType: taskType as "create" | "edit" | "refactor" | "snapshot",
        creatableFiles: [],
        editableFiles: [],
        readonlyFiles: [],
        expectedArtifacts: [],
        validationCommand: [],
        isDirty: false,
        validationErrors: [],
      };
      expect(state.taskType).toBe(taskType);
    });
  });

  it("should represent a clean state with no errors", () => {
    const cleanState: ManifestDesignerState = {
      goal: "Add new feature",
      taskType: "edit",
      creatableFiles: [],
      editableFiles: ["src/feature.ts"],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: ["npm", "test"],
      isDirty: false,
      validationErrors: [],
    };

    expect(cleanState.isDirty).toBe(false);
    expect(cleanState.validationErrors).toHaveLength(0);
  });

  it("should handle multiple files in each category", () => {
    const state: ManifestDesignerState = {
      goal: "Major refactoring",
      taskType: "refactor",
      creatableFiles: ["src/new1.ts", "src/new2.ts"],
      editableFiles: ["src/existing1.ts", "src/existing2.ts", "src/existing3.ts"],
      readonlyFiles: ["src/types.ts", "src/constants.ts"],
      expectedArtifacts: [],
      validationCommand: ["npm", "test"],
      isDirty: true,
      validationErrors: [],
    };

    expect(state.creatableFiles).toHaveLength(2);
    expect(state.editableFiles).toHaveLength(3);
    expect(state.readonlyFiles).toHaveLength(2);
  });

  it("should handle multiple validation errors", () => {
    const errors: ValidationError[] = [
      { code: "E001", message: "File not found", severity: "error" },
      { code: "E301", message: "Artifact mismatch", severity: "error" },
      { code: "W001", message: "Unused import", severity: "warning" },
    ];

    const state: ManifestDesignerState = {
      goal: "Broken manifest",
      taskType: "edit",
      creatableFiles: [],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: true,
      validationErrors: errors,
    };

    expect(state.validationErrors).toHaveLength(3);
    expect(state.validationErrors.filter((e) => e.severity === "error")).toHaveLength(2);
    expect(state.validationErrors.filter((e) => e.severity === "warning")).toHaveLength(1);
  });

  it("should handle complex expectedArtifacts", () => {
    const artifacts: ExpectedArtifact[] = [
      {
        file: "src/utils.ts",
        contains: [
          { type: "function", name: "formatDate", args: [{ name: "date", type: "Date" }] },
          { type: "function", name: "parseDate", args: [{ name: "str", type: "string" }] },
        ],
      },
      {
        file: "src/validators.ts",
        contains: [{ type: "class", name: "DateValidator" }],
      },
    ];

    const state: ManifestDesignerState = {
      goal: "Add date utilities",
      taskType: "create",
      creatableFiles: ["src/utils.ts", "src/validators.ts"],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: artifacts,
      validationCommand: ["npm", "test"],
      isDirty: false,
      validationErrors: [],
    };

    expect(state.expectedArtifacts).toHaveLength(2);
    expect(state.expectedArtifacts[0].contains).toHaveLength(2);
    expect(state.expectedArtifacts[1].contains).toHaveLength(1);
  });
});
