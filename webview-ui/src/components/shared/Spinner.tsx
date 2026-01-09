/**
 * Loading spinner component.
 */

import React from "react";

interface SpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = "medium", message }) => {
  const sizeMap = {
    small: 16,
    medium: 32,
    large: 48,
  };

  const pixelSize = sizeMap[size];

  return (
    <div className="spinner-container">
      <svg
        className="spinner"
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="spinner-circle"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2"
        />
      </svg>
      {message && <p className="spinner-message">{message}</p>}
      <style>{`
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          padding: var(--spacing-xl);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .spinner-circle {
          stroke: var(--primary);
          stroke-linecap: round;
          stroke-dasharray: 60;
          stroke-dashoffset: 45;
        }

        .spinner-message {
          color: var(--foreground-secondary);
          font-size: 0.9em;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Spinner;
