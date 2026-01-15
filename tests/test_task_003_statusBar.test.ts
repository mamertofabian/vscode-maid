/**
 * Behavioral tests for src/statusBar.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { MaidStatusBar } from "../src/statusBar";
import { setOutputChannel } from "../src/utils";

describe("MaidStatusBar", () => {
  let statusBar: MaidStatusBar;
  let mockChannel: vscode.OutputChannel;

  beforeEach(() => {
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;
    setOutputChannel(mockChannel);
    statusBar = new MaidStatusBar();
  });

  it("should create status bar item on construction", () => {
    expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
  });

  it("should set status to valid when updateStatus is called with no errors or warnings", () => {
    statusBar.updateStatus(0, 0);
    const state = statusBar.getState();
    expect(state).toBe("valid");
  });

  it("should set status to errors when updateStatus is called with errors", () => {
    statusBar.updateStatus(2, 0);
    const state = statusBar.getState();
    expect(state).toBe("errors");
  });

  it("should set status to warnings when updateStatus is called with warnings but no errors", () => {
    statusBar.updateStatus(0, 3);
    const state = statusBar.getState();
    expect(state).toBe("warnings");
  });

  it("should set status to validating when setValidating is called", () => {
    statusBar.setValidating();
    const state = statusBar.getState();
    expect(state).toBe("validating");
  });

  it("should set status to not-installed when setNotInstalled is called", () => {
    statusBar.setNotInstalled();
    const state = statusBar.getState();
    expect(state).toBe("not-installed");
  });

  it("should hide status bar when hide is called", () => {
    statusBar.hide();
    const state = statusBar.getState();
    expect(state).toBe("hidden");
  });

  it("should show status bar when show is called", () => {
    statusBar.show();
    // Should not throw
    expect(() => statusBar.show()).not.toThrow();
  });

  it("should set status to valid when setValid is called", () => {
    statusBar.setValid();
    const state = statusBar.getState();
    expect(state).toBe("valid");
  });

  it("should set status to errors when setErrors is called with count", () => {
    const count = 5;
    statusBar.setErrors(count);
    const state = statusBar.getState();
    expect(state).toBe("errors");
  });

  it("should set status to warnings when setWarnings is called with count", () => {
    const count = 3;
    statusBar.setWarnings(count);
    const state = statusBar.getState();
    expect(state).toBe("warnings");
  });

  it("should dispose resources when dispose is called", () => {
    statusBar.dispose();
    // Should not throw
    expect(() => statusBar.dispose()).not.toThrow();
  });
});
