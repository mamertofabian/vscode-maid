/**
 * MetricsCard component for displaying individual metrics with optional trend indicator.
 */

import React from "react";

interface MetricsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color,
}) => {
  const _getTrendIcon = (trendType: "up" | "down" | "neutral"): string => {
    switch (trendType) {
      case "up":
        return "\u2191"; // Up arrow
      case "down":
        return "\u2193"; // Down arrow
      case "neutral":
        return "\u2192"; // Right arrow
      default:
        return "";
    }
  };

  const _getTrendClass = (trendType: "up" | "down" | "neutral"): string => {
    switch (trendType) {
      case "up":
        return "trend-up";
      case "down":
        return "trend-down";
      case "neutral":
        return "trend-neutral";
      default:
        return "";
    }
  };

  return (
    <div className="metrics-card">
      <div className="metrics-title">{title}</div>
      <div
        className="metrics-value"
        style={{ color: color || "var(--foreground)" }}
      >
        {value}
        {trend && (
          <span className={`trend-indicator ${_getTrendClass(trend)}`}>
            {_getTrendIcon(trend)}
          </span>
        )}
      </div>
      {subtitle && <div className="metrics-subtitle">{subtitle}</div>}
      <style>{`
        .metrics-card {
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          text-align: center;
        }

        .metrics-title {
          font-size: 0.8em;
          color: var(--foreground-secondary);
          text-transform: uppercase;
          margin-bottom: var(--spacing-xs);
        }

        .metrics-value {
          font-size: 1.8em;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
        }

        .metrics-subtitle {
          font-size: 0.75em;
          color: var(--foreground-secondary);
          margin-top: var(--spacing-xs);
        }

        .trend-indicator {
          font-size: 0.6em;
          font-weight: 600;
        }

        .trend-up {
          color: var(--success);
        }

        .trend-down {
          color: var(--error);
        }

        .trend-neutral {
          color: var(--foreground-secondary);
        }
      `}</style>
    </div>
  );
};

export default MetricsCard;
