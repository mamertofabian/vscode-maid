/**
 * Utility functions for the MAID VS Code extension.
 * Includes CLI execution helpers and common operations.
 */

import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  CommandResult,
  LogLevel,
  ValidationResult,
  ManifestsResult,
  MaidFilesResult,
} from "./types";

const execAsync = promisify(exec);

// Shared output channel reference (set by extension.ts)
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Set the shared output channel for logging.
 */
export function setOutputChannel(channel: vscode.OutputChannel): void {
  outputChannel = channel;
}

/**
 * Get the shared output channel.
 */
export function getOutputChannel(): vscode.OutputChannel | undefined {
  return outputChannel;
}

/**
 * Log a message to the output channel.
 */
export function log(message: string, level: LogLevel = "info"): void {
  if (!outputChannel) {
    return;
  }
  const timestamp = new Date().toISOString();
  const prefix =
    level === "error" ? "ERROR" : level === "warn" ? "WARN" : "INFO";
  outputChannel.appendLine(`[${timestamp}] [${prefix}] ${message}`);
}

/**
 * Execute a CLI command and return the result.
 */
export async function executeCommand(
  command: string,
  cwd?: string,
  timeout = 30000
): Promise<CommandResult> {
  try {
    log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    log(`Command completed successfully`);
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    log(`Command failed: ${error.message}`, "error");
    return {
      success: false,
      stdout: error.stdout?.trim() || "",
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * Execute a MAID CLI command with JSON output.
 */
export async function executeMaidCommand<T>(
  args: string,
  cwd?: string
): Promise<T | null> {
  const workspaceFolder = cwd || getWorkspaceRoot();
  if (!workspaceFolder) {
    log("No workspace folder available for MAID command", "warn");
    return null;
  }

  const result = await executeCommand(`maid ${args}`, workspaceFolder);
  if (!result.success) {
    log(`MAID command failed: ${result.stderr}`, "error");
    return null;
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    log(`Failed to parse MAID output as JSON: ${error}`, "error");
    return null;
  }
}

/**
 * Run maid validate with JSON output.
 */
export async function runValidation(
  manifestPath?: string
): Promise<ValidationResult | null> {
  if (manifestPath) {
    // Use MAID root as working directory
    const maidRoot = getMaidRoot(manifestPath);
    const relativeManifestPath = path.relative(maidRoot, manifestPath);
    const args = `validate "${relativeManifestPath}" --json-output`;
    return executeMaidCommand<ValidationResult>(args, maidRoot);
  } else {
    const args = "validate --json-output";
    return executeMaidCommand<ValidationResult>(args);
  }
}

/**
 * Get manifests list with JSON output.
 */
export async function getManifests(): Promise<ManifestsResult | null> {
  return executeMaidCommand<ManifestsResult>("manifests --json-output");
}

/**
 * Get tracked files with JSON output.
 */
export async function getTrackedFiles(): Promise<MaidFilesResult | null> {
  return executeMaidCommand<MaidFilesResult>("files --json");
}

/**
 * Check if maid-lsp is installed.
 */
export async function checkMaidLspInstalled(): Promise<boolean> {
  try {
    log("Checking if maid-lsp is installed...");
    log(`Current PATH: ${process.env.PATH}`);
    const { stdout, stderr } = await execAsync("maid-lsp --version");
    log(`maid-lsp found! stdout: ${stdout.trim()}`);
    if (stderr) {
      log(`maid-lsp stderr: ${stderr.trim()}`, "warn");
    }
    return true;
  } catch (error: any) {
    log(`maid-lsp not found or error occurred: ${error.message}`, "error");
    return false;
  }
}

/**
 * Check if maid CLI is installed.
 */
export async function checkMaidCliInstalled(): Promise<boolean> {
  try {
    log("Checking if maid CLI is installed...");
    const { stdout } = await execAsync("maid --version");
    log(`maid CLI found! version: ${stdout.trim()}`);
    return true;
  } catch (error: any) {
    log(`maid CLI not found: ${error.message}`, "warn");
    return false;
  }
}

/**
 * Get the installed maid-lsp version.
 */
export async function getInstalledVersion(): Promise<string | null> {
  try {
    log("Checking installed maid-lsp version...");
    const { stdout } = await execAsync("maid-lsp --version");
    log(`maid-lsp --version output: ${stdout.trim()}`);
    const match = stdout.trim().match(/(\d+\.\d+\.\d+)/);
    const version = match ? match[1] : null;
    log(`Extracted version: ${version}`);
    return version;
  } catch (error) {
    log(`Failed to get maid-lsp version: ${error}`, "error");
    return null;
  }
}

/**
 * Get the workspace root folder path.
 */
export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return undefined;
}

/**
 * Get the MAID root directory (where the manifests/ folder is located).
 * This is the root directory for all MAID CLI operations.
 * For example: apps/frontend/manifests/task-005.manifest.json -> apps/frontend/
 */
export function getMaidRoot(manifestPath: string): string {
  // Get the directory containing the manifest file
  const manifestDir = path.dirname(manifestPath);
  // Get the parent of that directory (where manifests/ folder is)
  return path.dirname(manifestDir);
}

/**
 * Check if a file is a manifest file.
 */
export function isManifestFile(uri: vscode.Uri): boolean {
  return uri.fsPath.endsWith(".manifest.json");
}

/**
 * Check if a file is a manifest file by path string.
 */
export function isManifestPath(path: string): boolean {
  return path.endsWith(".manifest.json");
}

/**
 * Get all manifest files in the workspace.
 */
export async function findManifestFiles(): Promise<vscode.Uri[]> {
  return vscode.workspace.findFiles("**/*.manifest.json", "**/node_modules/**");
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function call.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}
