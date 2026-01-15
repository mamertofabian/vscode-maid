/**
 * Mock implementation of VS Code API for testing
 */

import { vi } from "vitest";
import type * as vscode from "vscode";

function createMockUri(fsPath: string): vscode.Uri {
  return {
    fsPath,
    toString: vi.fn(() => `file://${fsPath}`),
    scheme: "file",
    authority: "",
    path: fsPath,
    query: "",
    fragment: "",
    with: vi.fn(),
    toJSON: vi.fn(),
  } as vscode.Uri;
}

function createMockPosition(line: number, character: number): vscode.Position {
  return {
    line,
    character,
    isBefore: vi.fn(),
    isBeforeOrEqual: vi.fn(),
    isAfter: vi.fn(),
    isAfterOrEqual: vi.fn(),
    isEqual: vi.fn(),
    compareTo: vi.fn(),
    translate: vi.fn(),
    with: vi.fn(),
  } as vscode.Position;
}

function createMockRange(start: vscode.Position, end: vscode.Position): vscode.Range {
  return {
    start,
    end,
    isEmpty: false,
    isSingleLine: start.line === end.line,
    contains: vi.fn(),
    isEqual: vi.fn(),
    intersection: vi.fn(),
    union: vi.fn(),
    with: vi.fn(),
  } as vscode.Range;
}

function createMockSelection(start: vscode.Position, end: vscode.Position): vscode.Selection {
  const range = createMockRange(start, end);
  return {
    ...range,
    anchor: start,
    active: end,
    isEmpty: false,
    isReversed: false,
  } as vscode.Selection;
}

export const mockVscode = {
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    activeTextEditor: undefined,
    createTerminal: vi.fn(() => ({
      sendText: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
      exitStatus: undefined,
    })),
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCloseTerminal: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
    createStatusBarItem: vi.fn(() => ({
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
      color: undefined,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: "",
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: vscode.Uri): vscode.Uri => createMockUri(uri.fsPath)),
      },
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    })),
    registerTreeDataProvider: vi.fn(() => ({ dispose: vi.fn() })),
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    findFiles: vi.fn(() => Promise.resolve([])),
    openTextDocument: vi.fn(() =>
      Promise.resolve({
        getText: vi.fn(() => ""),
        uri: { fsPath: "", toString: vi.fn(() => "") },
        version: 1,
        languageId: "json",
      })
    ),
    asRelativePath: vi.fn((path: string) => path),
    onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
  },
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  },
  languages: {
    registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerReferenceProvider: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeDiagnostics: vi.fn(() => ({ dispose: vi.fn() })),
    getDiagnostics: vi.fn(() => []),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  Uri: {
    file: vi.fn((path: string): vscode.Uri => createMockUri(path)),
    joinPath: vi.fn((base: vscode.Uri | { fsPath: string }, ...paths: string[]): vscode.Uri => {
      const basePath = "fsPath" in base ? (base as { fsPath: string }).fsPath : String(base);
      return createMockUri([basePath, ...paths].join("/"));
    }),
  },
  Position: vi.fn(
    (line: number, character: number): vscode.Position => createMockPosition(line, character)
  ),
  Range: vi.fn(
    (start: vscode.Position, end: vscode.Position): vscode.Range => createMockRange(start, end)
  ),
  Selection: vi.fn(
    (start: vscode.Position, end: vscode.Position): vscode.Selection =>
      createMockSelection(start, end)
  ),
  TextEditorRevealType: {
    InCenter: 0,
  },
  DiagnosticSeverity: {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4,
  },
  Disposable: {
    from: vi.fn(() => ({ dispose: vi.fn() })),
  },
  ThemeColor: class ThemeColor {
    constructor(public id: string) {}
  },
  ThemeIcon: class ThemeIcon {
    constructor(
      public id: string,
      public color?: { id: string }
    ) {}
  },
  TreeItem: class TreeItem {
    label?: string;
    collapsibleState?: number;
    iconPath?: unknown;
    command?: unknown;
    contextValue?: string;
    tooltip?: string;
    description?: string | boolean;
    resourceUri?: unknown;
    constructor(label: string, collapsibleState?: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  EventEmitter: class EventEmitter<T> implements vscode.EventEmitter<T> {
    event = ((_listener: (e: T) => unknown) => {
      return { dispose: vi.fn() };
    }) as vscode.Event<T>;
    fire(_data: T): void {
      // Mock implementation
    }
    dispose(): void {
      // Mock implementation
    }
  } as {
    new <T>(): vscode.EventEmitter<T>;
  },
  version: "1.75.0",
};

vi.mock("vscode", () => mockVscode);
