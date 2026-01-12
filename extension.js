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
    this.statusBar.command = 'amp-free-usage.refresh';
    context.subscriptions.push(this.statusBar);

    this.startAutoRefresh();
    this.refresh();
  }

  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    const config = vscode.workspace.getConfiguration('ampFreeUsage');
    const intervalMinutes = config.get('refreshInterval', 5);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, intervalMs);
  }

  async refresh() {
    try {
      const config = vscode.workspace.getConfiguration('ampFreeUsage');
      const apiUrl = config.get('apiUrl') ||
        'https://ampcode.com/_app/remote/w6b2h6/getFreeTierUsage';
      const accessToken = config.get('accessToken');

      console.log('Fetching from:', apiUrl);

      const options = {
        method: 'GET',
        headers: {},
        credentials: 'include'
      };

      if (accessToken) {
        options.headers['Cookie'] = `session=${accessToken}`;
        console.log('Using session cookie for auth');
      }

      const response = await fetch(apiUrl, options);
      console.log('Response status:', response.status);
      
      const text = await response.text();
      console.log('Response text:', text);

      const result = JSON.parse(text);
      console.log('Result object:', result);
      
      let data = result.result;
      
      // If result is a string, parse it again
      if (typeof data === 'string') {
        console.log('Parsing nested JSON string');
        data = JSON.parse(data);
      }

      console.log('Parsed data:', data);

      if (Array.isArray(data) && data.length >= 7) {
        const quota = parseInt(data[2]);
        const used = parseInt(data[6]);
        const remaining = quota - used;
        const percentUsed = (used / quota) * 100;
        const replenishmentRate = parseInt(data[3]);

        console.log('Usage data:', { quota, used, remaining, percentUsed });

        this.usageData = {
          quota,
          used,
          remaining,
          percentUsed,
          replenishmentRate
        };

        this.updateStatusBar();
      } else {
        console.error('Data format invalid:', data);
        this.statusBar.text = '$(error) Amp: Invalid data format';
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.statusBar.text = '$(error) Amp: Error';
      this.statusBar.tooltip = errorMsg;
    }

    this.onDidChangeTreeDataEmitter.fire();
  }

  updateStatusBar() {
    if (!this.usageData) return;

    const percentUsed = Math.round(this.usageData.percentUsed);
    const remainingDollars = (this.usageData.remaining / 100).toFixed(2);
    const usedDollars = (this.usageData.used / 100).toFixed(2);
    this.statusBar.text = `Amp Free: $${remainingDollars} remaining`;
    this.statusBar.tooltip = `Used: $${usedDollars} of $${(this.usageData.quota / 100).toFixed(2)} (${percentUsed}%) | Replenishes: +${this.usageData.replenishmentRate}/hour`;
    this.statusBar.show();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!this.usageData) {
      return Promise.resolve([
        new UsageItem('Loading...', vscode.TreeItemCollapsibleState.None)
      ]);
    }

    const items = [];

    const percentUsed = Math.round(this.usageData.percentUsed);
    const barLength = 20;
    const filledLength = Math.round((percentUsed / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

    items.push(
      new UsageItem(
        `${bar} ${percentUsed}%`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(new UsageItem('', vscode.TreeItemCollapsibleState.None));

    items.push(
      new UsageItem(
        `Used: ${this.usageData.used} / ${this.usageData.quota}`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(
      new UsageItem(
        `Remaining: ${this.usageData.remaining}`,
        vscode.TreeItemCollapsibleState.None
      )
    );

    items.push(
      new UsageItem(
        `Replenish: +${this.usageData.replenishmentRate}/hour`,
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
  console.log('Amp Free Usage: Extension activated');

  const provider = new UsageProvider(context);

  vscode.window.registerTreeDataProvider('amp-usage-view', provider);

  const showCommand = vscode.commands.registerCommand('amp-free-usage.show', () => {
    console.log('Show command called');
    vscode.commands.executeCommand('amp-usage-view.focus');
  });

  const refreshCommand = vscode.commands.registerCommand('amp-free-usage.refresh', () => {
    provider.refresh();
  });

  const configChangeCommand = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('ampFreeUsage')) {
      provider.refresh();
    }
  });

  context.subscriptions.push(showCommand, refreshCommand, configChangeCommand, provider);
  
  console.log('Amp Free Usage: All commands registered');
}

function deactivate() {
  console.log('Amp Free Usage: Extension deactivated');
}

module.exports = {
  activate,
  deactivate
};
