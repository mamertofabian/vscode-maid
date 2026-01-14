/**
 * ArtifactEditor component for editing expected artifacts in a manifest.
 * Provides UI for adding, editing, and removing artifact definitions.
 */

import React, { useState, useCallback } from "react";

/**
 * Argument definition for a function artifact.
 */
interface _ArtifactArg {
  name: string;
  type: string;
}

/**
 * Return type definition for a function artifact.
 */
interface _ArtifactReturn {
  type: string;
}

/**
 * Single artifact item within contains array.
 */
interface _ArtifactItem {
  type: "function" | "class" | "interface" | "method" | "attribute";
  name: string;
  class?: string;
  args?: _ArtifactArg[];
  returns?: _ArtifactReturn;
}

/**
 * Expected artifact definition in manifest format.
 */
interface _ExpectedArtifact {
  file: string;
  contains: _ArtifactItem[];
}

/**
 * Props for the ArtifactEditor component.
 */
export interface ArtifactEditorProps {
  /** Current artifacts to edit */
  artifacts: _ExpectedArtifact[];
  /** Callback when artifacts change */
  onChange: (artifacts: _ExpectedArtifact[]) => void;
}

/**
 * ArtifactEditor component for managing expected artifacts.
 */
const ArtifactEditor: React.FC<ArtifactEditorProps> = ({ artifacts, onChange }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Add a new artifact group (file + contains)
  const _handleAddArtifact = useCallback(() => {
    onChange([
      ...artifacts,
      {
        file: "",
        contains: [],
      },
    ]);
  }, [artifacts, onChange]);

  // Remove an artifact group
  const _handleRemoveArtifact = useCallback(
    (index: number) => {
      onChange(artifacts.filter((_, i) => i !== index));
    },
    [artifacts, onChange]
  );

  // Update artifact file path
  const _handleFileChange = useCallback(
    (index: number, file: string) => {
      const updated = [...artifacts];
      updated[index] = { ...updated[index], file };
      onChange(updated);
    },
    [artifacts, onChange]
  );

  // Add a contains item to an artifact
  const _handleAddContainsItem = useCallback(
    (artifactIndex: number) => {
      const updated = [...artifacts];
      updated[artifactIndex] = {
        ...updated[artifactIndex],
        contains: [
          ...updated[artifactIndex].contains,
          { type: "function", name: "" },
        ],
      };
      onChange(updated);
    },
    [artifacts, onChange]
  );

  // Remove a contains item from an artifact
  const _handleRemoveContainsItem = useCallback(
    (artifactIndex: number, itemIndex: number) => {
      const updated = [...artifacts];
      updated[artifactIndex] = {
        ...updated[artifactIndex],
        contains: updated[artifactIndex].contains.filter((_, i) => i !== itemIndex),
      };
      onChange(updated);
    },
    [artifacts, onChange]
  );

  // Update a contains item
  const _handleUpdateContainsItem = useCallback(
    (artifactIndex: number, itemIndex: number, item: _ArtifactItem) => {
      const updated = [...artifacts];
      const newContains = [...updated[artifactIndex].contains];
      newContains[itemIndex] = item;
      updated[artifactIndex] = {
        ...updated[artifactIndex],
        contains: newContains,
      };
      onChange(updated);
    },
    [artifacts, onChange]
  );

  // Toggle expanded state
  const _handleToggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="artifact-editor">
      <div className="artifact-editor-header">
        <h3>Expected Artifacts</h3>
        <button type="button" onClick={_handleAddArtifact} className="btn-add">
          Add Artifact
        </button>
      </div>

      {artifacts.length === 0 ? (
        <div className="artifact-editor-empty">
          No artifacts defined. Click "Add Artifact" to create one.
        </div>
      ) : (
        <div className="artifact-list">
          {artifacts.map((artifact, artifactIndex) => (
            <div key={artifactIndex} className="artifact-group">
              <div className="artifact-group-header">
                <input
                  type="text"
                  value={artifact.file}
                  onChange={(e) => _handleFileChange(artifactIndex, e.target.value)}
                  placeholder="File path (e.g., src/module.ts)"
                  className="artifact-file-input"
                />
                <button
                  type="button"
                  onClick={() => _handleToggleExpand(artifactIndex)}
                  className="btn-expand"
                >
                  {expandedIndex === artifactIndex ? "Collapse" : "Expand"}
                </button>
                <button
                  type="button"
                  onClick={() => _handleRemoveArtifact(artifactIndex)}
                  className="btn-remove"
                >
                  Remove
                </button>
              </div>

              {expandedIndex === artifactIndex && (
                <div className="artifact-contains">
                  <div className="contains-header">
                    <span>Contains ({artifact.contains.length} items)</span>
                    <button
                      type="button"
                      onClick={() => _handleAddContainsItem(artifactIndex)}
                      className="btn-add-item"
                    >
                      Add Item
                    </button>
                  </div>

                  {artifact.contains.map((item, itemIndex) => (
                    <_ContainsItemEditor
                      key={itemIndex}
                      item={item}
                      onChange={(updated) =>
                        _handleUpdateContainsItem(artifactIndex, itemIndex, updated)
                      }
                      onRemove={() => _handleRemoveContainsItem(artifactIndex, itemIndex)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Props for the ContainsItemEditor component.
 */
interface _ContainsItemEditorProps {
  item: _ArtifactItem;
  onChange: (item: _ArtifactItem) => void;
  onRemove: () => void;
}

/**
 * Editor for a single contains item (function, class, etc.).
 */
const _ContainsItemEditor: React.FC<_ContainsItemEditorProps> = ({
  item,
  onChange,
  onRemove,
}) => {
  const [showArgs, setShowArgs] = useState(false);
  const [showReturns, setShowReturns] = useState(false);

  // Handle type change
  const _handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        ...item,
        type: e.target.value as _ArtifactItem["type"],
      });
    },
    [item, onChange]
  );

  // Handle name change
  const _handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...item,
        name: e.target.value,
      });
    },
    [item, onChange]
  );

  // Handle class change
  const _handleClassChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...item,
        class: e.target.value || undefined,
      });
    },
    [item, onChange]
  );

  // Handle args change
  const _handleArgsChange = useCallback(
    (args: _ArtifactArg[]) => {
      onChange({
        ...item,
        args: args.length > 0 ? args : undefined,
      });
    },
    [item, onChange]
  );

  // Handle returns change
  const _handleReturnsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const returnType = e.target.value.trim();
      onChange({
        ...item,
        returns: returnType ? { type: returnType } : undefined,
      });
    },
    [item, onChange]
  );

  // Add argument
  const _handleAddArg = useCallback(() => {
    const currentArgs = item.args || [];
    _handleArgsChange([...currentArgs, { name: "", type: "" }]);
  }, [item.args, _handleArgsChange]);

  // Update argument
  const _handleUpdateArg = useCallback(
    (index: number, arg: _ArtifactArg) => {
      const currentArgs = item.args || [];
      const newArgs = [...currentArgs];
      newArgs[index] = arg;
      _handleArgsChange(newArgs);
    },
    [item.args, _handleArgsChange]
  );

  // Remove argument
  const _handleRemoveArg = useCallback(
    (index: number) => {
      const currentArgs = item.args || [];
      _handleArgsChange(currentArgs.filter((_, i) => i !== index));
    },
    [item.args, _handleArgsChange]
  );

  return (
    <div className="contains-item">
      <div className="contains-item-main">
        <select value={item.type} onChange={_handleTypeChange}>
          <option value="function">Function</option>
          <option value="class">Class</option>
          <option value="interface">Interface</option>
          <option value="method">Method</option>
          <option value="attribute">Attribute</option>
        </select>

        <input
          type="text"
          value={item.name}
          onChange={_handleNameChange}
          placeholder="Name"
          className="item-name-input"
        />

        {(item.type === "method" || item.type === "attribute") && (
          <input
            type="text"
            value={item.class || ""}
            onChange={_handleClassChange}
            placeholder="Parent class"
            className="item-class-input"
          />
        )}

        <button type="button" onClick={onRemove} className="btn-delete">
          Delete
        </button>
      </div>

      {/* Arguments Section */}
      {(item.type === "function" || item.type === "method") && (
        <div className="contains-item-args">
          <button
            type="button"
            onClick={() => setShowArgs(!showArgs)}
            className="btn-toggle"
          >
            {showArgs ? "Hide Args" : "Show Args"} ({(item.args || []).length})
          </button>

          {showArgs && (
            <div className="args-editor">
              {(item.args || []).map((arg, argIndex) => (
                <div key={argIndex} className="arg-row">
                  <input
                    type="text"
                    value={arg.name}
                    onChange={(e) =>
                      _handleUpdateArg(argIndex, { ...arg, name: e.target.value })
                    }
                    placeholder="Arg name"
                  />
                  <input
                    type="text"
                    value={arg.type}
                    onChange={(e) =>
                      _handleUpdateArg(argIndex, { ...arg, type: e.target.value })
                    }
                    placeholder="Arg type"
                  />
                  <button type="button" onClick={() => _handleRemoveArg(argIndex)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={_handleAddArg} className="btn-add-arg">
                Add Argument
              </button>
            </div>
          )}
        </div>
      )}

      {/* Return Type Section */}
      {(item.type === "function" || item.type === "method") && (
        <div className="contains-item-returns">
          <button
            type="button"
            onClick={() => setShowReturns(!showReturns)}
            className="btn-toggle"
          >
            {showReturns ? "Hide Returns" : "Show Returns"}
          </button>

          {showReturns && (
            <div className="returns-editor">
              <input
                type="text"
                value={item.returns?.type || ""}
                onChange={_handleReturnsChange}
                placeholder="Return type"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtifactEditor;
