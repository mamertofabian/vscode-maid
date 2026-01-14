/**
 * Behavioral tests for src/utils.ts
 * Tests focus on observable behavior, not implementation details
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import {
  setOutputChannel,
  getOutputChannel,
  log,
  getWorkspaceRoot,
  getMaidRoot,
  isManifestFile,
  isManifestPath,
  findManifestFiles,
  debounce,
  throttle,
} from "../src/utils";
import { mockVscode } from "./vscode-mock";

// Mock child_process
vi.mock("child_process", () => {
  const execAsync = vi.fn();
  return {
    exec: vi.fn(),
    promisify: vi.fn(() => execAsync),
  };
});

describe("utils", () => {
  let mockChannel: vscode.OutputChannel;
  let appendLineMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    appendLineMock = vi.fn();
    mockChannel = {
      appendLine: appendLineMock,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;
    setOutputChannel(mockChannel);
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  describe("setOutputChannel and getOutputChannel", () => {
    it("should set and retrieve the output channel", () => {
      const channel = getOutputChannel();
      expect(channel).toBe(mockChannel);
    });

    it("should return undefined when no channel is set", () => {
      setOutputChannel(undefined as vscode.OutputChannel | undefined);
      const channel = getOutputChannel();
      expect(channel).toBeUndefined();
    });
  });

  describe("log", () => {
    it("should append log messages to the output channel with timestamp and prefix", () => {
      log("Test message");
      expect(appendLineMock).toHaveBeenCalled();
      const callArg = appendLineMock.mock.calls[0]?.[0] as string;
      expect(callArg).toContain("Test message");
      expect(callArg).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
      expect(callArg).toContain("[INFO]");
    });

    it("should use ERROR prefix for error level", () => {
      log("Error message", "error");
      const callArg = appendLineMock.mock.calls[0]?.[0] as string;
      expect(callArg).toContain("[ERROR]");
    });

    it("should use WARN prefix for warn level", () => {
      log("Warning message", "warn");
      const callArg = appendLineMock.mock.calls[0]?.[0] as string;
      expect(callArg).toContain("[WARN]");
    });

    it("should not append when no output channel is set", () => {
      setOutputChannel(undefined as vscode.OutputChannel | undefined);
      log("Message");
      expect(appendLineMock).not.toHaveBeenCalled();
    });
  });

  describe("isManifestPath", () => {
    it("should return true for paths ending with .manifest.json", () => {
      expect(isManifestPath("test.manifest.json")).toBe(true);
      expect(isManifestPath("/path/to/file.manifest.json")).toBe(true);
    });

    it("should return false for paths not ending with .manifest.json", () => {
      expect(isManifestPath("test.json")).toBe(false);
      expect(isManifestPath("manifest.json")).toBe(false);
      expect(isManifestPath("test.manifest")).toBe(false);
    });
  });

  describe("isManifestFile", () => {
    it("should return true for URIs with .manifest.json path", () => {
      const uri = vscode.Uri.file("/path/to/test.manifest.json");
      expect(isManifestFile(uri)).toBe(true);
    });

    it("should return false for URIs without .manifest.json path", () => {
      const uri = vscode.Uri.file("/path/to/test.json");
      expect(isManifestFile(uri)).toBe(false);
    });
  });

  describe("getWorkspaceRoot", () => {
    it("should return the first workspace folder path when available", () => {
      (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
        { uri: { fsPath: "/workspace/path" } } as vscode.WorkspaceFolder,
      ];
      const root = getWorkspaceRoot();
      expect(root).toBe("/workspace/path");
    });

    it("should return undefined when no workspace folders exist", () => {
      (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [];
      const root = getWorkspaceRoot();
      expect(root).toBeUndefined();
    });
  });

  describe("getMaidRoot", () => {
    it("should return the parent directory of the manifests folder", () => {
      const manifestPath = "/project/apps/frontend/manifests/task-001.manifest.json";
      const root = getMaidRoot(manifestPath);
      expect(root).toBe("/project/apps/frontend");
    });

    it("should handle nested manifest paths correctly", () => {
      const manifestPath = "/root/manifests/task-001.manifest.json";
      const root = getMaidRoot(manifestPath);
      expect(root).toBe("/root");
    });
  });

  describe("debounce", () => {
    it("should delay function execution until after the delay period", async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous calls when called multiple times", async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to the debounced function", async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced("arg1", "arg2");

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });
  });

  describe("throttle", () => {
    it("should limit function calls to once per limit period", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should allow calls after the limit period", async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);

      throttled();
      await new Promise((resolve) => setTimeout(resolve, 60));
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should pass arguments to the throttled function", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled("arg1", "arg2");

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });
  });

  describe("findManifestFiles", () => {
    it("should call workspace.findFiles with correct pattern", async () => {
      const mockUris = [vscode.Uri.file("/path/to/manifest.manifest.json")];
      (
        vi.mocked(mockVscode.workspace.findFiles) as unknown as {
          mockResolvedValue: (value: vscode.Uri[]) => void;
        }
      ).mockResolvedValue(mockUris);

      const result = await findManifestFiles();

      expect(mockVscode.workspace.findFiles).toHaveBeenCalledWith(
        "**/*.manifest.json",
        "**/node_modules/**"
      );
      expect(result).toEqual(mockUris);
    });
  });
});
