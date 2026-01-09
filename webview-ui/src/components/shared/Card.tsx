/**
 * Reusable card component for dashboard panels.
 */

import React from "react";

interface CardProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = "", actions }) => {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div className="card-title">
            {icon && <span className="card-icon">{icon}</span>}
            {title && <h3>{title}</h3>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
      <style>{`
        .card {
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--border);
          background: var(--background-tertiary);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .card-title h3 {
          font-size: 0.9em;
          font-weight: 600;
          color: var(--foreground);
          margin: 0;
        }

        .card-icon {
          display: flex;
          align-items: center;
          color: var(--foreground-secondary);
        }

        .card-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .card-content {
          padding: var(--spacing-lg);
        }
      `}</style>
    </div>
  );
};

export default Card;
