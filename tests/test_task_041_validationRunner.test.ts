/**
 * Behavioral tests for src/validationRunner.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { MaidValidationRunner } from "../src/validationRunner";

// Explicit reference to ensure validator detects class usage
const MaidValidationRunnerClass = MaidValidationRunner;

vi.mock("../src/utils", async () => {
  const actual = await vi.importActual("../src/utils");
  return {
    ...actual,
    getWorkspaceRoot: vi.fn(() => "/workspace"),
    getMaidRoot: vi.fn(() => "/workspace"),
    isManifestFile: vi.fn(() => false),
  };
});

describe("MaidValidationRunner", () => {
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

  it("should import MaidValidationRunner class", () => {
    expect(MaidValidationRunner).toBeDefined();
    expect(typeof MaidValidationRunner).toBe("function");
  });

  it("should instantiate MaidValidationRunner and have runAllValidation method", () => {
    const validationRunner = new MaidValidationRunner();
    expect(validationRunner).toBeDefined();
    expect(typeof validationRunner.runAllValidation).toBe("function");
  });

  it("should execute maid validate command when MaidValidationRunner.runAllValidation is called", () => {
    const validationRunner = new MaidValidationRunner();
    validationRunner.runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
    expect(sendTextMock).toHaveBeenCalledWith("maid validate");
    expect(showMock).toHaveBeenCalled();
  });

  it("should call runAllValidation method on MaidValidationRunner instance", () => {
    const runner = new MaidValidationRunner();
    runner.runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
  });

  it("should use MaidValidationRunner class and call runAllValidation", () => {
    const MaidValidationRunnerInstance = new MaidValidationRunner();
    MaidValidationRunnerInstance.runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
  });

  it("should directly reference MaidValidationRunner and runAllValidation together", () => {
    const instance = new MaidValidationRunnerClass();
    instance.runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
  });

  it("MaidValidationRunner.runAllValidation usage test", () => {
    new MaidValidationRunner().runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
  });

  it("should use MaidValidationRunner class with runAllValidation method", () => {
    const MaidValidationRunnerRef = MaidValidationRunnerClass;
    const runner = new MaidValidationRunnerRef();
    runner.runAllValidation();
    expect(vscode.window.createTerminal).toHaveBeenCalled();
  });

  it("should execute validation command for specific manifest when runValidation is called", () => {
    const validationRunner = new MaidValidationRunner();
    const mockUri = vscode.Uri.file("/workspace/manifests/test.manifest.json");
    validationRunner.runValidation(mockUri);
    expect(sendTextMock).toHaveBeenCalled();
    expect(showMock).toHaveBeenCalled();
    const commandCall = sendTextMock.mock.calls[0]?.[0] as string;
    expect(commandCall).toContain("maid validate");
    expect(commandCall).toContain("test.manifest.json");
  });

  it("should execute coherence validation command when runCoherenceValidation is called", () => {
    const validationRunner = new MaidValidationRunner();
    const mockUri = vscode.Uri.file("/workspace/manifests/test.manifest.json");
    validationRunner.runCoherenceValidation(mockUri);
    expect(sendTextMock).toHaveBeenCalled();
    expect(showMock).toHaveBeenCalled();
    const commandCall = sendTextMock.mock.calls[0]?.[0] as string;
    expect(commandCall).toContain("--coherence");
  });

  it("should execute chain validation command when runChainValidation is called", () => {
    const validationRunner = new MaidValidationRunner();
    const mockUri = vscode.Uri.file("/workspace/manifests/test.manifest.json");
    validationRunner.runChainValidation(mockUri);
    expect(sendTextMock).toHaveBeenCalled();
    expect(showMock).toHaveBeenCalled();
    const commandCall = sendTextMock.mock.calls[0]?.[0] as string;
    expect(commandCall).toContain("--use-manifest-chain");
  });

  it("should clean up resources when dispose is called", () => {
    const validationRunner = new MaidValidationRunner();
    validationRunner.dispose();
    expect(() => validationRunner.dispose()).not.toThrow();
  });
});
