/**
 * FilePicker component for selecting files to include in a manifest.
 * Provides a searchable list with multi-select support and file type filtering.
 */

import React, { useState, useMemo, useCallback } from "react";

/**
 * Props for the FilePicker component.
 */
export interface FilePickerProps {
  /** List of available files to choose from */
  files: string[];
  /** Currently selected files */
  selectedFiles?: string[];
  /** Callback when selection changes */
  onSelect: (files: string[]) => void;
  /** Optional file extension filter (e.g., ".ts", ".tsx") */
  filterExtension?: string;
  /** Whether to allow multiple selection */
  multiple?: boolean;
}

/**
 * FilePicker component for selecting files from workspace.
 */
const FilePicker: React.FC<FilePickerProps> = ({
  files,
  selectedFiles = [],
  onSelect,
  filterExtension,
  multiple = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(filterExtension || "");

  // Filter files based on search query and extension filter
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Apply search filter
      const matchesSearch =
        searchQuery === "" || file.toLowerCase().includes(searchQuery.toLowerCase());

      // Apply extension filter
      const matchesExtension = filter === "" || file.endsWith(filter);

      return matchesSearch && matchesExtension;
    });
  }, [files, searchQuery, filter]);

  // Handle checkbox change
  const _handleCheckboxChange = useCallback(
    (file: string, checked: boolean) => {
      if (multiple) {
        if (checked) {
          onSelect([...selectedFiles, file]);
        } else {
          onSelect(selectedFiles.filter((f) => f !== file));
        }
      } else {
        onSelect(checked ? [file] : []);
      }
    },
    [multiple, selectedFiles, onSelect]
  );

  // Check if a file is selected
  const _isSelected = useCallback(
    (file: string) => {
      return selectedFiles.includes(file);
    },
    [selectedFiles]
  );

  // Handle select all
  const _handleSelectAll = useCallback(() => {
    onSelect(filteredFiles);
  }, [filteredFiles, onSelect]);

  // Handle clear selection
  const _handleClearSelection = useCallback(() => {
    onSelect([]);
  }, [onSelect]);

  // Handle search input change
  const _handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle filter change
  const _handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  }, []);

  return (
    <div className="file-picker">
      {/* Search and Filter Controls */}
      <div className="file-picker-controls">
        <input
          type="text"
          className="file-picker-search"
          placeholder="Search files..."
          value={searchQuery}
          onChange={_handleSearchChange}
        />
        <select
          className="file-picker-filter"
          value={filter}
          onChange={_handleFilterChange}
        >
          <option value="">All files</option>
          <option value=".ts">TypeScript (.ts)</option>
          <option value=".tsx">React TSX (.tsx)</option>
          <option value=".js">JavaScript (.js)</option>
          <option value=".jsx">React JSX (.jsx)</option>
          <option value=".json">JSON (.json)</option>
          <option value=".py">Python (.py)</option>
        </select>
      </div>

      {/* Selection Actions */}
      {multiple && (
        <div className="file-picker-actions">
          <button type="button" onClick={_handleSelectAll}>
            Select All ({filteredFiles.length})
          </button>
          <button type="button" onClick={_handleClearSelection}>
            Clear Selection
          </button>
          <span className="selection-count">
            {selectedFiles.length} selected
          </span>
        </div>
      )}

      {/* File List */}
      <div className="file-picker-list">
        {filteredFiles.length === 0 ? (
          <div className="file-picker-empty">No files match your criteria</div>
        ) : (
          <ul>
            {filteredFiles.map((file) => (
              <li key={file} className="file-picker-item">
                <label>
                  <input
                    type="checkbox"
                    checked={_isSelected(file)}
                    onChange={(e) => _handleCheckboxChange(file, e.target.checked)}
                  />
                  <span className="file-path">{file}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="file-picker-selected">
          <h4>Selected Files:</h4>
          <ul>
            {selectedFiles.map((file) => (
              <li key={file}>
                <span>{file}</span>
                <button
                  type="button"
                  onClick={() => _handleCheckboxChange(file, false)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilePicker;
