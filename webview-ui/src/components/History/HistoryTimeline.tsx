/**
 * Timeline component showing commits chronologically.
 */

import React from "react";
import type { CommitHistory } from "../../types";
import "./styles.css";

interface HistoryTimelineProps {
  commits: CommitHistory[];
  selectedCommit?: string;
  onCommitSelect: (commitHash: string) => void;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  commits,
  selectedCommit,
  onCommitSelect,
}) => {
  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
  };

  const formatMessage = (message: string): string => {
    // Truncate long messages
    const maxLength = 60;
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + "...";
    }
    return message;
  };

  return (
    <div className="history-timeline">
      <h2>Commit History</h2>
      <div className="timeline-list">
        {commits.map((commit, index) => {
          const isSelected = commit.hash === selectedCommit;
          const isLast = index === commits.length - 1;

          return (
            <div
              key={commit.hash}
              className={`timeline-item ${isSelected ? "selected" : ""}`}
              onClick={() => onCommitSelect(commit.hash)}
            >
              <div className="timeline-line" />
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="commit-hash">{commit.shortHash}</span>
                  <span className="commit-date">{formatDate(commit.date)}</span>
                </div>
                <div className="commit-message">{formatMessage(commit.message)}</div>
                <div className="commit-meta">
                  <span className="commit-author">{commit.author}</span>
                  <span className="commit-changes">
                    +{commit.changes.added} -{commit.changes.removed}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryTimeline;
