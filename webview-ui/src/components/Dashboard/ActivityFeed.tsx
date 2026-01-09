/**
 * Card showing recent activity feed.
 */

import React from "react";
import Card from "../shared/Card";
import type { ActivityItem } from "../../types";

interface ActivityFeedProps {
  activities: ActivityItem[];
  onOpenManifest: (path: string) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, onOpenManifest }) => {
  const getActivityIcon = (type: ActivityItem["type"]): string => {
    switch (type) {
      case "created":
        return "+";
      case "modified":
        return "~";
      case "validated":
        return "V";
      case "error":
        return "X";
      default:
        return "?";
    }
  };

  const getActivityClass = (type: ActivityItem["type"]): string => {
    switch (type) {
      case "created":
        return "created";
      case "modified":
        return "modified";
      case "validated":
        return "validated";
      case "error":
        return "error";
      default:
        return "";
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Card
      title="Recent Activity"
      icon={
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
        </svg>
      }
      className="activity-card"
    >
      {activities.length === 0 ? (
        <p className="empty-message">No recent activity</p>
      ) : (
        <div className="activity-list">
          {activities.slice(0, 10).map((activity, index) => (
            <div key={index} className="activity-item">
              <div className={`activity-icon ${getActivityClass(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-content">
                <span
                  className="activity-message"
                  onClick={() =>
                    activity.manifestPath && onOpenManifest(activity.manifestPath)
                  }
                  style={{
                    cursor: activity.manifestPath ? "pointer" : "default",
                  }}
                >
                  {activity.message}
                </span>
                <span className="activity-time">{formatTimestamp(activity.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ActivityFeed;
