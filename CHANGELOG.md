# Change Log

All notable changes to the "MAID for VS Code" extension will be documented in this file.

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
