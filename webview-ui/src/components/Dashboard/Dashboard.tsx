/**
 * Main Dashboard component showing project overview and health metrics.
 */

import React, { useEffect, useState } from "react";
import { useVsCodeMessages, useSendMessage } from "../../hooks/useVsCodeApi";
import type { DashboardData, ExtensionToWebviewMessage } from "../../types";
import ValidationCard from "./ValidationCard";
import TestCoverageCard from "./TestCoverageCard";
import ActivityFeed from "./ActivityFeed";
import HealthIndicator from "./HealthIndicator";
import MetricsCard from "./MetricsCard";
import Spinner from "../shared/Spinner";
import "./styles.css";

interface FileTrackingBreakdown {
  tracked: number;
  untracked: number;
  total: number;
}

const _calculateHealthScore = (data: DashboardData | null): number => {
  if (!data) return 0;
  if (data.manifests.length === 0) return 0;

  const validManifests = data.manifests.filter((m) => m.isValid).length;
  const totalManifests = data.manifests.length;
  const validRatio = totalManifests > 0 ? validManifests / totalManifests : 0;

  // Factor in errors: more errors = lower score
  const errorPenalty = Math.min(data.totalErrors * 5, 30);
  const warningPenalty = Math.min(data.totalWarnings * 2, 10);

  const score = Math.round(validRatio * 100 - errorPenalty - warningPenalty);
  return Math.max(0, Math.min(100, score));
};

const _getFileTrackingBreakdown = (data: DashboardData | null): FileTrackingBreakdown => {
  if (!data) return { tracked: 0, untracked: 0, total: 0 };

  // Calculate tracked files based on valid manifests
  const tracked = data.manifests.filter((m) => m.isValid).length;
  const untracked = data.manifests.filter((m) => !m.isValid).length;
  const total = data.manifests.length;

  return { tracked, untracked, total };
};

const Dashboard: React.FC = () => {
  const message = useVsCodeMessages();
  const sendMessage = useSendMessage();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle messages from the extension
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
      case "dashboardData":
        setData(message.payload);
        setIsLoading(false);
        setError(null);
        break;
      case "loading":
        setIsLoading(message.payload.isLoading);
        break;
      case "error":
        setError(message.payload.message);
        setIsLoading(false);
        break;
      case "validationUpdate":
        // Update specific manifest validation status
        if (data) {
          const updatedManifests = data.manifests.map((m) =>
            m.path === message.payload.manifestPath
              ? {
                  ...m,
                  errorCount: message.payload.errorCount,
                  warningCount: message.payload.warningCount,
                  isValid: message.payload.errorCount === 0,
                }
              : m
          );
          setData({
            ...data,
            manifests: updatedManifests,
            totalErrors: updatedManifests.reduce((sum, m) => sum + m.errorCount, 0),
            totalWarnings: updatedManifests.reduce((sum, m) => sum + m.warningCount, 0),
          });
        }
        break;
    }
  }, [message, data]);

  const handleRefresh = () => {
    setIsLoading(true);
    sendMessage({ type: "refresh" });
  };

  const handleOpenManifest = (manifestPath: string) => {
    sendMessage({ type: "openManifest", payload: { manifestPath } });
  };

  const handleRunValidation = (manifestPath?: string) => {
    sendMessage({ type: "runValidation", payload: { manifestPath } });
  };

  const handleRunTests = (manifestPath?: string) => {
    sendMessage({ type: "runTests", payload: { manifestPath } });
  };

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading dashboard:</p>
        <p className="error-message">{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="dashboard-loading">
        <Spinner message="Loading project dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>MAID Project Dashboard</h1>
          <p className="subtitle">
            {data?.manifests.length || 0} manifests in workspace
          </p>
        </div>
        <div className="header-actions">
          <button
            className="secondary"
            onClick={() => handleRunValidation()}
            disabled={isLoading}
          >
            Validate All
          </button>
          <button
            className="secondary"
            onClick={() => handleRunTests()}
            disabled={isLoading}
          >
            Run Tests
          </button>
          <button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="health-section">
          <div className="health-indicator-container">
            <HealthIndicator score={_calculateHealthScore(data)} size="large" />
            <div className="health-label">Project Health</div>
          </div>
          <div className="metrics-summary">
            <MetricsCard
              title="Tracked"
              value={_getFileTrackingBreakdown(data).tracked}
              subtitle="Valid manifests"
              color="var(--success)"
            />
            <MetricsCard
              title="Untracked"
              value={_getFileTrackingBreakdown(data).untracked}
              subtitle="Invalid manifests"
              color="var(--error)"
            />
            <MetricsCard
              title="Total"
              value={_getFileTrackingBreakdown(data).total}
              subtitle="All manifests"
            />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{data?.manifests.length || 0}</span>
            <span className="stat-label">Manifests</span>
          </div>
          <div className="stat-card">
            <span className="stat-value text-success">
              {data?.manifests.filter((m) => m.isValid).length || 0}
            </span>
            <span className="stat-label">Valid</span>
          </div>
          <div className="stat-card">
            <span className="stat-value text-error">{data?.totalErrors || 0}</span>
            <span className="stat-label">Errors</span>
          </div>
          <div className="stat-card">
            <span className="stat-value text-warning">{data?.totalWarnings || 0}</span>
            <span className="stat-label">Warnings</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <ValidationCard
            manifests={data?.manifests || []}
            onOpenManifest={handleOpenManifest}
            onValidateManifest={(path) => handleRunValidation(path)}
          />
          <TestCoverageCard coverage={data?.testCoverage || null} />
          <ActivityFeed
            activities={data?.recentActivity || []}
            onOpenManifest={handleOpenManifest}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
