/**
 * Behavioral tests for task-002-snapshot-utils.manifest
 *
 * Goal: Snapshot of existing code in src/utils.ts
 *
 * These tests verify that the implementation matches the manifest specification.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { mockVscode } from "./vscode-mock";

// Create mock using vi.hoisted - this ensures it's available before module loads
const mocks = vi.hoisted(() => {
  const execAsync = vi.fn();
  return { execAsync };
});

vi.mock("child_process", () => {
  return {
    exec: vi.fn(),
  };
});

vi.mock("util", () => {
  return {
    promisify: vi.fn(() => mocks.execAsync),
  };
});

const execAsyncMock = mocks.execAsync;

import {
  checkMaidCliInstalled,
  checkMaidLspInstalled,
  debounce,
  executeCommand,
  executeMaidCommand,
  findManifestFiles,
  getInstalledVersion,
  getMaidRoot,
  getManifests,
  getOutputChannel,
  getTrackedFiles,
  getWorkspaceRoot,
  isManifestFile,
  isManifestPath,
  log,
  runValidation,
  setOutputChannel,
  throttle,
} from "../src/utils";

describe("checkMaidCliInstalled", () => {
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
    execAsyncMock.mockClear();
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(checkMaidCliInstalled).toBeDefined();
    expect(typeof checkMaidCliInstalled).toBe("function");
  });

  it("should return true when maid CLI is installed", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "maid 1.0.0\n", stderr: "" });
    const result = await checkMaidCliInstalled();
    expect(result).toBe(true);
    expect(execAsyncMock).toHaveBeenCalledWith("maid --version");
    expect(appendLineMock).toHaveBeenCalled();
  });

  it("should return false when maid CLI is not installed", async () => {
    const error = new Error("Command not found");
    execAsyncMock.mockRejectedValueOnce(error);
    const result = await checkMaidCliInstalled();
    expect(result).toBe(false);
    expect(execAsyncMock).toHaveBeenCalledWith("maid --version");
    expect(appendLineMock).toHaveBeenCalled();
  });
});

describe("checkMaidLspInstalled", () => {
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
    execAsyncMock.mockClear();
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(checkMaidLspInstalled).toBeDefined();
    expect(typeof checkMaidLspInstalled).toBe("function");
  });

  it("should return true when maid-lsp is installed", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "maid-lsp 1.0.0\n", stderr: "" });
    const result = await checkMaidLspInstalled();
    expect(result).toBe(true);
    expect(execAsyncMock).toHaveBeenCalledWith("maid-lsp --version");
    expect(appendLineMock).toHaveBeenCalled();
  });

  it("should return false when maid-lsp is not installed", async () => {
    const error = new Error("Command not found");
    execAsyncMock.mockRejectedValueOnce(error);
    const result = await checkMaidLspInstalled();
    expect(result).toBe(false);
    expect(execAsyncMock).toHaveBeenCalledWith("maid-lsp --version");
    expect(appendLineMock).toHaveBeenCalled();
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be defined", () => {
    expect(debounce).toBeDefined();
    expect(typeof debounce).toBe("function");
  });

  it("should delay function execution until after the delay period", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should cancel previous calls when called multiple times", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should pass arguments to the debounced function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced("arg1", "arg2");

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });
});

describe("executeCommand", () => {
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
    execAsyncMock.mockClear();
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(executeCommand).toBeDefined();
    expect(typeof executeCommand).toBe("function");
  });

  it("should return success result when command executes successfully", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "output", stderr: "" });
    const result = await executeCommand("echo test", "/workspace", 5000);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(execAsyncMock).toHaveBeenCalledWith("echo test", {
      cwd: "/workspace",
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });

  it("should return failure result when command fails", async () => {
    const error = {
      message: "Command failed",
      stdout: "some output",
      stderr: "error message",
      code: 1,
    };
    execAsyncMock.mockRejectedValueOnce(error);
    const result = await executeCommand("invalid-command");

    expect(result.success).toBe(false);
    expect(result.stdout).toBe("some output");
    expect(result.stderr).toBe("error message");
    expect(result.exitCode).toBe(1);
  });

  it("should use default timeout when not provided", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "output", stderr: "" });
    await executeCommand("echo test");

    expect(execAsyncMock).toHaveBeenCalledWith("echo test", {
      cwd: undefined,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });
});

describe("executeMaidCommand", () => {
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
    execAsyncMock.mockClear();
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/workspace" } } as vscode.WorkspaceFolder,
    ];
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(executeMaidCommand).toBeDefined();
    expect(typeof executeMaidCommand).toBe("function");
  });

  it("should return parsed JSON when command succeeds", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: '{"key": "value"}', stderr: "" });
    const result = await executeMaidCommand<{ key: string }>("validate --json-output");

    expect(result).toEqual({ key: "value" });
    expect(execAsyncMock).toHaveBeenCalledWith("maid validate --json-output", {
      cwd: "/workspace",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });

  it("should return null when command fails", async () => {
    const error = { message: "Command failed", code: 1 };
    execAsyncMock.mockRejectedValueOnce(error);
    const result = await executeMaidCommand("invalid-command");

    expect(result).toBeNull();
  });

  it("should return null when JSON parsing fails", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "invalid json", stderr: "" });
    const result = await executeMaidCommand("validate --json-output");

    expect(result).toBeNull();
  });

  it("should return null when no workspace folder is available", async () => {
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [];
    const result = await executeMaidCommand("validate --json-output");

    expect(result).toBeNull();
  });

  it("should use provided cwd when specified", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: '{"key": "value"}', stderr: "" });
    await executeMaidCommand("validate --json-output", "/custom/path");

    expect(execAsyncMock).toHaveBeenCalledWith("maid validate --json-output", {
      cwd: "/custom/path",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });
});

describe("findManifestFiles", () => {
  it("should be defined", () => {
    expect(findManifestFiles).toBeDefined();
    expect(typeof findManifestFiles).toBe("function");
  });

  it("should return array of manifest file URIs", async () => {
    const mockUris = [
      vscode.Uri.file("/workspace/manifests/task-001.manifest.json"),
      vscode.Uri.file("/workspace/manifests/task-002.manifest.json"),
    ];
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce(mockUris);

    const result = await findManifestFiles();

    expect(result).toEqual(mockUris);
    expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
      "**/*.manifest.json",
      "**/node_modules/**"
    );
  });

  it("should return empty array when no manifest files found", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([]);

    const result = await findManifestFiles();

    expect(result).toEqual([]);
  });
});

describe("getInstalledVersion", () => {
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
    execAsyncMock.mockClear();
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(getInstalledVersion).toBeDefined();
    expect(typeof getInstalledVersion).toBe("function");
  });

  it("should return version string when maid-lsp is installed", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "maid-lsp 1.2.3\n", stderr: "" });
    const result = await getInstalledVersion();

    expect(result).toBe("1.2.3");
    expect(execAsyncMock).toHaveBeenCalledWith("maid-lsp --version");
  });

  it("should return null when version cannot be extracted", async () => {
    execAsyncMock.mockResolvedValueOnce({ stdout: "no version here", stderr: "" });
    const result = await getInstalledVersion();

    expect(result).toBeNull();
  });

  it("should return null when maid-lsp is not installed", async () => {
    const error = new Error("Command not found");
    execAsyncMock.mockRejectedValueOnce(error);
    const result = await getInstalledVersion();

    expect(result).toBeNull();
  });
});

describe("getMaidRoot", () => {
  it("should be defined", () => {
    expect(getMaidRoot).toBeDefined();
    expect(typeof getMaidRoot).toBe("function");
  });

  it("should return the parent directory of the manifests folder", () => {
    const manifestPath = "/project/apps/frontend/manifests/task-001.manifest.json";
    const result = getMaidRoot(manifestPath);

    expect(result).toBe("/project/apps/frontend");
  });

  it("should handle nested manifest paths correctly", () => {
    const manifestPath = "/root/manifests/task-001.manifest.json";
    const result = getMaidRoot(manifestPath);

    expect(result).toBe("/root");
  });

  it("should handle paths with multiple directory levels", () => {
    const manifestPath = "/a/b/c/d/manifests/task-001.manifest.json";
    const result = getMaidRoot(manifestPath);

    expect(result).toBe("/a/b/c/d");
  });
});

describe("getManifests", () => {
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
    execAsyncMock.mockClear();
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/workspace" } } as vscode.WorkspaceFolder,
    ];
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(getManifests).toBeDefined();
    expect(typeof getManifests).toBe("function");
  });

  it("should return manifests result when command succeeds", async () => {
    const mockResult = {
      manifests: [
        { path: "manifests/task-001.manifest.json", valid: true },
        { path: "manifests/task-002.manifest.json", valid: false },
      ],
    };
    execAsyncMock.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResult),
      stderr: "",
    });

    const result = await getManifests();

    expect(result).toEqual(mockResult);
    expect(execAsyncMock).toHaveBeenCalledWith("maid manifests --json-output", {
      cwd: "/workspace",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });

  it("should return null when command fails", async () => {
    const error = { message: "Command failed", code: 1 };
    execAsyncMock.mockRejectedValueOnce(error);

    const result = await getManifests();

    expect(result).toBeNull();
  });
});

describe("getOutputChannel", () => {
  let mockChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(getOutputChannel).toBeDefined();
    expect(typeof getOutputChannel).toBe("function");
  });

  it("should return the set output channel", () => {
    setOutputChannel(mockChannel);
    const result = getOutputChannel();

    expect(result).toBe(mockChannel);
  });

  it("should return undefined when no channel is set", () => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
    const result = getOutputChannel();

    expect(result).toBeUndefined();
  });
});

describe("getTrackedFiles", () => {
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
    execAsyncMock.mockClear();
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/workspace" } } as vscode.WorkspaceFolder,
    ];
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(getTrackedFiles).toBeDefined();
    expect(typeof getTrackedFiles).toBe("function");
  });

  it("should return tracked files result when command succeeds", async () => {
    const mockResult = {
      undeclared: [],
      registered: [],
      tracked: ["src/utils.ts", "src/types.ts"],
      private_impl: [],
    };
    execAsyncMock.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResult),
      stderr: "",
    });

    const result = await getTrackedFiles();

    expect(result).toEqual(mockResult);
    expect(execAsyncMock).toHaveBeenCalledWith("maid files --json", {
      cwd: "/workspace",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });

  it("should return null when command fails", async () => {
    const error = { message: "Command failed", code: 1 };
    execAsyncMock.mockRejectedValueOnce(error);

    const result = await getTrackedFiles();

    expect(result).toBeNull();
  });
});

describe("getWorkspaceRoot", () => {
  it("should be defined", () => {
    expect(getWorkspaceRoot).toBeDefined();
    expect(typeof getWorkspaceRoot).toBe("function");
  });

  it("should return the first workspace folder path when available", () => {
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/workspace/path" } } as vscode.WorkspaceFolder,
    ];

    const result = getWorkspaceRoot();

    expect(result).toBe("/workspace/path");
  });

  it("should return undefined when no workspace folders exist", () => {
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [];

    const result = getWorkspaceRoot();

    expect(result).toBeUndefined();
  });

  it("should return first folder when multiple workspace folders exist", () => {
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/first/path" } } as vscode.WorkspaceFolder,
      { uri: { fsPath: "/second/path" } } as vscode.WorkspaceFolder,
    ];

    const result = getWorkspaceRoot();

    expect(result).toBe("/first/path");
  });
});

describe("isManifestFile", () => {
  it("should be defined", () => {
    expect(isManifestFile).toBeDefined();
    expect(typeof isManifestFile).toBe("function");
  });

  it("should return true for URIs with .manifest.json path", () => {
    const uri = vscode.Uri.file("/path/to/test.manifest.json");
    const result = isManifestFile(uri);

    expect(result).toBe(true);
  });

  it("should return false for URIs without .manifest.json path", () => {
    const uri = vscode.Uri.file("/path/to/test.json");
    const result = isManifestFile(uri);

    expect(result).toBe(false);
  });

  it("should return false for URIs ending with manifest.json but not .manifest.json", () => {
    const uri = vscode.Uri.file("/path/to/manifest.json");
    const result = isManifestFile(uri);

    expect(result).toBe(false);
  });
});

describe("isManifestPath", () => {
  it("should be defined", () => {
    expect(isManifestPath).toBeDefined();
    expect(typeof isManifestPath).toBe("function");
  });

  it("should return true for paths ending with .manifest.json", () => {
    expect(isManifestPath("test.manifest.json")).toBe(true);
    expect(isManifestPath("/path/to/file.manifest.json")).toBe(true);
  });

  it("should return false for paths not ending with .manifest.json", () => {
    expect(isManifestPath("test.json")).toBe(false);
    expect(isManifestPath("manifest.json")).toBe(false);
    expect(isManifestPath("test.manifest")).toBe(false);
    expect(isManifestPath("test.txt")).toBe(false);
  });
});

describe("log", () => {
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

  it("should be defined", () => {
    expect(log).toBeDefined();
    expect(typeof log).toBe("function");
  });

  it("should append log messages to the output channel with timestamp and INFO prefix", () => {
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
    expect(callArg).toContain("Error message");
  });

  it("should use WARN prefix for warn level", () => {
    log("Warning message", "warn");

    const callArg = appendLineMock.mock.calls[0]?.[0] as string;
    expect(callArg).toContain("[WARN]");
    expect(callArg).toContain("Warning message");
  });

  it("should not append when no output channel is set", () => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
    appendLineMock.mockClear();

    log("Message");

    expect(appendLineMock).not.toHaveBeenCalled();
  });
});

describe("runValidation", () => {
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
    execAsyncMock.mockClear();
    (mockVscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]) = [
      { uri: { fsPath: "/workspace" } } as vscode.WorkspaceFolder,
    ];
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(runValidation).toBeDefined();
    expect(typeof runValidation).toBe("function");
  });

  it("should return validation result when manifest path is provided", async () => {
    const manifestPath = "/workspace/manifests/task-001.manifest.json";
    const mockResult = {
      success: true,
      errors: [],
      warnings: [],
    };
    execAsyncMock.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResult),
      stderr: "",
    });

    const result = await runValidation(manifestPath);

    expect(result).toEqual(mockResult);
    expect(execAsyncMock).toHaveBeenCalledWith(
      'maid validate "manifests/task-001.manifest.json" --json-output',
      {
        cwd: "/workspace",
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );
  });

  it("should return validation result when no manifest path is provided", async () => {
    const mockResult = {
      success: true,
      errors: [],
      warnings: [],
    };
    execAsyncMock.mockResolvedValueOnce({
      stdout: JSON.stringify(mockResult),
      stderr: "",
    });

    const result = await runValidation();

    expect(result).toEqual(mockResult);
    expect(execAsyncMock).toHaveBeenCalledWith("maid validate --json-output", {
      cwd: "/workspace",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
  });

  it("should return null when command fails", async () => {
    const error = { message: "Command failed", code: 1 };
    execAsyncMock.mockRejectedValueOnce(error);

    const result = await runValidation();

    expect(result).toBeNull();
  });
});

describe("setOutputChannel", () => {
  let mockChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;
  });

  afterEach(() => {
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
  });

  it("should be defined", () => {
    expect(setOutputChannel).toBeDefined();
    expect(typeof setOutputChannel).toBe("function");
  });

  it("should set the output channel that can be retrieved", () => {
    setOutputChannel(mockChannel);
    const retrieved = getOutputChannel();

    expect(retrieved).toBe(mockChannel);
  });

  it("should allow setting channel to undefined", () => {
    setOutputChannel(mockChannel);
    setOutputChannel(undefined as vscode.OutputChannel | undefined);
    const retrieved = getOutputChannel();

    expect(retrieved).toBeUndefined();
  });
});

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be defined", () => {
    expect(throttle).toBeDefined();
    expect(typeof throttle).toBe("function");
  });

  it("should limit function calls to once per limit period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should allow calls after the limit period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 50);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should pass arguments to the throttled function", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled("arg1", "arg2");

    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("should ignore calls within the limit period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
