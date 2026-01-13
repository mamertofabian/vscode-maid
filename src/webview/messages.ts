/**
 * Message types for communication between extension and webview panels.
 */

import type {
  GraphNodeType,
  KnowledgeGraphResult,
  ManifestInfo,
  CommitHistory,
  HistoryPanelData,
  HierarchicalNode,
  DependencyImpact,
  GraphLayout,
  ManifestDesignerState,
} from "../types";
import type { ManifestChainData } from "./manifestChainPanel";

/**
 * Graph filter options for the Knowledge Graph Visualizer
 */
export interface GraphFilters {
  showManifests: boolean;
  showFiles: boolean;
  showModules: boolean;
  showArtifacts: boolean;
  searchQuery: string;
}

/**
 * Dashboard data aggregated from various MAID sources
 */
export interface DashboardData {
  manifests: ManifestSummary[];
  totalErrors: number;
  totalWarnings: number;
  testCoverage: TestCoverageSummary;
  recentActivity: ActivityItem[];
}

/**
 * Summary of a single manifest for the dashboard
 */
export interface ManifestSummary {
  path: string;
  name: string;
  goal?: string;
  errorCount: number;
  warningCount: number;
  isValid: boolean;
  lastModified?: string;
}

/**
 * Test coverage summary for the dashboard
 */
export interface TestCoverageSummary {
  totalManifests: number;
  validManifests: number;
  passingTests: number;
  failingTests: number;
  coverage: number; // 0-100 percentage
}

/**
 * Activity item for the recent activity feed
 */
export interface ActivityItem {
  type: "created" | "modified" | "validated" | "error";
  message: string;
  manifestPath?: string;
  timestamp: string;
}

/**
 * Theme information from VS Code
 */
export interface ThemeInfo {
  kind: "light" | "dark" | "high-contrast";
}

/**
 * Data for the hierarchical system view panel (#82)
 */
export interface HierarchicalViewData {
  nodes: HierarchicalNode[];
  rootId: string;
  currentLevel: number;
  selectedNodeId: string | null;
}

/**
 * Data for the impact analysis panel (#81)
 */
export interface ImpactAnalysisData {
  targetFile: string;
  impact: DependencyImpact | null;
  loading: boolean;
  error: string | null;
}

/**
 * Data for the manifest designer panel (#79)
 */
export interface ManifestDesignerData {
  state: ManifestDesignerState;
  availableFiles: string[];
  recentManifests: string[];
}

/**
 * Payload for layout change requests (#77)
 */
export interface LayoutChangePayload {
  layout: GraphLayout;
  animate: boolean;
}

/**
 * Payload for graph export requests (#77)
 */
export interface ExportPayload {
  format: "png" | "svg" | "json" | "dot";
  filename: string | null;
}

// ============================================================================
// Extension -> Webview Messages
// ============================================================================

export type ExtensionToWebviewMessage =
  | { type: "graphData"; payload: KnowledgeGraphResult }
  | { type: "dashboardData"; payload: DashboardData }
  | { type: "historyData"; payload: HistoryPanelData }
  | { type: "chainData"; payload: ManifestChainData }
  | { type: "commitDiff"; payload: { commitHash: string; diff: string } }
  | { type: "fileAtCommit"; payload: { commitHash: string; content: string } }
  | {
      type: "validationUpdate";
      payload: { manifestPath: string; errorCount: number; warningCount: number };
    }
  | { type: "themeChanged"; payload: ThemeInfo }
  | { type: "loading"; payload: { isLoading: boolean } }
  | { type: "error"; payload: { message: string } }
  | { type: "hierarchicalData"; payload: HierarchicalViewData }
  | { type: "impactData"; payload: ImpactAnalysisData }
  | { type: "designerData"; payload: ManifestDesignerData }
  | { type: "layoutChanged"; payload: { layout: GraphLayout } }
  | { type: "exportReady"; payload: { format: string; data: string } };

// ============================================================================
// Webview -> Extension Messages
// ============================================================================

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "nodeClick"; payload: { nodeId: string; nodeType: GraphNodeType } }
  | { type: "openFile"; payload: { filePath: string } }
  | { type: "openManifest"; payload: { manifestPath: string } }
  | { type: "runValidation"; payload: { manifestPath?: string } }
  | { type: "filterChange"; payload: { filters: GraphFilters } }
  | { type: "runTests"; payload: { manifestPath?: string } }
  | { type: "loadHistory"; payload: { manifestPath: string } }
  | { type: "loadCommit"; payload: { manifestPath: string; commitHash: string } }
  | {
      type: "compareCommits";
      payload: { manifestPath: string; commitHash1: string; commitHash2: string };
    }
  | { type: "openAtCommit"; payload: { manifestPath: string; commitHash: string } }
  | { type: "setManifest"; payload: { manifestPath: string } }
  | { type: "changeLayout"; payload: LayoutChangePayload }
  | { type: "exportGraph"; payload: ExportPayload }
  | { type: "analyzeImpact"; payload: { filePath: string } }
  | { type: "saveManifest"; payload: { state: ManifestDesignerState } }
  | { type: "validateDesigner"; payload: { state: ManifestDesignerState } }
  | { type: "selectHierarchyNode"; payload: { nodeId: string } }
  | { type: "drillDown"; payload: { nodeId: string } }
  | { type: "drillUp"; payload: Record<string, never> };
