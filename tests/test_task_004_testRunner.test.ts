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
    getMaidRoot: vi.fn(() => "/workspace"),
    isManifestFile: vi.fn(() => false),
  };
});

describe("MaidTestRunner", () => {
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
  });

  it("should execute maid test command when runAllTests is called", () => {
    const testRunner = new MaidTestRunner();
    testRunner.runAllTests();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
    expect(sendTextMock).toHaveBeenCalledWith("maid test");
    expect(showMock).toHaveBeenCalled();
  });

  it("should execute maid test watch command when runTestsWatch is called", () => {
    const testRunner = new MaidTestRunner();
    testRunner.runTestsWatch();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
    expect(sendTextMock).toHaveBeenCalledWith("maid test --watch-all");
    expect(showMock).toHaveBeenCalled();
  });

  it("should execute test command for specific manifest when runTestsForManifest is called", () => {
    const testRunner = new MaidTestRunner();
    const mockUri = vscode.Uri.file("/workspace/manifests/test.manifest.json");
    testRunner.runTestsForManifest(mockUri);
    expect(sendTextMock).toHaveBeenCalled();
    expect(showMock).toHaveBeenCalled();
    const commandCall = sendTextMock.mock.calls[0]?.[0] as string;
    expect(commandCall).toContain("maid test");
    expect(commandCall).toContain("test.manifest.json");
  });

  it("should clean up resources when dispose is called", () => {
    const testRunner = new MaidTestRunner();
    testRunner.dispose();
    expect(() => testRunner.dispose()).not.toThrow();
  });
});
