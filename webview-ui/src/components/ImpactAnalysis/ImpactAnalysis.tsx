/**
 * ImpactAnalysis component for displaying dependency impact analysis results.
 * Shows target file, loading/error states, impact severity, and affected items.
 */

import React from "react";

/**
 * Affected file entry with impact details.
 */
interface _AffectedFile {
  path: string;
  impactLevel?: string;
}

/**
 * Affected manifest entry.
 */
interface _AffectedManifest {
  path: string;
  name?: string;
}

/**
 * Affected artifact entry.
 */
interface _AffectedArtifact {
  name: string;
  type: string;
  file?: string;
}

/**
 * Recommendation entry.
 */
interface _Recommendation {
  id: string;
  message: string;
  priority?: "high" | "medium" | "low";
}

/**
 * Impact analysis result data.
 */
interface _ImpactData {
  targetFile: string;
  severity: "critical" | "high" | "medium" | "low" | "warning";
  affectedFiles: _AffectedFile[];
  affectedManifests: _AffectedManifest[];
  affectedArtifacts: _AffectedArtifact[];
  recommendations: _Recommendation[];
  totalImpact: number;
}

/**
 * Props for the ImpactAnalysis component.
 */
export interface ImpactAnalysisProps {
  targetFile: string;
  impact: _ImpactData | null;
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
  switch (severity.toLowerCase()) {
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
 * ImpactAnalysis component displays dependency impact analysis results.
 * Shows the target file being analyzed, impact severity, affected files/manifests/artifacts,
 * and provides recommendations.
 */
export const ImpactAnalysis: React.FC<ImpactAnalysisProps> = ({
  targetFile,
  impact,
  isLoading = false,
  error = null,
  onFileClick,
  onManifestClick,
  onRefresh,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="impact-analysis impact-analysis--loading">
        <div className="impact-analysis-header">
          <h2>Impact Analysis</h2>
        </div>
        <div className="impact-analysis-loading">
          <div className="spinner"></div>
          <p>Loading impact analysis for {targetFile}...</p>
        </div>
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
          {onRefresh && (
            <button className="btn btn-secondary" onClick={onRefresh}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Null impact state
  if (!impact) {
    return (
      <div className="impact-analysis impact-analysis--empty">
        <div className="impact-analysis-header">
          <h2>Impact Analysis</h2>
        </div>
        <div className="impact-analysis-empty">
          <p>No impact data available for file: {targetFile}</p>
        </div>
      </div>
    );
  }

  const severityColor = getSeverityColor(impact.severity);

  return (
    <div className="impact-analysis">
      <div className="impact-analysis-header">
        <h2>Impact Analysis</h2>
        {onRefresh && (
          <button className="btn btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>

      {/* Target File Section */}
      <div className="impact-analysis-target">
        <h3>Target File</h3>
        <p className="target-file-path">{impact.targetFile}</p>
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
                  onClick={() => onFileClick?.(file.path)}
                >
                  {file.path}
                </button>
                {file.impactLevel && (
                  <span className="impact-level">{file.impactLevel}</span>
                )}
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
                  onClick={() => onManifestClick?.(manifest.path)}
                >
                  {manifest.name || manifest.path}
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
                <span className="artifact-type">{artifact.type}</span>
                <span className="artifact-name">{artifact.name}</span>
                {artifact.file && (
                  <span className="artifact-file">in {artifact.file}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-items">No affected artifacts</p>
        )}
      </div>

      {/* Recommendations Panel */}
      <div className="impact-analysis-section recommendations-panel">
        <h3>Recommendations ({formatImpactCount(impact.recommendations.length)})</h3>
        {impact.recommendations.length > 0 ? (
          <ul className="recommendations-list">
            {impact.recommendations.map((recommendation) => (
              <li
                key={recommendation.id}
                className={`recommendation-item ${recommendation.priority ? `priority-${recommendation.priority}` : ""}`}
              >
                {recommendation.priority && (
                  <span
                    className="recommendation-priority"
                    style={{ color: getSeverityColor(recommendation.priority) }}
                  >
                    [{recommendation.priority.toUpperCase()}]
                  </span>
                )}
                <span className="recommendation-message">{recommendation.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-items">No recommendations</p>
        )}
      </div>
    </div>
  );
};

export default ImpactAnalysis;
