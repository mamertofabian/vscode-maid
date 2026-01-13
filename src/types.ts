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
export type FileTrackingStatus = "UNDECLARED" | "REGISTERED" | "TRACKED" | "PRIVATE_IMPL";

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
 * Parsed manifest JSON structure from .manifest.json files
 */
export interface ParsedManifestJson {
  goal?: string;
  taskType?: string;
  version?: string;
  supersedes?: string[];
  creatableFiles?: string[];
  editableFiles?: string[];
  readonlyFiles?: string[];
  expectedArtifacts?: ExpectedArtifact | ExpectedArtifact[];
  validationCommand?: string[];
  tasks?: ManifestTask[];
}

/**
 * Chain information for a manifest
 */
export interface ChainInfo {
  parents: number;
  children: number;
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
  | "category"
  | "creatableFile"
  | "editableFile"
  | "readonlyFile"
  | "expectedArtifact"
  | "artifactContains"
  | "supersedes"
  | "validationCommand"
  | "testFile";

/**
 * Context value for TreeView items (used for menu visibility)
 */
export type ManifestTreeItemContext =
  | "maidManifest"
  | "maidTask"
  | "maidArtifact"
  | "maidFile"
  | "maidCategory"
  | "maidCreatableFile"
  | "maidEditableFile"
  | "maidReadonlyFile"
  | "maidExpectedArtifact"
  | "maidValidationCommand"
  | "maidTestFile";

/**
 * Expected artifact definition in a manifest
 */
export interface ExpectedArtifact {
  file: string;
  contains: ArtifactContains[];
}

/**
 * Artifact contains entry (function, class, etc.)
 */
export interface ArtifactContains {
  type: "function" | "class" | "attribute" | "method";
  name: string;
  description?: string;
  args?: Array<{ name: string; type: string }>;
  returns?: { type: string };
}

/**
 * Types for manifest index (Go to Definition / References)
 */

/**
 * Category of file reference in a manifest
 */
export type FileReferenceCategory =
  | "creatable"
  | "editable"
  | "readonly"
  | "supersedes"
  | "expectedArtifact";

/**
 * A reference to a file within a manifest
 */
export interface FileReference {
  manifestPath: string;
  category: FileReferenceCategory;
  line: number;
  column: number;
}

/**
 * A reference to an artifact within a manifest
 */
export interface ArtifactReference {
  manifestPath: string;
  filePath: string;
  artifactType: "function" | "class" | "method" | "attribute";
  artifactName: string;
  line: number;
  column: number;
}

/**
 * Indexed data for a single manifest
 */
export interface ManifestIndexEntry {
  manifestPath: string;
  goal?: string;
  referencedFiles: Map<string, FileReference[]>;
  artifacts: Map<string, ArtifactReference[]>;
  supersedes: string[];
  supersededBy: string[];
}

/**
 * Git commit history entry for a manifest file
 */
export interface CommitHistory {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * Serialized commit history (for JSON message passing)
 */
export interface SerializedCommitHistory {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string; // ISO string
  message: string;
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * History panel data
 */
export interface HistoryPanelData {
  manifestPath: string;
  commits: CommitHistory[] | SerializedCommitHistory[];
  selectedCommit?: string;
  comparingCommits?: {
    commit1: string;
    commit2: string;
  };
}

/**
 * Hierarchical node for Visual Architecture Studio hierarchical system view.
 * Represents a node in a tree structure with metrics aggregation.
 * Used for issue #82 - hierarchical system view.
 */
export interface HierarchicalNode {
  id: string;
  name: string;
  type: GraphNodeType;
  level: number;
  parent: string | null;
  children: HierarchicalNode[];
  metrics: {
    manifestCount: number;
    fileCount: number;
    artifactCount: number;
    errorCount: number;
  };
}

/**
 * Dependency impact analysis result for Visual Architecture Studio.
 * Tracks which files, manifests, and artifacts are affected by changes.
 * Used for issue #81 - impact analysis.
 */
export interface DependencyImpact {
  artifactId: string;
  affectedFiles: string[];
  affectedManifests: string[];
  affectedArtifacts: string[];
  severity: "high" | "medium" | "low";
  totalImpact: number;
}

/**
 * Graph layout configuration for Visual Architecture Studio graph explorer.
 * Supports multiple layout algorithms with customizable options.
 * Used for issue #77 - graph explorer layouts.
 */
export interface GraphLayout {
  type: "hierarchical" | "force-directed" | "circular" | "timeline";
  options: Record<string, unknown>;
}

/**
 * Filter configuration for Visual Architecture Studio advanced filtering.
 * Enables filtering nodes by type, search query, and various criteria.
 * Used for issue #77 - advanced filtering.
 */
export interface FilterConfig {
  nodeTypes: GraphNodeType[];
  searchQuery: string;
  moduleFilter: string | null;
  taskTypeFilter: string | null;
  filePatternFilter: string | null;
}

/**
 * System-wide metrics for Visual Architecture Studio dashboard.
 * Aggregates validation results and file tracking statistics.
 * Used for issue #78 - dashboard metrics.
 */
export interface SystemMetrics {
  totalManifests: number;
  validManifests: number;
  errorCount: number;
  warningCount: number;
  fileTracking: {
    undeclared: number;
    registered: number;
    tracked: number;
  };
  coverage: number;
}

/**
 * State for the Visual Architecture Studio manifest designer.
 * Tracks the current manifest being designed and its validation status.
 * Used for issue #79 - visual designer.
 */
export interface ManifestDesignerState {
  goal: string;
  taskType: "create" | "edit" | "refactor" | "snapshot";
  creatableFiles: string[];
  editableFiles: string[];
  readonlyFiles: string[];
  expectedArtifacts: ExpectedArtifact[];
  validationCommand: string[];
  isDirty: boolean;
  validationErrors: ValidationError[];
}
