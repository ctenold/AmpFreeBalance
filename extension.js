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
    }

    const config = vscode.workspace.getConfiguration('ampFreeBalance');
    const intervalMinutes = config.get('refreshInterval', 5);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, intervalMs);
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
      
      // Reset command to refresh when configured
      this.statusBar.command = 'amp-free-balance.refresh';

      console.log('[Amp Free Balance] Fetching balance data');
      console.log('[Amp Free Balance] Token length:', accessToken.length, 'First 50 chars:', accessToken.substring(0, 50));

      const options = {
        method: 'GET',
        headers: {
          'Cookie': `session=${accessToken}`
        },
        credentials: 'include'
      };

      const response = await fetch(apiUrl, options);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('[Amp Free Balance] Raw response:', text.substring(0, 200));
      
      const result = JSON.parse(text);
      console.log('[Amp Free Balance] Parsed result:', result);
      
      let data = result.result;
      
      // Handle nested JSON string
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      console.log('[Amp Free Balance] Data array:', Array.isArray(data), 'Length:', data?.length, 'Data:', data);

      if (!Array.isArray(data) || data.length < 7) {
        throw new Error(`Invalid API response format. Got: ${JSON.stringify(data)}`);
      }

      const quota = parseInt(data[2]);
      const used = parseInt(data[6]);
      const remaining = quota - used;
      const percentUsed = (used / quota) * 100;
      const replenishmentRate = parseInt(data[3]);

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
      this.statusBar.tooltip = errorMsg;
    }

    this.onDidChangeTreeDataEmitter.fire();
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
      
      // Configured but loading
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
            
            console.log('[Amp Free Balance] Token parsed:', token.substring(0, 30) + '...');
            
            // Trigger refresh
            provider.refresh();
          } else {
            vscode.window.showErrorMessage(
              '❌ Could not parse session cookie.\n\nMake sure you pasted the full cURL command starting with "curl".'
            );
            console.error('[Amp Free Balance] Failed to parse token. Found:', token);
          }
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage('Setup failed: ' + error);
    }
  });

  const configChangeCommand = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('ampFreeBalance')) {
      provider.refresh();
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
