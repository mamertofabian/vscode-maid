/**
 * Shared type definitions for the MAID VS Code extension.
 * These types represent the JSON output from MAID Runner CLI commands.
 */

/**
 * Validation error/warning from MAID Runner
 * Error codes:
 * - E0XX: File/JSON errors (E001: not found, E002: schema failed)
 * - E1XX: Semantic errors (E101: semantic, E102: supersession)
 * - E3XX: Implementation errors (E301: artifact not found, E308: alignment)
 * - E9XX: System errors
 */
export interface ValidationError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  severity: "error" | "warning" | "info";
}

/**
 * Result from `maid validate --json-output`
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata?: {
    validation_mode?: string;
    manifest_path?: string;
  };
}

/**
 * File tracking status from `maid files --json`
 */
export type FileTrackingStatus =
  | "UNDECLARED"
  | "REGISTERED"
  | "TRACKED"
  | "PRIVATE_IMPL";

/**
 * Undeclared/Registered file entry with issues
 */
export interface UndeclaredFile {
  file: string;
  status: "UNDECLARED" | "REGISTERED";
  issues: string[];
  manifests: string[];
}

/**
 * Result from `maid files --json`
 */
export interface MaidFilesResult {
  undeclared: UndeclaredFile[];
  registered: UndeclaredFile[];
  tracked: string[];
  private_impl: string[];
}

/**
 * Knowledge graph node types
 */
export type GraphNodeType = "manifest" | "file" | "module" | "artifact";

/**
 * Knowledge graph node from `maid graph export --format json`
 */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  attributes: Record<string, unknown>;
  // Manifest-specific
  path?: string;
  goal?: string;
  task_type?: string;
  version?: string;
  // File-specific
  status?: string;
  // Module-specific
  name?: string;
  package?: string;
  // Artifact-specific
  artifact_type?: string;
  signature?: string | null;
  parent_class?: string | null;
}

/**
 * Knowledge graph edge from `maid graph export --format json`
 */
export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

/**
 * Result from `maid graph export --format json`
 */
export interface KnowledgeGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Task definition within a manifest
 */
export interface ManifestTask {
  id: string;
  description?: string;
  artifacts?: string[];
  dependencies?: string[];
  status?: "pending" | "in_progress" | "completed";
}

/**
 * Manifest info from `maid manifests --json-output`
 */
export interface ManifestInfo {
  path: string;
  name?: string;
  version?: string;
  tasks?: ManifestTask[];
  files?: string[];
  valid?: boolean;
  errorCount?: number;
  warningCount?: number;
}

/**
 * Result from `maid manifests --json-output`
 */
export interface ManifestsResult {
  manifests: ManifestInfo[];
}

/**
 * Status bar display states
 */
export type StatusBarState =
  | "valid"
  | "errors"
  | "warnings"
  | "validating"
  | "not-installed"
  | "hidden";

/**
 * Log level for the output channel
 */
export type LogLevel = "info" | "warn" | "error";

/**
 * CLI command execution result
 */
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * TreeView item types for the manifest explorer
 */
export type ManifestTreeItemType =
  | "manifest"
  | "task"
  | "artifact"
  | "file"
  | "category";

/**
 * Context value for TreeView items (used for menu visibility)
 */
export type ManifestTreeItemContext =
  | "maidManifest"
  | "maidTask"
  | "maidArtifact"
  | "maidFile"
  | "maidCategory";
