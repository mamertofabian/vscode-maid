/**
 * Git History Service for the MAID VS Code extension.
 * Retrieves commit history for manifest files using Git commands.
 */

import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { log, getWorkspaceRoot, executeCommand } from "./utils";
import type { CommitHistory } from "./types";

const execAsync = promisify(exec);

/**
 * Check if a workspace is a Git repository.
 */
export async function isGitRepository(workspacePath: string): Promise<boolean> {
  try {
    const result = await executeCommand(
      "git rev-parse --show-toplevel",
      workspacePath,
      5000
    );
    return result.success;
  } catch (error) {
    log(`Error checking Git repository: ${error}`, "error");
    return false;
  }
}

/**
 * Get the Git root directory for a workspace.
 */
export async function getGitRoot(workspacePath: string): Promise<string | null> {
  try {
    const result = await executeCommand(
      "git rev-parse --show-toplevel",
      workspacePath,
      5000
    );
    if (result.success && result.stdout.trim()) {
      return result.stdout.trim();
    }
    return null;
  } catch (error) {
    log(`Error getting Git root: ${error}`, "error");
    return null;
  }
}

/**
 * Get the relative path of a file from the Git root.
 */
async function getGitRelativePath(
  filePath: string,
  gitRoot: string
): Promise<string> {
  // Ensure both arguments are strings
  if (typeof filePath !== "string" || typeof gitRoot !== "string") {
    log(`Invalid path arguments: filePath=${typeof filePath} (${String(filePath)}), gitRoot=${typeof gitRoot} (${String(gitRoot)})`, "error");
    throw new Error(`Invalid path arguments: expected strings, got ${typeof filePath} and ${typeof gitRoot}`);
  }

  // Ensure paths are not empty
  if (!filePath || !gitRoot) {
    log(`Empty path arguments: filePath="${filePath}", gitRoot="${gitRoot}"`, "error");
    throw new Error(`Empty path arguments`);
  }

  try {
    // Convert to strings explicitly and normalize
    const normalizedGitRoot = String(path.normalize(String(gitRoot)));
    const normalizedFilePath = String(path.normalize(String(filePath)));
    
    log(`Computing relative path: from="${normalizedGitRoot}", to="${normalizedFilePath}"`);
    
    // Ensure both are still strings before calling path.relative
    if (typeof normalizedGitRoot !== "string" || typeof normalizedFilePath !== "string") {
      log(`Path normalization failed: gitRoot type=${typeof normalizedGitRoot}, filePath type=${typeof normalizedFilePath}`, "error");
      throw new Error(`Path normalization failed`);
    }
    
    const relativePath = path.relative(normalizedGitRoot, normalizedFilePath);
    
    // Normalize path separators for Git (use forward slashes)
    const gitPath = String(relativePath).replace(/\\/g, "/");
    log(`Computed relative path: "${gitPath}"`);
    return gitPath;
  } catch (error: any) {
    log(`Error computing relative path: ${error.message || error}`, "error");
    log(`  filePath: ${filePath} (type: ${typeof filePath}, length: ${filePath?.length})`);
    log(`  gitRoot: ${gitRoot} (type: ${typeof gitRoot}, length: ${gitRoot?.length})`);
    throw error;
  }
}

/**
 * Get commit history for a manifest file.
 */
export async function getManifestHistory(
  manifestPath: string,
  maxCommits: number = 50
): Promise<CommitHistory[]> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    log("No workspace root available", "error");
    return [];
  }

  const gitRoot = await getGitRoot(workspaceRoot);
  if (!gitRoot) {
    log("Not a Git repository", "warn");
    return [];
  }

  // Validate paths
  if (typeof manifestPath !== "string") {
    log(`Invalid manifest path: ${typeof manifestPath}`, "error");
    return [];
  }
  if (typeof gitRoot !== "string") {
    log(`Invalid git root: ${typeof gitRoot}`, "error");
    return [];
  }

  try {
    const relativePath = await getGitRelativePath(manifestPath, gitRoot);
    log(`Getting Git history for: ${relativePath}`);

    // Git log format: hash|author|email|date|message
    // Using --follow to track file renames
    // Using --date=iso-strict for consistent date parsing
    const gitLogCommand = `git log --follow --format="%H|%an|%ae|%ad|%s" --date=iso-strict -n ${maxCommits} -- "${relativePath}"`;

    const result = await executeCommand(gitLogCommand, gitRoot, 30000);
    if (!result.success) {
      log(`Git log failed: ${result.stderr}`, "error");
      return [];
    }

    if (!result.stdout.trim()) {
      log(`No Git history found for ${relativePath}`, "info");
      return [];
    }

    const commits: CommitHistory[] = [];
    const lines = result.stdout.trim().split("\n");

    for (const line of lines) {
      const parts = line.split("|");
      if (parts.length < 5) continue;

      const [hash, author, email, dateStr, ...messageParts] = parts;
      const message = messageParts.join("|"); // Rejoin in case message contains |

      try {
        const date = new Date(dateStr);
        const shortHash = hash.substring(0, 7);

        // Get diff stats for this commit
        const stats = await getCommitStats(gitRoot, hash, relativePath);

        commits.push({
          hash,
          shortHash,
          author,
          email,
          date,
          message,
          changes: stats,
        });
      } catch (error) {
        log(`Error parsing commit ${hash}: ${error}`, "warn");
      }
    }

    log(`Retrieved ${commits.length} commits for ${relativePath}`);
    return commits;
  } catch (error) {
    log(`Error getting manifest history: ${error}`, "error");
    return [];
  }
}

/**
 * Get diff statistics for a commit (added/removed lines).
 */
async function getCommitStats(
  gitRoot: string,
  commitHash: string,
  relativePath: string
): Promise<{ added: number; removed: number; modified: number }> {
  try {
    // Get the parent commit hash
    const parentResult = await executeCommand(
      `git rev-parse ${commitHash}^`,
      gitRoot,
      5000
    );

    if (!parentResult.success) {
      // This might be the first commit, no parent
      return { added: 0, removed: 0, modified: 0 };
    }

    const parentHash = parentResult.stdout.trim();
    const diffResult = await executeCommand(
      `git diff --numstat ${parentHash} ${commitHash} -- "${relativePath}"`,
      gitRoot,
      5000
    );

    if (!diffResult.success || !diffResult.stdout.trim()) {
      return { added: 0, removed: 0, modified: 0 };
    }

    // Parse numstat output: added removed filename
    const stats = diffResult.stdout.trim().split("\n");
    let added = 0;
    let removed = 0;

    for (const stat of stats) {
      const parts = stat.trim().split(/\s+/);
      if (parts.length >= 2) {
        const add = parseInt(parts[0], 10) || 0;
        const rem = parseInt(parts[1], 10) || 0;
        added += add;
        removed += rem;
      }
    }

    return {
      added,
      removed,
      modified: added + removed > 0 ? 1 : 0,
    };
  } catch (error) {
    log(`Error getting commit stats: ${error}`, "warn");
    return { added: 0, removed: 0, modified: 0 };
  }
}

/**
 * Get the diff for a specific commit.
 */
export async function getCommitDiff(
  manifestPath: string,
  commitHash: string
): Promise<string | null> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  const gitRoot = await getGitRoot(workspaceRoot);
  if (!gitRoot) {
    return null;
  }

  // Validate paths
  if (typeof manifestPath !== "string" || typeof gitRoot !== "string") {
    log(`Invalid path arguments in getCommitDiff: manifestPath=${typeof manifestPath}, gitRoot=${typeof gitRoot}`, "error");
    return null;
  }

  try {
    const relativePath = await getGitRelativePath(manifestPath, gitRoot);

    // Get parent commit
    const parentResult = await executeCommand(
      `git rev-parse ${commitHash}^`,
      gitRoot,
      5000
    );

    if (!parentResult.success) {
      // First commit, show full file
      const fileResult = await executeCommand(
        `git show ${commitHash}:${relativePath}`,
        gitRoot,
        5000
      );
      return fileResult.success ? fileResult.stdout : null;
    }

    const parentHash = parentResult.stdout.trim();
    const diffResult = await executeCommand(
      `git diff ${parentHash} ${commitHash} -- "${relativePath}"`,
      gitRoot,
      10000
    );

    return diffResult.success ? diffResult.stdout : null;
  } catch (error) {
    log(`Error getting commit diff: ${error}`, "error");
    return null;
  }
}

/**
 * Get file content at a specific commit.
 */
export async function getFileAtCommit(
  manifestPath: string,
  commitHash: string
): Promise<string | null> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  const gitRoot = await getGitRoot(workspaceRoot);
  if (!gitRoot) {
    return null;
  }

  // Validate paths
  if (typeof manifestPath !== "string" || typeof gitRoot !== "string") {
    log(`Invalid path arguments in getFileAtCommit: manifestPath=${typeof manifestPath}, gitRoot=${typeof gitRoot}`, "error");
    return null;
  }

  try {
    const relativePath = await getGitRelativePath(manifestPath, gitRoot);

    const result = await executeCommand(
      `git show ${commitHash}:${relativePath}`,
      gitRoot,
      10000
    );

    return result.success ? result.stdout : null;
  } catch (error) {
    log(`Error getting file at commit: ${error}`, "error");
    return null;
  }
}

/**
 * Get diff between two commits.
 */
export async function getDiffBetweenCommits(
  manifestPath: string,
  commitHash1: string,
  commitHash2: string
): Promise<string | null> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  const gitRoot = await getGitRoot(workspaceRoot);
  if (!gitRoot) {
    return null;
  }

  // Validate paths
  if (typeof manifestPath !== "string" || typeof gitRoot !== "string") {
    log(`Invalid path arguments in getDiffBetweenCommits: manifestPath=${typeof manifestPath}, gitRoot=${typeof gitRoot}`, "error");
    return null;
  }

  try {
    const relativePath = await getGitRelativePath(manifestPath, gitRoot);

    const result = await executeCommand(
      `git diff ${commitHash1} ${commitHash2} -- "${relativePath}"`,
      gitRoot,
      10000
    );

    return result.success ? result.stdout : null;
  } catch (error) {
    log(`Error getting diff between commits: ${error}`, "error");
    return null;
  }
}
