---
allowed-tools: Bash(git:*), Bash(npm:*), Bash(vsce:*), Bash(gh:*), Bash(ls:*), Bash(rm:*), Bash(code:*), Read, Edit
argument-hint: [version]
description: Publish VS Code extension to marketplace with proper release workflow
---

# Publish VS Code Extension

Complete workflow for publishing a VS Code extension to the Visual Studio Marketplace and creating a GitHub release.

## Prerequisites Check

1. Verify you're in a VS Code extension project directory
2. Check that package.json exists and has required fields
3. Verify git working tree is clean (all changes committed)

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

### 5. Publish to Marketplace

- Run `vsce publish`
- If this is first time: user will be prompted for Personal Access Token
  - Direct them to: https://dev.azure.com/_usersSettings/tokens
  - Token needs "Marketplace (Manage)" scope
- Capture and display the marketplace URLs from output

### 6. Update README Badge

- Check if README.md has marketplace badge
- If not, add at top of README:
  ```markdown
  [![Version](https://img.shields.io/badge/version-<VERSION>-blue.svg)](https://marketplace.visualstudio.com/items?itemName=<PUBLISHER>.<NAME>)
  ```
- Commit if changed

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
  - Marketplace URL
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
- 📦 Marketplace URL
- 🚀 GitHub Release URL
- 📝 Installation command: `code --install-extension <publisher>.<name>`

## Error Handling

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

## Notes

- Always run quality checks before publishing
- Test locally when possible
- Keep CHANGELOG.md up to date
- Tag releases in git for traceability
- Document all published versions in PUBLISHING.md
