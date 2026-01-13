/**
 * Behavioral tests for src/extension.ts
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

const mockContext = {
  subscriptions: [],
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
  },
  workspaceState: {
    get: vi.fn(),
    update: vi.fn(),
  },
  extensionUri: vscode.Uri.file("/test"),
} as unknown as vscode.ExtensionContext;

describe("extension", () => {
  beforeEach(() => {
    (vscode.window.createOutputChannel as any) = vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    }));
  });

  it("should have activate and deactivate functions", async () => {
    // Import after mocks are set up
    const { activate, deactivate } = await import("../src/extension");
    expect(activate).toBeDefined();
    expect(deactivate).toBeDefined();

    // Test deactivate (simpler, doesn't require full setup)
    expect(() => deactivate()).not.toThrow();
  });
});
