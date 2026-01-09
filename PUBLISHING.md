# Publishing Guide

This guide explains how to publish the MAID for VS Code extension to both the Microsoft VS Code Marketplace and Open VSX Registry (used by Cursor IDE, VSCodium, and other VS Code-compatible editors).

## Prerequisites

### For Microsoft VS Code Marketplace

1. **VS Code Publisher Account**
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with your Microsoft/GitHub account
   - Create a publisher (e.g., "aidrivencoder")
   - Update `package.json` with your publisher name

2. **Install vsce**
   ```bash
   npm install -g @vscode/vsce
   ```

3. **Personal Access Token**
   - Go to https://dev.azure.com
   - User Settings → Personal Access Tokens
   - Create token with "Marketplace (Manage)" scope
   - Save token securely

### For Open VSX Registry (Cursor IDE, VSCodium, etc.)

1. **Open VSX Account**
   - Create account at https://open-vsx.org/
   - Log in with GitHub account

2. **Install ovsx CLI**
   ```bash
   npm install -g ovsx
   ```

3. **Personal Access Token**
   - Go to https://open-vsx.org/user-settings/tokens
   - Generate a new access token
   - Save token securely (different from Microsoft token)

4. **⚠️ IMPORTANT: Claim Namespace Ownership (ONE-TIME, REQUIRED)**

   After publishing, your extension will show with a warning icon ⚠️ until you claim namespace ownership.

   **To get verified status:**
   - Go to https://github.com/EclipseFdn/open-vsx.org/issues
   - Create a new issue requesting namespace ownership
   - Title: `Request ownership of namespace: aidrivencoder`
   - Provide justification (you're the extension author/maintainer)
   - Wait for approval from Eclipse Foundation
   - Once approved, your extension will show with a verified shield icon ✓

   **This is a one-time process per namespace and is required to:**
   - Remove the warning icon from your extension
   - Display your extension as "verified"
   - Get full control over namespace members and permissions

## Publishing Steps

### 1. Update Version

Update version in `package.json`:
```json
{
  "version": "0.1.3"
}
```

Update `CHANGELOG.md` with new version entry.

### 2. Build Extension

```bash
npm install
npm run compile
```

### 3. Package Extension

```bash
vsce package
```

This creates a `.vsix` file you can test locally.

### 4. Test Locally

1. Install the `.vsix` file in VS Code:
   - Extensions → "..." → "Install from VSIX..."
   - Select the generated `.vsix` file

2. Test all features:
   - Open a `.manifest.json` file
   - Verify diagnostics appear
   - Test auto-install prompt
   - Test code actions and hover

### 5. Publish to Marketplaces

#### Publish to Microsoft VS Code Marketplace

**First time publishing:**
```bash
vsce publish
```

You'll be prompted for:
- Personal Access Token
- Publisher name (if not set in package.json)

**Subsequent updates:**
```bash
vsce publish
```

The version must be incremented from the previous release.

#### Publish to Open VSX Registry

**First time publishing (create namespace):**
```bash
# Create your publisher namespace (one-time setup)
ovsx create-namespace <your-publisher-name> -p <your-open-vsx-token>

# Publish the extension
ovsx publish -p <your-open-vsx-token>
```

**Subsequent updates:**
```bash
ovsx publish -p <your-open-vsx-token>
```

**Publish from .vsix file:**
```bash
ovsx publish vscode-maid-0.1.3.vsix -p <your-open-vsx-token>
```

**Complete workflow (publish to both marketplaces):**
```bash
# 1. Build and package
npm run compile
vsce package

# 2. Publish to Microsoft Marketplace
vsce publish

# 3. Publish to Open VSX (uses same .vsix)
ovsx publish -p <your-open-vsx-token>
```

## Alternative: Manual Upload

### Microsoft Marketplace
1. Package the extension: `vsce package`
2. Go to https://marketplace.visualstudio.com/manage
3. Click "New extension" → "Visual Studio Code"
4. Upload the `.vsix` file
5. Fill in marketplace metadata
6. Submit for review

### Open VSX Registry
1. Package the extension: `vsce package`
2. Go to https://open-vsx.org/user-settings/extensions
3. Click "Upload Extension"
4. Select the `.vsix` file
5. Extension is published immediately (no review process)

## Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

## Marketplace Metadata

Ensure `package.json` includes:
- ✅ `displayName` - User-friendly name
- ✅ `description` - Detailed description
- ✅ `categories` - Extension categories
- ✅ `keywords` - Search keywords
- ✅ `repository` - GitHub repository URL
- ✅ `homepage` - Project homepage
- ✅ `bugs` - Issues URL
- ✅ `license` - License type

## Post-Publishing

1. **Update README** with marketplace badge:
   ```markdown
   [![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://marketplace.visualstudio.com/items?itemName=aidrivencoder.vscode-maid)
   ```

2. **Create GitHub Release**:
   - Tag: `v0.1.2`
   - Upload `.vsix` file
   - Copy changelog entry

3. **Announce** on:
   - GitHub Discussions
   - Social media
   - Project documentation

## Troubleshooting

### Microsoft Marketplace Issues

**"Extension name already exists"**
- Choose a different name or use your publisher prefix

**"Invalid publisher"**
- Create publisher at marketplace.visualstudio.com/manage
- Update `package.json` with correct publisher

**"Version already exists"**
- Increment version in `package.json`
- Update `CHANGELOG.md`

**Publishing fails**
- Check Personal Access Token permissions
- Verify publisher name matches
- Ensure all required fields in `package.json`

### Open VSX Issues

**⚠️ "Extension shows warning icon / not verified"**

This is NORMAL for newly published extensions. To fix:

1. Your extension is published but shows as "unverified" until you claim namespace ownership
2. Go to https://github.com/EclipseFdn/open-vsx.org/issues
3. Create issue: "Request ownership of namespace: `aidrivencoder`"
4. Explain you're the extension author/maintainer
5. Wait for Eclipse Foundation approval (usually a few days)
6. Once approved, warning icon disappears and verified shield icon ✓ appears

**This is a ONE-TIME process per namespace and must be done for verified status.**

**"Namespace does not exist"**
- Create namespace first: `ovsx create-namespace <publisher-name> -p <token>`

**"Namespace already exists"**
- You can only create a namespace that matches your account name
- Or request access to an existing namespace

**"Invalid access token"**
- Verify token at https://open-vsx.org/user-settings/tokens
- Make sure you're using Open VSX token, not Microsoft token

**Extension not showing in Cursor IDE**
- Restart Cursor IDE after publishing
- Search for exact extension name in Extensions marketplace
- Check Open VSX registry: https://open-vsx.org/extension/<publisher>/<extension-name>

## Published Extension Information

### Microsoft VS Code Marketplace

**Extension successfully published on January 9, 2026**

- **Extension ID**: `aidrivencoder.vscode-maid`
- **Display Name**: MAID - Manifest-driven AI Development
- **Current Version**: 0.1.3
- **Publisher**: aidrivencoder
- **Marketplace URL**: https://marketplace.visualstudio.com/items?itemName=aidrivencoder.vscode-maid
- **Management Hub**: https://marketplace.visualstudio.com/manage/publishers/aidrivencoder/extensions/vscode-maid/hub
- **Publisher Profile**: https://marketplace.visualstudio.com/publishers/aidrivencoder

**Installation Command:**
```bash
code --install-extension aidrivencoder.vscode-maid
```

### Open VSX Registry

**Status**: Published (awaiting namespace ownership claim for verification)

**Open VSX URL**: https://open-vsx.org/extension/aidrivencoder/vscode-maid

**Installation:**
- Available in Cursor IDE Extensions marketplace
- Search for "MAID" or "vscode-maid"

**⚠️ Verification Status:**
- Extension currently shows warning icon until namespace ownership is claimed
- Create issue at https://github.com/EclipseFdn/open-vsx.org/issues to claim ownership
- Once approved, extension will show verified shield icon ✓

### Publishing Notes
- Display name was changed from "MAID for VS Code" to "MAID - Manifest-driven AI Development" to avoid similarity with existing "Marp for VS Code" extension
- Extension uses esbuild for bundling to ensure all dependencies are included in the package
- Bundled extension size: ~349KB (single file)
- Total package size: ~89KB (compressed)

### Version History
- **v0.1.3** (2026-01-09): Added automatic maid-lsp version checking with smart update detection
- **v0.1.2** (2026-01-09): Initial release with LSP integration and bundling support

## CI/CD (Optional)

Set up GitHub Actions for automatic publishing to both marketplaces:

```yaml
# .github/workflows/publish.yml
name: Publish Extension
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @vscode/vsce ovsx
      - run: npm install
      - run: npm run compile

      # Publish to Microsoft VS Code Marketplace
      - run: vsce publish -p ${{ secrets.VSCE_PAT }}

      # Publish to Open VSX Registry
      - run: ovsx publish -p ${{ secrets.OVSX_PAT }}
```

Store tokens as secrets in GitHub repository settings:
- `VSCE_PAT` - Microsoft Marketplace Personal Access Token
- `OVSX_PAT` - Open VSX Personal Access Token
