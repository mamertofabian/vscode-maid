/**
 * Shared type definitions for the MAID webview UI.
 * These mirror the types from the extension for use in the React app.
 */

// ============================================================================
// Graph Types
// ============================================================================

export type GraphNodeType = "manifest" | "file" | "module" | "artifact";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  attributes: Record<string, unknown>;
  path?: string;
  goal?: string;
  task_type?: string;
  version?: string;
  status?: string;
  name?: string;
  package?: string;
  artifact_type?: string;
  signature?: string | null;
  parent_class?: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface KnowledgeGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface ManifestSummary {
  path: string;
  name: string;
  goal?: string;
  errorCount: number;
  warningCount: number;
  isValid: boolean;
  lastModified?: string;
}

export interface TestCoverageSummary {
  totalManifests: number;
  validManifests: number;
  passingTests: number;
  failingTests: number;
  coverage: number;
}

export interface ActivityItem {
  type: "created" | "modified" | "validated" | "error";
  message: string;
  manifestPath?: string;
  timestamp: string;
}

export interface DashboardData {
  manifests: ManifestSummary[];
  totalErrors: number;
  totalWarnings: number;
  testCoverage: TestCoverageSummary;
  recentActivity: ActivityItem[];
}

// ============================================================================
// Filter Types
// ============================================================================

export interface GraphFilters {
  showManifests: boolean;
  showFiles: boolean;
  showModules: boolean;
  showArtifacts: boolean;
  searchQuery: string;
}

// ============================================================================
// Theme Types
// ============================================================================

export interface ThemeInfo {
  kind: "light" | "dark" | "high-contrast";
}

// ============================================================================
// History Types
// ============================================================================

export interface CommitHistory {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: Date | string; // Can be Date or ISO string (will be converted to Date in component)
  message: string;
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
}

export interface HistoryPanelData {
  manifestPath: string;
  commits: CommitHistory[];
  selectedCommit?: string;
  comparingCommits?: {
    commit1: string;
    commit2: string;
  };
}

// ============================================================================
// Message Types
// ============================================================================

export type ExtensionToWebviewMessage =
  | { type: "graphData"; payload: KnowledgeGraphResult }
  | { type: "dashboardData"; payload: DashboardData }
  | { type: "historyData"; payload: HistoryPanelData }
  | { type: "commitDiff"; payload: { commitHash: string; diff: string } }
  | { type: "fileAtCommit"; payload: { commitHash: string; content: string } }
  | { type: "validationUpdate"; payload: { manifestPath: string; errorCount: number; warningCount: number } }
  | { type: "themeChanged"; payload: ThemeInfo }
  | { type: "loading"; payload: { isLoading: boolean } }
  | { type: "error"; payload: { message: string } };

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
  | { type: "compareCommits"; payload: { manifestPath: string; commitHash1: string; commitHash2: string } }
  | { type: "openAtCommit"; payload: { manifestPath: string; commitHash: string } };
