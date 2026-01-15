/**
 * TreemapRenderer component for Canvas-based treemap rendering using D3.js.
 * Visualizes hierarchical data as a treemap with configurable size metrics,
 * custom color scales, and click interaction for node selection.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import type { HierarchicalNode } from "../../../../src/types";

/**
 * Props for the TreemapRenderer component.
 *
 * @property nodes: HierarchicalNode[] - The hierarchical node data to display
 * @property width: number - Width of the canvas in pixels
 * @property height: number - Height of the canvas in pixels
 * @property onNodeClick: (node) => void - Callback when a node is clicked
 * @property metric: string - Metric used for sizing nodes
 */
export interface _TreemapRendererProps {
  /** Hierarchical node data to display */
  nodes: HierarchicalNode[];
  /** Width of the canvas in pixels */
  width: number;
  /** Height of the canvas in pixels */
  height: number;
  /** Callback when a node is clicked - onNodeClick: handler */
  onNodeClick?: (node: HierarchicalNode) => void;
  /** Metric used for sizing nodes: 'files', 'artifacts', 'errors', or 'manifests' */
  metric?: "files" | "artifacts" | "errors" | "manifests";
  /** Optional color scale function */
  colorScale?: (value: number) => string;
  /** Currently selected node ID */
  selectedNodeId?: string;
  /** Optional CSS class name for the container */
  className?: string;
}

/**
 * D3 hierarchy data node format (private implementation detail).
 */
interface _TreemapDataNode {
  name: string;
  value?: number;
  children?: _TreemapDataNode[];
  originalNode: HierarchicalNode;
}

/**
 * Converts HierarchicalNode array to D3 hierarchy format.
 * @param nodes Array of HierarchicalNode to convert
 * @returns D3 hierarchy compatible data structure
 */
export function __buildTreemapData(nodes: HierarchicalNode[]): _TreemapDataNode {
  // Build children recursively
  function _buildChildren(nodeList: HierarchicalNode[]): _TreemapDataNode[] {
    return nodeList.map((node) => ({
      name: node.name,
      value: node.metrics.fileCount + node.metrics.artifactCount + 1,
      children:
        node.children && node.children.length > 0
          ? _buildChildren(node.children)
          : undefined,
      originalNode: node,
    }));
  }

  // Create root node with all nodes as children
  return {
    name: "root",
    children: _buildChildren(nodes),
    originalNode: {
      id: "root",
      name: "root",
      type: "module",
      level: -1,
      parent: null,
      children: nodes,
      metrics: {
        manifestCount: 0,
        fileCount: 0,
        artifactCount: 0,
        errorCount: 0,
      },
    },
  };
}

/**
 * Returns the color for a node using the provided color scale function.
 * @param node The hierarchical node to get color for
 * @param colorScale The D3 color scale function
 * @returns CSS color string
 */
export function __getNodeColor(node: HierarchicalNode, colorScale: (value: number) => string): string {
  // Use error count for color intensity (more errors = more red)
  const value = node.metrics.errorCount;
  return colorScale(value);
}

/**
 * Calculates the size value for a node based on the selected metric.
 * @param node The hierarchical node to calculate size for
 * @param metric The metric to use for sizing ('files', 'artifacts', 'errors', 'manifests')
 * @returns Numeric size value
 */
export function __calculateNodeSize(node: HierarchicalNode, metric: string): number {
  switch (metric) {
    case "files":
    case "fileCount":
      return Math.max(1, node.metrics.fileCount);
    case "artifacts":
    case "artifactCount":
      return Math.max(1, node.metrics.artifactCount);
    case "errors":
    case "errorCount":
      return Math.max(1, node.metrics.errorCount);
    case "manifests":
    case "manifestCount":
      return Math.max(1, node.metrics.manifestCount);
    default:
      // Default to combined metric
      return Math.max(
        1,
        node.metrics.fileCount +
          node.metrics.artifactCount +
          node.metrics.manifestCount
      );
  }
}

/**
 * TreemapRenderer component for Canvas-based treemap rendering using D3.js.
 * Renders hierarchical data as a treemap with configurable size metrics,
 * custom color scales, and click interaction for node selection.
 */
export const TreemapRenderer: React.FC<_TreemapRendererProps> = ({
  nodes,
  width,
  height,
  onNodeClick,
  metric = "files",
  colorScale: customColorScale,
  selectedNodeId,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<HierarchicalNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<HierarchicalNode | null>(null);
  // Store node positions for hit detection
  const nodePositionsRef = useRef<
    Array<{
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      node: HierarchicalNode;
    }>
  >([]);

  // Default color scale using D3 sequential scale
  const defaultColorScale = useCallback((value: number) => {
    const scale = d3.scaleSequential(d3.interpolateBlues).domain([0, 10]);
    return scale(Math.min(value, 10));
  }, []);

  const colorScaleToUse = customColorScale || defaultColorScale;

  // Render treemap using D3 and Canvas
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas before redraw
    ctx.clearRect(0, 0, width, height);

    // Build treemap data
    const data = _buildTreemapData(nodes);

    // Create D3 hierarchy
    const root = d3
      .hierarchy(data)
      .sum((d) => {
        if (d.originalNode) {
          return _calculateNodeSize(d.originalNode, metric);
        }
        return d.value || 1;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap<_TreemapDataNode>().size([width, height]).padding(2);

    // Apply treemap layout
    treemap(root);

    // Clear node positions
    nodePositionsRef.current = [];

    // Draw each node
    const leaves = root.leaves();
    leaves.forEach((leaf) => {
      const x0 = leaf.x0 || 0;
      const y0 = leaf.y0 || 0;
      const x1 = leaf.x1 || 0;
      const y1 = leaf.y1 || 0;
      const nodeWidth = x1 - x0;
      const nodeHeight = y1 - y0;

      const originalNode = leaf.data.originalNode;

      // Store position for hit detection
      if (originalNode && originalNode.id !== "root") {
        nodePositionsRef.current.push({
          x0,
          y0,
          x1,
          y1,
          node: originalNode,
        });
      }

      // Get fill color
      const fillColor = _getNodeColor(originalNode, colorScaleToUse);
      ctx.fillStyle = fillColor;
      ctx.fillRect(x0, y0, nodeWidth, nodeHeight);

      // Draw stroke for selected/hovered nodes
      const isSelected =
        selectedNodeId === originalNode.id ||
        selectedNode?.id === originalNode.id;
      const isHovered = hoveredNode?.id === originalNode.id;

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? "#ff0000" : "#ffcc00";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x0, y0, nodeWidth, nodeHeight);
      } else {
        // Default border
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(x0, y0, nodeWidth, nodeHeight);
      }

      // Draw text label if node is large enough
      if (nodeWidth > 30 && nodeHeight > 20) {
        ctx.fillStyle = "#000";
        ctx.font = "11px sans-serif";
        ctx.textBaseline = "top";

        // Truncate text to fit
        const maxWidth = nodeWidth - 4;
        let text = originalNode.name;
        if (ctx.measureText(text).width > maxWidth) {
          while (ctx.measureText(text + "...").width > maxWidth && text.length > 0) {
            text = text.slice(0, -1);
          }
          text += "...";
        }

        ctx.fillText(text, x0 + 2, y0 + 2);

        // Draw metric value if there's room
        if (nodeHeight > 35) {
          const metricValue = _calculateNodeSize(originalNode, metric);
          ctx.fillStyle = "#666";
          ctx.font = "10px sans-serif";
          ctx.fillText(`${metric}: ${metricValue}`, x0 + 2, y0 + 16);
        }
      }
    });
  }, [
    nodes,
    width,
    height,
    metric,
    colorScaleToUse,
    selectedNodeId,
    selectedNode,
    hoveredNode,
  ]);

  // Handle click events on canvas
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Find clicked node
      for (const pos of nodePositionsRef.current) {
        if (x >= pos.x0 && x <= pos.x1 && y >= pos.y0 && y <= pos.y1) {
          setSelectedNode(pos.node);
          // Call onNodeClick(node) callback if provided
          if (onNodeClick) {
            onNodeClick(pos.node);
          }
          return;
        }
      }
    },
    [onNodeClick]
  );

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Find hovered node
      for (const pos of nodePositionsRef.current) {
        if (x >= pos.x0 && x <= pos.x1 && y >= pos.y0 && y <= pos.y1) {
          if (hoveredNode?.id !== pos.node.id) {
            setHoveredNode(pos.node);
          }
          return;
        }
      }
      // No node under cursor
      if (hoveredNode) {
        setHoveredNode(null);
      }
    },
    [hoveredNode]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  return (
    <div className={`treemap-renderer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "pointer" }}
        aria-label="Treemap visualization"
        role="img"
      />
      {hoveredNode && (
        <div
          className="treemap-tooltip"
          style={{
            position: "absolute",
            pointerEvents: "none",
          }}
        >
          <strong>{hoveredNode.name}</strong>
          <br />
          Files: {hoveredNode.metrics.fileCount}
          <br />
          Artifacts: {hoveredNode.metrics.artifactCount}
          <br />
          Manifests: {hoveredNode.metrics.manifestCount}
          <br />
          Errors: {hoveredNode.metrics.errorCount}
        </div>
      )}
    </div>
  );
};

export default TreemapRenderer;
