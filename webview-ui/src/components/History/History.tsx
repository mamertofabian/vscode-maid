/**
 * Main History component showing manifest commit history timeline.
 */

import React, { useEffect, useState } from "react";
import { useVsCodeMessages, useSendMessage } from "../../hooks/useVsCodeApi";
import type { HistoryPanelData, ExtensionToWebviewMessage } from "../../types";
import HistoryTimeline from "./HistoryTimeline";
import CommitDetails from "./CommitDetails";
import ComparisonControls from "./ComparisonControls";
import Spinner from "../shared/Spinner";
import "./styles.css";

const History: React.FC = () => {
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  const [data, setData] = useState<HistoryPanelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | undefined>();
  const [comparingCommits, setComparingCommits] = useState<{
    commit1: string;
    commit2: string;
  } | null>(null);
  const [commitDiff, setCommitDiff] = useState<string | null>(null);

  // Handle messages from the extension
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
      case "historyData":
        // Convert ISO date strings back to Date objects
        const historyData = {
          ...message.payload,
          commits: message.payload.commits.map((commit: any) => ({
            ...commit,
            date: new Date(commit.date),
          })),
        };
        setData(historyData);
        setIsLoading(false);
        setError(null);
        if (message.payload.selectedCommit) {
          setSelectedCommit(message.payload.selectedCommit);
        }
        break;

      case "commitDiff":
        setCommitDiff(message.payload.diff);
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

  const handleRefresh = () => {
    if (data) {
      setIsLoading(true);
      sendMessage({ type: "loadHistory", payload: { manifestPath: data.manifestPath } });
    }
  };

  const handleCommitSelect = (commitHash: string) => {
    setSelectedCommit(commitHash);
    if (data) {
      sendMessage({
        type: "loadCommit",
        payload: { manifestPath: data.manifestPath, commitHash },
      });
    }
  };

  const handleCompare = (commitHash1: string, commitHash2: string) => {
    setComparingCommits({ commit1: commitHash1, commit2: commitHash2 });
    if (data) {
      sendMessage({
        type: "compareCommits",
        payload: {
          manifestPath: data.manifestPath,
          commitHash1,
          commitHash2,
        },
      });
    }
  };

  const handleOpenAtCommit = (commitHash: string) => {
    if (data) {
      sendMessage({
        type: "openAtCommit",
        payload: { manifestPath: data.manifestPath, commitHash },
      });
    }
  };

  if (error && !data) {
    return (
      <div className="history-error">
        <p>Error loading history:</p>
        <p className="error-message">{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="history-loading">
        <Spinner message="Loading manifest history..." />
      </div>
    );
  }

  if (!data || data.commits.length === 0) {
    return (
      <div className="history-empty">
        <p>No commit history found for this manifest.</p>
        <p className="hint">Make sure the file is tracked in Git.</p>
        <button onClick={handleRefresh}>Refresh</button>
      </div>
    );
  }

  const selectedCommitData = data.commits.find((c) => c.hash === selectedCommit);

  return (
    <div className="history">
      <header className="history-header">
        <div className="history-title">
          <h1>Manifest History</h1>
          <p className="history-path">{data.manifestPath}</p>
        </div>
        <button className="refresh-button" onClick={handleRefresh}>
          Refresh
        </button>
      </header>

      <div className="history-content">
        <div className="history-timeline-container">
          <HistoryTimeline
            commits={data.commits}
            selectedCommit={selectedCommit}
            onCommitSelect={handleCommitSelect}
          />
        </div>

        <div className="history-details-container">
          {selectedCommitData && (
            <>
              <CommitDetails
                commit={selectedCommitData}
                diff={commitDiff}
                onOpenAtCommit={handleOpenAtCommit}
              />
              <ComparisonControls
                commits={data.commits}
                onCompare={handleCompare}
              />
            </>
          )}
          {!selectedCommit && (
            <div className="history-placeholder">
              <p>Select a commit from the timeline to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
