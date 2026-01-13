/**
 * Behavioral tests for task-020-visual-architecture-messages.manifest
 *
 * Goal: Add Visual Architecture Studio message types for communication
 * between extension and webview panels.
 *
 * These tests verify that the 5 new interfaces and 2 extended union types
 * are properly defined and usable.
 * TypeScript compilation ensures type safety; these tests verify structure and behavior.
 */

import { describe, it, expect } from "vitest";
import type {
  HierarchicalViewData,
  ImpactAnalysisData,
  ManifestDesignerData,
  LayoutChangePayload,
  ExportPayload,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "../src/webview/messages";
import type {
  HierarchicalNode,
  DependencyImpact,
  GraphLayout,
  ManifestDesignerState,
  ValidationError,
  ExpectedArtifact,
} from "../src/types";

// ============================================================================
// HierarchicalViewData Tests
// ============================================================================

describe("HierarchicalViewData", () => {
  it("should create a valid HierarchicalViewData with all required properties", () => {
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

    const viewData: HierarchicalViewData = {
      nodes: [node],
      rootId: "node-1",
      currentLevel: 0,
      selectedNodeId: null,
    };

    expect(viewData.nodes).toHaveLength(1);
    expect(viewData.nodes[0].id).toBe("node-1");
    expect(viewData.rootId).toBe("node-1");
    expect(viewData.currentLevel).toBe(0);
    expect(viewData.selectedNodeId).toBeNull();
  });

  it("should support multiple nodes with nested hierarchy", () => {
    const childNode: HierarchicalNode = {
      id: "child-1",
      name: "Child Module",
      type: "file",
      level: 1,
      parent: "root-1",
      children: [],
      metrics: {
        manifestCount: 1,
        fileCount: 2,
        artifactCount: 5,
        errorCount: 0,
      },
    };

    const rootNode: HierarchicalNode = {
      id: "root-1",
      name: "Root Module",
      type: "module",
      level: 0,
      parent: null,
      children: [childNode],
      metrics: {
        manifestCount: 3,
        fileCount: 5,
        artifactCount: 10,
        errorCount: 1,
      },
    };

    const viewData: HierarchicalViewData = {
      nodes: [rootNode, childNode],
      rootId: "root-1",
      currentLevel: 0,
      selectedNodeId: "child-1",
    };

    expect(viewData.nodes).toHaveLength(2);
    expect(viewData.rootId).toBe("root-1");
    expect(viewData.selectedNodeId).toBe("child-1");
    expect(viewData.nodes[0].children).toHaveLength(1);
    expect(viewData.nodes[0].children[0].id).toBe("child-1");
  });

  it("should support different current levels for drill-down navigation", () => {
    const node: HierarchicalNode = {
      id: "node-1",
      name: "Deep Module",
      type: "artifact",
      level: 3,
      parent: "level-2-node",
      children: [],
      metrics: { manifestCount: 0, fileCount: 0, artifactCount: 1, errorCount: 0 },
    };

    const viewData: HierarchicalViewData = {
      nodes: [node],
      rootId: "level-2-node",
      currentLevel: 3,
      selectedNodeId: "node-1",
    };

    expect(viewData.currentLevel).toBe(3);
    expect(viewData.selectedNodeId).toBe("node-1");
  });

  it("should allow empty nodes array for uninitialized state", () => {
    const viewData: HierarchicalViewData = {
      nodes: [],
      rootId: "",
      currentLevel: 0,
      selectedNodeId: null,
    };

    expect(viewData.nodes).toEqual([]);
    expect(viewData.rootId).toBe("");
    expect(viewData.selectedNodeId).toBeNull();
  });
});

// ============================================================================
// ImpactAnalysisData Tests
// ============================================================================

describe("ImpactAnalysisData", () => {
  it("should create a valid ImpactAnalysisData with impact results", () => {
    const impact: DependencyImpact = {
      artifactId: "src/utils.ts::formatDate",
      affectedFiles: ["src/components/DatePicker.ts"],
      affectedManifests: ["manifests/task-001.manifest.json"],
      affectedArtifacts: ["DatePicker::formatDisplay"],
      severity: "high",
      totalImpact: 3,
    };

    const analysisData: ImpactAnalysisData = {
      targetFile: "src/utils.ts",
      impact: impact,
      loading: false,
      error: null,
    };

    expect(analysisData.targetFile).toBe("src/utils.ts");
    expect(analysisData.impact).not.toBeNull();
    expect(analysisData.impact!.artifactId).toBe("src/utils.ts::formatDate");
    expect(analysisData.impact!.severity).toBe("high");
    expect(analysisData.loading).toBe(false);
    expect(analysisData.error).toBeNull();
  });

  it("should represent loading state correctly", () => {
    const analysisData: ImpactAnalysisData = {
      targetFile: "src/feature.ts",
      impact: null,
      loading: true,
      error: null,
    };

    expect(analysisData.targetFile).toBe("src/feature.ts");
    expect(analysisData.impact).toBeNull();
    expect(analysisData.loading).toBe(true);
    expect(analysisData.error).toBeNull();
  });

  it("should represent error state correctly", () => {
    const analysisData: ImpactAnalysisData = {
      targetFile: "src/nonexistent.ts",
      impact: null,
      loading: false,
      error: "File not found in knowledge graph",
    };

    expect(analysisData.targetFile).toBe("src/nonexistent.ts");
    expect(analysisData.impact).toBeNull();
    expect(analysisData.loading).toBe(false);
    expect(analysisData.error).toBe("File not found in knowledge graph");
  });

  it("should support all severity levels in impact", () => {
    const severities: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

    severities.forEach((severity) => {
      const impact: DependencyImpact = {
        artifactId: "test-artifact",
        affectedFiles: [],
        affectedManifests: [],
        affectedArtifacts: [],
        severity: severity,
        totalImpact: 0,
      };

      const analysisData: ImpactAnalysisData = {
        targetFile: "test.ts",
        impact: impact,
        loading: false,
        error: null,
      };

      expect(analysisData.impact!.severity).toBe(severity);
    });
  });
});

// ============================================================================
// ManifestDesignerData Tests
// ============================================================================

describe("ManifestDesignerData", () => {
  it("should create a valid ManifestDesignerData with full state", () => {
    const artifact: ExpectedArtifact = {
      file: "src/utils.ts",
      contains: [{ type: "function", name: "formatDate" }],
    };

    const state: ManifestDesignerState = {
      goal: "Implement date utilities",
      taskType: "create",
      creatableFiles: ["src/utils.ts"],
      editableFiles: [],
      readonlyFiles: ["src/types.ts"],
      expectedArtifacts: [artifact],
      validationCommand: ["npm", "test"],
      isDirty: false,
      validationErrors: [],
    };

    const designerData: ManifestDesignerData = {
      state: state,
      availableFiles: ["src/utils.ts", "src/types.ts", "src/index.ts"],
      recentManifests: ["manifests/task-001.manifest.json", "manifests/task-002.manifest.json"],
    };

    expect(designerData.state.goal).toBe("Implement date utilities");
    expect(designerData.state.taskType).toBe("create");
    expect(designerData.availableFiles).toHaveLength(3);
    expect(designerData.recentManifests).toHaveLength(2);
  });

  it("should handle dirty state with validation errors", () => {
    const error: ValidationError = {
      code: "E301",
      message: "Artifact not found: formatDate",
      severity: "error",
    };

    const state: ManifestDesignerState = {
      goal: "Broken manifest",
      taskType: "edit",
      creatableFiles: [],
      editableFiles: ["src/feature.ts"],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: true,
      validationErrors: [error],
    };

    const designerData: ManifestDesignerData = {
      state: state,
      availableFiles: [],
      recentManifests: [],
    };

    expect(designerData.state.isDirty).toBe(true);
    expect(designerData.state.validationErrors).toHaveLength(1);
    expect(designerData.state.validationErrors[0].code).toBe("E301");
  });

  it("should support empty available files and recent manifests", () => {
    const state: ManifestDesignerState = {
      goal: "",
      taskType: "create",
      creatableFiles: [],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: false,
      validationErrors: [],
    };

    const designerData: ManifestDesignerData = {
      state: state,
      availableFiles: [],
      recentManifests: [],
    };

    expect(designerData.availableFiles).toEqual([]);
    expect(designerData.recentManifests).toEqual([]);
  });

  it("should support all task types", () => {
    const taskTypes: Array<"create" | "edit" | "refactor" | "snapshot"> = [
      "create",
      "edit",
      "refactor",
      "snapshot",
    ];

    taskTypes.forEach((taskType) => {
      const state: ManifestDesignerState = {
        goal: `Task type: ${taskType}`,
        taskType: taskType,
        creatableFiles: [],
        editableFiles: [],
        readonlyFiles: [],
        expectedArtifacts: [],
        validationCommand: [],
        isDirty: false,
        validationErrors: [],
      };

      const designerData: ManifestDesignerData = {
        state: state,
        availableFiles: [],
        recentManifests: [],
      };

      expect(designerData.state.taskType).toBe(taskType);
    });
  });
});

// ============================================================================
// LayoutChangePayload Tests
// ============================================================================

describe("LayoutChangePayload", () => {
  it("should create a valid LayoutChangePayload with animation enabled", () => {
    const layout: GraphLayout = {
      type: "hierarchical",
      options: { direction: "TB", levelSeparation: 100 },
    };

    const payload: LayoutChangePayload = {
      layout: layout,
      animate: true,
    };

    expect(payload.layout.type).toBe("hierarchical");
    expect(payload.layout.options.direction).toBe("TB");
    expect(payload.animate).toBe(true);
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

      const payload: LayoutChangePayload = {
        layout: layout,
        animate: false,
      };

      expect(payload.layout.type).toBe(layoutType);
    });
  });

  it("should support layout with complex options", () => {
    const layout: GraphLayout = {
      type: "force-directed",
      options: {
        strength: -100,
        distance: 200,
        centerForce: 0.1,
        collisionRadius: 50,
      },
    };

    const payload: LayoutChangePayload = {
      layout: layout,
      animate: true,
    };

    expect(payload.layout.options.strength).toBe(-100);
    expect(payload.layout.options.distance).toBe(200);
    expect(payload.animate).toBe(true);
  });

  it("should allow disabling animation for instant layout changes", () => {
    const layout: GraphLayout = {
      type: "circular",
      options: { radius: 300 },
    };

    const payload: LayoutChangePayload = {
      layout: layout,
      animate: false,
    };

    expect(payload.animate).toBe(false);
  });
});

// ============================================================================
// ExportPayload Tests
// ============================================================================

describe("ExportPayload", () => {
  it("should create a valid ExportPayload for PNG export", () => {
    const payload: ExportPayload = {
      format: "png",
      filename: "architecture-graph.png",
    };

    expect(payload.format).toBe("png");
    expect(payload.filename).toBe("architecture-graph.png");
  });

  it("should support all export formats", () => {
    const formats: Array<"png" | "svg" | "json" | "dot"> = ["png", "svg", "json", "dot"];

    formats.forEach((format) => {
      const payload: ExportPayload = {
        format: format,
        filename: `export.${format}`,
      };

      expect(payload.format).toBe(format);
    });
  });

  it("should allow null filename for auto-generated names", () => {
    const payload: ExportPayload = {
      format: "svg",
      filename: null,
    };

    expect(payload.format).toBe("svg");
    expect(payload.filename).toBeNull();
  });

  it("should support custom filenames with paths", () => {
    const payload: ExportPayload = {
      format: "json",
      filename: "/home/user/exports/knowledge-graph-2024.json",
    };

    expect(payload.format).toBe("json");
    expect(payload.filename).toBe("/home/user/exports/knowledge-graph-2024.json");
  });

  it("should support DOT format for Graphviz export", () => {
    const payload: ExportPayload = {
      format: "dot",
      filename: "graph.dot",
    };

    expect(payload.format).toBe("dot");
    expect(payload.filename).toBe("graph.dot");
  });
});

// ============================================================================
// ExtensionToWebviewMessage Union Type Tests
// ============================================================================

describe("ExtensionToWebviewMessage - new message types", () => {
  it("should create hierarchicalData message", () => {
    const node: HierarchicalNode = {
      id: "root",
      name: "Root",
      type: "module",
      level: 0,
      parent: null,
      children: [],
      metrics: { manifestCount: 1, fileCount: 2, artifactCount: 3, errorCount: 0 },
    };

    const viewData: HierarchicalViewData = {
      nodes: [node],
      rootId: "root",
      currentLevel: 0,
      selectedNodeId: null,
    };

    const message: ExtensionToWebviewMessage = {
      type: "hierarchicalData",
      payload: viewData,
    };

    expect(message.type).toBe("hierarchicalData");
    expect(message.payload.nodes).toHaveLength(1);
    expect(message.payload.rootId).toBe("root");
  });

  it("should create impactData message", () => {
    const impact: DependencyImpact = {
      artifactId: "src/utils.ts::helper",
      affectedFiles: ["src/app.ts"],
      affectedManifests: [],
      affectedArtifacts: [],
      severity: "medium",
      totalImpact: 1,
    };

    const analysisData: ImpactAnalysisData = {
      targetFile: "src/utils.ts",
      impact: impact,
      loading: false,
      error: null,
    };

    const message: ExtensionToWebviewMessage = {
      type: "impactData",
      payload: analysisData,
    };

    expect(message.type).toBe("impactData");
    expect(message.payload.targetFile).toBe("src/utils.ts");
    expect(message.payload.impact!.severity).toBe("medium");
  });

  it("should create designerData message", () => {
    const state: ManifestDesignerState = {
      goal: "Test goal",
      taskType: "create",
      creatableFiles: [],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: false,
      validationErrors: [],
    };

    const designerData: ManifestDesignerData = {
      state: state,
      availableFiles: ["src/index.ts"],
      recentManifests: [],
    };

    const message: ExtensionToWebviewMessage = {
      type: "designerData",
      payload: designerData,
    };

    expect(message.type).toBe("designerData");
    expect(message.payload.state.goal).toBe("Test goal");
    expect(message.payload.availableFiles).toContain("src/index.ts");
  });

  it("should create layoutChanged message", () => {
    const layout: GraphLayout = {
      type: "force-directed",
      options: { strength: -50 },
    };

    const message: ExtensionToWebviewMessage = {
      type: "layoutChanged",
      payload: { layout: layout },
    };

    expect(message.type).toBe("layoutChanged");
    expect(message.payload.layout.type).toBe("force-directed");
  });

  it("should create exportReady message", () => {
    const message: ExtensionToWebviewMessage = {
      type: "exportReady",
      payload: {
        format: "svg",
        data: "<svg>...</svg>",
      },
    };

    expect(message.type).toBe("exportReady");
    expect(message.payload.format).toBe("svg");
    expect(message.payload.data).toBe("<svg>...</svg>");
  });

  it("should discriminate between message types using type field", () => {
    const messages: ExtensionToWebviewMessage[] = [
      {
        type: "hierarchicalData",
        payload: { nodes: [], rootId: "", currentLevel: 0, selectedNodeId: null },
      },
      {
        type: "impactData",
        payload: { targetFile: "", impact: null, loading: false, error: null },
      },
      {
        type: "layoutChanged",
        payload: { layout: { type: "circular", options: {} } },
      },
    ];

    messages.forEach((msg) => {
      switch (msg.type) {
        case "hierarchicalData":
          expect(msg.payload.nodes).toBeDefined();
          expect(msg.payload.rootId).toBeDefined();
          break;
        case "impactData":
          expect(msg.payload.targetFile).toBeDefined();
          expect(msg.payload.loading).toBeDefined();
          break;
        case "layoutChanged":
          expect(msg.payload.layout).toBeDefined();
          break;
      }
    });
  });
});

// ============================================================================
// WebviewToExtensionMessage Union Type Tests
// ============================================================================

describe("WebviewToExtensionMessage - new message types", () => {
  it("should create changeLayout message", () => {
    const layout: GraphLayout = {
      type: "hierarchical",
      options: { direction: "LR" },
    };

    const payload: LayoutChangePayload = {
      layout: layout,
      animate: true,
    };

    const message: WebviewToExtensionMessage = {
      type: "changeLayout",
      payload: payload,
    };

    expect(message.type).toBe("changeLayout");
    expect(message.payload.layout.type).toBe("hierarchical");
    expect(message.payload.animate).toBe(true);
  });

  it("should create exportGraph message", () => {
    const payload: ExportPayload = {
      format: "png",
      filename: "graph.png",
    };

    const message: WebviewToExtensionMessage = {
      type: "exportGraph",
      payload: payload,
    };

    expect(message.type).toBe("exportGraph");
    expect(message.payload.format).toBe("png");
    expect(message.payload.filename).toBe("graph.png");
  });

  it("should create analyzeImpact message", () => {
    const message: WebviewToExtensionMessage = {
      type: "analyzeImpact",
      payload: { filePath: "src/utils.ts" },
    };

    expect(message.type).toBe("analyzeImpact");
    expect(message.payload.filePath).toBe("src/utils.ts");
  });

  it("should create saveManifest message", () => {
    const state: ManifestDesignerState = {
      goal: "Save this manifest",
      taskType: "edit",
      creatableFiles: [],
      editableFiles: ["src/feature.ts"],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: ["npm", "test"],
      isDirty: true,
      validationErrors: [],
    };

    const message: WebviewToExtensionMessage = {
      type: "saveManifest",
      payload: { state: state },
    };

    expect(message.type).toBe("saveManifest");
    expect(message.payload.state.goal).toBe("Save this manifest");
    expect(message.payload.state.isDirty).toBe(true);
  });

  it("should create validateDesigner message", () => {
    const state: ManifestDesignerState = {
      goal: "Validate this",
      taskType: "create",
      creatableFiles: ["src/new.ts"],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: false,
      validationErrors: [],
    };

    const message: WebviewToExtensionMessage = {
      type: "validateDesigner",
      payload: { state: state },
    };

    expect(message.type).toBe("validateDesigner");
    expect(message.payload.state.taskType).toBe("create");
  });

  it("should create selectHierarchyNode message", () => {
    const message: WebviewToExtensionMessage = {
      type: "selectHierarchyNode",
      payload: { nodeId: "node-42" },
    };

    expect(message.type).toBe("selectHierarchyNode");
    expect(message.payload.nodeId).toBe("node-42");
  });

  it("should create drillDown message", () => {
    const message: WebviewToExtensionMessage = {
      type: "drillDown",
      payload: { nodeId: "parent-node" },
    };

    expect(message.type).toBe("drillDown");
    expect(message.payload.nodeId).toBe("parent-node");
  });

  it("should create drillUp message with empty payload", () => {
    const message: WebviewToExtensionMessage = {
      type: "drillUp",
      payload: {},
    };

    expect(message.type).toBe("drillUp");
    expect(message.payload).toEqual({});
  });

  it("should discriminate between message types using type field", () => {
    const messages: WebviewToExtensionMessage[] = [
      {
        type: "changeLayout",
        payload: { layout: { type: "circular", options: {} }, animate: false },
      },
      { type: "exportGraph", payload: { format: "svg", filename: null } },
      { type: "analyzeImpact", payload: { filePath: "test.ts" } },
      { type: "selectHierarchyNode", payload: { nodeId: "node-1" } },
      { type: "drillDown", payload: { nodeId: "node-2" } },
      { type: "drillUp", payload: {} },
    ];

    const typeSet = new Set(messages.map((m) => m.type));

    expect(typeSet.has("changeLayout")).toBe(true);
    expect(typeSet.has("exportGraph")).toBe(true);
    expect(typeSet.has("analyzeImpact")).toBe(true);
    expect(typeSet.has("selectHierarchyNode")).toBe(true);
    expect(typeSet.has("drillDown")).toBe(true);
    expect(typeSet.has("drillUp")).toBe(true);

    messages.forEach((msg) => {
      switch (msg.type) {
        case "changeLayout":
          expect(msg.payload.layout).toBeDefined();
          expect(msg.payload.animate).toBeDefined();
          break;
        case "exportGraph":
          expect(msg.payload.format).toBeDefined();
          break;
        case "analyzeImpact":
          expect(msg.payload.filePath).toBeDefined();
          break;
        case "selectHierarchyNode":
          expect(msg.payload.nodeId).toBeDefined();
          break;
        case "drillDown":
          expect(msg.payload.nodeId).toBeDefined();
          break;
        case "drillUp":
          expect(msg.payload).toEqual({});
          break;
      }
    });
  });
});

// ============================================================================
// Integration Tests - Message Round Trip Scenarios
// ============================================================================

describe("Message Round Trip Scenarios", () => {
  it("should support hierarchical view workflow", () => {
    // User selects a node
    const selectMessage: WebviewToExtensionMessage = {
      type: "selectHierarchyNode",
      payload: { nodeId: "module-1" },
    };
    expect(selectMessage.type).toBe("selectHierarchyNode");

    // User drills down
    const drillDownMessage: WebviewToExtensionMessage = {
      type: "drillDown",
      payload: { nodeId: "module-1" },
    };
    expect(drillDownMessage.type).toBe("drillDown");

    // Extension sends updated hierarchical data
    const responseMessage: ExtensionToWebviewMessage = {
      type: "hierarchicalData",
      payload: {
        nodes: [],
        rootId: "module-1",
        currentLevel: 1,
        selectedNodeId: null,
      },
    };
    expect(responseMessage.payload.currentLevel).toBe(1);

    // User drills up
    const drillUpMessage: WebviewToExtensionMessage = {
      type: "drillUp",
      payload: {},
    };
    expect(drillUpMessage.type).toBe("drillUp");
  });

  it("should support layout change workflow", () => {
    // User requests layout change
    const requestMessage: WebviewToExtensionMessage = {
      type: "changeLayout",
      payload: {
        layout: { type: "force-directed", options: { strength: -100 } },
        animate: true,
      },
    };
    expect(requestMessage.payload.animate).toBe(true);

    // Extension confirms layout changed
    const responseMessage: ExtensionToWebviewMessage = {
      type: "layoutChanged",
      payload: {
        layout: { type: "force-directed", options: { strength: -100 } },
      },
    };
    expect(responseMessage.payload.layout.type).toBe("force-directed");
  });

  it("should support export workflow", () => {
    // User requests export
    const requestMessage: WebviewToExtensionMessage = {
      type: "exportGraph",
      payload: { format: "svg", filename: "my-graph.svg" },
    };
    expect(requestMessage.payload.format).toBe("svg");

    // Extension sends export data
    const responseMessage: ExtensionToWebviewMessage = {
      type: "exportReady",
      payload: { format: "svg", data: "<svg>graph content</svg>" },
    };
    expect(responseMessage.payload.data).toContain("<svg>");
  });

  it("should support manifest designer workflow", () => {
    // Extension sends initial designer state
    const initialState: ManifestDesignerState = {
      goal: "",
      taskType: "create",
      creatableFiles: [],
      editableFiles: [],
      readonlyFiles: [],
      expectedArtifacts: [],
      validationCommand: [],
      isDirty: false,
      validationErrors: [],
    };

    const initMessage: ExtensionToWebviewMessage = {
      type: "designerData",
      payload: {
        state: initialState,
        availableFiles: ["src/app.ts", "src/utils.ts"],
        recentManifests: [],
      },
    };
    expect(initMessage.payload.availableFiles).toHaveLength(2);

    // User requests validation
    const validateMessage: WebviewToExtensionMessage = {
      type: "validateDesigner",
      payload: {
        state: {
          ...initialState,
          goal: "Add new feature",
          creatableFiles: ["src/feature.ts"],
        },
      },
    };
    expect(validateMessage.payload.state.goal).toBe("Add new feature");

    // User saves manifest
    const saveMessage: WebviewToExtensionMessage = {
      type: "saveManifest",
      payload: {
        state: {
          ...initialState,
          goal: "Add new feature",
          creatableFiles: ["src/feature.ts"],
          isDirty: true,
        },
      },
    };
    expect(saveMessage.payload.state.isDirty).toBe(true);
  });

  it("should support impact analysis workflow", () => {
    // User requests impact analysis
    const requestMessage: WebviewToExtensionMessage = {
      type: "analyzeImpact",
      payload: { filePath: "src/core/utils.ts" },
    };
    expect(requestMessage.payload.filePath).toBe("src/core/utils.ts");

    // Extension sends loading state
    const loadingMessage: ExtensionToWebviewMessage = {
      type: "impactData",
      payload: {
        targetFile: "src/core/utils.ts",
        impact: null,
        loading: true,
        error: null,
      },
    };
    expect(loadingMessage.payload.loading).toBe(true);

    // Extension sends results
    const resultMessage: ExtensionToWebviewMessage = {
      type: "impactData",
      payload: {
        targetFile: "src/core/utils.ts",
        impact: {
          artifactId: "src/core/utils.ts::parseConfig",
          affectedFiles: ["src/app.ts", "src/config.ts"],
          affectedManifests: ["manifests/task-005.manifest.json"],
          affectedArtifacts: ["App::initialize", "Config::load"],
          severity: "high",
          totalImpact: 5,
        },
        loading: false,
        error: null,
      },
    };
    expect(resultMessage.payload.impact!.totalImpact).toBe(5);
    expect(resultMessage.payload.impact!.affectedFiles).toHaveLength(2);
  });
});
