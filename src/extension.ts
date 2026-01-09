import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { exec } from "child_process";
import { promisify } from "util";
import * as https from "https";

const execAsync = promisify(exec);

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;

// Constants for version checking
const PYPI_API_URL = "https://pypi.org/pypi/maid-lsp/json";
const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_VERSION_CHECK_KEY = "maidLsp.lastVersionCheck";
const DISMISSED_VERSION_KEY = "maidLsp.dismissedVersion";

/**
 * Log a message to the output channel.
 */
function log(message: string, level: "info" | "warn" | "error" = "info"): void {
  if (!outputChannel) {
    return;
  }
  const timestamp = new Date().toISOString();
  const prefix = level === "error" ? "ERROR" : level === "warn" ? "WARN" : "INFO";
  outputChannel.appendLine(`[${timestamp}] [${prefix}] ${message}`);
}

/**
 * Get the installed maid-lsp version.
 */
async function getInstalledVersion(): Promise<string | null> {
  try {
    log("Checking installed maid-lsp version...");
    const { stdout } = await execAsync("maid-lsp --version");
    log(`maid-lsp --version output: ${stdout.trim()}`);
    // Extract version number from output (e.g., "maid-lsp 0.2.1" -> "0.2.1")
    const match = stdout.trim().match(/(\d+\.\d+\.\d+)/);
    const version = match ? match[1] : null;
    log(`Extracted version: ${version}`);
    return version;
  } catch (error) {
    log(`Failed to get maid-lsp version: ${error}`, "error");
    return null;
  }
}

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
 * Check if maid-lsp is installed and accessible.
 */
async function checkMaidLspInstalled(): Promise<boolean> {
  try {
    log("Checking if maid-lsp is installed...");
    log(`Current PATH: ${process.env.PATH}`);
    const { stdout, stderr } = await execAsync("maid-lsp --version");
    log(`maid-lsp found! stdout: ${stdout.trim()}`);
    if (stderr) {
      log(`maid-lsp stderr: ${stderr.trim()}`, "warn");
    }
    return true;
  } catch (error: any) {
    log(`maid-lsp not found or error occurred: ${error.message}`, "error");
    if (error.code) {
      log(`Error code: ${error.code}`, "error");
    }
    if (error.stderr) {
      log(`Error stderr: ${error.stderr}`, "error");
    }
    return false;
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
    try {
      const { stdout } = await execAsync("maid-lsp --version");
      vscode.window.showInformationMessage(
        `MAID LSP is installed: ${stdout.trim()}`
      );
    } catch (error) {
      vscode.window.showInformationMessage("MAID LSP is installed");
    }
  } else {
    await promptMaidLspInstall();
  }
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // Create output channel first
  outputChannel = vscode.window.createOutputChannel("MAID");
  context.subscriptions.push(outputChannel);

  log("=".repeat(60));
  log("MAID Extension Activating");
  log(`VS Code version: ${vscode.version}`);
  log(`Extension version: 0.1.4`);
  log(`Platform: ${process.platform}`);
  log(`Architecture: ${process.arch}`);
  log(`Node version: ${process.version}`);
  log(`Workspace folders: ${vscode.workspace.workspaceFolders?.length || 0}`);
  log("=".repeat(60));

  // Check if maid-lsp is installed
  const isInstalled = await checkMaidLspInstalled();
  if (!isInstalled) {
    log("maid-lsp is not installed, prompting user for installation");
    await promptMaidLspInstall();
    // Register command to check installation later
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "vscode-maid.checkInstallation",
        checkInstallationStatus
      )
    );
    log("Skipping LSP client activation until maid-lsp is installed");
    // Don't activate the client yet - user needs to install first
    return;
  }

  log("maid-lsp is installed, proceeding with activation");

  // Add workspace document listeners for debugging
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.uri.fsPath.endsWith(".manifest.json")) {
        log(`[Workspace Event] Manifest file opened: ${document.uri.fsPath}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.fsPath.endsWith(".manifest.json")) {
        log(`[Workspace Event] Manifest file changed: ${event.document.uri.fsPath}`);
      }
    })
  );

  // CRITICAL: Add save listener at workspace level since server doesn't support save notifications
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.uri.fsPath.endsWith(".manifest.json")) {
        log(`[Workspace Event] Manifest file SAVED: ${document.uri.fsPath}`);

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

  // Start the language client
  startLanguageClient(context);

  // Register command to recheck installation
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-maid.checkInstallation",
      checkInstallationStatus
    )
  );

  // Register command to manually check for updates
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.checkForUpdates", () =>
      checkForUpdates(context, true)
    )
  );

  // Register command to show output channel
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-maid.showLogs", () => {
      if (outputChannel) {
        outputChannel.show();
      }
    })
  );

  // Check for updates automatically (throttled to once per day)
  log("Checking for maid-lsp updates...");
  checkForUpdates(context, false);

  log("MAID Extension activation complete");
}

export function deactivate(): Thenable<void> | undefined {
  log("MAID Extension deactivating...");
  if (!client) {
    log("No LSP client to stop");
    return undefined;
  }
  log("Stopping LSP client...");
  return client.stop().then(() => {
    log("LSP client stopped successfully");
  });
}
