/**
 * Commit details component showing commit information and diff.
 */

import React from "react";
import type { CommitHistory } from "../../types";
import Card from "../shared/Card";
import "./styles.css";

interface CommitDetailsProps {
  commit: CommitHistory;
  diff: string | null;
  onOpenAtCommit: (commitHash: string) => void;
}

const CommitDetails: React.FC<CommitDetailsProps> = ({
  commit,
  diff,
  onOpenAtCommit,
}) => {
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(dateObj);
  };

  const formatDiff = (diffText: string): string => {
    // Simple diff formatting - could be enhanced with syntax highlighting
    return diffText;
  };

  return (
    <Card title="Commit Details">
      <div className="commit-details">
        <div className="commit-info">
          <div className="info-row">
            <span className="info-label">Hash:</span>
            <span className="info-value">{commit.hash}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Author:</span>
            <span className="info-value">
              {commit.author} &lt;{commit.email}&gt;
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{formatDate(commit.date as Date | string)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Message:</span>
            <span className="info-value commit-message-full">{commit.message}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Changes:</span>
            <span className="info-value">
              +{commit.changes.added} lines added, -{commit.changes.removed} lines removed
            </span>
          </div>
        </div>

        <div className="commit-actions">
          <button
            className="open-version-button"
            onClick={() => onOpenAtCommit(commit.hash)}
          >
            <span className="button-icon">📄</span>
            Open at This Version
          </button>
        </div>

        {diff && (
          <div className="commit-diff">
            <h3>Diff</h3>
            <pre className="diff-content">{formatDiff(diff)}</pre>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CommitDetails;
