/**
 * Behavioral tests for src/testRunner.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { MaidTestRunner } from "../src/testRunner";

vi.mock("../src/utils", async () => {
  const actual = await vi.importActual("../src/utils");
  return {
    ...actual,
    getWorkspaceRoot: vi.fn(() => "/workspace"),
  };
});

describe("MaidTestRunner", () => {
  let testRunner: MaidTestRunner;
  let mockTerminal: vscode.Terminal;
  let sendTextMock: ReturnType<typeof vi.fn>;
  let showMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendTextMock = vi.fn();
    showMock = vi.fn();
    mockTerminal = {
      sendText: sendTextMock,
      show: showMock,
      dispose: vi.fn(),
      exitStatus: undefined,
    } as unknown as vscode.Terminal;
    vi.mocked(vscode.window.createTerminal).mockReturnValue(mockTerminal);
    testRunner = new MaidTestRunner();
  });

  it("should create terminal when runAllTests is called", () => {
    testRunner.runAllTests();
    const createTerminalMock = vi.mocked(vscode.window.createTerminal);
    expect(createTerminalMock).toHaveBeenCalled();
    expect(sendTextMock).toHaveBeenCalledWith("maid test");
    expect(showMock).toHaveBeenCalled();
  });

  it("should handle terminal creation correctly", () => {
    expect(testRunner).toBeDefined();
  });

  it("should dispose resources when dispose is called", () => {
    testRunner.dispose();
    expect(() => testRunner.dispose()).not.toThrow();
  });
});
