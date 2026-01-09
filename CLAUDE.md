# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that provides Language Server Protocol (LSP) integration for MAID (Manifest-driven AI Development). The extension validates `.manifest.json` files through the `maid-lsp` Python server and provides diagnostics, code actions, and hover information.

## Build and Development Commands

### Compilation
```bash
npm run compile       # Compile TypeScript to JavaScript (output to ./out/)
npm run watch        # Watch mode - auto-compile on file changes
```

### Testing and Debugging
- Press `F5` in VS Code to launch Extension Development Host for testing
- No automated test suite currently exists (test configuration in launch.json is placeholder)

### Packaging
```bash
npm install -g @vscode/vsce
vsce package         # Creates .vsix file for local testing or distribution
vsce publish         # Publish to VS Code Marketplace (requires PAT)
```

## Architecture

### Extension Lifecycle
1. **Activation**: Extension activates when any JSON file is opened (`onLanguage:json` event)
2. **Installation Check**: On first activation, checks if `maid-lsp` is installed using `maid-lsp --version`
3. **Auto-install Prompt**: If not found, shows installation options (pip/pipx/uv)
4. **LSP Client Start**: If installed, spawns `maid-lsp` process with `--stdio` and connects via Language Server Protocol

### File Structure
- `src/extension.ts` - Single-file extension implementation containing:
  - `activate()` - Entry point, checks installation and starts LSP client
  - `deactivate()` - Cleanup, stops LSP client
  - `checkMaidLspInstalled()` - Verifies maid-lsp availability
  - `promptMaidLspInstall()` - Installation wizard UI
  - `startLanguageClient()` - LSP client initialization
  - `checkInstallationStatus()` - Command implementation for manual installation check

### LSP Integration
- Uses `vscode-languageclient` package to communicate with `maid-lsp` server
- Document selector: Only activates for files matching `**/*.manifest.json` pattern
- File system watcher: Monitors workspace for `.manifest.json` changes
- Server options configurable via `maid-lsp.path` and `maid-lsp.args` settings

### Configuration Options
- `maid-lsp.path` (string, default: "maid-lsp"): Path to maid-lsp executable
- `maid-lsp.args` (array, default: ["--stdio"]): Arguments passed to maid-lsp

### Commands
- `vscode-maid.checkInstallation` - Check MAID LSP Installation (accessible via Command Palette)

## Key Dependencies

- **Runtime**:
  - `maid-lsp` (Python package, external): Language server providing validation logic
  - `vscode-languageclient@^9.0.0`: LSP client library

- **Development**:
  - `typescript@^5.0.0`: Compiler
  - `@types/vscode@^1.74.0`: VS Code API types
  - `@types/node@^20.0.0`: Node.js types

## Publishing Workflow

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run `npm run compile` to build
4. Run `vsce package` to create `.vsix`
5. Test locally by installing `.vsix`
6. Run `vsce publish` (requires Personal Access Token with Marketplace scope)

See PUBLISHING.md for detailed instructions.

## Design Patterns

### Graceful Degradation
The extension handles missing `maid-lsp` gracefully:
- Detects installation status before starting LSP client
- Provides helpful installation UI rather than failing silently
- Registers command even when server unavailable for later retry

### Configuration-Driven
Server path and arguments are configurable to support:
- Custom installation locations
- Different Python environments (virtualenv, conda, etc.)
- Platform-specific paths (Windows vs Unix)

### File Pattern Matching
Uses glob patterns (`**/*.manifest.json`) rather than file extension matching to ensure:
- Only manifest files trigger validation (not all JSON files)
- Works regardless of directory depth
- Consistent with MAID tooling conventions

## Related Projects

- [maid-lsp](https://github.com/mamertofabian/maid-lsp) - Python LSP server (separate repo)
- [maid-runner](https://github.com/mamertofabian/maid-runner) - CLI validation tool used by maid-lsp
