/**
 * Main ManifestDesigner component for form-based manifest editing.
 * Provides UI for editing manifest properties including goal, taskType, files, and artifacts.
 */

import React, { useState, useEffect, useCallback } from "react";

/**
 * VS Code API interface for webview communication.
 */
interface _VsCodeApi {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare function _acquireVsCodeApi(): _VsCodeApi;

// Get VS Code API (only available in webview context)
const vscode = typeof _acquireVsCodeApi !== "undefined" ? _acquireVsCodeApi() : null;

/**
 * Artifact definition within a manifest.
 */
interface _ArtifactContains {
  type: "function" | "class" | "attribute" | "method";
  name: string;
  description?: string;
  args?: Array<{ name: string; type: string }>;
  returns?: { type: string };
}

/**
 * Expected artifact definition.
 */
interface _ExpectedArtifact {
  file: string;
  contains: _ArtifactContains[];
}

/**
 * Validation error from manifest validation.
 */
interface _ValidationError {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * State of the manifest being designed.
 */
interface _ManifestDesignerState {
  goal: string;
  taskType: "create" | "edit" | "refactor" | "snapshot";
  creatableFiles: string[];
  editableFiles: string[];
  readonlyFiles: string[];
  expectedArtifacts: _ExpectedArtifact[];
  validationCommand: string[];
  isDirty: boolean;
  validationErrors: _ValidationError[];
}

/**
 * Props for the ManifestDesigner component.
 */
export interface ManifestDesignerProps {
  initialState?: _ManifestDesignerState;
  availableFiles?: string[];
  onSave?: (state: _ManifestDesignerState) => void;
  onValidate?: (state: _ManifestDesignerState) => void;
}

/**
 * Get default empty state for a new manifest.
 */
function _getDefaultState(): _ManifestDesignerState {
  return {
    goal: "",
    taskType: "create",
    creatableFiles: [],
    editableFiles: [],
    readonlyFiles: [],
    expectedArtifacts: [],
    validationCommand: [],
    isDirty: false,
    validationErrors: [],
  };
}

/**
 * ManifestDesigner component for creating and editing MAID manifests.
 */
const ManifestDesigner: React.FC<ManifestDesignerProps> = ({
  initialState,
  availableFiles = [],
  onSave,
  onValidate,
}) => {
  const [state, setState] = useState<_ManifestDesignerState>(
    initialState || _getDefaultState()
  );

  // Update state when initialState prop changes
  useEffect(() => {
    if (initialState) {
      setState(initialState);
    }
  }, [initialState]);

  // Handle goal change
  const handleGoalChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({
      ...prev,
      goal: e.target.value,
      isDirty: true,
    }));
  }, []);

  // Handle taskType change
  const handleTaskTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setState((prev) => ({
      ...prev,
      taskType: e.target.value as _ManifestDesignerState["taskType"],
      isDirty: true,
    }));
  }, []);

  // Handle file list change
  const handleFilesChange = useCallback(
    (fileType: "creatableFiles" | "editableFiles" | "readonlyFiles", files: string[]) => {
      setState((prev) => ({
        ...prev,
        [fileType]: files,
        isDirty: true,
      }));
    },
    []
  );

  // Handle artifacts change
  const handleArtifactsChange = useCallback((artifacts: _ExpectedArtifact[]) => {
    setState((prev) => ({
      ...prev,
      expectedArtifacts: artifacts,
      isDirty: true,
    }));
  }, []);

  // Handle validation command change
  const handleValidationCommandChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const command = e.target.value.split(" ").filter((s) => s.trim() !== "");
      setState((prev) => ({
        ...prev,
        validationCommand: command,
        isDirty: true,
      }));
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(state);
    }
    if (vscode) {
      vscode.postMessage({
        type: "saveManifest",
        payload: { state },
      });
    }
  }, [state, onSave]);

  // Handle validate
  const handleValidate = useCallback(() => {
    if (onValidate) {
      onValidate(state);
    }
    if (vscode) {
      vscode.postMessage({
        type: "validateDesigner",
        payload: { state },
      });
    }
  }, [state, onValidate]);

  // Count errors and warnings
  const errorCount = state.validationErrors.filter((e) => e.severity === "error").length;
  const warningCount = state.validationErrors.filter((e) => e.severity === "warning").length;

  return (
    <div className="manifest-designer">
      <header className="manifest-designer-header">
        <h1>Manifest Designer</h1>
        <div className="manifest-designer-actions">
          <button onClick={handleValidate} className="btn btn-secondary">
            Validate
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={!state.isDirty}>
            Save
          </button>
        </div>
      </header>

      {/* Validation Status */}
      {state.validationErrors.length > 0 && (
        <div className="validation-status">
          {errorCount > 0 && (
            <span className="error-count">{errorCount} error(s)</span>
          )}
          {warningCount > 0 && (
            <span className="warning-count">{warningCount} warning(s)</span>
          )}
          <ul className="validation-errors">
            {state.validationErrors.map((error, idx) => (
              <li key={idx} className={`validation-error ${error.severity}`}>
                [{error.code}] {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="manifest-designer-form">
        {/* Goal */}
        <div className="form-group">
          <label htmlFor="goal">Goal</label>
          <textarea
            id="goal"
            value={state.goal}
            onChange={handleGoalChange}
            placeholder="Describe what this manifest accomplishes..."
            rows={3}
          />
        </div>

        {/* Task Type */}
        <div className="form-group">
          <label htmlFor="taskType">Task Type</label>
          <select id="taskType" value={state.taskType} onChange={handleTaskTypeChange}>
            <option value="create">Create</option>
            <option value="edit">Edit</option>
            <option value="refactor">Refactor</option>
            <option value="snapshot">Snapshot</option>
          </select>
        </div>

        {/* File Lists */}
        <div className="form-group">
          <label>Creatable Files</label>
          <_FileList
            files={state.creatableFiles}
            availableFiles={availableFiles}
            onChange={(files) => handleFilesChange("creatableFiles", files)}
          />
        </div>

        <div className="form-group">
          <label>Editable Files</label>
          <_FileList
            files={state.editableFiles}
            availableFiles={availableFiles}
            onChange={(files) => handleFilesChange("editableFiles", files)}
          />
        </div>

        <div className="form-group">
          <label>Readonly Files</label>
          <_FileList
            files={state.readonlyFiles}
            availableFiles={availableFiles}
            onChange={(files) => handleFilesChange("readonlyFiles", files)}
          />
        </div>

        {/* Expected Artifacts */}
        <div className="form-group">
          <label>Expected Artifacts</label>
          <_ArtifactList
            artifacts={state.expectedArtifacts}
            onChange={handleArtifactsChange}
          />
        </div>

        {/* Validation Command */}
        <div className="form-group">
          <label htmlFor="validationCommand">Validation Command</label>
          <input
            id="validationCommand"
            type="text"
            value={state.validationCommand.join(" ")}
            onChange={handleValidationCommandChange}
            placeholder="e.g., pnpm exec vitest run tests/test_file.test.ts"
          />
        </div>
      </form>
    </div>
  );
};

/**
 * Props for FileList component.
 */
interface _FileListProps {
  files: string[];
  availableFiles: string[];
  onChange: (files: string[]) => void;
}

/**
 * FileList component for managing a list of files.
 */
const _FileList: React.FC<_FileListProps> = ({ files, availableFiles, onChange }) => {
  const [newFile, setNewFile] = useState("");

  const _handleAdd = () => {
    if (newFile && !files.includes(newFile)) {
      onChange([...files, newFile]);
      setNewFile("");
    }
  };

  const _handleRemove = (file: string) => {
    onChange(files.filter((f) => f !== file));
  };

  return (
    <div className="file-list">
      <ul>
        {files.map((file) => (
          <li key={file}>
            <span>{file}</span>
            <button type="button" onClick={() => _handleRemove(file)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="file-list-add">
        <input
          type="text"
          value={newFile}
          onChange={(e) => setNewFile(e.target.value)}
          placeholder="Add file path..."
          list="available-files"
        />
        <datalist id="available-files">
          {availableFiles.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <button type="button" onClick={_handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
};

/**
 * Props for ArtifactList component.
 */
interface _ArtifactListProps {
  artifacts: _ExpectedArtifact[];
  onChange: (artifacts: _ExpectedArtifact[]) => void;
}

/**
 * ArtifactList component for managing expected artifacts.
 */
const _ArtifactList: React.FC<_ArtifactListProps> = ({ artifacts, onChange }) => {
  const _handleAddArtifact = () => {
    onChange([
      ...artifacts,
      {
        file: "",
        contains: [],
      },
    ]);
  };

  const _handleRemoveArtifact = (index: number) => {
    onChange(artifacts.filter((_, i) => i !== index));
  };

  const _handleArtifactChange = (index: number, artifact: _ExpectedArtifact) => {
    const newArtifacts = [...artifacts];
    newArtifacts[index] = artifact;
    onChange(newArtifacts);
  };

  return (
    <div className="artifact-list">
      {artifacts.map((artifact, index) => (
        <div key={index} className="artifact-item">
          <div className="artifact-header">
            <input
              type="text"
              value={artifact.file}
              onChange={(e) =>
                _handleArtifactChange(index, { ...artifact, file: e.target.value })
              }
              placeholder="File path..."
            />
            <button type="button" onClick={() => _handleRemoveArtifact(index)}>
              Remove
            </button>
          </div>
          <div className="artifact-contains">
            {artifact.contains.map((item, itemIdx) => (
              <div key={itemIdx} className="artifact-contains-item">
                <select
                  value={item.type}
                  onChange={(e) => {
                    const newContains = [...artifact.contains];
                    newContains[itemIdx] = {
                      ...item,
                      type: e.target.value as _ArtifactContains["type"],
                    };
                    _handleArtifactChange(index, { ...artifact, contains: newContains });
                  }}
                >
                  <option value="function">Function</option>
                  <option value="class">Class</option>
                  <option value="interface">Interface</option>
                  <option value="method">Method</option>
                </select>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newContains = [...artifact.contains];
                    newContains[itemIdx] = { ...item, name: e.target.value };
                    _handleArtifactChange(index, { ...artifact, contains: newContains });
                  }}
                  placeholder="Name..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const newContains = artifact.contains.filter((_, i) => i !== itemIdx);
                    _handleArtifactChange(index, { ...artifact, contains: newContains });
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                _handleArtifactChange(index, {
                  ...artifact,
                  contains: [...artifact.contains, { type: "function", name: "" }],
                });
              }}
            >
              Add Artifact
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={_handleAddArtifact}>
        Add Expected Artifact
      </button>
    </div>
  );
};

export default ManifestDesigner;
