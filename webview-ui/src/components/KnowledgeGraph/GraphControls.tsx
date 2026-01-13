/**
 * Controls panel for filtering and searching the knowledge graph.
 */

import React from "react";
import type { GraphFilters } from "../../types";

interface GraphControlsProps {
  filters: GraphFilters;
  onFilterChange: (filters: GraphFilters) => void;
  onRefresh: () => void;
  isLoading: boolean;
  nodeCount: number;
  edgeCount: number;
  currentLayout?: string;
  onLayoutChange?: (layoutType: string) => void;
  onExport?: (format: string) => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  isLoading,
  nodeCount,
  edgeCount,
  currentLayout,
  onLayoutChange,
  onExport,
}) => {
  const handleCheckboxChange = (key: keyof GraphFilters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      [key]: e.target.checked,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleLayoutSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLayoutChange?.(e.target.value);
  };

  const handleExportClick = (format: string) => {
    onExport?.(format);
  };

  return (
    <div className="graph-controls">
      <div className="controls-row">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search nodes..."
            value={filters.searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="refresh-button">
          {isLoading ? "Loading..." : "Refresh"}
        </button>
        <select
          value={currentLayout || "force-directed"}
          onChange={handleLayoutSelect}
          className="layout-select"
        >
          <option value="force-directed">Force-Directed</option>
          <option value="hierarchical">Hierarchical</option>
          <option value="circular">Circular</option>
        </select>
        <div className="export-controls">
          <button onClick={() => handleExportClick("json")}>Export JSON</button>
          <button onClick={() => handleExportClick("dot")}>Export DOT</button>
        </div>
      </div>

      <div className="controls-row filters">
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showManifests}
            onChange={handleCheckboxChange("showManifests")}
          />
          <span className="node-indicator manifest" />
          Manifests
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showFiles}
            onChange={handleCheckboxChange("showFiles")}
          />
          <span className="node-indicator file" />
          Files
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showModules}
            onChange={handleCheckboxChange("showModules")}
          />
          <span className="node-indicator module" />
          Modules
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showArtifacts}
            onChange={handleCheckboxChange("showArtifacts")}
          />
          <span className="node-indicator artifact" />
          Artifacts
        </label>
      </div>

      <div className="controls-row stats">
        <span className="stat">
          <strong>{nodeCount}</strong> nodes
        </span>
        <span className="stat">
          <strong>{edgeCount}</strong> edges
        </span>
      </div>
    </div>
  );
};

export default GraphControls;
