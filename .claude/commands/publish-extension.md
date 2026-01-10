---
allowed-tools: Bash(git:*), Bash(npm:*), Bash(vsce:*), Bash(ovsx:*), Bash(gh:*), Bash(ls:*), Bash(rm:*), Bash(code:*), Read, Edit
argument-hint: [version]
description: Publish VS Code extension to marketplace with proper release workflow
---

# Publish VS Code Extension

Complete workflow for publishing a VS Code extension to both the Visual Studio Marketplace and Open VSX Registry, and creating a GitHub release.

## Prerequisites Check

1. Verify you're in a VS Code extension project directory
2. Check that package.json exists and has required fields
3. Verify git working tree is clean (all changes committed)
4. Check if `ovsx` CLI is installed: `ovsx --version`
   - If not installed: `npm install -g ovsx`
   - Verify Open VSX account exists at https://open-vsx.org/
   - Verify Open VSX token is available (user will need to provide it)

## Steps to Execute

### 1. Version Update (if version argument provided)

If $1 (version argument) is provided:
- Update version in package.json to $1
- Update CHANGELOG.md with new version entry and date
- Commit these changes: `git commit -m "Bump version to $1"`

### 2. Pre-publish Checks

- Run `npm run check-types` (or `tsc --noEmit`) to verify no TypeScript errors
- Run build/compile: `npm run package` or `npm run compile`
- Check for existing .vsix files and note the version

### 3. Package Extension

- Run `vsce package` to create .vsix file
- Verify the package was created successfully
- Check the file size and contents summary

### 4. Test Installation (Optional but Recommended)

Ask user if they want to test the package locally first:
- If yes: `code --install-extension <filename>.vsix --force`
- Wait for user confirmation before proceeding

### 5. Publish to Microsoft VS Code Marketplace

- Run `vsce publish`
- If this is first time: user will be prompted for Personal Access Token
  - Direct them to: https://dev.azure.com/_usersSettings/tokens
  - Token needs "Marketplace (Manage)" scope
- Capture and display the marketplace URLs from output

### 6. Publish to Open VSX Registry

- Ask user for Open VSX Personal Access Token (if not already configured)
  - Direct them to: https://open-vsx.org/user-settings/tokens
  - Token is different from Microsoft Marketplace token
- Check if namespace exists (first time only):
  - If namespace doesn't exist: `ovsx create-namespace <publisher-name> -p <open-vsx-token>`
- Publish to Open VSX using the .vsix file:
  - `ovsx publish <filename>.vsix -p <open-vsx-token>`
  - Or: `ovsx publish -p <open-vsx-token>` (uses package.json)
- Capture and display the Open VSX URL from output
- **Note**: Extension will show warning icon until namespace ownership is claimed (one-time process)
  - Direct user to: https://github.com/EclipseFdn/open-vsx.org/issues
  - Create issue: "Request ownership of namespace: <publisher-name>"

### 7. Create GitHub Release

- Extract current version from package.json
- Extract changelog entries for this version
- Run gh command to create release:
  ```bash
  gh release create v<VERSION> \
    <filename>.vsix \
    --title "v<VERSION> - <TITLE>" \
    --notes "<CHANGELOG_CONTENT>"
  ```
- Include installation instructions in release notes

### 8. Update Documentation

- Update PUBLISHING.md with published extension information:
  - Extension ID
  - Microsoft Marketplace URL
  - Open VSX Registry URL
  - Management Hub URL
  - Version number
  - Publication date
- Commit documentation updates

### 9. Push to Remote

Ask user if they want to push changes to remote:
- `git push origin main`
- `git push --tags`

### 10. Summary

Display final summary with:
- ✅ Published version number
- 📦 Microsoft Marketplace URL
- 📦 Open VSX Registry URL
- 🚀 GitHub Release URL
- 📝 Installation commands:
  - Microsoft: `code --install-extension <publisher>.<name>`
  - Open VSX: Available in Cursor IDE, VSCodium, and other VS Code-compatible editors

## Error Handling

### Microsoft Marketplace Errors

- If `vsce publish` fails with "Similar extension display name":
  - Update displayName in package.json to be more distinctive
  - Commit the change
  - Retry publishing
- If PAT authentication fails:
  - Direct user to create token at https://dev.azure.com/_usersSettings/tokens
  - Run `vsce login <publisher>` first
- If version already exists:
  - User must increment version in package.json
  - Update CHANGELOG.md
  - Commit and retry

### Open VSX Registry Errors

- If "Namespace does not exist":
  - Create namespace first: `ovsx create-namespace <publisher-name> -p <open-vsx-token>`
- If "Invalid access token":
  - Verify token at https://open-vsx.org/user-settings/tokens
  - Make sure using Open VSX token, not Microsoft token
- If "Namespace already exists":
  - This is normal if namespace was created previously
  - Continue with publishing
- If extension shows warning icon after publishing:
  - This is normal for newly published extensions
  - Extension is published but unverified until namespace ownership is claimed
  - Direct user to create issue at https://github.com/EclipseFdn/open-vsx.org/issues
  - Title: "Request ownership of namespace: <publisher-name>"
  - This is a one-time process per namespace

## Notes

- Always run quality checks before publishing
- Test locally when possible
- Keep CHANGELOG.md up to date
- Tag releases in git for traceability
- Document all published versions in PUBLISHING.md
- Both marketplaces use the same .vsix file (package once, publish twice)
- Open VSX namespace ownership claim is a one-time process per namespace
- Open VSX token is different from Microsoft Marketplace token
- Extension will be available in Cursor IDE, VSCodium, and other VS Code-compatible editors after Open VSX publishing