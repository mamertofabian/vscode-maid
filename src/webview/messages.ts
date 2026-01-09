/**
 * Message types for communication between extension and webview panels.
 */

import type { GraphNodeType, KnowledgeGraphResult, ManifestInfo } from "../types";

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

// ============================================================================
// Extension -> Webview Messages
// ============================================================================

export type ExtensionToWebviewMessage =
  | { type: "graphData"; payload: KnowledgeGraphResult }
  | { type: "dashboardData"; payload: DashboardData }
  | { type: "validationUpdate"; payload: { manifestPath: string; errorCount: number; warningCount: number } }
  | { type: "themeChanged"; payload: ThemeInfo }
  | { type: "loading"; payload: { isLoading: boolean } }
  | { type: "error"; payload: { message: string } };

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
  | { type: "runTests"; payload: { manifestPath?: string } };
