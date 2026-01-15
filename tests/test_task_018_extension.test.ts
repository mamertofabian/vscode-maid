/**
 * Behavioral tests for src/extension.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";

// Mock vscode-languageclient before importing extension
vi.mock("vscode-languageclient/node", () => {
  const MockLanguageClient = vi.fn(function (this: Record<string, unknown>) {
    this.start = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn().mockResolvedValue(undefined);
    this.sendNotification = vi.fn();
    this.initializeResult = undefined;
    this.onDidChangeState = vi.fn();
  });
  return {
    LanguageClient: MockLanguageClient,
    LanguageClientOptions: {},
    ServerOptions: {},
  };
});

vi.mock("../src/utils", async () => {
  const actual = await vi.importActual("../src/utils");
  return {
    ...actual,
    checkMaidLspInstalled: vi.fn().mockResolvedValue(true),
    getInstalledVersion: vi.fn().mockResolvedValue("1.0.0"),
  };
});

describe("extension", () => {
  beforeEach(() => {
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
  });

  it("should have activate and deactivate functions", async () => {
    // Import after mocks are set up
    const { activate, deactivate } = await import("../src/extension");
    expect(activate).toBeDefined();
    expect(deactivate).toBeDefined();

    // Test activate with mock context
    const mockContext = {
      subscriptions: [],
      extensionUri: vscode.Uri.file("/test"),
      extensionPath: "/test",
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
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: { dispose: vi.fn() },
      },
      storageUri: vscode.Uri.file("/test/storage"),
      globalStorageUri: vscode.Uri.file("/test/global-storage"),
      logUri: vscode.Uri.file("/test/log"),
      extensionMode: 1,
      environmentVariableCollection: {
        persistent: false,
        description: "",
        replace: vi.fn(),
        append: vi.fn(),
        prepend: vi.fn(),
        get: vi.fn(),
        forEach: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getScoped: vi.fn(),
      },
      asAbsolutePath: vi.fn((p: string) => `/test/${p}`),
      storagePath: "/test/storage",
      globalStoragePath: "/test/global-storage",
      logPath: "/test/log",
      extension: {
        id: "test.extension",
        extensionUri: vscode.Uri.file("/test"),
        extensionPath: "/test",
        isActive: true,
        packageJSON: {},
        extensionKind: 1,
        exports: undefined,
        activate: vi.fn(),
      },
      languageModelAccessInformation: {
        onDidChange: { dispose: vi.fn() },
        canSendRequest: vi.fn(),
      },
    } as unknown as vscode.ExtensionContext;

    await activate(mockContext);

    // Test deactivate
    expect(() => deactivate()).not.toThrow();
  });
});
