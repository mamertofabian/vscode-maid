# Publishing Guide

This guide explains how to publish the MAID LSP extension to the VS Code Marketplace.

## Prerequisites

1. **VS Code Publisher Account**
   - Go to https://marketplace.visualstudio.com/manage
   - Sign in with your Microsoft/GitHub account
   - Create a publisher (e.g., "maid-team")
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

### 5. Publish to Marketplace

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

## Alternative: Manual Upload

1. Package the extension: `vsce package`
2. Go to https://marketplace.visualstudio.com/manage
3. Click "New extension" → "Visual Studio Code"
4. Upload the `.vsix` file
5. Fill in marketplace metadata
6. Submit for review

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
   [![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://marketplace.visualstudio.com/items?itemName=maid-team.maid-lsp)
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

### "Extension name already exists"
- Choose a different name or use your publisher prefix

### "Invalid publisher"
- Create publisher at marketplace.visualstudio.com/manage
- Update `package.json` with correct publisher

### "Version already exists"
- Increment version in `package.json`
- Update `CHANGELOG.md`

### Publishing fails
- Check Personal Access Token permissions
- Verify publisher name matches
- Ensure all required fields in `package.json`

## CI/CD (Optional)

Set up GitHub Actions for automatic publishing:

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
      - run: npm install -g @vscode/vsce
      - run: npm install
      - run: npm run compile
      - run: vsce publish -p ${{ secrets.VSCE_PAT }}
```

Store Personal Access Token as `VSCE_PAT` secret in GitHub repository settings.
