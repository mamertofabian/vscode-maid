# Quick Setup Guide

## Prerequisites

1. **Node.js and npm** installed
2. **maid-lsp** installed and in PATH (or know its full path)
3. **VS Code** or **Cursor** editor

## Step 1: Install Dependencies

```bash
cd vscode-extension
npm install
```

## Step 2: Compile TypeScript

```bash
npm run compile
```

## Step 3: Test Locally

### Option A: Using VS Code Extension Development Host

1. Open the `vscode-extension` folder in VS Code
2. Press `F5` or go to Run → Start Debugging
3. A new "Extension Development Host" window will open
4. In that window, open a folder containing `.manifest.json` files
5. Open a `.manifest.json` file (e.g., `manifests/test-error.manifest.json`)
6. Check the Problems panel for validation errors

### Option B: Install from VSIX

1. Build the VSIX package:
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```

2. Install in VS Code/Cursor:
   - Open VS Code/Cursor
   - Go to Extensions (`Ctrl+Shift+X`)
   - Click "..." → "Install from VSIX..."
   - Select the generated `.vsix` file

## Step 4: Verify It Works

1. Open `manifests/test-error.manifest.json`
2. You should see an error about missing `goal` field
3. Check Output panel → Select "MAID LSP" to see server logs

## Troubleshooting

### Extension doesn't activate

- Check that `maid-lsp` is in PATH: `which maid-lsp`
- Or configure path in settings:
  ```json
  {
    "maid-lsp.path": "/full/path/to/maid-lsp"
  }
  ```

### No diagnostics appearing

- Check Output panel → "MAID LSP" for errors
- Verify `maid-runner` is installed: `maid --version`
- Restart VS Code/Cursor after installation

### TypeScript compilation errors

- Make sure you ran `npm install` first
- Check Node.js version: `node --version` (should be 16+)
