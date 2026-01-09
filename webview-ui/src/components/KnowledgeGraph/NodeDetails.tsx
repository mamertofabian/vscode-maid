/**
 * Panel showing details of the selected node in the knowledge graph.
 */

import React from "react";
import type { GraphNode } from "../../types";

interface NodeDetailsProps {
  node: GraphNode;
  onClose: () => void;
  onOpenNode: (node: GraphNode) => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose, onOpenNode }) => {
  const getNodeTypeIcon = (type: string): string => {
    switch (type) {
      case "manifest":
        return "M";
      case "file":
        return "F";
      case "module":
        return "Mo";
      case "artifact":
        return "A";
      default:
        return "?";
    }
  };

  const renderAttributes = () => {
    const excludeKeys = ["id", "type", "attributes"];
    const entries = Object.entries(node).filter(
      ([key, value]) => !excludeKeys.includes(key) && value != null
    );

    if (entries.length === 0) return null;

    return (
      <div className="node-attributes">
        <h4>Attributes</h4>
        <dl>
          {entries.map(([key, value]) => (
            <div key={key} className="attribute-row">
              <dt>{formatKey(key)}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (str) => str.toUpperCase());
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const canOpen = node.path != null;

  return (
    <div className="node-details">
      <div className="node-details-header">
        <div className="node-type-badge" data-type={node.type}>
          {getNodeTypeIcon(node.type)}
        </div>
        <div className="node-title">
          <h3>{node.name || node.path?.split("/").pop() || node.id}</h3>
          <span className="node-type-label">{node.type}</span>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="node-details-content">
        {node.goal && (
          <div className="node-goal">
            <h4>Goal</h4>
            <p>{node.goal}</p>
          </div>
        )}

        {node.path && (
          <div className="node-path">
            <h4>Path</h4>
            <p className="path-value">{node.path}</p>
          </div>
        )}

        {node.signature && (
          <div className="node-signature">
            <h4>Signature</h4>
            <code>{node.signature}</code>
          </div>
        )}

        {renderAttributes()}
      </div>

      {canOpen && (
        <div className="node-details-footer">
          <button className="open-button" onClick={() => onOpenNode(node)}>
            Open {node.type === "manifest" ? "Manifest" : "File"}
          </button>
        </div>
      )}
    </div>
  );
};

export default NodeDetails;
