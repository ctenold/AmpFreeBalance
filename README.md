# Amp Free Usage Extension

A lightweight VS Code extension that displays your Amp Free tier quota usage with auto-refresh. Monitor your remaining balance directly in the status bar and sidebar.

## Features

- 💰 **Status Bar Display** - Shows remaining balance in dollars at the bottom left
- 📊 **Sidebar Panel** - Visual progress bar with detailed usage breakdown
- 🔄 **Auto-Refresh** - Updates every 5 minutes (configurable)
- 💵 **Dollar Formatting** - Displays remaining, used, and replenishment rate in USD
- 🎯 **One-Click Refresh** - Manual refresh button in sidebar

## Installation

### From GitHub (Recommended)

1. Clone or download this repository
2. Open the folder in VS Code
3. Press **F5** to launch the extension in development mode
4. Click the **$** icon in the left sidebar to view your Amp Free usage

### As VSIX Package

1. Create a `.vsix` package
2. In VS Code: **Ctrl+Shift+P** → "Install from VSIX" → select the package

## Configuration

### Setting Your Session Token

The extension requires your Amp session cookie for authentication.

**How to get your session token:**

1. Go to **ampcode.com** and log in
2. Press **F12** to open DevTools
3. Go to **Network** tab
4. Refresh the page and look for the `getFreeTierUsage` request
5. Click on that request
6. In the **Headers** section, find the `cookie` header
7. Copy the value after `session=` (the long string)

**Configure in VS Code:**

1. Press **Ctrl+,** to open Settings
2. Search for `ampFreeUsage.accessToken`
3. Paste your session token value
4. Reload VS Code (F5 if in dev mode)

### Optional Settings

- **ampFreeUsage.refreshInterval** (default: 5)
  - Auto-refresh interval in minutes
  - Set to `0` to disable auto-refresh

- **ampFreeUsage.apiUrl** (default: official Amp endpoint)
  - Override the API endpoint if needed

## Usage

### Status Bar (Bottom Left)

The status bar displays your remaining balance:

```
Amp Free: $7.00 remaining
```

**Hover** over the status bar to see detailed information:
- Used amount and quota
- Usage percentage
- Hourly replenishment rate (up to $10/day limit)

### Sidebar Panel (Left Activity Bar)

Click the **$** icon to open the Amp Free usage sidebar showing:
- Visual progress bar
- Used / Total quota
- Remaining balance
- Replenishment rate

Click the **Refresh** button to manually check your latest usage.

## How It Works

1. **Fetches Usage Data** - Calls the Amp API with your session token every 5 minutes (or on manual refresh)
2. **Parses Response** - Extracts quota and used values from the API response
3. **Converts to Dollars** - Divides by 100 to convert from cents to USD
4. **Updates Display** - Shows remaining balance and usage details

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

⚠️ **Important:** 
- Your session token is **sensitive authentication data**
- **Do NOT commit your token to version control**
- The `.gitignore` is configured to protect settings
- Store sensitive config in VS Code's local settings only
- Your token will expire eventually - refresh it when authentication fails

## Troubleshooting

### "Authentication required" Error
- Your session token may have expired
- Get a fresh token from ampcode.com (see Configuration above)
- Paste the new token in VS Code settings and reload

### "Loading..." stuck indefinitely
- Check your internet connection
- Verify your API URL is correct
- Check the token is valid and hasn't expired

### No display/extension not loading
- Make sure you have the session token configured
- Press **Ctrl+Shift+P** and reload the extension window
- Check Debug Console (F5 mode) for error messages

## Development

To modify or extend this extension:

1. Edit `extension.js` for logic changes
2. Edit `package.json` for configuration/UI changes
3. Edit `media/icon.svg` for sidebar icon
4. Press **F5** to test changes in a new window
5. Reload with **Ctrl+R** in the extension window

## License

Free to use and modify for personal/commercial use.

---

**Made for Amp Free tier users.** Monitor your quota usage at a glance! 💰
