/**
 * Comparison controls for selecting two commits to compare.
 */

import React, { useState } from "react";
import type { CommitHistory } from "../../types";
import Card from "../shared/Card";
import "./styles.css";

interface ComparisonControlsProps {
  commits: CommitHistory[];
  onCompare: (commitHash1: string, commitHash2: string) => void;
}

const ComparisonControls: React.FC<ComparisonControlsProps> = ({
  commits,
  onCompare,
}) => {
  const [commit1, setCommit1] = useState<string>("");
  const [commit2, setCommit2] = useState<string>("");

  const handleCompare = () => {
    if (commit1 && commit2 && commit1 !== commit2) {
      onCompare(commit1, commit2);
    }
  };

  return (
    <Card title="Compare Versions">
      <div className="comparison-controls">
        <div className="comparison-selects">
          <div className="select-group">
            <label htmlFor="commit1">From:</label>
            <select
              id="commit1"
              value={commit1}
              onChange={(e) => setCommit1(e.target.value)}
            >
              <option value="">Select commit...</option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.shortHash} - {commit.message.substring(0, 40)}
                </option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label htmlFor="commit2">To:</label>
            <select
              id="commit2"
              value={commit2}
              onChange={(e) => setCommit2(e.target.value)}
            >
              <option value="">Select commit...</option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.shortHash} - {commit.message.substring(0, 40)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="compare-button"
          onClick={handleCompare}
          disabled={!commit1 || !commit2 || commit1 === commit2}
        >
          Compare
        </button>
      </div>
    </Card>
  );
};

export default ComparisonControls;
