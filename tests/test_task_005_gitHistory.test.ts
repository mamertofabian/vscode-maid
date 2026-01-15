/**
 * Behavioral tests for src/gitHistory.ts
 */

import { describe, it, expect, vi } from "vitest";
import "./vscode-mock";
import {
  isGitRepository,
  getGitRoot,
  getCommitDiff,
  getDiffBetweenCommits,
  getFileAtCommit,
  getManifestHistory,
} from "../src/gitHistory";
import { executeCommand } from "../src/utils";

vi.mock("../src/utils", () => ({
  executeCommand: vi.fn(),
  log: vi.fn(),
  getWorkspaceRoot: vi.fn(() => "/workspace"),
}));

describe("gitHistory", () => {
  describe("isGitRepository", () => {
    it("should return true when git rev-parse succeeds", async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: "/workspace",
        stderr: "",
        exitCode: 0,
      });

      const result = await isGitRepository("/workspace");
      expect(result).toBe(true);
      expect(executeCommand).toHaveBeenCalledWith(
        "git rev-parse --show-toplevel",
        "/workspace",
        5000
      );
    });

    it("should return false when git rev-parse fails", async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "not a git repository",
        exitCode: 128,
      });

      const result = await isGitRepository("/workspace");
      expect(result).toBe(false);
    });
  });

  describe("getGitRoot", () => {
    it("should return git root path when command succeeds", async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: "/workspace\n",
        stderr: "",
        exitCode: 0,
      });

      const result = await getGitRoot("/workspace");
      expect(result).toBe("/workspace");
    });

    it("should return null when command fails", async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "not a git repository",
        exitCode: 128,
      });

      const result = await getGitRoot("/workspace");
      expect(result).toBeNull();
    });
  });

  describe("getCommitDiff", () => {
    it("should return diff for a commit", async () => {
      const manifestPath = "/workspace/manifests/task.manifest.json";
      const commitHash = "abc123";
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: "diff content",
        stderr: "",
        exitCode: 0,
      });

      const result = await getCommitDiff(manifestPath, commitHash);
      expect(result).toBeDefined();
    });
  });

  describe("getDiffBetweenCommits", () => {
    it("should return diff between two commits", async () => {
      const manifestPath = "/workspace/manifests/task.manifest.json";
      const commitHash1 = "abc123";
      const commitHash2 = "def456";
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: "diff content between commits",
        stderr: "",
        exitCode: 0,
      });

      const result = await getDiffBetweenCommits(manifestPath, commitHash1, commitHash2);
      expect(result).toBeDefined();
    });
  });

  describe("getFileAtCommit", () => {
    it("should return file content at a specific commit", async () => {
      const manifestPath = "/workspace/manifests/task.manifest.json";
      const commitHash = "abc123";
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: '{"goal": "test"}',
        stderr: "",
        exitCode: 0,
      });

      const result = await getFileAtCommit(manifestPath, commitHash);
      expect(result).toBeDefined();
    });
  });

  describe("getManifestHistory", () => {
    it("should return commit history for a manifest", async () => {
      const manifestPath = "/workspace/manifests/task.manifest.json";
      const maxCommits = 10;
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        stdout: "abc123|Author|2024-01-01|Commit message",
        stderr: "",
        exitCode: 0,
      });

      const result = await getManifestHistory(manifestPath, maxCommits);
      expect(result).toBeDefined();
    });
  });
});
