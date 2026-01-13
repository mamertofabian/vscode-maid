/**
 * Behavioral tests for src/testRunner.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { MaidTestRunner } from "../src/testRunner";
import { getWorkspaceRoot } from "../src/utils";

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

  beforeEach(() => {
    mockTerminal = {
      sendText: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
      exitStatus: undefined,
    } as unknown as vscode.Terminal;
    (vscode.window.createTerminal as any) = vi.fn(() => mockTerminal);
    testRunner = new MaidTestRunner();
  });

  it("should create terminal when runAllTests is called", async () => {
    await testRunner.runAllTests();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
    expect(mockTerminal.sendText).toHaveBeenCalledWith("maid test");
    expect(mockTerminal.show).toHaveBeenCalled();
  });

  it("should handle terminal creation correctly", () => {
    expect(testRunner).toBeDefined();
  });

  it("should dispose resources when dispose is called", () => {
    testRunner.dispose();
    expect(() => testRunner.dispose()).not.toThrow();
  });
});
