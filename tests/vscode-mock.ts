/**
 * Mock implementation of VS Code API for testing
 */

import { vi } from "vitest";

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
        asWebviewUri: vi.fn((uri: any) => uri),
      },
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    })),
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
    onDidOpenTextDocument: { dispose: vi.fn() },
    onDidChangeTextDocument: { dispose: vi.fn() },
    onDidSaveTextDocument: { dispose: vi.fn() },
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
    file: vi.fn((path: string) => ({
      fsPath: path,
      toString: vi.fn(() => `file://${path}`),
    })),
    joinPath: vi.fn((base: any, ...paths: string[]) => ({
      fsPath: [base.fsPath || base, ...paths].join("/"),
      toString: vi.fn(() => `file://${[base.fsPath || base, ...paths].join("/")}`),
    })),
  },
  Position: vi.fn((line: number, character: number) => ({
    line,
    character,
  })),
  Range: vi.fn((start: any, end: any) => ({
    start,
    end,
  })),
  Selection: vi.fn((start: any, end: any) => ({
    start,
    end,
  })),
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
  TreeItem: class TreeItem {
    label?: string;
    collapsibleState?: any;
    iconPath?: any;
    command?: any;
    contextValue?: string;
    tooltip?: string;
    description?: string;
    resourceUri?: any;
    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  EventEmitter: class EventEmitter<T> {
    event: any;
    fire(data: T): void {}
    dispose(): void {}
  },
  version: "1.75.0",
};

vi.mock("vscode", () => mockVscode);
