/**
 * HealthIndicator component with circular progress showing health score.
 * Color coded: green (>80), yellow (50-80), red (<50)
 */

import React from "react";

interface HealthIndicatorProps {
  score: number; // 0-100
  size?: "small" | "medium" | "large";
}

const _getHealthColor = (score: number): string => {
  if (score > 80) {
    return "var(--success)";
  }
  if (score >= 50) {
    return "var(--warning)";
  }
  return "var(--error)";
};

const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  score,
  size = "medium",
}) => {
  const _getSizeValue = (sizeType: "small" | "medium" | "large"): number => {
    switch (sizeType) {
      case "small":
        return 60;
      case "medium":
        return 100;
      case "large":
        return 140;
      default:
        return 100;
    }
  };

  const _getFontSize = (sizeType: "small" | "medium" | "large"): string => {
    switch (sizeType) {
      case "small":
        return "0.35em";
      case "medium":
        return "0.5em";
      case "large":
        return "0.6em";
      default:
        return "0.5em";
    }
  };

  const sizeValue = _getSizeValue(size);
  const fontSize = _getFontSize(size);
  const color = _getHealthColor(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div
      className="health-indicator"
      style={{ width: sizeValue, height: sizeValue }}
    >
      <svg viewBox="0 0 36 36" className="health-chart">
        <path
          className="health-bg"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="health-circle"
          style={{
            stroke: color,
            strokeDasharray: `${clampedScore}, 100`,
          }}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <text
          x="18"
          y="20.35"
          className="health-score"
          style={{ fontSize, fill: color }}
        >
          {score}%
        </text>
      </svg>
      <style>{`
        .health-indicator {
          display: inline-block;
        }

        .health-chart {
          display: block;
          width: 100%;
          height: 100%;
        }

        .health-bg {
          fill: none;
          stroke: var(--background-tertiary);
          stroke-width: 3.8;
        }

        .health-circle {
          fill: none;
          stroke-width: 2.8;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease;
        }

        .health-score {
          text-anchor: middle;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default HealthIndicator;
