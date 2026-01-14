/**
 * ImpactAnalysis component - standalone page that handles VS Code messaging.
 * Shows target file, loading/error states, impact severity, and affected items.
 */

import React, { useEffect, useState } from "react";
import { useVsCodeMessages, useSendMessage } from "../../hooks/useVsCodeApi";
import type { ExtensionToWebviewMessage, ImpactAnalysisData } from "../../types";
import Spinner from "../shared/Spinner";

/**
 * Props for the ImpactAnalysis component (optional - for standalone use).
 */
export interface ImpactAnalysisProps {
  // Optional props - component manages its own state when used standalone
  targetFile?: string;
  impact?: ImpactAnalysisData["impact"];
  isLoading?: boolean;
  error?: string | null;
  onFileClick?: (filePath: string) => void;
  onManifestClick?: (manifestPath: string) => void;
  onRefresh?: () => void;
}

/**
 * Get the color associated with a severity level.
 */
export const getSeverityColor = (severity: string): string => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "#dc2626"; // Red 600
    case "high":
      return "#ea580c"; // Orange 600
    case "medium":
      return "#d97706"; // Amber 600
    case "low":
      return "#65a30d"; // Lime 600
    case "warning":
      return "#ca8a04"; // Yellow 600
    default:
      return "#6b7280"; // Gray 500
  }
};

/**
 * Format an impact count for display.
 */
export const formatImpactCount = (count: number): string => {
  if (count === 0) {
    return "None";
  }
  if (count === 1) {
    return "1 item";
  }
  return `${count} items`;
};

/**
 * ImpactAnalysis component - standalone page for impact analysis.
 */
export const ImpactAnalysis: React.FC<ImpactAnalysisProps> = () => {
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  const [targetFile, setTargetFile] = useState<string>("");
  const [impact, setImpact] = useState<ImpactAnalysisData["impact"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle messages from the extension
  useEffect(() => {
    if (!message) return;

    const msg = message as ExtensionToWebviewMessage;
    switch (msg.type) {
      case "impactData":
        setTargetFile(msg.payload.targetFile);
        setImpact(msg.payload.impact);
        setIsLoading(msg.payload.loading);
        setError(msg.payload.error);
        break;
      case "loading":
        setIsLoading(msg.payload.isLoading);
        break;
      case "error":
        setError(msg.payload.message);
        setIsLoading(false);
        break;
    }
  }, [message]);

  // Signal ready to extension on mount
  useEffect(() => {
    sendMessage({ type: "ready" });
  }, [sendMessage]);

  const _handleRefresh = () => {
    setIsLoading(true);
    sendMessage({ type: "refresh" });
  };

  const _handleFileClick = (filePath: string) => {
    sendMessage({ type: "openFile", payload: { filePath } });
  };

  const _handleManifestClick = (manifestPath: string) => {
    sendMessage({ type: "openManifest", payload: { manifestPath } });
  };

  const _handleAnalyzeFile = () => {
    // Request file selection and analysis
    sendMessage({ type: "analyzeImpact", payload: { filePath: "" } });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="impact-analysis impact-analysis--loading">
        <div className="impact-analysis-header">
          <h2>Impact Analysis</h2>
        </div>
        <Spinner message={targetFile ? `Analyzing ${targetFile}...` : "Loading impact analysis..."} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="impact-analysis impact-analysis--error">
        <div className="impact-analysis-header">
          <h2>Impact Analysis</h2>
        </div>
        <div className="impact-analysis-error">
          <p className="error-message">Error: {error}</p>
          <button className="btn btn-secondary" onClick={_handleRefresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no file selected
  if (!targetFile || !impact) {
    return (
      <div className="impact-analysis impact-analysis--empty">
        <div className="impact-analysis-header">
          <h2>Impact Analysis</h2>
        </div>
        <div className="impact-analysis-empty">
          <p>Select a file to analyze its dependency impact.</p>
          <button className="btn btn-primary" onClick={_handleAnalyzeFile}>
            Analyze File
          </button>
        </div>
      </div>
    );
  }

  const severityColor = getSeverityColor(impact.severity);

  return (
    <div className="impact-analysis">
      <div className="impact-analysis-header">
        <h2>Impact Analysis</h2>
        <button className="btn btn-secondary" onClick={_handleRefresh}>
          Refresh
        </button>
      </div>

      {/* Target File Section */}
      <div className="impact-analysis-target">
        <h3>Target File</h3>
        <p className="target-file-path">{targetFile}</p>
      </div>

      {/* Severity Indicator */}
      <div className="impact-analysis-severity">
        <h3>Severity</h3>
        <div
          className="severity-indicator"
          style={{ backgroundColor: severityColor }}
        >
          <span className="severity-label">{impact.severity.toUpperCase()}</span>
        </div>
        <p className="total-impact">
          Total Impact: {formatImpactCount(impact.totalImpact)}
        </p>
      </div>

      {/* Affected Files List */}
      <div className="impact-analysis-section affected-files-section">
        <h3>Affected Files ({formatImpactCount(impact.affectedFiles.length)})</h3>
        {impact.affectedFiles.length > 0 ? (
          <ul className="affected-files-list">
            {impact.affectedFiles.map((file, index) => (
              <li key={index} className="affected-file-item">
                <button
                  className="file-link"
                  onClick={() => _handleFileClick(file)}
                >
                  {file}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-items">No affected files</p>
        )}
      </div>

      {/* Affected Manifests List */}
      <div className="impact-analysis-section affected-manifests-section">
        <h3>Affected Manifests ({formatImpactCount(impact.affectedManifests.length)})</h3>
        {impact.affectedManifests.length > 0 ? (
          <ul className="affected-manifests-list">
            {impact.affectedManifests.map((manifest, index) => (
              <li key={index} className="affected-manifest-item">
                <button
                  className="manifest-link"
                  onClick={() => _handleManifestClick(manifest)}
                >
                  {manifest}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-items">No affected manifests</p>
        )}
      </div>

      {/* Affected Artifacts List */}
      <div className="impact-analysis-section affected-artifacts-section">
        <h3>Affected Artifacts ({formatImpactCount(impact.affectedArtifacts.length)})</h3>
        {impact.affectedArtifacts.length > 0 ? (
          <ul className="affected-artifacts-list">
            {impact.affectedArtifacts.map((artifact, index) => (
              <li key={index} className="affected-artifact-item">
                <span className="artifact-name">{artifact}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-items">No affected artifacts</p>
        )}
      </div>
    </div>
  );
};

export default ImpactAnalysis;
