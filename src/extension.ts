import * as vscode from 'vscode';

interface UsageData {
  quota: number;
  used: number;
  remaining: number;
  percentUsed: number;
  replenishmentRate: number;
}

class UsageProvider implements vscode.TreeDataProvider<UsageItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<UsageItem | undefined | null | void> =
    new vscode.EventEmitter<UsageItem | undefined | null | void>();
  onDidChangeTreeData: vscode.Event<UsageItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private usageData: UsageData | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private statusBar: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBar.command = 'amp-free-usage.refresh';
    context.subscriptions.push(this.statusBar);

    this.startAutoRefresh();
    this.refresh();
  }

  private startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    const config = vscode.workspace.getConfiguration('ampFreeUsage');
    const intervalMinutes = config.get<number>('refreshInterval', 5);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, intervalMs);
  }

  async refresh() {
    try {
      const config = vscode.workspace.getConfiguration('ampFreeUsage');
      const apiUrl = config.get<string>('apiUrl') ||
        'https://ampcode.com/_app/remote/w6b2h6/getFreeTierUsage';

      const response = await fetch(apiUrl);
      const text = await response.text();

      const result = JSON.parse(text);
      const data = result.result;

      if (Array.isArray(data) && data.length >= 7) {
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

        this.updateStatusBar();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.statusBar.text = `$(error) Amp: Error`;
      this.statusBar.tooltip = errorMsg;
    }

    this._onDidChangeTreeData.fire();
  }

  private updateStatusBar() {
    if (!this.usageData) return;

    const percentUsed = Math.round(this.usageData.percentUsed);
    this.statusBar.text = `$(chart-line) Amp: ${this.usageData.used}/${this.usageData.quota} (${percentUsed}%)`;
    this.statusBar.tooltip = `Remaining: ${this.usageData.remaining} | Replenishes: +${this.usageData.replenishmentRate}/hour`;
    this.statusBar.show();
  }

  getTreeItem(element: UsageItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: UsageItem): Thenable<UsageItem[]> {
    if (!this.usageData) {
      return Promise.resolve([
        new UsageItem('Loading...', vscode.TreeItemCollapsibleState.None)
      ]);
    }

    const items: UsageItem[] = [];

    // Progress bar item
    const percentUsed = Math.round(this.usageData.percentUsed);
    const barLength = 20;
    const filledLength = Math.round((percentUsed / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

    items.push(
      new UsageItem(
        `${bar} ${percentUsed}%`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: '',
          title: '',
          arguments: []
        }
      )
    );

    items.push(new UsageItem('', vscode.TreeItemCollapsibleState.None)); // Spacer

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
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new UsageProvider(context);

  vscode.window.registerTreeDataProvider('amp-usage-view', provider);

  const refreshCommand = vscode.commands.registerCommand('amp-free-usage.refresh', () => {
    provider.refresh();
  });

  const refreshIntervalCommand = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('ampFreeUsage')) {
      provider.refresh();
    }
  });

  context.subscriptions.push(refreshCommand, refreshIntervalCommand, provider);
}

export function deactivate() {}
