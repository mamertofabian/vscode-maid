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

========================================

<!-- MAID-SECTION-START -->

# MAID Methodology

**This project uses Manifest-driven AI Development (MAID) v1.3**

MAID is a methodology for developing software with AI assistance by explicitly declaring:

- What files can be modified for each task
- What code artifacts (functions, classes, interfaces, types) should be created or modified
- How to validate that the changes meet requirements

This project is compatible with MAID-aware AI agents including Claude Code and other tools that understand the MAID workflow.

## Prerequisites: Installing MAID Runner

MAID Runner is a Python CLI tool that validates manifests and runs tests. Even for TypeScript/JavaScript projects, you need Python to run the `maid` CLI.

**Option 1: Using pipx (recommended - no Python project setup needed)**

```bash
pipx install maid-runner
```

**Option 2: Using pip**

```bash
pip install maid-runner
```

**Option 3: Using uv**

```bash
uv tool install maid-runner
```

After installation, verify with:

```bash
maid --help
```

**Note:** MAID Runner requires Python 3.10+. The `maid` command validates your TypeScript/JavaScript code structure against manifests.

## MAID Workflow

### Phase 1: Goal Definition

Confirm the high-level goal before proceeding.

### Phase 2: Planning Loop

**Before ANY implementation - iterative refinement:**

1. Draft manifest (`manifests/task-XXX.manifest.json`)
2. Draft behavioral tests (`tests/test_task_XXX_*.test.ts`)
3. Run validation: `maid validate manifests/task-XXX.manifest.json --validation-mode behavioral`
4. Refine both tests & manifest until validation passes

### Phase 3: Implementation

1. Load ONLY files from manifest (`editableFiles` + `readonlyFiles`)
2. Implement code to pass tests
3. Run behavioral validation (from `validationCommand`)
4. Iterate until all tests pass

### Phase 4: Integration

Verify complete chain: `npm test` (or `pnpm test` / `yarn test`)

## Manifest Template

```json
{
  "goal": "Clear task description",
  "taskType": "edit|create|refactor",
  "supersedes": [],
  "creatableFiles": [],
  "editableFiles": [],
  "readonlyFiles": [],
  "expectedArtifacts": {
    "file": "path/to/file.ts",
    "contains": [
      {
        "type": "function|class|interface",
        "name": "artifactName",
        "class": "ParentClass",
        "args": [{ "name": "arg1", "type": "string" }],
        "returns": "ReturnType"
      }
    ]
  },
  "validationCommand": ["npm", "test", "--", "file.test.ts"]
}
```

## MAID CLI Commands

**IMPORTANT: Always use the `maid` CLI for validation and snapshots, NOT direct Python scripts.**

### Whole-Codebase Validation (Recommended)

```bash
# Validate ALL active manifests with proper chaining
# Automatically excludes superseded manifests and uses manifest chain
maid validate

# Run ALL validation commands from all active manifests
# Intelligent enough to exclude inactive manifests
maid test
```

**These commands are the primary way to verify complete MAID compliance across the entire codebase.**

### Manifest Creation and Management

```bash
# Create a new manifest for a file (RECOMMENDED - auto-numbers, auto-supersedes snapshots)
maid manifest create <file-path> --goal "Description" [--artifacts JSON] [--dry-run] [--json]

# Key options for manifest create:
#   --goal "Description"          # Required: Task description
#   --artifacts JSON               # Optional: JSON array of artifact definitions
#   --task-type create|edit|refactor  # Optional: Auto-detected if not specified
#   --dry-run                      # Preview manifest without writing
#   --json                         # Output as JSON (for agent consumption)
#   --delete                       # Create deletion manifest (status: absent)
#   --rename-to <new-path>         # Create rename manifest
#   --test-file <path>             # Specify test file path
#   --readonly-files <files>       # Comma-separated readonly dependencies

# Generate a snapshot manifest from existing code
maid snapshot <file-path> [--output-dir <dir>] [--force] [--skip-test-stub]

# Generate system-wide manifest aggregating all active manifests
maid snapshot-system [--output <file>] [--manifest-dir <dir>] [--quiet]
```

### Validation Commands

```bash
# Validate a specific manifest (with optional manifest chain)
maid validate <manifest-path> [--use-manifest-chain] [--quiet]

# Validate all manifests in a directory
maid validate --manifest-dir <dir> [--use-manifest-chain]

# Validation modes
maid validate <manifest-path> --validation-mode behavioral    # Checks tests USE artifacts
maid validate <manifest-path> --validation-mode implementation  # Checks code DEFINES artifacts (default)
maid validate <manifest-path> --validation-mode schema      # Validates manifest structure only

# Important validation options:
#   --use-manifest-chain          # Merge related manifests (enables file tracking analysis)
#   --manifest-dir <dir>           # Validate all manifests in directory
#   --watch / --watch-all          # Watch mode: auto re-validate on changes
#   --coherence / --coherence-only  # Architectural coherence validation
#   --quiet, --verbose             # Control output verbosity
#   --json-output                  # Output results as JSON

# Run validation commands from manifests
maid test [--manifest-dir <dir>] [--fail-fast] [--verbose] [--quiet]

# Run tests for a single manifest
maid test --manifest <manifest-path> [--watch]

# Watch modes (Live TDD workflow)
maid test --manifest <manifest-path> --watch      # Single-manifest watch
maid test --watch-all                            # Multi-manifest watch
```

### Utility Commands

```bash
# List manifests that reference a file
maid manifests <file-path> [--manifest-dir <dir>] [--quiet] [--json-output]

# Show file tracking status (UNDECLARED/REGISTERED/TRACKED)
maid files [--manifest-dir <dir>] [--issues-only] [--status <status>] [--json]

# Generate test stubs from existing manifest
maid generate-stubs <manifest-path>

# Output the manifest JSON schema
maid schema

# Knowledge graph operations
maid graph query "<query>" [--manifest-dir <dir>]
maid graph export --format json|dot|graphml --output <file> [--manifest-dir <dir>]
maid graph analysis --type find-cycles|show-stats [--manifest-dir <dir>]
```

### Quick Reference

```bash
# Whole-Codebase Validation (Primary Commands)
maid validate     # Validate ALL active manifests with proper chaining
maid test         # Run ALL validation commands from active manifests

# Watch Mode (Live TDD workflow)
maid test --manifest manifests/task-XXX.manifest.json --watch  # Single-manifest watch
maid test --watch-all                                          # Multi-manifest watch

# Individual Task Validation Flow
# 1. During Planning: Behavioral validation (checks tests USE artifacts)
maid validate manifests/task-XXX.manifest.json --validation-mode behavioral --use-manifest-chain

# 2. During Implementation: Implementation validation (checks code DEFINES artifacts)
maid validate manifests/task-XXX.manifest.json --validation-mode implementation --use-manifest-chain

# 3. Run actual tests
maid test --manifest manifests/task-XXX.manifest.json

# Manifest Creation Workflow
# 1. Create manifest (preferred over writing manually)
maid manifest create <file-path> --goal "Description" --dry-run  # Preview first
maid manifest create <file-path> --goal "Description"            # Create it

# 2. Validate the manifest
maid validate manifests/task-XXX.manifest.json --validation-mode behavioral

# 3. Write tests, then validate implementation
maid validate manifests/task-XXX.manifest.json --validation-mode implementation
```

### Important Concepts

**File Tracking Analysis**: When using `--use-manifest-chain` in implementation mode, MAID Runner automatically analyzes file tracking compliance:

- 🔴 **UNDECLARED**: Files not in any manifest (high priority - add to manifest)
- 🟡 **REGISTERED**: Files tracked but incomplete compliance (medium priority - add artifacts/tests)
- ✓ **TRACKED**: Files with full MAID compliance

**Watch Modes**: Enable live TDD workflow with automatic re-validation when files change. Perfect for iterative development.

**Validation Modes**:

- **Behavioral**: Verifies test files USE/CALL the declared artifacts (use during Phase 2: Planning)
- **Implementation**: Verifies code DEFINES the artifacts (use during Phase 3: Implementation)
- **Schema**: Validates manifest JSON structure only

**Manifest Creation**: Prefer `maid manifest create` over writing manifests manually. It handles:

- Auto-numbering (finds next available task number)
- Auto-supersession (unfreezes snapshotted files)
- File mode detection (creatableFiles vs editableFiles)
- Validation command generation

### Get Help

````bash
maid --help
maid validate --help
maid manifest create --help
maid snapshot --help
maid test --help
# ... and so on for any command
```"""

## Validation Modes

- **Strict Mode** (`creatableFiles`): Implementation must EXACTLY match `expectedArtifacts`
- **Permissive Mode** (`editableFiles`): Implementation must CONTAIN `expectedArtifacts` (allows existing code)

## Key Rules

**NEVER:** Modify code without manifest | Skip validation | Access unlisted files
**ALWAYS:** Manifest first → Tests → Implementation → Validate

## Manifest Rules (CRITICAL)

**These rules are non-negotiable for maintaining MAID compliance:**

- **Manifest Immutability**: The current task's manifest (e.g., `task-050.manifest.json`) can be modified while actively working on that task. Once you move to the next task, ALL prior manifests become immutable and part of the permanent audit trail. NEVER modify completed task manifests—this breaks the chronological record of changes.

- **One File Per Manifest**: `expectedArtifacts` is an OBJECT that defines artifacts for a SINGLE file only. It is NOT an array of files. This is a common mistake that will cause validation to fail.

- **Multi-File Changes Require Multiple Manifests**: If your task modifies public APIs in multiple files (e.g., `utils.py` AND `handlers.py`), you MUST create separate sequential manifests—one per file:
  - `task-050-update-utils.manifest.json` → modifies `utils.py`
  - `task-051-update-handlers.manifest.json` → modifies `handlers.py`

- **Definition of Done (Zero Tolerance)**: A task is NOT complete until BOTH validation commands pass with ZERO errors or warnings:
  - `maid validate <manifest-path>` → Must pass 100%
  - `maid test` → Must pass 100%

  Partial completion is not acceptable. All errors must be fixed before proceeding to the next task.

## Artifact Rules

- **Public** (no `_` prefix): MUST be in manifest
- **Private** (`_` prefix): Optional in manifest
- **creatableFiles**: Strict validation (exact match)
- **editableFiles**: Permissive validation (contains at least)

## Superseded Manifests

**Critical:** When a manifest is superseded, it is completely excluded from MAID operations:

- `maid validate` ignores superseded manifests when merging manifest chains
- `maid test` does NOT execute `validationCommand` from superseded manifests
- Superseded manifests serve as historical documentation only—they are archived, not active

## Transitioning from Snapshots to Natural Evolution

**Key Insight:** Snapshot manifests are for "frozen" code. Once code evolves, transition to natural MAID flow:

1. **Snapshot Phase**: Capture complete baseline with `maid snapshot`
2. **Transition Manifest**: When file needs changes, create edit manifest that:
   - Declares ALL current functions (existing + new)
   - Supersedes the snapshot manifest
   - Uses `taskType: "edit"`
3. **Future Evolution**: Subsequent manifests only declare new changes
   - With `--use-manifest-chain`, validator merges all active manifests
   - No need to update previous manifests

## File Deletion Pattern

When removing a file tracked by MAID: Create refactor manifest → Supersede creation manifest → Delete file and tests → Validate deletion.

**Manifest**: `taskType: "refactor"`, supersedes original, `status: "absent"` in expectedArtifacts

**Validation**: File deleted, tests deleted, no remaining imports

## File Rename Pattern

When renaming a file tracked by MAID: Create refactor manifest → Supersede creation manifest → Use `git mv` → Update manifest → Validate rename.

**Manifest**: `taskType: "refactor"`, supersedes original, new filename in `creatableFiles`, same API in `expectedArtifacts` under new location

**Validation**: Old file deleted, new file exists with working functionality, no old imports, git history preserved

**Key difference from deletion**: Rename maintains module's public API continuity under new location.

## Refactoring Private Implementation

MAID provides flexibility for refactoring private implementation details without requiring new manifests:

- **Private code** (functions, classes, variables with `_` prefix) can be refactored freely
- **Internal logic changes** that don't affect the public API are allowed
- **Code quality improvements** (splitting functions, extracting helpers, renaming privates) are permitted

**Requirements:**

- All tests must continue to pass
- All validations must pass (`maid validate`, `maid test`)
- Public API must remain unchanged
- No MAID rules are violated

This breathing room allows practical development without bureaucracy while maintaining accountability for public interface changes.

## Getting Started

1. Create your first manifest (preferred: use `maid manifest create <file-path> --goal "Description"` or manually create `manifests/task-001-<description>.manifest.json`)
2. Write behavioral tests in `tests/test_task_001_*.test.ts`
3. Validate: `maid validate manifests/task-001-<description>.manifest.json --validation-mode behavioral`
4. Implement the code
5. Run tests to verify: `maid test`

## Additional Resources

- **Full MAID Specification**: See `.maid/docs/maid_specs.md` for complete methodology details
- **MAID Runner Repository**: https://github.com/mamertofabian/maid-runner
<!-- MAID-SECTION-END -->
````
