# Change Log

All notable changes to the "MAID for VS Code" extension will be documented in this file.

## [0.4.2] - 2026-01-10

### Fixed
- File path resolution now uses MAID root instead of workspace root for consistency
  - Updated `manifestIndex.resolveFilePath()` to use `getMaidRoot()`
  - Updated `referenceProvider.resolveFilePath()` to use `getMaidRoot()`
  - Updated `definitionProvider.resolveFilePath()` to use `getMaidRoot()`
  - Updated `knowledgeGraph` to use `getMaidRoot()` for consistency
  - This fixes issues where manifests in subdirectories couldn't find referenced files
- Removed unused activation event for `maidManifests` from package.json

## [0.4.1] - 2026-01-10

### Fixed
- MAID root detection now ignores `system.manifest.json` in project root
- Improved diagnostic logging to show file categories and node types

## [0.4.0] - 2026-01-10

### Added
- **File Manifests View** - New sidebar panel showing all manifests that reference the currently active file, organized by category (Creatable, Editable, Read-only, Expected Artifacts)
- **Manifest Chain Visualizer** - Interactive webview panel using vis.js to visualize manifest supersession relationships as a hierarchical graph with parent/child relationships
- **Chain Indicators in Manifest Explorer** - Visual indicators showing parent/child manifest counts in descriptions, plus expandable "Chain" section showing related manifests
- **Find Manifests for File** - New command (`vscode-maid.findManifestsForFile`) that shows a quick pick of all manifests referencing the current file
- **Coherence Validation** - New command (`vscode-maid.validateCoherence`) to run `maid validate --coherence --json-output` for coherence checking
- **Chain Validation** - New command (`vscode-maid.validateManifestChain`) to run `maid validate --use-manifest-chain --json-output` for validating entire manifest chains

### Changed
- Manifest Explorer now displays chain information (parent/child counts) in manifest descriptions
- File Manifests view automatically updates when switching between files

## [0.3.3] - 2026-01-09

### Changed
- Refactored terminology: renamed `manifestParentDir` to `maidRoot` for clarity
- All MAID CLI commands now execute from the MAID root directory (where manifests/ folder is located)
- File paths in tracked files and knowledge graph views now display complete paths relative to workspace root

### Fixed
- Knowledge graph visualizer now loads data correctly from MAID root directory
- Test and validate commands now run from the correct directory (MAID root instead of workspace root)
- File paths in all views now consistently show full paths matching manifest view behavior

## [0.3.2] - 2026-01-09

### Fixed
- Test files in manifest view now display only file paths without command prefixes (e.g., "pytest")

## [0.3.1] - 2026-01-09

### Fixed
- Extension failing to load due to `jsonc-parser` not being bundled

## [0.3.0] - 2026-01-09

### Added
- **Knowledge Graph Visualizer** - Interactive webview panel to visualize entity relationships from manifests
- **Project Dashboard** - New dashboard webview showing project overview and manifest statistics
- **Go to Definition** - Navigate to artifact files, test files, and related manifests directly from JSON references
- **Find References** - Find all manifest references to a specific file or artifact

### Changed
- Test files now displayed as expandable category in manifest explorer (instead of validation command)
- Activity bar icon updated to monochrome design for better VS Code integration
- New geometric MAID logo with PNG exports for better visual identity

## [0.2.0] - 2026-01-09

### Added
- **Manifest Explorer** - New sidebar panel showing all manifest files in workspace with expandable sections:
  - Goal and context overview
  - Tasks with status indicators
  - Artifacts with file paths
  - Test files list
  - Dependencies
- **Tracked Files View** - Shows all files tracked by the currently selected manifest
- **Knowledge Graph View** - Displays entity relationships defined in manifests
- **Test Runner Integration** - Run tests directly from the manifest explorer:
  - Run all tests command
  - Run tests for specific manifest (context menu and inline button)
  - Watch mode support
- **Manifest Validation** - Validate manifests via context menu or command palette
- Context menu actions for manifest files in explorer and editor

### Changed
- Major version bump reflecting significant new features
- Enhanced extension description to highlight new capabilities

## [0.1.4] - 2026-01-09

### Added
- Comprehensive logging system with output channel for debugging
- New command: "MAID: Show Logs" to view extension activity
- Workspace-level save handler for immediate diagnostic updates
- LSP middleware logging for document events (open, change, save)
- Server capability logging to track LSP features
- PATH environment logging to diagnose installation issues
- Diagnostic event tracking with detailed issue reporting

### Fixed
- Diagnostics not updating after saving files in Cursor IDE
- Red squiggles persisting after fixing issues until file reopened
- "Ignoring notification for unknown method" warnings in output
- LSP server not supporting save notifications properly

### Changed
- Removed file watcher that caused unsupported method warnings
- Improved error handling with detailed logging at all stages
- Enhanced debugging capabilities for troubleshooting extension issues

## [0.1.3] - 2026-01-09

### Added
- Automatic version checking for maid-lsp server (checks PyPI every 24 hours)
- Smart installation method detection (automatically detects uv tool, pipx, or pip)
- New command: "MAID: Check for MAID LSP Updates" for manual version checking
- Update notifications with appropriate upgrade command based on installation method
- User preferences persistence (dismissed versions, last check timestamp)

### Fixed
- Update command now uses correct package manager (uv tool upgrade, pipx upgrade, or pip install)

## [0.1.2] - 2026-01-09

### Added
- Initial release of MAID for VS Code extension
- LSP integration for real-time manifest validation
- Real-time validation diagnostics for `.manifest.json` files
- Auto-detection of `maid-lsp` installation with helpful prompts
- Support for code actions and hover information
- Configuration options for custom `maid-lsp` path and arguments
- Command palette command to check installation status

### Features
- Automatic activation when opening `.manifest.json` files
- Prompts user to install `maid-lsp` if not found (via pip, pipx, or uv)
- Shows validation errors in Problems panel
- 100ms debounced validation on file changes
