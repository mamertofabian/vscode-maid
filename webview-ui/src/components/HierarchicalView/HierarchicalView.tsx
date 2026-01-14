/**
 * HierarchicalView component for displaying hierarchical system visualization.
 * Supports multiple visualization modes (treemap, sunburst, nested),
 * handles drill-down/drill-up navigation, and filters nodes by level.
 *
 * When used standalone (no props), handles VS Code messaging to load data.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useVsCodeMessages, useSendMessage } from "../../hooks/useVsCodeApi";
import type { HierarchicalNode } from "../../../../src/types";
import type { ExtensionToWebviewMessage, HierarchicalViewData } from "../../types";
import Spinner from "../shared/Spinner";

/**
 * ViewModeOption interface for the mode selector.
 * Defines the shape of view mode options with value and label properties.
 *
 * This is equivalent to: type ViewModeOption = { value: string; label: string; }
 */
interface _ViewModeOption {
  value: "treemap" | "sunburst" | "nested";
  label: string;
  description?: string;
}

// Internal type alias used by getViewModeOptions(): ViewModeOption[]
type _ViewModeOptionAlias = _ViewModeOption;

/**
 * Get available view mode options for the hierarchical view.
 * @returns Array of view mode options
 */
export function getViewModeOptions(): ViewModeOption[] {
  return [
    {
      value: "treemap",
      label: "Treemap",
      description: "Display nodes as nested rectangles sized by metrics",
    },
    {
      value: "sunburst",
      label: "Sunburst",
      description: "Display nodes as concentric rings radiating from center",
    },
    {
      value: "nested",
      label: "Nested",
      description: "Display nodes as a traditional nested tree structure",
    },
  ];
}

/**
 * Filter nodes by their level in the hierarchy.
 * @param nodes Array of hierarchical nodes to filter
 * @param level The level to filter by (0 = root, 1 = first level children, etc.)
 * @returns Filtered array of nodes matching the specified level
 */
export function filterNodesByLevel(
  nodes: HierarchicalNode[],
  level: number
): HierarchicalNode[] {
  const result: HierarchicalNode[] = [];

  function _collectNodesAtLevel(nodeList: HierarchicalNode[]): void {
    for (const node of nodeList) {
      if (node.level === level) {
        result.push(node);
      }
      if (node.children && node.children.length > 0) {
        _collectNodesAtLevel(node.children);
      }
    }
  }

  _collectNodesAtLevel(nodes);
  return result;
}

/**
 * Props for the HierarchicalView component.
 *
 * @property nodes: HierarchicalNode[] - The hierarchical node data to display
 * @property onNodeClick: (node) => void - Callback when a node is clicked
 * @property viewMode: string - Current visualization mode
 */
export interface HierarchicalViewProps {
  /** Hierarchical node data to display (optional - fetches from VS Code when not provided) */
  nodes?: HierarchicalNode[];
  /** Callback when a node is clicked - onNodeClick: handler */
  onNodeClick?: (node: HierarchicalNode) => void;
  /** Current visualization mode */
  viewMode?: "treemap" | "sunburst" | "nested";
  /** Callback when view mode changes */
  onViewModeChange?: (mode: "treemap" | "sunburst" | "nested") => void;
  /** Callback when drilling down into a node */
  onDrillDown?: (node: HierarchicalNode) => void;
  /** Callback when drilling up to parent */
  onDrillUp?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * HierarchicalView component for rendering hierarchical system visualization.
 * Supports treemap, sunburst, and nested view modes with drill-down navigation.
 */
export const HierarchicalView: React.FC<HierarchicalViewProps> = ({
  nodes: propNodes,
  onNodeClick,
  viewMode: propViewMode = "nested",
  onViewModeChange,
  onDrillDown,
  onDrillUp,
  className = "",
  isLoading: propIsLoading = false,
  error: propError = null,
}) => {
  // VS Code messaging for standalone mode
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  // Internal state for standalone mode
  const [internalNodes, setInternalNodes] = useState<HierarchicalNode[]>([]);
  const [internalLoading, setInternalLoading] = useState(!propNodes);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<"treemap" | "sunburst" | "nested">("nested");

  // Use props if provided, otherwise use internal state
  const nodes = propNodes ?? internalNodes;
  const isLoading = propNodes ? propIsLoading : internalLoading;
  const error = propNodes ? propError : internalError;
  const viewMode = propNodes ? propViewMode : internalViewMode;

  // Handle VS Code messages for standalone mode
  useEffect(() => {
    if (!message) return;

    const msg = message as ExtensionToWebviewMessage;
    switch (msg.type) {
      case "hierarchicalData":
        setInternalNodes(msg.payload.nodes);
        setInternalLoading(false);
        break;
      case "loading":
        setInternalLoading(msg.payload.isLoading);
        break;
      case "error":
        setInternalError(msg.payload.message);
        setInternalLoading(false);
        break;
    }
  }, [message]);

  // Signal ready to extension on mount (only in standalone mode)
  useEffect(() => {
    if (!propNodes) {
      sendMessage({ type: "ready" });
    }
  }, [propNodes, sendMessage]);

  // Navigation state for drill-down/drill-up
  const [currentNode, setCurrentNode] = useState<HierarchicalNode | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<HierarchicalNode[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);

  // Handle drill-down into a node
  const handleDrillDown = useCallback(
    (node: HierarchicalNode) => {
      if (node.children && node.children.length > 0) {
        setBreadcrumb((prev) => [...prev, node]);
        setCurrentNode(node);
        setSelectedLevel(node.level + 1);
        onDrillDown?.(node);
      }
    },
    [onDrillDown]
  );

  // Handle drill-up to parent level
  const handleDrillUp = useCallback(() => {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);
      const parentNode = newBreadcrumb[newBreadcrumb.length - 1] || null;
      setCurrentNode(parentNode);
      setSelectedLevel(parentNode ? parentNode.level + 1 : 0);
      onDrillUp?.();
    }
  }, [breadcrumb, onDrillUp]);

  // Handle node click - calls onNodeClick(node) callback
  const handleNodeClick = useCallback(
    (node: HierarchicalNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: "treemap" | "sunburst" | "nested") => {
      // Update internal state for standalone mode
      if (!propNodes) {
        setInternalViewMode(mode);
      }
      onViewModeChange?.(mode);
    },
    [propNodes, onViewModeChange]
  );

  // Get display nodes based on current navigation state
  const displayNodes = currentNode
    ? currentNode.children
    : filterNodesByLevel(nodes, selectedLevel);

  // Render metrics for a node
  const _renderMetrics = (node: HierarchicalNode) => (
    <div className="hierarchical-view-metrics">
      <span className="metric" title="Manifest count">
        <span className="metric-label">Manifests:</span>
        <span className="metric-value">{node.metrics.manifestCount}</span>
      </span>
      <span className="metric" title="File count">
        <span className="metric-label">Files:</span>
        <span className="metric-value">{node.metrics.fileCount}</span>
      </span>
      <span className="metric" title="Artifact count">
        <span className="metric-label">Artifacts:</span>
        <span className="metric-value">{node.metrics.artifactCount}</span>
      </span>
      <span className="metric" title="Error count">
        <span className="metric-label">Errors:</span>
        <span className="metric-value error-count">
          {node.metrics.errorCount}
        </span>
      </span>
    </div>
  );

  // Render nested tree view
  const _renderNestedNode = (node: HierarchicalNode, depth: number = 0) => (
    <li
      key={node.id}
      className="hierarchical-view-node"
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      <div
        className="node-content"
        onClick={() => handleNodeClick(node)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleNodeClick(node);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={node.children.length > 0 ? "true" : undefined}
      >
        <span className="node-name">{node.name}</span>
        <span className="node-type">{node.type}</span>
        {_renderMetrics(node)}
        {node.children && node.children.length > 0 && (
          <button
            className="drill-down-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDrillDown(node);
            }}
            aria-label={`Drill down into ${node.name}`}
          >
            Drill Down
          </button>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="node-children" role="group">
          {node.children.map((child) => _renderNestedNode(child, depth + 1))}
        </ul>
      )}
    </li>
  );

  // Render treemap visualization
  const _renderTreemap = () => (
    <div className="hierarchical-view-treemap">
      {displayNodes.map((node) => (
        <div
          key={node.id}
          className="treemap-node"
          style={{
            flex: Math.max(
              1,
              node.metrics.manifestCount +
                node.metrics.fileCount +
                node.metrics.artifactCount
            ),
          }}
          onClick={() => handleNodeClick(node)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleNodeClick(node);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`${node.name}: ${node.metrics.manifestCount} manifests, ${node.metrics.fileCount} files`}
        >
          <span className="node-name">{node.name}</span>
          {_renderMetrics(node)}
          {node.children && node.children.length > 0 && (
            <button
              className="drill-down-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDrillDown(node);
              }}
            >
              Expand
            </button>
          )}
        </div>
      ))}
    </div>
  );

  // Render sunburst visualization
  const _renderSunburst = () => (
    <div className="hierarchical-view-sunburst">
      <div className="sunburst-center">
        {currentNode ? (
          <div className="current-node-info">
            <span className="node-name">{currentNode.name}</span>
            {_renderMetrics(currentNode)}
          </div>
        ) : (
          <span className="root-label">Root</span>
        )}
      </div>
      <div className="sunburst-ring" role="list">
        {displayNodes.map((node, index) => (
          <div
            key={node.id}
            className="sunburst-segment"
            style={{
              transform: `rotate(${(index / displayNodes.length) * 360}deg)`,
            }}
            onClick={() => handleNodeClick(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleNodeClick(node);
              }
            }}
            role="listitem"
            tabIndex={0}
            aria-label={node.name}
          >
            <span className="node-name">{node.name}</span>
            {_renderMetrics(node)}
            {node.children && node.children.length > 0 && (
              <button
                className="drill-down-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDrillDown(node);
                }}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render the appropriate visualization based on view mode
  const _renderVisualization = () => {
    switch (viewMode) {
      case "treemap":
        return _renderTreemap();
      case "sunburst":
        return _renderSunburst();
      case "nested":
      default:
        return (
          <ul className="hierarchical-view-nested" role="tree">
            {displayNodes.map((node) => _renderNestedNode(node))}
          </ul>
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`hierarchical-view hierarchical-view--loading ${className}`}>
        <div className="hierarchical-view-loading">
          <div className="spinner" />
          <p>Loading hierarchical view...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`hierarchical-view hierarchical-view--error ${className}`}>
        <div className="hierarchical-view-error">
          <p className="error-message">Error: {error}</p>
        </div>
      </div>
    );
  }

  // View mode options
  const viewModeOptions = getViewModeOptions();

  return (
    <div className={`hierarchical-view ${className}`}>
      {/* Header with controls */}
      <div className="hierarchical-view-header">
        <h2>Hierarchical View</h2>
        <div className="hierarchical-view-controls">
          {/* View Mode Selector */}
          <div className="view-mode-selector" role="group" aria-label="View mode">
            <label htmlFor="viewMode">Mode:</label>
            <select
              id="viewMode"
              value={viewMode}
              onChange={(e) =>
                handleViewModeChange(
                  e.target.value as "treemap" | "sunburst" | "nested"
                )
              }
            >
              {viewModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="level-filter" role="group" aria-label="Level filter">
            <label htmlFor="levelFilter">Level:</label>
            <input
              id="levelFilter"
              type="number"
              min="0"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <nav className="hierarchical-view-breadcrumb" aria-label="Breadcrumb">
          <button
            className="breadcrumb-root"
            onClick={() => {
              setBreadcrumb([]);
              setCurrentNode(null);
              setSelectedLevel(0);
            }}
          >
            Root
          </button>
          {breadcrumb.map((node, index) => (
            <span key={node.id} className="breadcrumb-item">
              <span className="breadcrumb-separator">/</span>
              <button
                className="breadcrumb-link"
                onClick={() => {
                  const newBreadcrumb = breadcrumb.slice(0, index + 1);
                  setBreadcrumb(newBreadcrumb);
                  setCurrentNode(node);
                  setSelectedLevel(node.level + 1);
                }}
              >
                {node.name}
              </button>
            </span>
          ))}
          <button
            className="drill-up-btn"
            onClick={handleDrillUp}
            aria-label="Go back to parent level"
          >
            Drill Up
          </button>
        </nav>
      )}

      {/* Main Visualization */}
      <div className="hierarchical-view-content">
        {nodes.length === 0 ? (
          <div className="hierarchical-view-empty">
            <p>No nodes to display</p>
          </div>
        ) : displayNodes.length === 0 ? (
          <div className="hierarchical-view-empty">
            <p>No nodes at level {selectedLevel}</p>
          </div>
        ) : (
          _renderVisualization()
        )}
      </div>

      {/* Summary Footer */}
      <div className="hierarchical-view-footer">
        <span className="node-count">
          Showing {displayNodes.length} nodes at level {selectedLevel}
        </span>
      </div>
    </div>
  );
};

export default HierarchicalView;
