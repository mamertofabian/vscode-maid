# MAID for VS Code

[![Version](https://img.shields.io/badge/version-0.1.4-blue.svg)](https://marketplace.visualstudio.com/items?itemName=aidrivencoder.vscode-maid)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

VS Code extension for [MAID (Manifest-driven AI Development)](https://github.com/mamertofabian/maid-runner) with comprehensive IDE integration for manifest validation, exploration, and test execution.

## Features

### Currently Available

- ✅ **Real-time Validation** - Instant feedback as you edit `.manifest.json` files via LSP
- ✅ **Auto-install Detection** - Automatically detects if `maid-lsp` is installed and guides you through installation
- ✅ **Code Actions** - Quick fixes for common validation errors
- ✅ **Hover Information** - Detailed artifact information on hover
- ✅ **Diagnostics** - Validation errors and warnings in Problems panel
- ✅ **Debounced Updates** - Efficient 100ms debouncing for smooth editing experience

### Planned Features

- 🔄 **Manifest Explorer Sidebar** - Browse and navigate manifests in your workspace
- 🔄 **Test Execution Integration** - Run MAID tests directly from the IDE
- 🔄 **Inline Validation Indicators** - Visual feedback in the editor
- 🔄 **Status Bar Integration** - Real-time validation status display

## Requirements

- Python 3.10+ (for `maid-lsp` server)
- `maid-lsp` Python package (will be prompted to install if missing)

## Installation

### From VS Code Marketplace

1. Open VS Code or Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "MAID" or "MAID for VS Code"
4. Click Install

### Manual Installation

1. Download the `.vsix` file from [Releases](https://github.com/mamertofabian/vscode-maid/releases)
2. Open VS Code/Cursor
3. Go to Extensions → "..." → "Install from VSIX..."
4. Select the downloaded file

## First-Time Setup

When you first open a `.manifest.json` file, the extension will:

1. Check if `maid-lsp` is installed
2. If not found, show a prompt with installation options:
   - **Install via pip** - `pip install --user maid-lsp`
   - **Install via pipx** - `pipx install maid-lsp` (recommended)
   - **Install via uv** - `uv tool install maid-lsp`
   - **Manual installation** - Instructions provided

After installation, restart VS Code/Cursor and the extension will activate automatically.

## Usage

1. Open any `.manifest.json` file
2. The extension activates automatically
3. Validation errors appear in the Problems panel
4. Hover over manifest elements for detailed information
5. Use Quick Fix (`Ctrl+.` / `Cmd+.`) for code actions

## Configuration

The extension can be configured in VS Code settings:

```json
{
  "maid-lsp.path": "maid-lsp",
  "maid-lsp.args": ["--stdio"]
}
```

### Custom Server Path

If `maid-lsp` is not in your PATH, specify the full path:

```json
{
  "maid-lsp.path": "/home/user/.local/bin/maid-lsp"
}
```

On Windows:
```json
{
  "maid-lsp.path": "C:\\Users\\YourName\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\maid-lsp.exe"
}
```

## Commands

- **MAID: Check MAID LSP Installation** - Verify installation status and get help if needed

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

## Troubleshooting

### Extension doesn't activate

1. Check that `maid-lsp` is installed: Run `maid-lsp --version` in terminal
2. If not installed, use the command "MAID: Check MAID LSP Installation"
3. Verify Python is in PATH: `python --version`

### No diagnostics appearing

1. Check Output panel → Select "MAID LSP" for errors
2. Verify `maid-runner` is installed: `maid --version`
3. Ensure you're editing a file ending with `.manifest.json`
4. Restart VS Code/Cursor after installing `maid-lsp`

### Installation issues

- **pip not found**: Install Python from [python.org](https://www.python.org/)
- **Permission errors**: Use `--user` flag with pip or install via pipx
- **Command not found after install**: Restart VS Code/Cursor or add Python Scripts to PATH

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/mamertofabian/vscode-maid.git
cd vscode-maid

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm install -g @vscode/vsce
vsce package
```

### Testing Locally

1. Open the `vscode-maid` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open a workspace with `.manifest.json` files
4. Test validation and features

## Related Projects

- [maid-lsp](https://github.com/mamertofabian/maid-lsp) - Python LSP server implementation
- [maid-runner](https://github.com/mamertofabian/maid-runner) - MAID CLI validation tool

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 🐛 [Report Issues](https://github.com/mamertofabian/vscode-maid/issues)
- 💬 [Discussions](https://github.com/mamertofabian/vscode-maid/discussions)
- 📖 [Documentation](https://github.com/mamertofabian/maid-lsp#readme)
