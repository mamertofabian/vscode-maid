/**
 * React hooks for VS Code webview communication.
 */

import { useEffect, useState, useCallback } from "react";
import { postMessage, getState, setState } from "../vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../types";

/**
 * Hook to listen for messages from the extension.
 * Sends a "ready" message on mount to request initial data.
 */
export function useVsCodeMessages(): ExtensionToWebviewMessage | null {
  const [lastMessage, setLastMessage] = useState<ExtensionToWebviewMessage | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      setLastMessage(event.data);
    };

    window.addEventListener("message", handler);

    // Signal to extension that webview is ready
    postMessage({ type: "ready" });

    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  return lastMessage;
}

/**
 * Hook to send messages to the extension.
 */
export function useSendMessage(): (message: WebviewToExtensionMessage) => void {
  return useCallback((message: WebviewToExtensionMessage) => {
    postMessage(message);
  }, []);
}

/**
 * Hook for persisting state across webview sessions.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const persisted = getState<Record<string, T>>();
    if (persisted && key in persisted) {
      return persisted[key];
    }
    return initialValue;
  });

  const setPersistedValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      const currentState = getState<Record<string, T>>() || {};
      setState({ ...currentState, [key]: newValue });
    },
    [key]
  );

  return [value, setPersistedValue];
}

/**
 * Hook to request a data refresh from the extension.
 */
export function useRefresh(): () => void {
  return useCallback(() => {
    postMessage({ type: "refresh" });
  }, []);
}
