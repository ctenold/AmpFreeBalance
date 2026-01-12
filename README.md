# Amp Free Usage Extension

A VS Code extension that displays your Amp Free tier usage in the sidebar with auto-refresh.

## Features

- 📊 Sidebar view showing usage progress bar below the Amp window
- ⚙️ Customizable API URL via settings
- 🔄 Auto-refresh every 5 minutes (configurable)
- 📈 Display remaining quota, replenishment rate, and percentage
- 🎯 Refresh button to check usage immediately

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to open extension development host
5. The Amp Usage view appears in the left sidebar (chart icon)

## Configuration

Set your API endpoint and refresh interval in VS Code settings:

```json
{
  "ampFreeUsage.apiUrl": "https://ampcode.com/_app/remote/w6b2h6/getFreeTierUsage",
  "ampFreeUsage.refreshInterval": 5
}
```

- **apiUrl**: Your Amp Free tier usage API endpoint
- **refreshInterval**: Auto-refresh interval in minutes (default: 5)

## API Requirements

The API endpoint must return JSON with this structure:
```json
{
  "result": [metadata, provider, quota, replenishment, hours, models, used]
}
```

Where:
- Index 2: quota (total limit)
- Index 6: used (current usage)

## Usage

1. Open VS Code
2. Click the chart icon (Amp Usage) in the left sidebar
3. View your usage with auto-refresh every 5 minutes
4. Click the refresh icon to check usage immediately
5. Hover over status bar to see replenishment rate

---

**Note:** Do not commit your API URL to version control if it contains sensitive information.
