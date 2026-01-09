/**
 * Card showing validation status of all manifests.
 */

import React from "react";
import Card from "../shared/Card";
import type { ManifestSummary } from "../../types";

interface ValidationCardProps {
  manifests: ManifestSummary[];
  onOpenManifest: (path: string) => void;
  onValidateManifest: (path: string) => void;
}

const ValidationCard: React.FC<ValidationCardProps> = ({
  manifests,
  onOpenManifest,
  onValidateManifest,
}) => {
  // Sort manifests: errors first, then warnings, then valid
  const sortedManifests = [...manifests].sort((a, b) => {
    if (a.errorCount !== b.errorCount) return b.errorCount - a.errorCount;
    if (a.warningCount !== b.warningCount) return b.warningCount - a.warningCount;
    return a.name.localeCompare(b.name);
  });

  const getStatusIcon = (manifest: ManifestSummary): string => {
    if (manifest.errorCount > 0) return "X";
    if (manifest.warningCount > 0) return "!";
    return "V";
  };

  const getStatusClass = (manifest: ManifestSummary): string => {
    if (manifest.errorCount > 0) return "error";
    if (manifest.warningCount > 0) return "warning";
    return "success";
  };

  return (
    <Card
      title="Validation Status"
      icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12zm-.5-9h1v4h-1V5zm0 5h1v1h-1v-1z" />
        </svg>
      }
      className="validation-card"
    >
      {manifests.length === 0 ? (
        <p className="empty-message">No manifests found in workspace</p>
      ) : (
        <div className="manifest-list">
          {sortedManifests.map((manifest) => (
            <div key={manifest.path} className="manifest-item">
              <div
                className={`status-indicator ${getStatusClass(manifest)}`}
                title={
                  manifest.isValid
                    ? "Valid"
                    : `${manifest.errorCount} errors, ${manifest.warningCount} warnings`
                }
              >
                {getStatusIcon(manifest)}
              </div>
              <div className="manifest-info" onClick={() => onOpenManifest(manifest.path)}>
                <span className="manifest-name">{manifest.name}</span>
                {manifest.goal && (
                  <span className="manifest-goal" title={manifest.goal}>
                    {manifest.goal}
                  </span>
                )}
              </div>
              <div className="manifest-stats">
                {manifest.errorCount > 0 && (
                  <span className="stat-badge error">{manifest.errorCount}</span>
                )}
                {manifest.warningCount > 0 && (
                  <span className="stat-badge warning">{manifest.warningCount}</span>
                )}
              </div>
              <button
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidateManifest(manifest.path);
                }}
                title="Validate manifest"
              >
                V
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ValidationCard;
