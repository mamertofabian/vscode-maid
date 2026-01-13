/**
 * ImpactTree component for displaying impact analysis results as an expandable tree.
 * Renders impact levels with color coding, supports expand/collapse functionality,
 * and handles click events to navigate to files.
 */

import React, { useState } from "react";
import type { DependencyImpact } from "../../types";

/**
 * Props for the ImpactTree component.
 */
export interface ImpactTreeProps {
  /** The impact analysis data to display */
  impact: DependencyImpact;
  /** Callback when a tree node is clicked for navigation */
  onNodeClick: (filePath: string, nodeType: string) => void;
  /** Set of expanded node IDs (controlled mode) */
  expandedNodes?: Set<string>;
  /** Callback when a node is toggled (controlled mode) */
  onToggleNode?: (nodeId: string) => void;
}

/**
 * Represents a node in the impact tree structure.
 */
export interface ImpactTreeNode {
  /** Unique identifier for the node */
  id: string;
  /** Display label for the node */
  label: string;
  /** Type of node (file, manifest, artifact, root) */
  type: string;
  /** Impact severity level */
  level: "high" | "medium" | "low";
  /** Child nodes in the tree */
  children: ImpactTreeNode[];
  /** File path for navigation (if applicable) */
  filePath?: string;
}

/**
 * Build the impact tree structure from DependencyImpact data.
 * Transforms the flat impact data into a hierarchical tree structure.
 */
export function buildImpactTree(impact: DependencyImpact): ImpactTreeNode[] {
  const rootNodes: ImpactTreeNode[] = [];

  // Add affected files as children
  if (impact.affectedFiles.length > 0) {
    const fileNode: ImpactTreeNode = {
      id: "files",
      label: `Affected Files (${impact.affectedFiles.length})`,
      type: "category",
      level: impact.severity,
      children: impact.affectedFiles.map((file, index) => ({
        id: `file-${index}`,
        label: file.split("/").pop() || file,
        type: "file",
        level: impact.severity,
        children: [],
        filePath: file,
      })),
    };
    rootNodes.push(fileNode);
  }

  // Add affected manifests as children
  if (impact.affectedManifests.length > 0) {
    const manifestNode: ImpactTreeNode = {
      id: "manifests",
      label: `Affected Manifests (${impact.affectedManifests.length})`,
      type: "category",
      level: impact.severity,
      children: impact.affectedManifests.map((manifest, index) => ({
        id: `manifest-${index}`,
        label: manifest.split("/").pop() || manifest,
        type: "manifest",
        level: impact.severity,
        children: [],
        filePath: manifest,
      })),
    };
    rootNodes.push(manifestNode);
  }

  // Add affected artifacts as children
  if (impact.affectedArtifacts.length > 0) {
    const artifactNode: ImpactTreeNode = {
      id: "artifacts",
      label: `Affected Artifacts (${impact.affectedArtifacts.length})`,
      type: "category",
      level: impact.severity,
      children: impact.affectedArtifacts.map((artifact, index) => ({
        id: `artifact-${index}`,
        label: artifact,
        type: "artifact",
        level: impact.severity,
        children: [],
      })),
    };
    rootNodes.push(artifactNode);
  }

  return rootNodes;
}

/**
 * Get the icon character for a node type.
 */
export function getNodeIcon(type: string): string {
  switch (type) {
    case "file":
      return "F";
    case "manifest":
      return "M";
    case "artifact":
      return "A";
    case "category":
      return "C";
    case "root":
      return "R";
    default:
      return "?";
  }
}

/**
 * Get the color for an impact level.
 */
export function getLevelColor(level: number | string): string {
  if (typeof level === "string") {
    switch (level) {
      case "high":
        return "var(--vscode-errorForeground, #F44336)";
      case "medium":
        return "var(--vscode-warningForeground, #FF9800)";
      case "low":
        return "var(--vscode-successForeground, #4CAF50)";
      default:
        return "var(--vscode-foreground, #CCCCCC)";
    }
  }
  // Handle numeric levels
  if (level >= 3) {
    return "var(--vscode-errorForeground, #F44336)";
  } else if (level >= 2) {
    return "var(--vscode-warningForeground, #FF9800)";
  } else {
    return "var(--vscode-successForeground, #4CAF50)";
  }
}

/**
 * Recursive tree node renderer component.
 * @private
 */
interface _TreeNodeRendererProps {
  node: ImpactTreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onNodeClick: (filePath: string, nodeType: string) => void;
}

const _TreeNodeRenderer: React.FC<_TreeNodeRendererProps> = ({
  node,
  level,
  expandedNodes,
  onToggle,
  onNodeClick,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const indentStyle = { paddingLeft: `${level * 16}px` };

  const _handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  const _handleClick = () => {
    if (node.filePath) {
      onNodeClick(node.filePath, node.type);
    }
  };

  return (
    <li className="impact-tree-node" role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className="impact-tree-node-content"
        style={indentStyle}
        onClick={_handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            _handleClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={node.label}
      >
        {hasChildren && (
          <button
            className="impact-tree-toggle"
            onClick={_handleToggle}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "-" : "+"}
          </button>
        )}
        {!hasChildren && <span className="impact-tree-toggle-placeholder" />}
        <span
          className="impact-tree-icon"
          data-type={node.type}
          style={{ color: getLevelColor(node.level) }}
        >
          {getNodeIcon(node.type)}
        </span>
        <span className="impact-tree-label">{node.label}</span>
      </div>
      {hasChildren && isExpanded && (
        <ul className="impact-tree-children" role="group">
          {node.children.map((child) => (
            <_TreeNodeRenderer
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onNodeClick={onNodeClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * ImpactTree component for displaying impact analysis as an expandable tree.
 */
const ImpactTree: React.FC<ImpactTreeProps> = ({
  impact,
  onNodeClick,
  expandedNodes: controlledExpandedNodes,
  onToggleNode,
}) => {
  // Internal state for uncontrolled mode
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<Set<string>>(
    new Set(["files", "manifests", "artifacts"])
  );

  // Use controlled or uncontrolled mode
  const expandedNodes = controlledExpandedNodes ?? internalExpandedNodes;
  const _handleToggle = onToggleNode ?? ((nodeId: string) => {
    setInternalExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  });

  const treeNodes = buildImpactTree(impact);

  if (treeNodes.length === 0) {
    return (
      <div className="impact-tree impact-tree-empty">
        <p>No impact data available.</p>
      </div>
    );
  }

  return (
    <div className="impact-tree" data-severity={impact.severity}>
      <div className="impact-tree-header">
        <h3 className="impact-tree-title">
          Impact Analysis: {impact.artifactId}
        </h3>
        <span
          className="impact-tree-severity"
          style={{ color: getLevelColor(impact.severity) }}
        >
          Severity: {impact.severity}
        </span>
        <span className="impact-tree-total">
          Total Impact: {impact.totalImpact}
        </span>
      </div>
      <ul className="impact-tree-root" role="tree" aria-label="Impact analysis tree">
        {treeNodes.map((node) => (
          <_TreeNodeRenderer
            key={node.id}
            node={node}
            level={0}
            expandedNodes={expandedNodes}
            onToggle={_handleToggle}
            onNodeClick={onNodeClick}
          />
        ))}
      </ul>
    </div>
  );
};

export { ImpactTree };
export default ImpactTree;
