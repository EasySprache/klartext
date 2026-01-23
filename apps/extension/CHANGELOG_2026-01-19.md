# KlarText Extension - Changelog
## January 19, 2026

### 🎉 Major Features Added

#### 1. Structured Logging System
- **New file**: `extension_logger.js` - Logging module ported from demo app
- Logs each simplification with comprehensive metrics:
  - Average sentence length
  - Percentage of long sentences (>20 words)
  - Automated Readability Index (ARI)
  - Meaning preservation score (Jaccard similarity)
- Guardrails evaluation (4 checks per simplification)
- Logs written via Chrome Downloads API to `klartext/extension_logs/`
- Matches logging structure from `notebooks/12_demo_logging_setup.ipynb`

#### 2. German & English Language Support
- **Language selector** in popup UI
- Dropdown to choose between English and German
- Language preference **persists** across sessions (Chrome Storage API)
- API calls now send selected language to backend
- Supports both `en` and `de` template paths

#### 3. Selection-Based Simplification
- **Two operation modes**:
  1. **Simplify Entire Page** - Original functionality
  2. **Simplify Selection** - NEW! Simplify only highlighted text
- Smart text selection detection
- Preserves page structure - only replaces selected content
- Error handling for invalid selections (<20 chars)

#### 4. Cancellable Batch Processing
- **120-second timeout** threshold for large pages
- After timeout, displays cancel button in loading overlay
- User can abort and switch to selection mode
- Implements `AbortController` for clean cancellation
- Helpful error message suggests using selection mode

#### 5. Restore Original Text
- **Floating restore button** (bottom-right corner)
- One-click restoration of all original text
- Keyboard accessible (Enter/Space)
- Replaces reliance on page refresh
- Improves user experience based on feedback

---

## Files Modified

### New Files
- ✨ `apps/extension/extension_logger.js` - Logger module (268 lines)
- 📋 `apps/extension/TESTING_GUIDE.md` - Comprehensive testing guide
- 📋 `apps/extension/CHANGELOG_2026-01-19.md` - This file

### Modified Files

#### `apps/extension/config.js`
- Added `SUPPORTED_LANGUAGES` object with language labels
- Updated comments for `DEFAULT_LANG`

#### `apps/extension/manifest.json`
- Added permissions: `storage`, `downloads`
- Added `extension_logger.js` to `web_accessible_resources`

#### `apps/extension/popup/popup.html`
- Added language selector dropdown
- Replaced single button with two buttons:
  - "Simplify Entire Page"
  - "Simplify Selection"
- Updated button IDs and styling

#### `apps/extension/popup/popup.css`
- Added styles for `.language-selector` and `.language-select`
- Added `.secondary-button` styles for selection button
- Updated button spacing and layout
- Enhanced focus states for accessibility

#### `apps/extension/popup/popup.js`
- Added language selector handling
- Implemented language persistence (Chrome Storage API)
- Updated button event listeners (now two buttons)
- Added `initializePopup()` to load saved preferences
- Selection state detection for smart button states
- Updated message types: `SIMPLIFY_PAGE` vs `SIMPLIFY_SELECTION`

#### `apps/extension/background/service-worker.js`
- Complete rewrite of message handler
- Now handles 3 message types:
  1. `SIMPLIFY_PAGE` - Full page simplification
  2. `SIMPLIFY_SELECTION` - Selected text only
  3. `WRITE_LOG` - Log entry writing
- Added `handleLogWrite()` function for log file management
- Added `handleSimplification()` function with language parameter
- Injects `extension_logger.js` alongside content script
- Sends `START_SIMPLIFICATION` message to content script with mode and language

#### `apps/extension/content/simplify.js` (Major updates)
**New Functions:**
- `getSelectedText()` - Extract and validate selected text
- `simplifySelection(language)` - Simplify only selection
- `showCancelButton(onCancel)` - Display cancel button after timeout
- `hideCancelButton()` - Remove cancel button
- `showRestoreButton()` - Display floating restore button
- `restorePage()` - Restore all original text

**Updated Functions:**
- `callAPI(texts, language, abortSignal)` - Added language and abort parameters
- `simplifyInBatches(chunks, language, abortController)` - Added language, abort support, and logging integration
- `simplifyPage(language)` - Added language parameter, timeout detection, cancel button, restore button

**Message Handling:**
- Removed auto-execution of `simplifyPage()`
- Added `chrome.runtime.onMessage` listener for `START_SIMPLIFICATION`
- Routes to appropriate function based on mode

**Logging Integration:**
- Imports `log_simplification` from `extension_logger.js`
- Logs each successful simplification in batch mode
- Logs selection simplifications

---

## Technical Details

### Message Flow

```
User clicks button in Popup
    ↓
Popup sends message to Service Worker
    Type: SIMPLIFY_PAGE or SIMPLIFY_SELECTION
    Data: { language: 'en' or 'de' }
    ↓
Service Worker injects scripts:
    1. config.js
    2. extension_logger.js
    3. content/simplify.js
    ↓
Service Worker sends message to Content Script
    Type: START_SIMPLIFICATION
    Data: { mode: 'page' or 'selection', language: 'en' or 'de' }
    ↓
Content Script executes simplification
    ↓
Content Script logs results (sends WRITE_LOG to Service Worker)
    ↓
Service Worker writes log files (Downloads API)
```

### Abort Controller Flow

```
simplifyPage() called
    ↓
Creates AbortController
    ↓
Sets 120s timeout
    ↓
Passes controller to simplifyInBatches()
    ↓
Each API call uses controller.signal
    ↓
After 120s: showCancelButton()
    ↓
User clicks cancel → abortController.abort()
    ↓
Fetch requests abort with AbortError
    ↓
Cleanup and show error message
```

### Data Storage

**Chrome Storage (Local):**
- `preferredLanguage` - User's selected language ('en' or 'de')

**Chrome Downloads:**
- Individual JSONL files per simplification
- Path: `Downloads/klartext/extension_logs/[timestamp].jsonl`
- Note: Not appended to single file due to extension restrictions

**DOM Data Attributes:**
- `data-klartext-original` - Stores original text before simplification
- `data-klartext-simplified` - Marks element as simplified ('1')

---

## Breaking Changes

⚠️ **Extension must be reloaded** after update due to:
- New permissions added (`storage`, `downloads`)
- New files added to web_accessible_resources
- Service worker message handling changed

⚠️ **Old saved results format** no longer compatible:
- Previous: Single `simplifyPage()` auto-execution
- Now: Message-driven execution with mode selection

---

## Known Limitations

1. **Log file format**: Individual JSONL files per simplification rather than single appended file
   - **Reason**: Chrome extension security restrictions
   - **Alternative**: Could use Chrome Storage API with periodic export feature

2. **Selection mode limitations**:
   - Works best with single-element selections
   - Complex multi-element selections may not render perfectly
   - Replaces entire parent element's text content

3. **Meaning preservation metric**:
   - Uses Jaccard similarity instead of TF-IDF cosine
   - **Reason**: No sklearn in browser context
   - Less accurate than Python implementation

4. **Cancel button timing**:
   - Fixed 120-second threshold
   - Not configurable via UI (requires code change)

---

## Future Enhancements

### Short-term:
- [ ] Add option to export all logs as single JSONL file
- [ ] Make timeout threshold configurable in popup UI
- [ ] Improve selection mode to handle multi-element selections
- [ ] Add loading progress indicator (percentage complete)

### Medium-term:
- [ ] Use Chrome Storage API for centralized logging with export
- [ ] Add batch size configuration in settings
- [ ] Implement better TF-IDF similarity (consider external library)
- [ ] Add "simplify link" context menu option (right-click)

### Long-term:
- [ ] Add A/B testing framework for prompt versions
- [ ] Implement local caching of simplified text
- [ ] Add feedback mechanism for users to rate simplifications
- [ ] Support for more languages (French, Spanish, etc.)

---

## Testing Recommendations

See [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for comprehensive testing instructions.

**Priority tests:**
1. ✅ Language selection and persistence
2. ✅ Both simplification modes (page vs selection)
3. ✅ Restore functionality
4. ✅ Error handling (API down, no selection)
5. ✅ Logging system (check Downloads folder)

---

## Migration Notes

If you have the extension installed:

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click reload icon for KlarText extension

2. **Grant new permissions**:
   - Extension will request Storage and Downloads permissions
   - Click "Allow" when prompted

3. **Clear old data** (optional):
   - Old results in `apps/extension/logs/` are now deprecated
   - New logs go to `Downloads/klartext/extension_logs/`

4. **Test basic functionality**:
   - Ensure API is running at localhost:8000
   - Try both English and German
   - Verify language persists after closing popup

---

## Credits

- Logging system ported from `notebooks/12_demo_logging_setup.ipynb`
- Language support pattern from `demo/app.py`
- UI design follows accessibility guidelines from `.cursorrules`

---

## Questions or Issues?

- Check console for `[KlarText]` debug messages
- Review service worker logs: `chrome://extensions/` → Inspect service worker
- Enable debug: Set `CONFIG.DEBUG = true` in `config.js`
- See [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for troubleshooting
