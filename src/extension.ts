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

// Constants for version checking
const PYPI_API_URL = "https://pypi.org/pypi/maid-lsp/json";
const VERSION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_VERSION_CHECK_KEY = "maidLsp.lastVersionCheck";
const DISMISSED_VERSION_KEY = "maidLsp.dismissedVersion";

/**
 * Get the installed maid-lsp version.
 */
async function getInstalledVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync("maid-lsp --version");
    // Extract version number from output (e.g., "maid-lsp 0.2.1" -> "0.2.1")
    const match = stdout.trim().match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest version from PyPI.
 */
async function getLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    https
      .get(PYPI_API_URL, { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.info?.version || null);
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null))
      .on("timeout", () => resolve(null));
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
  // Check for uv tool
  try {
    const { stdout } = await execAsync("uv tool list");
    if (stdout.includes("maid-lsp")) {
      return "uv tool upgrade maid-lsp";
    }
  } catch {
    // uv not available or maid-lsp not installed as tool
  }

  // Check for pipx
  try {
    const { stdout } = await execAsync("pipx list");
    if (stdout.includes("maid-lsp")) {
      return "pipx upgrade maid-lsp";
    }
  } catch {
    // pipx not available or maid-lsp not installed via pipx
  }

  // Fallback to pip
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
    await execAsync("maid-lsp --version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt user to install maid-lsp with helpful options.
 */
async function promptMaidLspInstall(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    "MAID LSP server not found. How would you like to install it?",
    "Install via pip",
    "Install via pipx",
    "Install via uv",
    "I'll install it manually"
  );

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

  terminal.sendText(commands[choice]);
  terminal.show();
  vscode.window.showInformationMessage(
    "Installation command sent to terminal. Please restart VS Code after installation completes."
  );
}

/**
 * Start the LSP client.
 */
function startLanguageClient(context: vscode.ExtensionContext): void {
  // Get configuration
  const config = vscode.workspace.getConfiguration("maid-lsp");
  const serverPath = config.get<string>("path", "maid-lsp");
  const serverArgs = config.get<string[]>("args", ["--stdio"]);

  // Only activate for .manifest.json files
  const documentSelector = [
    { scheme: "file", pattern: "**/*.manifest.json" },
  ];

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
      // Notify server of file changes in workspace
      fileEvents: vscode.workspace.createFileSystemWatcher(
        "**/*.manifest.json"
      ),
    },
  };

  // Create and start the client
  client = new LanguageClient(
    "maid-lsp",
    "MAID",
    serverOptions,
    clientOptions
  );

  client.start();
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
  // Check if maid-lsp is installed
  const isInstalled = await checkMaidLspInstalled();
  if (!isInstalled) {
    await promptMaidLspInstall();
    // Register command to check installation later
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "vscode-maid.checkInstallation",
        checkInstallationStatus
      )
    );
    // Don't activate the client yet - user needs to install first
    return;
  }

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

  // Check for updates automatically (throttled to once per day)
  checkForUpdates(context, false);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
