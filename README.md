# Perplexity – Usage Limits Panel

A sleek, highly functional userscript for [Perplexity.ai](https://www.perplexity.ai/) that adds a sticky bottom panel to track your real-time usage limits, MCP (Model Context Protocol) source limits, and account settings.

Never get caught off-guard by hitting your Pro search limits again. This script seamlessly hooks into Perplexity's internal APIs to give you a clear, at-a-glance view of your remaining resources without cluttering the UI.

## ✨ Features

- **Real-Time Limit Tracking**: Displays remaining limits for Pro searches, Research, Agentic Research, and Labs features.
- **MCP Integrations**: Monitors specific limits for external integrations (GitHub, Notion, Google Drive, Slack, etc.) dynamically.
- **Settings Overview**: Quickly view important settings like daily upload limits, default models, and whether data training is disabled.
- **Color-Coded Warnings**: Limits are color-coded to visually warn you when you're running low (e.g., <=3 is critical red, <=10 is orange, <=25 is yellow).
- **Smart Auto-Refresh**: Automatically detects when you send a query (via `Enter` key, submit buttons, or backend `fetch` calls) and refreshes the data in the background.
- **Theme Support**: Fully supports Light and Dark modes with a built-in toggle switch.
- **Non-Intrusive Smart Layout**: Dynamically adjusts itself to avoid covering sidebars, and gracefully shifts Perplexity's chat interface upward so messages are never hidden behind the panel.
- **Hideable**: Can be toggled out of sight with a compact "Show Usage" button.

## 🚀 Installation

To use this script, you will need a userscript manager extension installed in your browser.

1. **Install a Userscript Manager:**
   - Tampermonkey (Chrome, Edge, Safari, Firefox)
   - Violentmonkey (Chrome, Edge, Firefox)

2. **Install the Script:**
   - Create a new script in your userscript manager.
   - Copy the entire contents of `perplexity_usage_panel.js` and paste it into the editor.
   - Save the script (usually `Ctrl + S` or `Cmd + S`).

3. **Start Using It:**
   - Navigate to or refresh Perplexity.ai.
   - The panel will automatically appear at the bottom of the screen.

## 💡 Usage & Controls

Once installed, the panel operates automatically. It includes a few manual controls located on the far right:

- **Dot Status Indicator**: 
  - **Teal**: Live and up-to-date.
  - **Yellow**: Waiting/Pending refresh (usually triggers when a query is sent).
- **☀ / ☾ Theme Toggle**: Manually switch the panel between Light and Dark themes (saves to your local storage).
- **↻ Refresh**: Manually ping the Perplexity API to update your limits immediately.
- **✕ Close**: Hides the panel, leaving a small "Show Usage" tab on the bottom right to restore it later.

## ⚙️ How it Works

The script works by making secure, authenticated background `fetch` requests to Perplexity's own internal REST endpoints:
- `/rest/rate-limit/all` (Provides data on limits)
- `/rest/user/settings` (Provides data on preferences and limits)

It uses an event-interceptor on the browser's native `fetch` API, as well as `click` and `keydown` event listeners on the search bar, to know exactly when you've executed a new search, triggering a delayed data refresh.

## 🛠 Configuration

If you want to track additional limit categories or MCP sources not currently included, you can modify the configuration objects at the top of `perplexity_usage_panel.js`:

```javascript
// Modify search limit labels or total thresholds
const SEARCH_LIMITS = { ... };

// Add new user settings keys you'd like to monitor
const SETTINGS_FIELDS = [ ... ];

// Map raw internal MCP source keys to friendly UI labels
const MCP_NAMES = { ... };
```

## 📝 License

This project is licensed under the MIT License. See the script header for details.

---

*Disclaimer: This is an unofficial, community-created script. It is not affiliated with, endorsed by, or maintained by Perplexity AI. It relies on internal API endpoints which may change or be deprecated over time.*