/**
 * MAID VS Code Extension
 * Provides LSP integration, manifest exploration, test execution, and validation features
 * for Manifest-driven AI Development (MAID).
 */

import * as vscode from "vscode";
import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import * as https from "https";

import {
  log,
  setOutputChannel,
  getOutputChannel,
  checkMaidLspInstalled,
  getInstalledVersion,
  isManifestPath,
} from "./utils";
import { MaidStatusBar } from "./statusBar";
import {
  ManifestTreeDataProvider,
  TrackedFilesTreeDataProvider,
} from "./manifestExplorer";
import { KnowledgeGraphTreeDataProvider } from "./knowledgeGraph";
import { ManifestHistoryTreeDataProvider } from "./manifestHistory";
import { MaidTestRunner } from "./testRunner";
import { ManifestIndex } from "./manifestIndex";
import { ManifestDefinitionProvider } from "./definitionProvider";
import { ManifestReferenceProvider, FileReferenceProvider } from "./referenceProvider";
import { KnowledgeGraphPanel } from "./webview/knowledgeGraphPanel";
import { DashboardPanel } from "./webview/dashboardPanel";
import { HistoryPanel } from "./webview/historyPanel";

// Module-level state
let client: LanguageClient | undefined;
let statusBar: MaidStatusBar | undefined;
let manifestProvider: ManifestTreeDataProvider | undefined;
let trackedFilesProvider: TrackedFilesTreeDataProvider | undefined;
let knowledgeGraphProvider: KnowledgeGraphTreeDataProvider | undefined;
let historyProvider: ManifestHistoryTreeDataProvider | undefined;
let testRunner: MaidTestRunner | undefined;
let manifestIndex: ManifestIndex | undefined;

// Constants for version checking
const PYPI_API_URL = "https://pypi.org/pypi/maid-lsp/json";
const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_VERSION_CHECK_KEY = "maidLsp.lastVersionCheck";
const DISMISSED_VERSION_KEY = "maidLsp.dismissedVersion";

/**
 * Fetch the latest version from PyPI.
 */
async function getLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    log(`Fetching latest version from PyPI: ${PYPI_API_URL}`);
    https
      .get(PYPI_API_URL, { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const version = json.info?.version || null;
            log(`Latest version from PyPI: ${version}`);
            resolve(version);
          } catch (error) {
            log(`Failed to parse PyPI response: ${error}`, "error");
            resolve(null);
          }
        });
      })
      .on("error", (error) => {
        log(`PyPI request error: ${error}`, "error");
        resolve(null);
      })
      .on("timeout", () => {
        log("PyPI request timeout", "warn");
        resolve(null);
      });
  });
}

/**
 * Compare two semver version strings.
 * Returns true if newVersion > currentVersion
 */
function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  const current = currentVersion.split(".").map(Number);
  const latest = newVersion.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if (latest[i] > current[i]) return true;
    if (latest[i] < current[i]) return false;
  }
  return false;
}

/**
 * Detect how maid-lsp was installed.
 * Returns the appropriate upgrade command.
 */
async function detectInstallationMethod(): Promise<string> {
  log("Detecting maid-lsp installation method...");

  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  // Check for uv tool
  try {
    const { stdout } = await execAsync("uv tool list");
    if (stdout.includes("maid-lsp")) {
      log("Detected installation via uv tool");
      return "uv tool upgrade maid-lsp";
    }
  } catch (error) {
    log(`uv tool check failed: ${error}`);
  }

  // Check for pipx
  try {
    const { stdout } = await execAsync("pipx list");
    if (stdout.includes("maid-lsp")) {
      log("Detected installation via pipx");
      return "pipx upgrade maid-lsp";
    }
  } catch (error) {
    log(`pipx check failed: ${error}`);
  }

  // Fallback to pip
  log("Using pip as fallback installation method");
  return "pip install --upgrade maid-lsp";
}

/**
 * Check for updates and show notification if available.
 */
async function checkForUpdates(
  context: vscode.ExtensionContext,
  force = false
): Promise<void> {
  // Check if we should skip (unless forced)
  if (!force) {
    const lastCheck = context.globalState.get<number>(LAST_VERSION_CHECK_KEY);
    const now = Date.now();
    if (lastCheck && now - lastCheck < VERSION_CHECK_INTERVAL_MS) {
      return; // Checked recently, skip
    }
  }

  const installedVersion = await getInstalledVersion();
  if (!installedVersion) {
    return; // Can't determine installed version
  }

  const latestVersion = await getLatestVersion();
  if (!latestVersion) {
    if (force) {
      vscode.window.showWarningMessage(
        "Unable to check for maid-lsp updates. Please try again later."
      );
    }
    return; // Can't fetch latest version
  }

  // Update last check timestamp
  await context.globalState.update(LAST_VERSION_CHECK_KEY, Date.now());

  // Check if user dismissed this version
  const dismissedVersion = context.globalState.get<string>(
    DISMISSED_VERSION_KEY
  );
  if (!force && dismissedVersion === latestVersion) {
    return; // User already dismissed this version
  }

  // Check if update is available
  if (isNewerVersion(installedVersion, latestVersion)) {
    const choice = await vscode.window.showInformationMessage(
      `maid-lsp ${latestVersion} is available (you have ${installedVersion})`,
      "Update Now",
      "Dismiss",
      "Don't Show Again"
    );

    if (choice === "Update Now") {
      // Detect installation method and use appropriate command
      const updateCommand = await detectInstallationMethod();
      const terminal = vscode.window.createTerminal("MAID Updater");
      terminal.sendText(updateCommand);
      terminal.show();
      vscode.window.showInformationMessage(
        `Update command sent to terminal: ${updateCommand}\nPlease restart VS Code after the update completes.`
      );
    } else if (choice === "Don't Show Again") {
      await context.globalState.update(DISMISSED_VERSION_KEY, latestVersion);
    }
  } else if (force) {
    vscode.window.showInformationMessage(
      `maid-lsp is up to date (${installedVersion})`
    );
  }
}

/**
 * Prompt user to install maid-lsp with helpful options.
 */
async function promptMaidLspInstall(): Promise<void> {
  log("Prompting user to install maid-lsp...");
  const choice = await vscode.window.showInformationMessage(
    "MAID LSP server not found. How would you like to install it?",
    "Install via pip",
    "Install via pipx",
    "Install via uv",
    "I'll install it manually"
  );

  log(`User selected installation option: ${choice || "none"}`);

  if (!choice || choice === "I'll install it manually") {
    vscode.window.showInformationMessage(
      "Install maid-lsp manually: pip install maid-lsp (or pipx install maid-lsp / uv tool install maid-lsp)"
    );
    return;
  }

  const terminal = vscode.window.createTerminal("MAID Installer");
  const commands: Record<string, string> = {
    "Install via pip": "pip install --user maid-lsp",
    "Install via pipx": "pipx install maid-lsp",
    "Install via uv": "uv tool install maid-lsp",
  };

  const command = commands[choice];
  log(`Sending installation command to terminal: ${command}`);
  terminal.sendText(command);
  terminal.show();
  vscode.window.showInformationMessage(
    "Installation command sent to terminal. Please restart VS Code after installation completes."
  );
}

/**
 * Start the LSP client.
 */
function startLanguageClient(context: vscode.ExtensionContext): void {
  log("Starting MAID LSP client...");

  const outputChannel = getOutputChannel();

  // Get configuration
  const config = vscode.workspace.getConfiguration("maid-lsp");
  const serverPath = config.get<string>("path", "maid-lsp");
  const serverArgs = config.get<string[]>("args", ["--stdio"]);

  log(`Server path: ${serverPath}`);
  log(`Server args: ${JSON.stringify(serverArgs)}`);

  // Only activate for .manifest.json files
  const documentSelector = [
    { scheme: "file", pattern: "**/*.manifest.json" },
  ];

  log(`Document selector: ${JSON.stringify(documentSelector)}`);

  // Server options - spawn maid-lsp process
  const serverOptions: ServerOptions = {
    command: serverPath,
    args: serverArgs,
    options: {},
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      // Don't use fileEvents since server doesn't support workspace/didChangeWatchedFiles
      // Instead, we'll rely on textDocument/didSave notifications
    },
    outputChannel: outputChannel,
    initializationOptions: {},
    // Ensure the client sends save notifications
    initializationFailedHandler: (error) => {
      log(`LSP initialization failed: ${error}`, "error");
      return false;
    },
    middleware: {
      didOpen: (document, next) => {
        log(`[LSP Middleware] Document opened: ${document.uri.toString()}`);
        log(`[LSP Middleware] Language ID: ${document.languageId}`);
        log(`[LSP Middleware] File size: ${document.getText().length} bytes`);
        log(`[LSP Middleware] First 100 chars: ${document.getText().substring(0, 100)}`);
        return next(document);
      },
      didChange: (event, next) => {
        log(`[LSP Middleware] Document changed: ${event.document.uri.toString()}`);
        log(`[LSP Middleware] Changes: ${event.contentChanges.length} change(s)`);
        return next(event);
      },
      didSave: async (document, next) => {
        log(`[LSP Middleware] Document saved: ${document.uri.toString()}`);
        const result = await next(document);

        // Force re-send the document to trigger validation after save
        // This works around the server not supporting workspace/didChangeWatchedFiles
        if (client) {
          try {
            log(`[LSP Middleware] Sending close notification for re-validation`);
            await client.sendNotification('textDocument/didClose', {
              textDocument: { uri: document.uri.toString() }
            });

            log(`[LSP Middleware] Sending open notification with updated content`);
            await client.sendNotification('textDocument/didOpen', {
              textDocument: {
                uri: document.uri.toString(),
                languageId: document.languageId,
                version: document.version,
                text: document.getText()
              }
            });
            log(`[LSP Middleware] Re-validation triggered successfully`);
          } catch (error) {
            log(`[LSP Middleware] Failed to trigger re-validation: ${error}`, "error");
          }
        } else {
          log(`[LSP Middleware] No client available for re-validation`, "warn");
        }

        return result;
      },
      handleDiagnostics: (uri, diagnostics, next) => {
        log(`[LSP Middleware] Received diagnostics for ${uri.toString()}: ${diagnostics.length} issue(s)`);

        // Update status bar with diagnostics
        if (statusBar) {
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor && activeEditor.document.uri.toString() === uri.toString()) {
            const errors = diagnostics.filter(d => d.severity === 1).length;
            const warnings = diagnostics.filter(d => d.severity === 2).length;
            statusBar.updateStatus(errors, warnings);
          }
        }

        if (diagnostics.length > 0) {
          diagnostics.forEach((diag, index) => {
            log(`  [${index + 1}] Line ${diag.range.start.line + 1}, Col ${diag.range.start.character}: ${diag.severity === 1 ? 'ERROR' : diag.severity === 2 ? 'WARNING' : diag.severity === 3 ? 'INFO' : 'HINT'} - ${diag.message}`);
          });
        } else {
          log(`  No issues found by LSP server`);
        }
        return next(uri, diagnostics);
      },
    },
  };

  // Create and start the client
  client = new LanguageClient(
    "maid-lsp",
    "MAID",
    serverOptions,
    clientOptions
  );

  // Add error handlers
  client.onDidChangeState((event) => {
    log(`LSP client state changed: ${JSON.stringify(event)}`);
  });

  log("Starting LSP client...");
  client
    .start()
    .then(() => {
      log("LSP client started successfully");

      // Log server capabilities (initializeResult is a property, not a Promise)
      if (client && client.initializeResult) {
        try {
          const caps = client.initializeResult?.capabilities;
          log(`[LSP Server] Server capabilities received`);
          log(`[LSP Server] Text Document Sync: ${JSON.stringify(caps?.textDocumentSync)}`);
          log(`[LSP Server] Diagnostic Provider: ${JSON.stringify(caps?.diagnosticProvider)}`);
          log(`[LSP Server] Full capabilities: ${JSON.stringify(caps, null, 2)}`);
        } catch (error) {
          log(`Failed to log server capabilities: ${error}`, "warn");
        }
      } else {
        log(`[LSP Server] No initialize result available yet`, "warn");
      }

      // Request diagnostics for all open manifest files
      vscode.workspace.textDocuments.forEach((document) => {
        if (document.uri.fsPath.endsWith(".manifest.json")) {
          log(`[LSP Client] Requesting diagnostics for already open file: ${document.uri.fsPath}`);
        }
      });

      // Listen for diagnostics
      context.subscriptions.push(
        vscode.languages.onDidChangeDiagnostics((event) => {
          event.uris.forEach((uri) => {
            if (uri.fsPath.endsWith(".manifest.json")) {
              const diagnostics = vscode.languages.getDiagnostics(uri);
              log(`[Diagnostics Event] ${uri.fsPath}: ${diagnostics.length} issues`);

              // Update status bar for active document
              if (statusBar) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.toString() === uri.toString()) {
                  const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                  const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
                  statusBar.updateStatus(errors, warnings);
                }
              }

              if (diagnostics.length > 0) {
                diagnostics.forEach((diag, index) => {
                  log(`  [${index + 1}] Line ${diag.range.start.line + 1}: ${diag.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : diag.severity === vscode.DiagnosticSeverity.Warning ? 'WARNING' : 'INFO'} - ${diag.message}`);
                });
              }
            }
          });
        })
      );
    })
    .catch((error) => {
      log(`Failed to start LSP client: ${error}`, "error");
      vscode.window.showErrorMessage(
        `Failed to start MAID LSP: ${error.message || error}`
      );
    });

  context.subscriptions.push(client);
}

/**
 * Check installation status and show result to user.
 */
async function checkInstallationStatus(): Promise<void> {
  const isInstalled = await checkMaidLspInstalled();
  if (isInstalled) {
    const version = await getInstalledVersion();
    if (version) {
      vscode.window.showInformationMessage(
        `MAID LSP is installed: maid-lsp ${version}`
      );
    } else {
      vscode.window.showInformationMessage("MAID LSP is installed");
    }
  } else {
    await promptMaidLspInstall();
  }
}

/**
 * Register all TreeView providers.
 */
function registerTreeViews(context: vscode.ExtensionContext): void {
  log("Registering TreeView providers...");

  // Manifest explorer
  manifestProvider = new ManifestTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maidManifests", manifestProvider)
  );
  context.subscriptions.push(manifestProvider);

  // Tracked files
  trackedFilesProvider = new TrackedFilesTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maidTrackedFiles", trackedFilesProvider)
  );
  context.subscriptions.push(trackedFilesProvider);

  // Knowledge graph
  knowledgeGraphProvider = new KnowledgeGraphTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maidKnowledgeGraph", knowledgeGraphProvider)
  );
  context.subscriptions.push(knowledgeGraphProvider);

  // Manifest history
  historyProvider = new ManifestHistoryTreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maidManifestHistory", historyProvider)
  );
  context.subscriptions.push(historyProvider);

  log("TreeView providers registered");
}

/**
 * Register all commands.
 */
function registerCommands(context: vscode.ExtensionContext): void {
  log("Registering commands...");

  // Installation check
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.checkInstallation",
      checkInstallationStatus
    )
  );

  // Update check
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.checkForUpdates", () =>
      checkForUpdates(context, true)
    )
  );

  // Show logs
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.showLogs", () => {
      const outputChannel = getOutputChannel();
      if (outputChannel) {
        outputChannel.show();
      }
    })
  );

  // Refresh manifests
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.refreshManifests", () => {
      if (manifestProvider) {
        manifestProvider.refresh();
      }
    })
  );

  // Refresh tracked files
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.refreshTrackedFiles", () => {
      if (trackedFilesProvider) {
        trackedFilesProvider.refresh();
      }
    })
  );

  // Refresh knowledge graph
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.refreshKnowledgeGraph", () => {
      if (knowledgeGraphProvider) {
        knowledgeGraphProvider.refresh();
      }
    })
  );

  // Refresh manifest history
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.refreshManifestHistory", () => {
      if (historyProvider) {
        historyProvider.refresh();
      }
    })
  );

  // Test runner commands
  testRunner = new MaidTestRunner();
  context.subscriptions.push(testRunner);

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.runTests", () => {
      testRunner?.runAllTests();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.runTestsWatch", () => {
      testRunner?.runTestsWatch();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.runTestsForManifest", (arg?: unknown) => {
      testRunner?.runTestsForManifest(arg);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.validateManifest", (arg?: unknown) => {
      testRunner?.runValidation(arg);
    })
  );

  // Webview panel commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.showKnowledgeGraphVisualizer", () => {
      KnowledgeGraphPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.showDashboard", () => {
      DashboardPanel.createOrShow(context.extensionUri);
    })
  );

  // History panel commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.showManifestHistory",
      (manifestPath?: string, commitHash?: string) => {
        const activeEditor = vscode.window.activeTextEditor;
        const pathToUse =
          manifestPath ||
          (activeEditor && isManifestPath(activeEditor.document.uri.fsPath)
            ? activeEditor.document.uri.fsPath
            : undefined);

        if (pathToUse) {
          HistoryPanel.createOrShow(context.extensionUri, pathToUse, commitHash);
        } else {
          vscode.window.showWarningMessage(
            "Please open a manifest file to view its history"
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.compareManifestVersions",
      async (commitHash1?: string, commitHash2?: string) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !isManifestPath(activeEditor.document.uri.fsPath)) {
          vscode.window.showWarningMessage(
            "Please open a manifest file to compare versions"
          );
          return;
        }

        const manifestPath = activeEditor.document.uri.fsPath;
        if (commitHash1 && commitHash2) {
          HistoryPanel.createOrShow(context.extensionUri, manifestPath);
          // The panel will handle the comparison via message
        } else {
          vscode.window.showInformationMessage(
            "Use the History panel to select commits for comparison"
          );
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.openManifestAtCommit",
      async (commitHash?: string) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !isManifestPath(activeEditor.document.uri.fsPath)) {
          vscode.window.showWarningMessage(
            "Please open a manifest file to view at a specific commit"
          );
          return;
        }

        if (!commitHash) {
          vscode.window.showWarningMessage("No commit hash provided");
          return;
        }

        const manifestPath = activeEditor.document.uri.fsPath;
        HistoryPanel.createOrShow(context.extensionUri, manifestPath, commitHash);
      }
    )
  );

  log("Commands registered");
}

/**
 * Register workspace event listeners.
 */
function registerWorkspaceListeners(context: vscode.ExtensionContext): void {
  log("Registering workspace listeners...");

  // Document open listener
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isManifestPath(document.uri.fsPath)) {
        log(`[Workspace Event] Manifest file opened: ${document.uri.fsPath}`);
      }
    })
  );

  // Document change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isManifestPath(event.document.uri.fsPath)) {
        log(`[Workspace Event] Manifest file changed: ${event.document.uri.fsPath}`);
      }
    })
  );

  // CRITICAL: Add save listener at workspace level since server doesn't support save notifications
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (isManifestPath(document.uri.fsPath)) {
        log(`[Workspace Event] Manifest file SAVED: ${document.uri.fsPath}`);

        // Set status bar to validating
        if (statusBar) {
          statusBar.setValidating();
        }

        // Force re-validation by closing and reopening the document
        if (client) {
          try {
            log(`[Save Handler] Triggering re-validation for saved file`);

            await client.sendNotification('textDocument/didClose', {
              textDocument: { uri: document.uri.toString() }
            });

            await client.sendNotification('textDocument/didOpen', {
              textDocument: {
                uri: document.uri.toString(),
                languageId: document.languageId,
                version: document.version,
                text: document.getText()
              }
            });

            log(`[Save Handler] Re-validation completed`);
          } catch (error) {
            log(`[Save Handler] Failed to trigger re-validation: ${error}`, "error");
          }
        } else {
          log(`[Save Handler] No LSP client available`, "warn");
        }
      }
    })
  );

  log("Workspace listeners registered");
}

/**
 * Register definition and reference providers for navigation.
 */
async function registerNavigationProviders(
  context: vscode.ExtensionContext
): Promise<void> {
  log("Registering navigation providers...");

  // Create and initialize the manifest index
  manifestIndex = new ManifestIndex(context);
  await manifestIndex.initialize(getOutputChannel());

  // Register definition provider for manifest files
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { pattern: "**/*.manifest.json" },
      new ManifestDefinitionProvider(manifestIndex)
    )
  );
  log("Definition provider registered for *.manifest.json");

  // Register reference provider for manifest files
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { pattern: "**/*.manifest.json" },
      new ManifestReferenceProvider(manifestIndex)
    )
  );
  log("Reference provider registered for *.manifest.json");

  // Register reference provider for all files (to find manifest references)
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      { pattern: "**/*" },
      new FileReferenceProvider(manifestIndex)
    )
  );
  log("File reference provider registered for all files");

  // Register supersession navigation commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.goToParentManifest", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.uri.fsPath.endsWith(".manifest.json")) {
        vscode.window.showWarningMessage("This command is only available in manifest files");
        return;
      }

      const chain = manifestIndex?.getSupersessionChain(editor.document.uri.fsPath);
      if (!chain || chain.parents.length === 0) {
        vscode.window.showInformationMessage("No parent manifest found (this manifest is not superseded by any other)");
        return;
      }

      if (chain.parents.length === 1) {
        // Open the single parent
        const uri = vscode.Uri.file(chain.parents[0]);
        await vscode.window.showTextDocument(uri);
      } else {
        // Show quick pick for multiple parents
        const items = chain.parents.map((p) => ({
          label: vscode.workspace.asRelativePath(p),
          path: p,
        }));
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select parent manifest to open",
        });
        if (selected) {
          const uri = vscode.Uri.file(selected.path);
          await vscode.window.showTextDocument(uri);
        }
      }
    })
  );
  log("goToParentManifest command registered");

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.goToChildManifests", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.uri.fsPath.endsWith(".manifest.json")) {
        vscode.window.showWarningMessage("This command is only available in manifest files");
        return;
      }

      const chain = manifestIndex?.getSupersessionChain(editor.document.uri.fsPath);
      if (!chain || chain.children.length === 0) {
        vscode.window.showInformationMessage("No child manifests found (this manifest does not supersede any other)");
        return;
      }

      if (chain.children.length === 1) {
        // Open the single child
        const uri = vscode.Uri.file(chain.children[0]);
        await vscode.window.showTextDocument(uri);
      } else {
        // Show quick pick for multiple children
        const items = chain.children.map((p) => ({
          label: vscode.workspace.asRelativePath(p),
          path: p,
        }));
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select child manifest to open",
        });
        if (selected) {
          const uri = vscode.Uri.file(selected.path);
          await vscode.window.showTextDocument(uri);
        }
      }
    })
  );
  log("goToChildManifests command registered");

  // Register command for navigating to artifact definitions (used by knowledge graph)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.goToArtifactDefinition",
      async (filePath: string, artifactName: string, artifactType: string) => {
        if (!filePath || !artifactName) {
          vscode.window.showWarningMessage("Missing file path or artifact name");
          return;
        }

        try {
          const uri = vscode.Uri.file(filePath);
          const document = await vscode.workspace.openTextDocument(uri);
          const content = document.getText();

          // Get file extension to determine language
          const ext = path.extname(filePath).toLowerCase();
          const position = findArtifactPosition(content, artifactName, artifactType, ext);

          if (position) {
            const editor = await vscode.window.showTextDocument(document);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            );
          } else {
            // Fallback: just open the file
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage(
              `Could not find ${artifactType} "${artifactName}" in file, opened file instead`
            );
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
      }
    )
  );
  log("goToArtifactDefinition command registered");

  log("Navigation providers registered");
}

/**
 * Find the position of an artifact definition in file content.
 */
function findArtifactPosition(
  content: string,
  name: string,
  type: string,
  ext: string
): vscode.Position | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns: RegExp[] = [];

  // Python patterns
  if (ext === ".py") {
    switch (type) {
      case "class":
        patterns.push(new RegExp(`^\\s*class\\s+${escapedName}\\s*[:\\(]`, "m"));
        break;
      case "function":
        patterns.push(new RegExp(`^\\s*(?:async\\s+)?def\\s+${escapedName}\\s*\\(`, "m"));
        break;
      case "method":
        patterns.push(new RegExp(`^\\s+(?:async\\s+)?def\\s+${escapedName}\\s*\\(`, "m"));
        break;
      case "attribute":
        patterns.push(new RegExp(`^\\s*${escapedName}\\s*[:=]`, "m"));
        patterns.push(new RegExp(`self\\.${escapedName}\\s*=`, "m"));
        break;
    }
  }

  // TypeScript/JavaScript patterns
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    switch (type) {
      case "class":
        patterns.push(new RegExp(`^\\s*(?:export\\s+)?class\\s+${escapedName}\\s*[{<]`, "m"));
        break;
      case "function":
        patterns.push(new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${escapedName}\\s*[<(]`, "m"));
        patterns.push(new RegExp(`^\\s*(?:export\\s+)?const\\s+${escapedName}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|[^=])\\s*=>`, "m"));
        patterns.push(new RegExp(`^\\s*(?:export\\s+)?const\\s+${escapedName}\\s*=\\s*function`, "m"));
        break;
      case "method":
        patterns.push(new RegExp(`^\\s+(?:async\\s+)?${escapedName}\\s*\\(`, "m"));
        break;
      case "attribute":
      case "interface":
        patterns.push(new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var|interface|type)\\s+${escapedName}\\s*[:=<{]`, "m"));
        break;
    }
  }

  // Go patterns
  if (ext === ".go") {
    switch (type) {
      case "function":
        patterns.push(new RegExp(`^func\\s+${escapedName}\\s*\\(`, "m"));
        break;
      case "method":
        patterns.push(new RegExp(`^func\\s+\\([^)]+\\)\\s+${escapedName}\\s*\\(`, "m"));
        break;
      case "class":
        patterns.push(new RegExp(`^type\\s+${escapedName}\\s+struct`, "m"));
        break;
      case "interface":
        patterns.push(new RegExp(`^type\\s+${escapedName}\\s+interface`, "m"));
        break;
    }
  }

  // Rust patterns
  if (ext === ".rs") {
    switch (type) {
      case "function":
        patterns.push(new RegExp(`^\\s*(?:pub\\s+)?(?:async\\s+)?fn\\s+${escapedName}\\s*[<(]`, "m"));
        break;
      case "class":
        patterns.push(new RegExp(`^\\s*(?:pub\\s+)?struct\\s+${escapedName}\\s*[{<]`, "m"));
        break;
      case "interface":
        patterns.push(new RegExp(`^\\s*(?:pub\\s+)?trait\\s+${escapedName}\\s*[{<]`, "m"));
        break;
    }
  }

  // Try each pattern
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) {
      const lines = content.substring(0, match.index).split("\n");
      return new vscode.Position(lines.length - 1, 0);
    }
  }

  // Fallback: simple word search
  const simplePattern = new RegExp(`\\b${escapedName}\\b`);
  const match = simplePattern.exec(content);
  if (match) {
    const lines = content.substring(0, match.index).split("\n");
    return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
  }

  return undefined;
}

/**
 * Extension activation.
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // Create output channel first
  const outputChannel = vscode.window.createOutputChannel("MAID");
  context.subscriptions.push(outputChannel);
  setOutputChannel(outputChannel);

  log("=".repeat(60));
  log("MAID Extension Activating");
  log(`VS Code version: ${vscode.version}`);
  log(`Extension version: 0.1.4`);
  log(`Platform: ${process.platform}`);
  log(`Architecture: ${process.arch}`);
  log(`Node version: ${process.version}`);
  log(`Workspace folders: ${vscode.workspace.workspaceFolders?.length || 0}`);
  log("=".repeat(60));

  // Initialize status bar (always available)
  statusBar = new MaidStatusBar();
  context.subscriptions.push(statusBar);

  // Register TreeViews (always available)
  registerTreeViews(context);

  // Register commands (always available)
  registerCommands(context);

  // Check if maid-lsp is installed
  const isInstalled = await checkMaidLspInstalled();
  if (!isInstalled) {
    log("maid-lsp is not installed, prompting user for installation");
    statusBar.setNotInstalled();
    await promptMaidLspInstall();
    log("Skipping LSP client activation until maid-lsp is installed");
    // Don't activate the client yet - user needs to install first
    return;
  }

  log("maid-lsp is installed, proceeding with activation");

  // Register workspace listeners
  registerWorkspaceListeners(context);

  // Register navigation providers (Go to Definition, Find References)
  await registerNavigationProviders(context);

  // Start the language client
  startLanguageClient(context);

  // Check for updates automatically (throttled to once per day)
  log("Checking for maid-lsp updates...");
  checkForUpdates(context, false);

  log("MAID Extension activation complete");
}

/**
 * Extension deactivation.
 */
export function deactivate(): Thenable<void> | undefined {
  log("MAID Extension deactivating...");

  // Dispose status bar
  if (statusBar) {
    statusBar.dispose();
    statusBar = undefined;
  }

  // Dispose manifest provider
  if (manifestProvider) {
    manifestProvider.dispose();
    manifestProvider = undefined;
  }

  // Dispose tracked files provider
  if (trackedFilesProvider) {
    trackedFilesProvider.dispose();
    trackedFilesProvider = undefined;
  }

  // Dispose knowledge graph provider
  if (knowledgeGraphProvider) {
    knowledgeGraphProvider.dispose();
    knowledgeGraphProvider = undefined;
  }

  // Dispose history provider
  if (historyProvider) {
    historyProvider.dispose();
    historyProvider = undefined;
  }

  // Dispose test runner
  if (testRunner) {
    testRunner.dispose();
    testRunner = undefined;
  }

  // Dispose manifest index
  if (manifestIndex) {
    manifestIndex.dispose();
    manifestIndex = undefined;
  }

  // Stop LSP client
  if (!client) {
    log("No LSP client to stop");
    return undefined;
  }
  log("Stopping LSP client...");
  return client.stop().then(() => {
    log("LSP client stopped successfully");
  });
}
