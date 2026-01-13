/**
 * Behavioral tests for task-040: Integration and Registration
 *
 * Tests verify that registerImpactAnalysisCommand and registerHierarchicalViewCommand
 * functions exist in src/extension.ts and can be called with a vscode.ExtensionContext.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";

// Mock vscode-languageclient before importing extension
vi.mock("vscode-languageclient/node", () => ({
  LanguageClient: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn(),
    initializeResult: undefined,
  })),
  LanguageClientOptions: {},
  ServerOptions: {},
}));

vi.mock("../src/utils", async () => {
  const actual = await vi.importActual("../src/utils");
  return {
    ...actual,
    checkMaidLspInstalled: vi.fn().mockResolvedValue(true),
    getInstalledVersion: vi.fn().mockResolvedValue("1.0.0"),
  };
});

const createMockContext = (): vscode.ExtensionContext => {
  return {
    subscriptions: [],
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    },
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
    },
    extensionUri: vscode.Uri.file("/test"),
    extensionPath: "/test",
    storagePath: "/test/storage",
    globalStoragePath: "/test/global-storage",
    logPath: "/test/log",
    extensionMode: 1,
    environmentVariableCollection: {
      replace: vi.fn(),
      append: vi.fn(),
      prepend: vi.fn(),
      get: vi.fn(),
      forEach: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      persistent: false,
      description: "",
      [Symbol.iterator]: vi.fn(),
    } as unknown as vscode.GlobalEnvironmentVariableCollection,
    asAbsolutePath: vi.fn((p: string) => `/test/${p}`),
    storageUri: vscode.Uri.file("/test/storage"),
    globalStorageUri: vscode.Uri.file("/test/global-storage"),
    logUri: vscode.Uri.file("/test/log"),
    secrets: {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn(),
      onDidChange: vi.fn(),
    } as unknown as vscode.SecretStorage,
    extension: {
      id: "test.extension",
      extensionUri: vscode.Uri.file("/test"),
      extensionPath: "/test",
      isActive: true,
      packageJSON: {},
      extensionKind: 1,
      exports: undefined,
      activate: vi.fn(),
    } as unknown as vscode.Extension<unknown>,
    languageModelAccessInformation: {
      onDidChange: vi.fn(),
      canSendRequest: vi.fn(),
    } as unknown as vscode.LanguageModelAccessInformation,
  } as unknown as vscode.ExtensionContext;
};

describe("task-040: Integration and Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(vscode.window.createOutputChannel).mockReturnValue({
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      logLevel: 0,
      onDidChangeLogLevel: { dispose: vi.fn() },
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as vscode.OutputChannel & vscode.LogOutputChannel);

    vi.mocked(vscode.window.registerTreeDataProvider).mockReturnValue({
      dispose: vi.fn(),
    } as vscode.Disposable);

    vi.mocked(vscode.workspace.onDidOpenTextDocument).mockReturnValue({
      dispose: vi.fn(),
    } as vscode.Disposable);

    vi.mocked(vscode.workspace.onDidChangeTextDocument).mockReturnValue({
      dispose: vi.fn(),
    } as vscode.Disposable);

    vi.mocked(vscode.workspace.onDidSaveTextDocument).mockReturnValue({
      dispose: vi.fn(),
    } as vscode.Disposable);
  });

  describe("registerImpactAnalysisCommand", () => {
    it("should be exported as a function", async () => {
      const extension = await import("../src/extension");

      expect(extension.registerImpactAnalysisCommand).toBeDefined();
      expect(typeof extension.registerImpactAnalysisCommand).toBe("function");
    });

    it("should accept vscode.ExtensionContext as parameter", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();

      // Function should be callable with ExtensionContext
      expect(() => extension.registerImpactAnalysisCommand(mockContext)).not.toThrow();
    });

    it("should return void", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();

      const result = extension.registerImpactAnalysisCommand(mockContext);

      expect(result).toBeUndefined();
    });

    it("should register a command with vscode.commands.registerCommand", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();
      const registerCommandSpy = vi.spyOn(vscode.commands, "registerCommand");

      extension.registerImpactAnalysisCommand(mockContext);

      expect(registerCommandSpy).toHaveBeenCalled();
    });
  });

  describe("registerHierarchicalViewCommand", () => {
    it("should be exported as a function", async () => {
      const extension = await import("../src/extension");

      expect(extension.registerHierarchicalViewCommand).toBeDefined();
      expect(typeof extension.registerHierarchicalViewCommand).toBe("function");
    });

    it("should accept vscode.ExtensionContext as parameter", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();

      // Function should be callable with ExtensionContext
      expect(() => extension.registerHierarchicalViewCommand(mockContext)).not.toThrow();
    });

    it("should return void", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();

      const result = extension.registerHierarchicalViewCommand(mockContext);

      expect(result).toBeUndefined();
    });

    it("should register a command with vscode.commands.registerCommand", async () => {
      const extension = await import("../src/extension");
      const mockContext = createMockContext();
      const registerCommandSpy = vi.spyOn(vscode.commands, "registerCommand");

      extension.registerHierarchicalViewCommand(mockContext);

      expect(registerCommandSpy).toHaveBeenCalled();
    });
  });
});
