import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let client: LanguageClient | undefined;

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
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
