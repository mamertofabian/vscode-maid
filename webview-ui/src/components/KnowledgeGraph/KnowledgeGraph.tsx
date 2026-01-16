/**
 * Main Knowledge Graph component using vis.js for network visualization.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Network, Options, Data } from "vis-network";
import { DataSet } from "vis-data";
import { useVsCodeMessages, useSendMessage, usePersistedState } from "../../hooks/useVsCodeApi";
import type { KnowledgeGraphResult, GraphNode, GraphFilters, ExtensionToWebviewMessage, GraphLayoutType } from "../../types";
import GraphControls from "./GraphControls";
import NodeDetails from "./NodeDetails";
import Spinner from "../shared/Spinner";
import "./styles.css";

const defaultFilters: GraphFilters = {
  showManifests: true,
  showFiles: true,
  showModules: true,
  showArtifacts: true,
  searchQuery: "",
};

const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  const [graphData, setGraphData] = useState<KnowledgeGraphResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = usePersistedState<GraphFilters>("graphFilters", defaultFilters);
  const [currentLayout, setCurrentLayout] = useState<string>("force-directed");

  // Handle messages from the extension
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
      case "graphData":
        setGraphData(message.payload);
        setIsLoading(false);
        setError(null);
        break;
      case "loading":
        setIsLoading(message.payload.isLoading);
        break;
      case "error":
        setError(message.payload.message);
        setIsLoading(false);
        break;
    }
  }, [message]);

  // Filter nodes based on current filters
  const filterNodes = useCallback(
    (nodes: GraphNode[]): GraphNode[] => {
      return nodes.filter((node) => {
        // Type filter
        if (node.type === "manifest" && !filters.showManifests) return false;
        if (node.type === "file" && !filters.showFiles) return false;
        if (node.type === "module" && !filters.showModules) return false;
        if (node.type === "artifact" && !filters.showArtifacts) return false;

        // Search filter
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const label = _getNodeLabel(node).toLowerCase();
          const id = node.id.toLowerCase();
          if (!label.includes(query) && !id.includes(query)) return false;
        }

        return true;
      });
    },
    [filters]
  );

  // Get the display label for a node
  const _getNodeLabel = (node: GraphNode): string => {
    switch (node.type) {
      case "manifest":
        return node.path?.split("/").pop()?.replace(".manifest.json", "") || node.id;
      case "file":
        return node.path?.split("/").pop() || node.id;
      case "module":
        return node.name || node.id;
      case "artifact":
        return node.name || node.id;
      default:
        return node.id;
    }
  };

  // Get tooltip content for a node
  const _getNodeTooltip = (node: GraphNode): string => {
    const lines: string[] = [];
    lines.push(`Type: ${node.type}`);

    if (node.path) lines.push(`Path: ${node.path}`);
    if (node.goal) lines.push(`Goal: ${node.goal}`);
    if (node.name) lines.push(`Name: ${node.name}`);
    if (node.artifact_type) lines.push(`Artifact Type: ${node.artifact_type}`);
    if (node.signature) lines.push(`Signature: ${node.signature}`);

    return lines.join("\n");
  };

  // Initialize and update the network visualization
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Wait for next frame to ensure container has dimensions
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        const filteredNodes = filterNodes(graphData.nodes);
        const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

        // Filter edges to only include those between visible nodes
        const filteredEdges = graphData.edges.filter(
          (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
        );

        const nodes = new DataSet(
          filteredNodes.map((node) => ({
            id: node.id,
            label: _getNodeLabel(node),
            group: node.type,
            title: _getNodeTooltip(node),
            // Store original node data for click handling
            originalNode: node,
          }))
        );

        const edges = new DataSet(
          filteredEdges.map((edge, index) => ({
            id: `edge-${index}`,
            from: edge.source,
            to: edge.target,
            label: edge.relation || "",
            arrows: "to",
            color: _getEdgeColor(edge.relation),
          }))
        );

        const data: Data = { nodes, edges };

        const options: Options = {
          groups: {
            manifest: {
              color: { background: "#4A90D9", border: "#2E6CB3" },
              shape: "box",
              font: { color: "#ffffff" },
            },
            file: {
              color: { background: "#7CB342", border: "#558B2F" },
              shape: "ellipse",
              font: { color: "#ffffff" },
            },
            module: {
              color: { background: "#9C27B0", border: "#7B1FA2" },
              shape: "diamond",
              font: { color: "#ffffff" },
            },
            artifact: {
              color: { background: "#FF9800", border: "#F57C00" },
              shape: "dot",
              size: 15,
              font: { color: "#ffffff" },
            },
          },
          physics: {
            enabled: true,
            stabilization: {
              enabled: true,
              iterations: 100,
              updateInterval: 25,
            },
            barnesHut: {
              gravitationalConstant: -2000,
              centralGravity: 0.3,
              springLength: 150,
              springConstant: 0.04,
            },
          },
          interaction: {
            navigationButtons: true,
            keyboard: {
              enabled: true,
              bindToWindow: false,
            },
            hover: true,
            tooltipDelay: 200,
          },
          layout: {
            improvedLayout: true,
          },
          edges: {
            smooth: {
              enabled: true,
              type: "continuous",
              roundness: 0.5,
            },
            font: {
              size: 10,
              align: "middle",
            },
          },
        };

        // Destroy existing network if it exists
        if (networkRef.current) {
          networkRef.current.destroy();
        }

        networkRef.current = new Network(containerRef.current, data, options);

        // Handle node click
        networkRef.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId) as unknown as { originalNode: GraphNode } | null;
            if (nodeData?.originalNode) {
              setSelectedNode(nodeData.originalNode);
              sendMessage({
                type: "nodeClick",
                payload: {
                  nodeId: nodeData.originalNode.id,
                  nodeType: nodeData.originalNode.type,
                },
              });
            }
          } else {
            setSelectedNode(null);
          }
        });

        // Handle double-click to open file
        networkRef.current.on("doubleClick", (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId) as unknown as { originalNode: GraphNode } | null;
            if (nodeData?.originalNode) {
              const node = nodeData.originalNode;
              if (node.path) {
                if (node.type === "manifest") {
                  sendMessage({ type: "openManifest", payload: { manifestPath: node.path } });
                } else {
                  sendMessage({ type: "openFile", payload: { filePath: node.path } });
                }
              }
            }
          }
        });
      } catch (err) {
        console.error("Error initializing vis.js network:", err);
        setError(`Failed to render graph: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData, filters, filterNodes, sendMessage]);

  // Get edge color based on relation type
  const _getEdgeColor = (relation: string | undefined): string => {
    if (!relation) return "#808080";
    switch (relation.toLowerCase()) {
      case "supersedes":
        return "#4A90D9";
      case "contains":
        return "#7CB342";
      case "implements":
      case "defines":
        return "#FF9800";
      default:
        return "#808080";
    }
  };

  const handleFilterChange = (newFilters: GraphFilters) => {
    setFilters(newFilters);
    sendMessage({ type: "filterChange", payload: { filters: newFilters } });
  };

  const handleRefresh = () => {
    setIsLoading(true);
    sendMessage({ type: "refresh" });
  };

  const handleOpenNode = (node: GraphNode) => {
    if (node.path) {
      if (node.type === "manifest") {
        sendMessage({ type: "openManifest", payload: { manifestPath: node.path } });
      } else {
        sendMessage({ type: "openFile", payload: { filePath: node.path } });
      }
    }
  };

  // Get layout options for vis.js based on layout type
  const _getLayoutOptions = (layoutType: string) => {
    switch (layoutType) {
      case "hierarchical":
        return {
          hierarchical: {
            enabled: true,
            direction: "UD",
            sortMethod: "directed",
          },
        };
      case "circular":
        return {
          hierarchical: false,
          // vis.js doesn't have native circular, use physics
        };
      default:
        return { hierarchical: false };
    }
  };

  const handleLayoutChange = (layoutType: GraphLayoutType) => {
    setCurrentLayout(layoutType);
    sendMessage({
      type: "changeLayout",
      payload: {
        layout: { type: layoutType, options: {} },
        animate: true,
      },
    });

    // Update vis.js network layout
    if (networkRef.current) {
      const layoutOptions = _getLayoutOptions(layoutType);
      networkRef.current.setOptions({ layout: layoutOptions });
    }
  };

  const handleExport = (format: "json" | "dot" | "png" | "svg") => {
    sendMessage({
      type: "exportGraph",
      payload: { format, filename: null },
    });
  };

  if (error) {
    return (
      <div className="knowledge-graph-error">
        <p>Error loading knowledge graph:</p>
        <p className="error-message">{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className="knowledge-graph-container">
      <GraphControls
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        nodeCount={graphData?.nodes.length || 0}
        edgeCount={graphData?.edges.length || 0}
      />
      <div className="knowledge-graph-main">
        <div className="network-container">
          {isLoading && <Spinner message="Loading knowledge graph..." />}
          <div
            ref={containerRef}
            className="network-canvas"
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        </div>
        {selectedNode && (
          <NodeDetails
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onOpenNode={handleOpenNode}
          />
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
