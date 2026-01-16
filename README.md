# Amp Free Balance

A professional VS Code extension for monitoring your Amp API free tier balance and quota usage in real-time. Get immediate visibility into your remaining balance and usage patterns with automatic refresh and intuitive UI components.

**Note:** This is a community-developed extension, not affiliated with the official Amp project.

## Features

- **Real-time Status Bar** - Color-coded balance indicator (🟢 green, 🟡 yellow, 🔴 red, ⚠️ warning)
- **Balance Monitoring** - Displays remaining balance in USD format ($X.XX)
- **Low Balance Alerts** - Configurable warning threshold (default: $1.00, disable with 0)
- **Detailed Sidebar** - Visual progress bar, usage breakdown, and setup instructions
- **Auto-Refresh** - Updates every 5 minutes by default (configurable in settings)
- **Simple Setup** - Paste cURL command, auto-parses session token
- **Secure** - Token stored in VS Code local settings (never committed)

## Installation

### From Releases (Easiest - Recommended)

1. Go to [GitHub Releases](https://github.com/ctenold/AmpFreeBalance/releases)
2. Download the latest `.vsix` file
3. In VS Code: **Ctrl+Shift+P** → search `Install from VSIX`
4. Select the downloaded `.vsix` file
5. Extension loads automatically ✅

### From Source (Development)

1. Clone this repository
2. Open the folder in VS Code
3. Press **F5** to launch in development mode
4. Click the **$** icon in sidebar to start setup

### Manual VSIX Build

1. Clone the repository
2. Run `npm install -g vsce`
3. Run `vsce package`
4. Install the generated `.vsix` file in VS Code

## Configuration

### Automated Session Setup (Recommended)

1. Press **Ctrl+Shift+P** and run: **"Amp Free Balance: Configure Session Token"**
2. Extension will open your browser to ampcode.com/settings
3. Retrieve your session token from the DevTools Network tab
4. Paste into VS Code settings (see manual setup below)

### Manual Session Token Setup

If automated setup fails, manually retrieve your session token:

1. Go to **https://ampcode.com/settings** and log in
2. Press **F12** to open DevTools → **Network** tab
3. Look for the `getFreeTierUsage` request
4. Click the request and find the `Cookie` header
5. Copy the session token value (long alphanumeric string after `session=`)
6. In VS Code: Press **Ctrl+,** → Search for `ampFreeBalance.accessToken` → Paste token
7. Reload VS Code window

### Optional Settings

- **ampFreeBalance.refreshInterval** (default: 5 minutes)
  - How often to check your balance automatically
  - Set to `0` to disable auto-refresh

- **ampFreeBalance.lowBalanceThreshold** (default: 1)
  - Dollar amount to trigger low balance warning
  - When remaining balance drops below this, you'll see ⚠️ and a warning popup
  - Set to `0` to disable warnings

- **ampFreeBalance.apiUrl** (advanced)
  - Override the API endpoint if the default changes
  - Default: `https://ampcode.com/_app/remote/w6b2h6/getFreeTierUsage`

## Usage

### Status Bar (Bottom Left)

The status bar displays your remaining balance with color-coded status:

```
🟢 Amp Free Balance: $7.00    (< 70% used)
🟡 Amp Free Balance: $3.00    (70-89% used)
🔴 Amp Free Balance: $1.50    (≥ 90% used)
⚠️ Amp Free Balance: $0.50    (Below threshold)
```

**Hover** over the status bar to see:
- Used and total quota in USD
- Usage percentage
- Hourly replenishment rate

### Sidebar Panel (Left Activity Bar)

Click the **$** icon to open the Amp Free Balance sidebar showing:
- Visual progress bar
- Used / Total quota
- Remaining balance
- Replenishment rate

Click the **Refresh** button to manually check your latest usage.

## How It Works

1. **Fetches Balance Data** - Calls the Amp API with your session token (default: every 5 minutes)
2. **Parses Response** - Extracts quota, usage, and replenishment data
3. **Calculates Balance** - Determines remaining balance in cents, converts to dollars
4. **Color-codes Status** - Determines icon based on percentage used or low balance threshold
5. **Shows Warnings** - Displays popup alert if balance drops below your threshold
6. **Updates UI** - Displays formatted balance in status bar and detailed breakdown in sidebar

## File Structure

```
AmpUsage/
├── extension.js          # Main extension code
├── package.json          # Extension manifest
├── media/
│   └── icon.svg          # Sidebar icon ($)
├── README.md             # This file
└── .vscode/
    └── launch.json       # Debug configuration
```

## Security & Privacy

**⚠️ Security Notice:**
- Session tokens are **sensitive authentication credentials**
- Never commit tokens to version control or share publicly
- VS Code local settings store tokens securely in your user profile
- Tokens expire periodically—refresh via "Configure Session Token" command when authentication fails
- The `.gitignore` file protects settings files from leaking sensitive data

## Troubleshooting

### "Authentication required" Error
- Your session token may have expired
- Get a fresh token from ampcode.com (see Configuration above)
- Paste the new token in VS Code settings and reload

### Status Bar Shows "Not configured"
- Run **Ctrl+Shift+P** → "Amp Free Balance: Configure Session Token"
- Or manually set `ampFreeBalance.accessToken` in VS Code settings
- Reload the window after configuration

### No data displays / "Error" shown
- Check your internet connection
- Verify your session token is valid and hasn't expired
- Check Debug Console (F5 mode) for detailed error messages

## Development

To modify or extend this extension:

1. Edit `extension.js` for logic changes
2. Edit `package.json` for configuration/UI changes
3. Edit `media/icon.svg` for sidebar icon
4. Press **F5** to test changes in a new window
5. Reload with **Ctrl+R** in the extension window

## Changelog

### v1.0.0 (Latest)
- ✅ Color-coded balance status (🟢 🟡 🔴 ⚠️)
- ✅ Low balance warnings with configurable threshold
- ✅ Auto-parsing of cURL session tokens
- ✅ Real-time balance monitoring with auto-refresh
- ✅ Professional UI with step-by-step setup guide
- ✅ Dollar formatting throughout ($X.XX)
- ✅ Secure local token storage

## License

MIT License - Free to use, modify, and distribute for personal and commercial purposes.

---

**Amp Free Balance** — Community extension for monitoring Amp API free tier usage. Not officially affiliated with Amp.

Get the latest version from [Releases](https://github.com/ctenold/AmpFreeBalance/releases).
