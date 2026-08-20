# KlarText - Easy Language Chrome Extension

> **Version:** 0.1.0  
> **Manifest:** V3  
> **License:** See [LICENSE](../../LICENSE)

Transform complex text on web pages into **easy-to-understand language**. Makes websites more accessible for everyone.

This Chrome extension uses the KlarText API to simplify web content in real-time, supporting both English and German. Perfect for users with cognitive disabilities, language learners, or anyone who wants clearer web content.

## Quick Start

1. **Install:** Load unpacked from `apps/extension` folder in Chrome
2. **Start API:** Run KlarText API at `localhost:8000`
3. **Open Sidepanel:** Right-click extension icon → "Open side panel" (first time only)
4. **Use:** Select mode → Watch text simplify!

> **Note:** On first use, you must right-click the extension icon and select "Open side panel". After that, clicking the icon normally will work automatically.

## Table of Contents

- [Features](#features)
- [What's New in v0.1.0](#whats-new-in-v010)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Development & Testing](#development--testing)
- [Configuration](#configuration)
- [Internationalization (i18n)](#internationalization-i18n)
- [Packaging & Distribution](#packaging--distribution)
- [Icons & Assets](#icons--assets)
- [Troubleshooting](#troubleshooting)
- [Support & Contributing](#support--contributing)

## Features

### Two Simplification Modes
- **Simplify Entire Page** - Processes all visible text on the current page in batches
- **Simplify Selection** - Simplifies only the text you highlight

### User Interface
- **Sidepanel UI** - Clean, accessible interface with 18px base font and high contrast
- **Branding** - KlarText logo and tagline for easy recognition
- **Language Detection** - Automatically detects page language (English/German) with manual override
- **Webapp Integration** - Quick links to webapp features (input text, upload PDF, text-to-speech)

### Progress & Control
- **Real-time Progress** - Visual progress bar with percentage, batch count, and estimated time
- **Page Indicator** - Shows which domain/page is being simplified
- **Cancel Anytime** - Red cancel button to stop processing immediately
- **Restore Original** - One-click reload to restore original page content
- **Selection Flow** - Select new text button for simplifying multiple portions

### Accessibility
- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- High contrast UI (AA compliant)
- Visible focus states for all interactive elements
- Large, readable 18px base font size

## What's New in v0.1.0

This version represents a major redesign from popup to sidepanel UI:

**UI Changes:**
- Migrated from popup to persistent sidepanel interface
- Added KlarText branding with logo and tagline
- New icon set (tornado toolbar icons replacing previous icons)
- Clean, modern layout with better visual hierarchy

**New Features:**
- **Simplify Selection** mode - Simplify only highlighted text
- **Language Detection** - Auto-detect page language with manual override
- **Real-time Progress** - Live progress bar with percentage and ETA
- **Cancel Button** - Stop processing at any time
- **Webapp Integration** - Direct links to additional features (PDF upload, TTS)
- **Page Indicator** - Shows which domain is being processed
- **Smart State Management** - Selection mode disabled during page processing

**Technical Improvements:**
- User cancellation support via AbortController
- Batch progress tracking with detailed status updates
- Per-domain language preference storage
- Improved error handling and user feedback
- Better accessibility with WCAG AA compliance

**Deprecated:**
- Popup UI (moved to `apps/deprecated/popup/`)

## How it works

1. **Open the sidepanel** by right-clicking the extension icon and selecting "Open side panel" (first time only; after that, left-click works)
2. **Choose a simplification mode:**
   - **Simplify Entire Page** - Automatically collects and simplifies all text on the page
   - **Simplify Selection** - Highlight text on the page, then click to simplify just that portion
3. **Monitor progress** - Watch the progress bar update with real-time status
4. **Cancel if needed** - Click the red Cancel button to stop processing
5. **Restore when done** - Use the Restore Original Text button to reload the page

## Architecture

### File Structure
```
apps/extension/
├── manifest.json                    # MV3 configuration and permissions
├── config.js                        # API endpoint and extension settings
├── extension_logger.js              # Logging utility
├── background/
│   └── service-worker.js           # Message routing between sidepanel and content
├── content/
│   ├── simplify.js                 # Text collection, API calls, DOM updates
│   └── styles.css                  # Styling for on-page elements
├── sidepanel/
│   ├── sidepanel.html              # Main UI structure
│   ├── sidepanel.css               # Accessible styling (18px base, AA contrast)
│   └── sidepanel.js                # UI logic and message handling
├── _locales/
│   ├── en/messages.json            # English UI + manifest strings
│   └── de/messages.json            # German UI + manifest strings
└── icons/
    ├── tornado-*.png               # Extension toolbar icons
    ├── klartextlogo3.png           # Branding logo
    ├── tornado.png                 # Page simplification icon
    ├── simplyselection.png         # Selection mode icon
    └── selecttext.png              # Selection prompt icon
```

### Message Flow
The extension uses Chrome's messaging API to communicate between components:

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `GET_ACTIVE_TAB` | Sidepanel → Background | Request current tab information |
| `SIMPLIFY_PAGE` | Sidepanel → Background → Content | Start page simplification |
| `SIMPLIFY_SELECTION` | Sidepanel → Background → Content | Start selection simplification |
| `PROGRESS_UPDATE` | Content → Background → Sidepanel | Update progress bar and status |
| `CANCEL_SIMPLIFICATION` | Sidepanel → Content | Cancel ongoing processing |
| `RESTORE_ORIGINAL` | Sidepanel → Content | Reload page to restore original |
| `SHOW_SELECTION_DIALOG` | Sidepanel → Content | Prompt user to select text |
| `DETECT_LANGUAGE` | Sidepanel → Content | Request page language detection |
| `PAGE_PROCESSING_STARTED` | Content → Sidepanel | Disable selection mode during page processing |
| `PAGE_PROCESSING_ENDED` | Content → Sidepanel | Re-enable selection mode |

### Key Components

**Background Service Worker** (`service-worker.js`)
- Routes messages between sidepanel and content scripts
- Manages extension lifecycle
- Injects content scripts when needed

**Content Script** (`simplify.js`)
- Collects text nodes from page DOM
- Batches text for efficient API calls
- Updates page with simplified text
- Handles user cancellation via AbortController
- Reports progress with percentage, batch info, and ETA

**Sidepanel** (`sidepanel.html/js/css`)
- Primary user interface
- Language detection and override
- Two simplification modes (page/selection)
- Real-time progress tracking
- Webapp feature links

### Changes from Previous Version
- **Removed popup** - Popup UI deprecated in favor of sidepanel
- **Enhanced sidepanel** - Added branding, language controls, progress tracking
- **New icons** - Updated to tornado toolbar icons, added action icons
- **Cancel support** - User can abort processing at any time
- **Selection mode** - Added ability to simplify highlighted text only
- **Progress tracking** - Real-time updates with percentage and ETA
- **Webapp integration** - Direct links to additional features

## Development & Testing

### Local Testing (Load Unpacked)

1. **Install the extension:**
   ```bash
   # Open Chrome and navigate to:
   chrome://extensions
   
   # Enable Developer mode (toggle in top right)
   # Click "Load unpacked"
   # Select the apps/extension folder (contains manifest.json)
   ```

2. **Start the KlarText API:**
   ```bash
   # From project root
   cd services/api
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Or update API_ENDPOINT in config.js to point to your API instance
   ```

3. **Toggle extension API environment (dev/prod):**
   ```bash
   # From project root
   cd apps/extension

   # Use local API and verbose logs for development
   ./scripts/toggle-config-env.sh dev

   # Use production API settings for release testing
   ./scripts/toggle-config-env.sh prod

   # Check current setting
   ./scripts/toggle-config-env.sh status
   ```
   After toggling, reload the extension in `chrome://extensions` and refresh your test page.

4. **Test the extension:**
   - Open a normal website (e.g., news article, blog post, Wikipedia)
   - **Right-click** the KlarText extension icon and select "Open side panel"
   - The sidepanel opens on the right side
   - After first use, normal left-clicking will work automatically

### Testing Entire Page Simplification

1. Click **"Simplify Entire Page"** button (with tornado icon)
2. **Observe:**
   - Progress bar appears with percentage
   - Batch information shows (e.g., "Batch 3 of 10")
   - Estimated time remaining displays
   - Page indicator shows current domain
   - Red cancel button appears
3. **Wait for completion:**
   - Green checkmark with success message
   - Restore Original Text button appears
4. **Test restore:**
   - Click "Restore Original Text"
   - Page reloads with original content

### Testing Selection Simplification

1. Click **"Simplify Selection"** button (with selection icon)
2. **Highlight text** on the page that you want to simplify
3. Click **"Simplify Selection"** again
4. **Observe:**
   - Progress bar shows
   - Only selected text is simplified
   - Success message appears
   - "Select New Text" button appears
5. **Test multiple selections:**
   - Click "Select New Text"
   - Highlight different text
   - Click "Simplify Selection" to process

### Testing Language Detection

1. **English page:**
   - Sidepanel should show "Page language: English"
2. **German page:**
   - Visit a German website
   - Sidepanel should show "Page language: Deutsch"
3. **Manual override:**
   - Click "Wrong? Click to change"
   - Select correct language from dropdown
   - Language preference saved per domain

### Testing Cancel Functionality

1. Start simplifying a large page
2. Click the **red Cancel button** during processing
3. **Verify:**
   - Processing stops immediately
   - "Simplification cancelled" message appears
   - UI returns to idle state
   - Selection mode re-enabled

### Testing Webapp Links

1. Scroll to "MORE FEATURES ON THE WEBAPP" section
2. Click each feature card:
   - Input Text
   - Upload PDF
   - Text to Speech
3. **Verify:** Links open in new tab to correct webapp URLs

### Known Limitations

- ⚠️ **First-time setup:** Must right-click extension icon → "Open side panel" on first use (left-click works automatically after that)
- ⚠️ **Chrome internal pages:** Extension cannot run on `chrome://` URLs
- ⚠️ **Protected/gated websites:** Some authenticated pages, strict CSP contexts, or embedded frames may prevent content access or script injection
- ⚠️ **Dynamic content:** Pages that heavily re-render may overwrite simplified text
- ⚠️ **API required:** Extension requires KlarText API running (local or remote)
- ⚠️ **Large pages:** Very large pages (1000+ text chunks) may take several minutes
- ⚠️ **Selection blocking:** Selection mode disabled during page simplification

### Debugging

**When you change code:**
1. Go to `chrome://extensions`
2. Click **Reload** button on the KlarText extension card
3. Refresh the test webpage
4. Reopen the sidepanel

**Check console logs:**
- **Sidepanel console:** Right-click sidepanel → Inspect → Console tab
- **Background worker console:** `chrome://extensions` → Extension details → "service worker" link
- **Content script console:** Right-click webpage → Inspect → Console tab (filter by "[KlarText]")

**Common issues:**
- **"Could not find active tab"** - Refresh the extension and webpage
- **"Failed to communicate with extension"** - Check that API is running at correct endpoint
- **No response from content script** - Refresh webpage to inject content script

## Configuration

### API Configuration (`config.js`)

The extension connects to the KlarText API. Configure the endpoint and settings:

```javascript
const CONFIG = {
  API_ENDPOINT: 'https://klartext-api.fly.dev',  // Production API base URL
  API_TIMEOUT: 30000,                     // Request timeout (ms)
  MIN_TEXT_LENGTH: 10,                    // Minimum characters to simplify
  BATCH_SIZE: 20,                         // Chunks per batch request
  WEBAPP_URL: 'https://klartext.app',     // Webapp base URL
  WEBAPP_FEATURES: [
    { id: 'input-text', url: '/input' },
    { id: 'upload-pdf', url: '/upload' },
    { id: 'text-to-speech', url: '/tts' }
  ]
};
```

**API Routes used:**
- `/simplify` - Single text simplification (for selections)
- `/simplify-batch` - Batch text simplification (for entire pages)

**Integration approach used in this extension:**
- Calls the KlarText backend through the extension service worker (API proxy)
- Does **not** require Google Analytics 4 for core functionality
- Does **not** require OAuth 2.0 unless user-account features are introduced later

**Production setup:**
- Keep `API_ENDPOINT` on your production HTTPS API URL
- The service worker only proxies allowlisted API origins and `/v1/simplify/batch`. Add a new host in `background/service-worker.js` before changing `API_ENDPOINT` to it.
- Set `DEBUG` to `false` in `config.js` and `background/service-worker.js` (or run `./scripts/toggle-config-env.sh prod`)
- Update `WEBAPP_URL` to your production webapp URL
- Adjust `API_TIMEOUT` and `BATCH_SIZE` based on your API performance

## Internationalization (i18n)

KlarText uses Chrome extension i18n message catalogs in `_locales/`.

### What is localized
- Manifest fields (`name`, `description`, `action.default_title`) via `__MSG_*__` keys
- Sidepanel static text via `data-i18n` / `data-i18n-aria-label` attributes
- Sidepanel runtime status/error text via locale catalogs loaded from `_locales/*/messages.json`
- Sidepanel UI locale follows the detected/selected page language (`en`/`de`) instead of the browser UI language

### Locale files
- `apps/extension/_locales/en/messages.json`
- `apps/extension/_locales/de/messages.json`

### Add another language
1. Create `apps/extension/_locales/<locale>/messages.json`
2. Copy all keys from English catalog and translate `message` values
3. Reload extension at `chrome://extensions`
4. Verify manifest title/description and sidepanel labels in that browser language

### Chrome Web Store listing language vs extension i18n
- Web Store listing language is configured in the Developer Dashboard listing form
- Extension runtime i18n is controlled by `_locales/*/messages.json` in code
- Manifest-level strings still follow Chrome UI locale rules, while sidepanel text follows KlarText's in-app language selection
- Maintain both so listing text and in-product UI stay aligned

## Packaging & Distribution

### Create ZIP for Chrome Web Store

```bash
# From the project root
cd apps/extension

# Create and verify a release ZIP in dist/
./scripts/package-extension-zip.sh
```

The script:
- Reads `version` from `manifest.json`
- Produces `dist/klartext-extension-v<version>.zip`
- Excludes development-only files
- Verifies the archive contains `manifest.json`

### Publish to Chrome Web Store

1. **Developer Account**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Pay one-time $5 registration fee (if not already registered)

2. **Upload Extension**
   - Click **"New Item"**
   - Upload `dist/klartext-extension-v<version>.zip`
   - Wait for automatic checks to complete

3. **Store Listing**
   - **Name:** KlarText - Easy Language for Everyone
   - **Summary:** Transform complex text into easy-to-understand language
   - **Description:** Use the detailed description from manifest
   - **Category:** Accessibility
   - **Language:** English (add German translation if desired)

4. **Graphics**
   - **Icon:** 128x128px (already in extension)
   - **Small tile:** 440x280px screenshot of sidepanel
   - **Screenshots:** 1280x800px or 640x400px
     - Screenshot of sidepanel open
     - Screenshot of page being simplified
     - Screenshot of progress tracking
     - Screenshot of webapp features section

5. **Privacy**
   - **Single purpose:** Simplifies web page text for accessibility
   - **Permissions justification:**
     - `activeTab` - Access current page content to simplify
     - `scripting` - Inject content script to modify text
     - `storage` - Save language preferences per domain
     - `sidePanel` - Display sidepanel interface
     - `tabs` - Identify current page for processing
   - **Host permissions:** Required to simplify text on any website
   - **Privacy policy URL:** Production webapp `/privacy` page (for example `https://your-app.vercel.app/privacy`)
   - **Telemetry note:** `/v1/log-run` stores hashed input metadata; raw user text is not logged by this endpoint

6. **Submit for Review**
   - Review takes 1-3 business days typically
   - Address any feedback from Chrome Web Store team

### Release Checklist

Before each release:
- [ ] Bump `version` in `manifest.json` (use semantic versioning)
- [ ] Update `CHANGELOG.md` with changes
- [ ] Confirm manifest icon paths point to current production branding assets
- [ ] Confirm manifest i18n keys resolve correctly from `_locales/en/messages.json`
- [ ] Test all features thoroughly:
  - [ ] Page simplification on multiple sites
  - [ ] Selection simplification
  - [ ] Language detection and override
  - [ ] Progress tracking and cancellation
  - [ ] Restore original text
  - [ ] Webapp feature links
- [ ] Test on different types of websites (news, blogs, documentation)
- [ ] Verify API endpoint configuration for production in `config.js`:
  - [ ] `API_ENDPOINT` uses production `https://` URL (not localhost)
  - [ ] `DEBUG` is set to `false`
- [ ] Review and update privacy policy if needed
- [ ] Verify backend CORS production allowlist includes expected extension/web origins
- [ ] Confirm production telemetry/logging does not include raw user text
- [ ] Create clean ZIP file using `./scripts/package-extension-zip.sh`
- [ ] Upload to Chrome Web Store
- [ ] Test installed version from store (unlisted first)

## Icons & Assets

### Extension Icons (Toolbar)
- `icons/tornado-16.png` - 16x16px toolbar icon
- `icons/tornado-48.png` - 48x48px toolbar icon
- `icons/tornado-128.png` - 128x128px store listing icon

### UI Icons (In-Extension)
- `icons/klartextlogo3.png` - KlarText logo for branding
- `icons/tornado.png` - Simplify entire page button icon
- `icons/simplyselection.png` - Simplify selection button icon
- `icons/selecttext.png` - Selection prompt dialog icon
- `icons/Klartexticon1.png` - Input text feature card icon
- `icons/Klartext.png` - Upload PDF feature card icon
- `icons/Klartextsound.png` - Text-to-speech feature card icon

**Note:** Some icons are also duplicated in `/assets/icons/` and `/assets/images/` for use in other parts of the project.

### Icon Guidelines for Updates
- Maintain consistent style across all icons
- Ensure icons are recognizable at small sizes (16x16)
- Use accessible color contrast ratios
- Export as PNG with transparent backgrounds
- Consider dark mode appearance

## Troubleshooting

### Extension Not Working on Some Pages

**Problem:** Content script fails to inject or extension icon is grayed out.

**Solutions:**
- ✅ Extension cannot run on Chrome internal pages (`chrome://`, `chrome-extension://`, etc.)
- ✅ Refresh the page after installing/reloading the extension
- ✅ Check that page is a standard HTTP/HTTPS website
- ✅ Some sites block extensions - try a different site to verify it works

### Sidepanel Doesn't Open When Clicking Icon

**Problem:** Left-clicking the extension icon does nothing.

**Solutions:**
- ✅ Right-click the extension icon and select "Open side panel"
- ✅ After opening once, left-clicking will work automatically
- ✅ This is a known issue - see [known_issues.md](known_issues.md) for details

### "Could not find active tab" Error

**Problem:** Sidepanel shows error message when opened.

**Solutions:**
- ✅ Reload the extension at `chrome://extensions`
- ✅ Refresh the webpage you're trying to simplify
- ✅ Close and reopen the sidepanel
- ✅ Make sure you're on a valid webpage (not a Chrome internal page)

### API Connection Errors

**Problem:** "Failed to communicate with extension" or timeout errors.

**Solutions:**
- ✅ Verify KlarText API is running: `curl http://localhost:8000`
- ✅ Check `config.js` has correct `API_ENDPOINT`
- ✅ Check browser console for CORS errors
- ✅ Increase `API_TIMEOUT` in `config.js` for slower connections
- ✅ Check API logs for errors: `docker logs klartext-api` (if using Docker)

### Progress Stuck or Not Updating

**Problem:** Progress bar shows but doesn't update or gets stuck.

**Solutions:**
- ✅ Use the Cancel button to stop processing
- ✅ Check content script console for errors (right-click page → Inspect → Console)
- ✅ Verify API is responding: check API logs
- ✅ Some pages with heavy JavaScript may conflict - try a simpler page
- ✅ Refresh page and try again

### Simplified Text Disappears or Reverts

**Problem:** Text simplifies but then reverts to original.

**Solutions:**
- ✅ Some sites use React/Vue and re-render frequently - this will overwrite changes
- ✅ Try disabling auto-refresh on the page
- ✅ Use "Simplify Selection" mode for specific sections instead
- ✅ Consider using the webapp for better persistence

### Language Detection Wrong

**Problem:** Extension detects wrong language or uses incorrect language.

**Solutions:**
- ✅ Click "Wrong? Click to change" and manually select correct language
- ✅ Language preference is saved per domain
- ✅ Clear saved preferences: Chrome DevTools → Application → Storage → Local Storage → Clear
- ✅ Check page HTML lang attribute: `document.documentElement.lang`

## Support & Contributing

### Reporting Issues

Found a bug or have a feature request?
1. Check [known_issues.md](known_issues.md) for known limitations
2. Search existing issues in the project repository
3. Create a new issue with:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

### Contributing

We welcome contributions! Areas where you can help:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🌍 Translation to other languages
- ♿ Accessibility improvements
- 🎨 UI/UX enhancements

See the main project [README](../../README.md) for contribution guidelines.

### Future Roadmap

Potential features for future versions:
- [ ] Support for more languages (Spanish, French, etc.)
- [ ] Multiple simplification levels (A1, A2, B1)
- [ ] Persist simplified text across page navigations
- [ ] Keyboard shortcuts for quick actions
- [ ] Customizable UI themes
- [ ] Offline mode with cached API
- [ ] Statistics (words simplified, time saved)
- [ ] Export simplified page as PDF/HTML

---


