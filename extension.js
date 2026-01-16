// vscode is provided by the extension host at runtime
const vscode = (function() {
  try {
    return require('vscode');
  } catch (e) {
    // Fallback - vscode will be injected globally
    return typeof window !== 'undefined' && window.vscode ? window.vscode : {};
  }
})();

class UsageProvider {
  constructor(context) {
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    this.usageData = null;
    this.refreshTimer = null;

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBar.command = 'amp-free-balance.refresh';
    context.subscriptions.push(this.statusBar);

    this.startAutoRefresh();
    this.refresh();
  }

  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    const config = vscode.workspace.getConfiguration('ampFreeBalance');
    const intervalMinutes = config.get('refreshInterval', 5);
    
    // Validate interval (minimum 1 minute, maximum 60 minutes)
    const validInterval = Math.max(1, Math.min(60, intervalMinutes));
    const intervalMs = validInterval * 60 * 1000;

    if (intervalMinutes !== validInterval) {
      // If user set invalid interval, update to valid value
      config.update('refreshInterval', validInterval, true);
      vscode.window.showWarningMessage(`Refresh interval adjusted to ${validInterval} minutes (must be between 1-60)`);
    }

    if (validInterval > 0) {
      this.refreshTimer = setInterval(() => {
        this.refresh();
      }, intervalMs);
    }
  }

  async refresh() {
    try {
      const config = vscode.workspace.getConfiguration('ampFreeBalance');
      const apiUrl = config.get('apiUrl') ||
        'https://ampcode.com/_app/remote/w6b2h6/getFreeTierUsage';
      const accessToken = config.get('accessToken');

      if (!accessToken) {
        this.statusBar.text = '$(warning) Amp Free Balance: Not configured';
        this.statusBar.tooltip = 'Click to setup session token';
        this.statusBar.command = 'amp-free-balance.authenticate';
        this.statusBar.show();
        this.onDidChangeTreeDataEmitter.fire();
        return;
      }

      // Basic token validation
      if (accessToken.length < 10) {
        throw new Error('Session token appears to be invalid (too short). Please reconfigure your token.');
      }

      // Reset command to refresh when configured
      this.statusBar.command = 'amp-free-balance.refresh';

      console.log('[Amp Free Balance] Fetching balance data');

      // Use fetch with proper error handling and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const options = {
        method: 'GET',
        headers: {
          'Cookie': `session=${accessToken}`,
          'User-Agent': 'VSCode-AmpFreeBalance/1.3.2'
        },
        credentials: 'include',
        signal: controller.signal
      };

      let response;
      try {
        response = await fetch(apiUrl, options);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Check your internet connection.');
        }
        // Check if fetch is available
        if (typeof fetch === 'undefined') {
          throw new Error('Network request failed: fetch API not available in this VS Code version.');
        }
        throw new Error(`Network error: ${fetchError.message}`);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Your session token may have expired. Please reconfigure.');
        } else if (response.status === 429) {
          throw new Error('Rate limited. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Amp API may be temporarily unavailable.');
        } else {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
      }

      const text = await response.text();
      console.log('[Amp Free Balance] Raw response length:', text.length);

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON response from API. The service may be experiencing issues.');
      }

      console.log('[Amp Free Balance] Parsed result type:', typeof result);

      let data = result.result;

      // Handle nested JSON string
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (nestedParseError) {
          throw new Error('Invalid nested JSON in API response.');
        }
      }

      console.log('[Amp Free Balance] Data type:', typeof data, 'Is array:', Array.isArray(data), 'Length:', data?.length);

      if (!Array.isArray(data) || data.length < 7) {
        throw new Error(`Unexpected API response format. Expected array with at least 7 elements, got: ${JSON.stringify(data).substring(0, 100)}...`);
      }

      const quota = parseInt(data[2]);
      const used = parseInt(data[6]);
      const remaining = quota - used;
      const percentUsed = (used / quota) * 100;
      const replenishmentRate = parseInt(data[3]);

      // Validate parsed data
      if (isNaN(quota) || isNaN(used) || isNaN(replenishmentRate) || quota <= 0) {
        throw new Error('Invalid numeric data in API response. The service may be experiencing issues.');
      }

      this.usageData = {
        quota,
        used,
        remaining,
        percentUsed,
        replenishmentRate
      };

      console.log('[Amp Free Balance] Balance data updated successfully');
      this.updateStatusBar();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Amp Free Balance] Error:', errorMsg);
      this.statusBar.text = '$(error) Amp Free Balance: Error';
      this.statusBar.tooltip = `Error: ${errorMsg}`;
      this.usageData = null; // Clear stale data on error
    } finally {
      this.onDidChangeTreeDataEmitter.fire();
    }
  }



  updateStatusBar() {
    if (!this.usageData) return;

    const config = vscode.workspace.getConfiguration('ampFreeBalance');
    const lowBalanceThreshold = config.get('lowBalanceThreshold', 1) * 100; // Convert to cents

    const percentUsed = Math.round(this.usageData.percentUsed);
    const remainingDollars = (this.usageData.remaining / 100).toFixed(2);
    const usedDollars = (this.usageData.used / 100).toFixed(2);
    const replenishmentDollars = (this.usageData.replenishmentRate / 100).toFixed(2);
    const quotaDollars = (this.usageData.quota / 100).toFixed(2);

    // Determine color coding based on remaining balance
    let icon = '$';
    let warningMessage = null;

    if (lowBalanceThreshold > 0 && this.usageData.remaining < lowBalanceThreshold) {
      icon = '⚠️';
      warningMessage = `Low balance: $${remainingDollars} remaining (threshold: $${(lowBalanceThreshold / 100).toFixed(2)})`;
    } else if (percentUsed >= 90) {
      icon = '🔴'; // Red for 90%+ used
    } else if (percentUsed >= 70) {
      icon = '🟡'; // Yellow for 70-89% used
    } else {
      icon = '🟢'; // Green for <70% used
    }

    this.statusBar.text = `${icon} Amp Free Balance: $${remainingDollars}`;
    this.statusBar.tooltip = `Used: $${usedDollars} of $${quotaDollars} (${percentUsed}%) | Daily replenishment: +$${replenishmentDollars}/hour`;
    this.statusBar.show();

    // Show warning popup if balance is low
    if (warningMessage) {
      vscode.window.showWarningMessage(warningMessage);
    }
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!this.usageData) {
      const config = vscode.workspace.getConfiguration('ampFreeBalance');
      const accessToken = config.get('accessToken');

      if (!accessToken) {
        // Not configured - show setup instructions
        const items = [
          new UsageItem('⚙️  Setup Required', vscode.TreeItemCollapsibleState.None),
          new UsageItem('', vscode.TreeItemCollapsibleState.None),
          new UsageItem('1️⃣  Run "Configure Session Token"', vscode.TreeItemCollapsibleState.None),
          new UsageItem('    (Ctrl+Shift+P or click status bar)', vscode.TreeItemCollapsibleState.None),
          new UsageItem('    then go to ampcode.com/settings', vscode.TreeItemCollapsibleState.None),
          new UsageItem('', vscode.TreeItemCollapsibleState.None),
          new UsageItem('2️⃣  Press F12 → Network tab', vscode.TreeItemCollapsibleState.None),
          new UsageItem('3️⃣  Look for "getFreeTierUsage" request', vscode.TreeItemCollapsibleState.None),
          new UsageItem('4️⃣  Right-click → Copy as cURL', vscode.TreeItemCollapsibleState.None),
          new UsageItem('5️⃣  Paste the cURL command', vscode.TreeItemCollapsibleState.None),
          new UsageItem('6️⃣  Done! Token auto-saved ✅', vscode.TreeItemCollapsibleState.None),
          new UsageItem('', vscode.TreeItemCollapsibleState.None),
          new UsageItem('⏰ Session expires periodically', vscode.TreeItemCollapsibleState.None),
          new UsageItem('   If auth fails, repeat steps 1-6', vscode.TreeItemCollapsibleState.None),
        ];
        return Promise.resolve(items);
      }

      // Configured but loading/error
      return Promise.resolve([
        new UsageItem('⏳ Loading balance...', vscode.TreeItemCollapsibleState.None)
      ]);
    }

    const items = [];

    const percentUsed = Math.round(this.usageData.percentUsed);
    const barLength = 20;
    const filledLength = Math.round((percentUsed / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

    // Format amounts in dollars
    const remainingDollars = (this.usageData.remaining / 100).toFixed(2);
    const usedDollars = (this.usageData.used / 100).toFixed(2);
    const quotaDollars = (this.usageData.quota / 100).toFixed(2);
    const replenishmentDollars = (this.usageData.replenishmentRate / 100).toFixed(2);

    items.push(
      new UsageItem(
        `${bar}  ${percentUsed}%`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(new UsageItem('', vscode.TreeItemCollapsibleState.None));

    items.push(
      new UsageItem(
        `Used: $${usedDollars} / $${quotaDollars}`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(
      new UsageItem(
        `Remaining: $${remainingDollars}`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(
      new UsageItem(
        `Replenish: +$${replenishmentDollars}/hour`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    return Promise.resolve(items);
  }

  dispose() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.statusBar) {
      this.statusBar.dispose();
    }
  }
}

class UsageItem extends vscode.TreeItem {
  constructor(label, collapsibleState) {
    super(label, collapsibleState);
  }
}

function activate(context) {
  console.log('[Amp Free Balance] Extension activated');

  const provider = new UsageProvider(context);

  vscode.window.registerTreeDataProvider('amp-balance-view', provider);

  const showCommand = vscode.commands.registerCommand('amp-free-balance.show', () => {
    vscode.commands.executeCommand('amp-balance-view.focus');
  });

  const refreshCommand = vscode.commands.registerCommand('amp-free-balance.refresh', () => {
    provider.refresh();
  });

  const authCommand = vscode.commands.registerCommand('amp-free-balance.authenticate', async () => {
    try {
      const choice = await vscode.window.showInformationMessage(
        '⚙️ Setup - Step 1: Go to ampcode.com/settings',
        { detail: 'Click the button below to open in your browser' },
        '🌐 Open'
      );

      if (choice === '🌐 Open') {
        vscode.env.openExternal(vscode.Uri.parse('https://ampcode.com/settings'));

        const next = await vscode.window.showInputBox({
          title: '📋 Steps 2-6: Get Session Token',
          prompt: 'Step 2: Press F12 → Network tab\nStep 3: Look for "getFreeTierUsage" request\nStep 4: Right-click → Copy as cURL\nStep 5: Paste here\nStep 6: Done!',
          placeHolder: 'curl "https://ampcode.com/_app/remote/... -b "session=..."',
          ignoreFocusOut: true
        });

        if (next) {
          // Try to parse session cookie from various formats
          let token = null;

          // Try Windows cURL format with -b flag: -b "...session=VALUE;..."
          // Session token ends at semicolon, caret, space, or quote
          const winCurlMatch = next.match(/session=([^;\s^"']+)/);
          if (winCurlMatch && winCurlMatch[1]) {
            token = winCurlMatch[1];
          }

          // Try cURL format: -H "Cookie: session=..."
          if (!token) {
            const curlMatch = next.match(/-H\s+["']Cookie:\s+session=([^"';]+)/);
            if (curlMatch && curlMatch[1]) {
              token = curlMatch[1];
            }
          }

          // Try fetch with headers object: "Cookie": "session=..."
          if (!token) {
            const fetchMatch = next.match(/"Cookie":\s*"session=([^"]+)/);
            if (fetchMatch && fetchMatch[1]) {
              token = fetchMatch[1];
            }
          }

          // Try simple session=value format (fallback)
          if (!token) {
            const simpleMatch = next.match(/session=([a-zA-Z0-9_\-\*\.]+)/);
            if (simpleMatch && simpleMatch[1]) {
              token = simpleMatch[1];
            }
          }

          if (token && token.length > 10) {
            const config = vscode.workspace.getConfiguration('ampFreeBalance');
            await config.update('accessToken', token, true);

            vscode.window.showInformationMessage(
              '✅ Session token saved!',
              { detail: `Your balance will update automatically. If authentication fails later, refresh the token using the same steps.` }
            );

            console.log('[Amp Free Balance] Token parsed and saved successfully');

            // Trigger refresh and restart timer
            provider.startAutoRefresh();
            provider.refresh();
          } else {
            vscode.window.showErrorMessage(
              '❌ Could not parse session cookie.\n\nMake sure you pasted the full cURL command starting with "curl".'
            );
            console.error('[Amp Free Balance] Failed to parse valid token');
          }
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage('Setup failed: ' + error);
    }
  });

  const configChangeCommand = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('ampFreeBalance')) {
      console.log('[Amp Free Balance] Configuration changed, updating...');
      provider.startAutoRefresh(); // Restart timer with new interval
      provider.refresh(); // Refresh immediately
    }
  });

  context.subscriptions.push(showCommand, refreshCommand, authCommand, configChangeCommand, provider);

  console.log('[Amp Free Balance] Extension initialized successfully');
}

function deactivate() {
  console.log('[Amp Free Balance] Extension deactivated');
}

module.exports = {
  activate,
  deactivate
};
