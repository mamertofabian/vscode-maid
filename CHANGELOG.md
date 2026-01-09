# Change Log

All notable changes to the "MAID for VS Code" extension will be documented in this file.

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
