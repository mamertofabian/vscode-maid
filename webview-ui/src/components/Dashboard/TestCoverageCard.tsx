/**
 * Card showing test coverage summary.
 */

import React from "react";
import Card from "../shared/Card";
import type { TestCoverageSummary } from "../../types";

interface TestCoverageCardProps {
  coverage: TestCoverageSummary | null;
}

const TestCoverageCard: React.FC<TestCoverageCardProps> = ({ coverage }) => {
  if (!coverage) {
    return (
      <Card
        title="Test Coverage"
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.5 1.5a1 1 0 0 0-1 0L1 5v6l6.5 3.5a1 1 0 0 0 1 0L15 11V5L8.5 1.5zM8 2.56L13.5 5.5 8 8.44 2.5 5.5 8 2.56zM2 6.31l5.5 2.75v5.38L2 11.69V6.31zm6.5 8.13V9.06l5.5-2.75v5.38l-5.5 2.75z" />
          </svg>
        }
        className="coverage-card"
      >
        <p className="empty-message">No test data available</p>
      </Card>
    );
  }

  const coveragePercent = Math.round(coverage.coverage);
  const totalTests = coverage.passingTests + coverage.failingTests;

  const getCoverageColor = (percent: number): string => {
    if (percent >= 80) return "var(--success)";
    if (percent >= 50) return "var(--warning)";
    return "var(--error)";
  };

  return (
    <Card
      title="Test Coverage"
      icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.5 1.5a1 1 0 0 0-1 0L1 5v6l6.5 3.5a1 1 0 0 0 1 0L15 11V5L8.5 1.5zM8 2.56L13.5 5.5 8 8.44 2.5 5.5 8 2.56zM2 6.31l5.5 2.75v5.38L2 11.69V6.31zm6.5 8.13V9.06l5.5-2.75v5.38l-5.5 2.75z" />
        </svg>
      }
      className="coverage-card"
    >
      <div className="coverage-content">
        <div className="coverage-circle">
          <svg viewBox="0 0 36 36" className="circular-chart">
            <path
              className="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle"
              style={{
                stroke: getCoverageColor(coveragePercent),
                strokeDasharray: `${coveragePercent}, 100`,
              }}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className="percentage">
              {coveragePercent}%
            </text>
          </svg>
        </div>

        <div className="coverage-details">
          <div className="detail-row">
            <span className="detail-label">Valid Manifests</span>
            <span className="detail-value">
              {coverage.validManifests} / {coverage.totalManifests}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Passing Tests</span>
            <span className="detail-value text-success">{coverage.passingTests}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Failing Tests</span>
            <span className="detail-value text-error">{coverage.failingTests}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Tests</span>
            <span className="detail-value">{totalTests}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TestCoverageCard;
