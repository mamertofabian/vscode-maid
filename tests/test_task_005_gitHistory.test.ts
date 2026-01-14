/**
 * Behavioral tests for src/gitHistory.ts
 */

import { describe, it, expect, vi } from "vitest";
import "./vscode-mock";
import { isGitRepository, getGitRoot } from "../src/gitHistory";
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
});
