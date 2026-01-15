# Easy Language Chrome Extension (Manifest V3)

This Chrome extension rewrites the visible text on the current page into **simpler / easier language**.

Right now it uses a **mock transformer** (simple word replacements) and includes a **placeholder** for a real API call.

## How it works

- When you click **Simplify page text** in the popup, the extension injects `content/simplify.js` into the active tab.
- The script walks through visible text nodes and replaces longer text with simplified text.
- To undo changes, just **refresh the page**.

Key files:
- `manifest.json` — MV3 config + permissions
- `background/service-worker.js` — receives popup message and injects the content script
- `content/simplify.js` — page text rewriting + API placeholder
- `popup/popup.html` / `popup/popup.js` — UI button that triggers simplify

## Test the extension (local / Load unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `apps/extension` folder (the folder that contains `manifest.json`)
5. Open any normal website (example: a news article)
6. Click the extension icon → **Simplify page text**

What you should see:
- Some words get replaced (e.g. “utilize” → “use”, “approximately” → “about”).
- The page text is modified in-place.

Notes / limitations:
- Content scripts **cannot run** on Chrome internal pages like `chrome://extensions`.
- Pages with very dynamic content may re-render and overwrite changes.

When you change code:
- Go back to `chrome://extensions` and click **Reload** on the extension.
- Refresh the page you are testing on.

## Plug in a real API later

Edit `content/simplify.js`:
- Set `API_ENDPOINT` to your backend endpoint.
- Implement the response shape in `simplifyViaApi()` (it currently expects `{ "text": "..." }`).

Tip: If you want per-site permission prompts, keep `host_permissions` empty and rely on `activeTab`.

## Package (ZIP) for deployment

Chrome Web Store accepts a `.zip` containing your extension source (including `manifest.json`).

```bash
# From the project root, navigate to the extension folder
cd apps/extension
zip -r klartext-extension.zip . -x "*.DS_Store" -x "*.zip" -x "logs/*"
```

## Publish to Chrome Web Store

1. Create a developer account: https://chrome.google.com/webstore/devconsole
2. Click **New Item** → upload `easy-language-extension.zip`
3. Fill out listing details (description, screenshots, privacy info)
4. Submit for review

Release checklist:
- Bump `version` in `manifest.json`
- Re-zip and upload the new `.zip`
