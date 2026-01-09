/**
 * VS Code API wrapper for webview communication.
 * Provides type-safe message passing between the webview and extension.
 */

import type { WebviewToExtensionMessage } from "./types";

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): T;
}

// Declare the acquireVsCodeApi function that VS Code injects
declare function acquireVsCodeApi(): VsCodeApi;

// Acquire the VS Code API once and cache it
let vsCodeApi: VsCodeApi | undefined;

function getVsCodeApi(): VsCodeApi {
  if (!vsCodeApi) {
    vsCodeApi = acquireVsCodeApi();
  }
  return vsCodeApi;
}

/**
 * Post a message to the extension
 */
export function postMessage(message: WebviewToExtensionMessage): void {
  getVsCodeApi().postMessage(message);
}

/**
 * Get persisted state from VS Code
 */
export function getState<T>(): T | undefined {
  return getVsCodeApi().getState<T>();
}

/**
 * Persist state in VS Code (survives panel close/reopen)
 */
export function setState<T>(state: T): T {
  return getVsCodeApi().setState(state);
}
