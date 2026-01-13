/**
 * Manifest Chain component using vis.js for network visualization.
 * Shows manifest supersession relationships as a directed graph.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Network, Options, Data } from "vis-network";
import { DataSet } from "vis-data";
import { useVsCodeMessages, useSendMessage } from "../../hooks/useVsCodeApi";
import type { ManifestChainData, ManifestChainNode, ExtensionToWebviewMessage } from "../../types";
import Spinner from "../shared/Spinner";
import "./styles.css";

const ManifestChain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  const [chainData, setChainData] = useState<ManifestChainData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ManifestChainNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("graph");

  // Handle messages from the extension
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
      case "chainData":
        setChainData((message as ExtensionToWebviewMessage & { type: "chainData" }).payload);
        setIsLoading(false);
        setError(null);
        break;
      case "loading":
        setIsLoading((message as ExtensionToWebviewMessage & { type: "loading" }).payload.isLoading);
        break;
      case "error":
        setError((message as ExtensionToWebviewMessage & { type: "error" }).payload.message);
        setIsLoading(false);
        break;
    }
  }, [message]);

  // Initialize vis.js network
  useEffect(() => {
    if (!containerRef.current || !chainData) return;

    // Create nodes dataset
    const nodes = new DataSet(
      chainData.nodes.map((node) => {
        const isCurrent = node.path === chainData.currentManifest;
        return {
          id: node.id,
          label: node.label,
          title: node.goal || node.path,
          level: node.level,
          color: isCurrent
            ? {
                background: "#4A90D9",
                border: "#2E5C8A",
                highlight: { background: "#5BA0E9", border: "#3E6C9A" },
              }
            : node.level < 0
            ? {
                background: "#7CB342",
                border: "#558B2F",
                highlight: { background: "#8CC352", border: "#659B3F" },
              }
            : {
                background: "#FF9800",
                border: "#F57C00",
                highlight: { background: "#FFA820", border: "#F58C10" },
              },
          font: { color: "#FFFFFF", size: 14 },
          shape: "box",
        };
      })
    );

    // Create edges dataset
    const edges = new DataSet(
      chainData.edges.map((edge) => ({
        from: edge.from,
        to: edge.to,
        arrows: edge.arrows,
        label: edge.label || "",
        color: { color: "#808080", highlight: "#404040" },
        font: { align: "middle", size: 12 },
      }))
    );

    const data: Data = { nodes, edges };

    // Network options
    const options: Options = {
      layout: {
        hierarchical: {
          direction: "UD", // Up-Down layout
          sortMethod: "directed",
          levelSeparation: 150,
          nodeSpacing: 200,
          treeSpacing: 300,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      },
      physics: {
        enabled: false, // Disable physics for hierarchical layout
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        width: 2,
        smooth: {
          type: "continuous",
          roundness: 0.5,
        },
      },
    };

    // Create network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Handle node click
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const node = chainData.nodes.find((n) => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
          sendMessage({
            type: "openManifest",
            payload: { manifestPath: node.path },
          });
        }
      } else {
        setSelectedNode(null);
      }
    });

    // Handle double click to set as current manifest
    network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as string;
        const node = chainData.nodes.find((n) => n.id === nodeId);
        if (node) {
          sendMessage({
            type: "setManifest",
            payload: { manifestPath: node.path },
          });
        }
      }
    });

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [chainData, sendMessage]);

  const handleRefresh = () => {
    setIsLoading(true);
    sendMessage({ type: "refresh" });
  };

  /**
   * Toggle between graph and timeline view modes.
   */
  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
  };

  /**
   * Calculate and return chain statistics including depth and breadth.
   */
  const getChainStatistics = () => {
    if (!chainData || chainData.nodes.length === 0) {
      return {
        depth: 0,
        breadth: 0,
        totalNodes: 0,
        parentCount: 0,
        childCount: 0,
      };
    }

    const nodes = chainData.nodes;

    // Calculate depth: range of levels
    const levels = nodes.map((n) => n.level);
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const depth = maxLevel - minLevel + 1;

    // Calculate breadth: maximum nodes at any single level
    const levelCounts = new Map<number, number>();
    for (const node of nodes) {
      const count = levelCounts.get(node.level) || 0;
      levelCounts.set(node.level, count + 1);
    }
    const breadth = Math.max(...levelCounts.values());

    // Count parents and children
    const parentCount = nodes.filter((n) => n.level < 0).length;
    const childCount = nodes.filter((n) => n.level > 0).length;

    return {
      depth,
      breadth,
      totalNodes: nodes.length,
      parentCount,
      childCount,
    };
  };

  if (error) {
    return (
      <div className="manifest-chain-error">
        <p>Error loading manifest chain:</p>
        <p className="error-message">{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className="manifest-chain-container">
      <div className="manifest-chain-header">
        <h2>Manifest Chain</h2>
        <div className="manifest-chain-controls">
          <button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="manifest-chain-loading">
          <Spinner />
          <p>Loading manifest chain...</p>
        </div>
      )}

      {!isLoading && chainData && (
        <>
          <div className="manifest-chain-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: "#4A90D9" }}></div>
              <span>Current Manifest</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: "#7CB342" }}></div>
              <span>Parent Manifests (Superseded By)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: "#FF9800" }}></div>
              <span>Child Manifests (Supersedes)</span>
            </div>
            <div className="legend-hint">
              <span>Click to open manifest • Double-click to set as current</span>
            </div>
          </div>

          <div ref={containerRef} className="manifest-chain-network" />

          {selectedNode && (
            <div className="manifest-chain-details">
              <h3>{selectedNode.label}</h3>
              <p className="manifest-path">{selectedNode.path}</p>
              {selectedNode.goal && <p className="manifest-goal">{selectedNode.goal}</p>}
            </div>
          )}
        </>
      )}

      {!isLoading && !chainData && (
        <div className="manifest-chain-empty">
          <p>No manifest chain data available.</p>
          <p>Please open a manifest file to view its chain.</p>
        </div>
      )}
    </div>
  );
};

export default ManifestChain;
