/**
 * Controls panel for filtering and searching the knowledge graph.
 *
 * NOTE: Layout switching and export features have been removed as they were not
 * working properly. The code is preserved below in comments for future development.
 *
 * TODO: Re-implement layout switching with proper vis-network integration
 * TODO: Re-implement export functionality (JSON, DOT, PNG, SVG)
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
  // DISABLED: Layout and export features need further development
  // currentLayout?: string;
  // onLayoutChange?: (layoutType: string) => void;
  // onExport?: (format: string) => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  isLoading,
  nodeCount,
  edgeCount,
}) => {
  const _handleCheckboxChange = (key: keyof GraphFilters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      [key]: e.target.checked,
    });
  };

  const _handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  // DISABLED: Layout and export handlers - need further development
  // const handleLayoutSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   onLayoutChange?.(e.target.value);
  // };
  // const handleExportClick = (format: string) => {
  //   onExport?.(format);
  // };

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
        {/* DISABLED: Layout selector - needs proper vis-network integration
        <select
          value={currentLayout || "force-directed"}
          onChange={handleLayoutSelect}
          className="layout-select"
        >
          <option value="force-directed">Force-Directed</option>
          <option value="hierarchical">Hierarchical</option>
          <option value="circular">Circular</option>
          <option value="timeline">Timeline</option>
        </select>
        */}
        {/* DISABLED: Export buttons - need implementation
        <div className="export-controls">
          <button onClick={() => handleExportClick("json")}>Export JSON</button>
          <button onClick={() => handleExportClick("dot")}>Export DOT</button>
          <button onClick={() => handleExportClick("png")}>Export PNG</button>
          <button onClick={() => handleExportClick("svg")}>Export SVG</button>
        </div>
        */}
      </div>

      <div className="controls-row filters">
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showManifests}
            onChange={_handleCheckboxChange("showManifests")}
          />
          <span className="node-indicator manifest" />
          Manifests
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showFiles}
            onChange={_handleCheckboxChange("showFiles")}
          />
          <span className="node-indicator file" />
          Files
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showModules}
            onChange={_handleCheckboxChange("showModules")}
          />
          <span className="node-indicator module" />
          Modules
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.showArtifacts}
            onChange={_handleCheckboxChange("showArtifacts")}
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
