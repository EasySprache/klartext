# KlarText Extension - Changelog

This document tracks all notable changes to the KlarText Chrome Extension.

---

## January 23, 2026

**Branch:** extension-updates  
**Focus:** Integration & Bug Fixes

### ✅ Features Integrated

#### 1. **Extension Logger** (from `erinn_updates`)
- ✅ **`extension_logger.js`** - Structured logging with metrics tracking
  - LIX readability scores
  - Word/sentence counts
  - Syllable analysis
  - Template version tracking
- ✅ **CHANGELOG_2026-01-19.md** - Documentation of logging features

#### 2. **Enhanced Language Support** (from `erinn_updates`)
- ✅ **`SUPPORTED_LANGUAGES`** config - German and English with labels
- ✅ **`CURRENT_TEMPLATE_VERSION`** config - For A/B testing
- ✅ **`MIN_SELECTION_LENGTH`** config - Separate threshold for manual selection (20 chars)
- ✅ **`MIN_TEXT_LENGTH`** config - For automatic page chunking (100 chars)

#### 3. **UX Improvements** (re-implemented from transcript)
- ✅ **Better Progress Feedback**
  - Real percentage based on completed chunks (not just batch number)
  - Domain indicator: `[scrumm.ing] Batch 1/4 (22% - 10/45 chunks)`
  - Chunk count progress tracking
  - Estimated time remaining based on average batch duration
  
- ✅ **Navigation Detection**
  - Detects page unload (beforeunload event)
  - Detects SPA navigation (history.pushState/replaceState)
  - Automatically cleans up UI when navigating away
  
- ✅ **Domain Indicators**
  - Shows which page is being processed: `[domain.com] Processing...`
  - Reduces confusion when sidepanel persists across tabs

#### 4. **Existing Features Preserved**
- ✅ **Sidepanel UI** - Better UX than popup
- ✅ **Permission Fixes**
  - `tabs` permission - Read tab URLs for language detection
  - `storage` permission - Save user preferences per domain
  - `host_permissions: ["<all_urls>"]` - Inject content scripts
  - `sidePanel` permission - Enable sidepanel API
- ✅ **Language parameter support** - Source and target language handling
- ✅ **START_SIMPLIFICATION message** - Service worker → content script communication

---

### 🐛 Bug Fixes

#### 1. **Extension Logger Syntax Error** ✅
**Problem:** 
```
Uncaught SyntaxError: Unexpected token 'export' (at extension_logger.js:198:1)
```

**Root Cause:** ES6 `export` statements don't work in content script context

**Fix:** 
- Removed `export` keywords from functions
- Made functions globally available via `window.KlarTextLogger` object
- Functions now accessible as:
  - `window.KlarTextLogger.log_simplification()`
  - `window.KlarTextLogger.compute_metrics()`
  - `window.KlarTextLogger.evaluate_guardrails()`

**Files Modified:**
- `apps/extension/extension_logger.js` (lines 198, 266)

---

#### 2. **Blocking Page Overlay** ✅
**Problem:** 
- Full-page dark overlay (`rgba(0, 0, 0, 0.7)`) blocked user interaction
- User couldn't browse while simplification was running
- This was NOT the behavior in previous working version

**Root Cause:** 
- `showLoading()` function created full-screen overlay with `z-index: 999999`
- Covered entire page and prevented clicks/scrolling

**Fix:**
- Removed blocking overlay creation entirely
- Replaced with message passing to sidepanel
- Page now remains fully interactive during simplification
- Non-blocking notification banners still show success/error (auto-dismiss)

**Files Modified:**
- `apps/extension/content/simplify.js` (lines 357-443)
  - `showLoading()` - Now sends message to sidepanel instead of creating overlay
  - `updateProgress()` - Sends progress updates to sidepanel
  - `hideLoading()` - Sends completion message to sidepanel
  - `showError()` - Sends error to sidepanel + non-blocking banner
  - `showSuccess()` - Sends success to sidepanel + non-blocking banner

---

#### 3. **Progress Not Showing in Sidepanel** ✅
**Problem:**
- Sidepanel stuck on "Starting simplification..." forever
- No progress updates like previous working version's `"Processing batch 36/123 (29%)..."`
- Progress was only logged to console, not displayed in UI

**Root Cause:**
- Content script wasn't sending `PROGRESS_UPDATE` messages to sidepanel
- All progress updates were only shown in page overlays (which blocked interaction)

**Fix:**
- Content script now sends `chrome.runtime.sendMessage()` with:
  ```javascript
  {
    type: 'PROGRESS_UPDATE',
    status: 'processing' | 'complete' | 'error' | 'idle',
    message: '[domain] Batch 1/4 (22% - 10/45 chunks)...'
  }
  ```
- Progress updates sent from:
  - `showLoading()` - Initial progress
  - `updateProgress()` - Batch progress with % and chunk counts
  - `showSuccess()` - Completion message
  - `showError()` - Error message
  - `hideLoading()` - Reset to idle

**Files Modified:**
- `apps/extension/content/simplify.js` (lines 357-485)

---

#### 4. **Sidepanel Not Receiving Progress** ✅
**Problem:**
- Sidepanel had old message format expecting `progress` field
- Content script was sending `status` + `message` fields
- Mismatch caused messages to be ignored

**Fix:**
- Updated sidepanel's `PROGRESS_UPDATE` listener to handle new format
- Supports both legacy format (backwards compatibility) and new format:
  - **New format:** `{ status, message }` (processing/complete/error/idle)
  - **Legacy format:** `{ progress, buttonId }` (still supported)
- Properly updates button loading state and status message based on status:
  - `processing` → Show spinner + progress text in button
  - `complete` → Hide spinner, show success message
  - `error` → Hide spinner, show error message
  - `idle` → Reset to default state

**Files Modified:**
- `apps/extension/sidepanel/sidepanel.js` (lines 176-235)

---

### 📋 File Changes Summary

#### Modified Files
1. **`apps/extension/config.js`**
   - Added SUPPORTED_LANGUAGES
   - Added CURRENT_TEMPLATE_VERSION
   - Added MIN_SELECTION_LENGTH (20)
   - Updated MIN_TEXT_LENGTH (100)

2. **`apps/extension/content/simplify.js`**
   - Enhanced `simplifyInBatches()` with detailed progress tracking
   - Added domain extraction and display
   - Added navigation detection (beforeunload, pushState, replaceState)
   - Improved progress messages with ETA calculation
   - Removed blocking overlay creation
   - Added message passing to sidepanel for progress updates

3. **`apps/extension/manifest.json`**
   - All permissions configured correctly
   - Includes extension_logger.js in web_accessible_resources

4. **`apps/extension/background/service-worker.js`**
   - Checks for and injects extension_logger.js
   - Handles GET_ACTIVE_TAB, SIMPLIFY_PAGE, SIMPLIFY_SELECTION messages

5. **`apps/extension/extension_logger.js`**
   - Removed ES6 `export` statements
   - Added `window.KlarTextLogger` global object

6. **`apps/extension/sidepanel/sidepanel.js`**
   - Updated `PROGRESS_UPDATE` listener for new message format
   - Added status-based UI updates (processing/complete/error/idle)
   - Maintained backwards compatibility with legacy format

---

### 🎯 What Works Now

#### Core Features
- ✅ Sidepanel UI with language detection
- ✅ Full-page simplification
- ✅ Selection-based simplification
- ✅ Language support (German/English)
- ✅ Structured logging (extension_logger.js)

#### UX Improvements
- ✅ Real-time progress with % and chunk counts
- ✅ Domain indicators to show which page is processing
- ✅ Estimated time remaining
- ✅ Navigation detection and cleanup
- ✅ Separate thresholds for page (100 chars) vs selection (20 chars)
- ✅ Page remains fully interactive during simplification
- ✅ Progress displayed in sidepanel (not blocking overlay)

#### Permissions
- ✅ All necessary permissions configured
- ✅ Works on any website (host_permissions: <all_urls>)
- ✅ Can read tab URLs (tabs permission)
- ✅ Can save preferences (storage permission)

---

### 📝 Known Limitations

#### Sidepanel Visibility Across Tabs
**Issue:** Chrome MV3 sidepanel API doesn't provide built-in tab isolation. Sidepanel stays visible when switching tabs.

**Workaround:** Domain indicators show which page is being processed: `[scrumm.ing] Batch 1/4...`

**Impact:** Users can see which page is being simplified even if they switch tabs.

#### Future Improvements (Not Implemented Yet)
- ⏳ Streaming results (render batch-by-batch)
- ⏳ Caching extracted page text per URL
- ⏳ Separate queues for page vs selection jobs
- ⏳ Backend logging integration (API endpoint for metrics)

---

### 🎉 Summary

**Before:**
- ❌ Blocking overlay preventing interaction
- ❌ Progress only in console
- ❌ Sidepanel stuck on "Starting..."
- ❌ Logger syntax error

**After:**
- ✅ Page fully interactive during simplification
- ✅ Progress shown in sidepanel button
- ✅ Domain indicator in progress messages
- ✅ Non-blocking notification banners
- ✅ Logger working without errors
- ✅ Matches previous working behavior

The extension now has the best of both branches plus all troubleshooting improvements!

---

## January 19, 2026

**Focus:** Major Feature Additions

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

### 📋 Files Modified

#### New Files
- ✨ `apps/extension/extension_logger.js` - Logger module (268 lines)
- 📋 `apps/extension/TESTING_GUIDE.md` - Comprehensive testing guide
- 📋 `apps/extension/CHANGELOG_2026-01-19.md` - Initial changelog

#### Modified Files

**`apps/extension/config.js`**
- Added `SUPPORTED_LANGUAGES` object with language labels
- Updated comments for `DEFAULT_LANG`

**`apps/extension/manifest.json`**
- Added permissions: `storage`, `downloads`
- Added `extension_logger.js` to `web_accessible_resources`

**`apps/extension/popup/popup.html`**
- Added language selector dropdown
- Replaced single button with two buttons:
  - "Simplify Entire Page"
  - "Simplify Selection"
- Updated button IDs and styling

**`apps/extension/popup/popup.css`**
- Added styles for `.language-selector` and `.language-select`
- Added `.secondary-button` styles for selection button
- Updated button spacing and layout
- Enhanced focus states for accessibility

**`apps/extension/popup/popup.js`**
- Added language selector handling
- Implemented language persistence (Chrome Storage API)
- Updated button event listeners (now two buttons)
- Added `initializePopup()` to load saved preferences
- Selection state detection for smart button states
- Updated message types: `SIMPLIFY_PAGE` vs `SIMPLIFY_SELECTION`

**`apps/extension/background/service-worker.js`**
- Complete rewrite of message handler
- Now handles 3 message types:
  1. `SIMPLIFY_PAGE` - Full page simplification
  2. `SIMPLIFY_SELECTION` - Selected text only
  3. `WRITE_LOG` - Log entry writing
- Added `handleLogWrite()` function for log file management
- Added `handleSimplification()` function with language parameter
- Injects `extension_logger.js` alongside content script
- Sends `START_SIMPLIFICATION` message to content script with mode and language

**`apps/extension/content/simplify.js` (Major updates)**

*New Functions:*
- `getSelectedText()` - Extract and validate selected text
- `simplifySelection(language)` - Simplify only selection
- `showCancelButton(onCancel)` - Display cancel button after timeout
- `hideCancelButton()` - Remove cancel button
- `showRestoreButton()` - Display floating restore button
- `restorePage()` - Restore all original text

*Updated Functions:*
- `callAPI(texts, language, abortSignal)` - Added language and abort parameters
- `simplifyInBatches(chunks, language, abortController)` - Added language, abort support, and logging integration
- `simplifyPage(language)` - Added language parameter, timeout detection, cancel button, restore button

*Message Handling:*
- Removed auto-execution of `simplifyPage()`
- Added `chrome.runtime.onMessage` listener for `START_SIMPLIFICATION`
- Routes to appropriate function based on mode

*Logging Integration:*
- Imports `log_simplification` from `extension_logger.js`
- Logs each successful simplification in batch mode
- Logs selection simplifications

---

### 🔧 Technical Details

#### Message Flow

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

#### Abort Controller Flow

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

#### Data Storage

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

### ⚠️ Breaking Changes

**Extension must be reloaded** after update due to:
- New permissions added (`storage`, `downloads`)
- New files added to web_accessible_resources
- Service worker message handling changed

**Old saved results format** no longer compatible:
- Previous: Single `simplifyPage()` auto-execution
- Now: Message-driven execution with mode selection

---

### 📝 Known Limitations

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

### 🚀 Future Enhancements

#### Short-term:
- [ ] Add option to export all logs as single JSONL file
- [ ] Make timeout threshold configurable in popup UI
- [ ] Improve selection mode to handle multi-element selections
- [ ] Add loading progress indicator (percentage complete)

#### Medium-term:
- [ ] Use Chrome Storage API for centralized logging with export
- [ ] Add batch size configuration in settings
- [ ] Implement better TF-IDF similarity (consider external library)
- [ ] Add "simplify link" context menu option (right-click)

#### Long-term:
- [ ] Add A/B testing framework for prompt versions
- [ ] Implement local caching of simplified text
- [ ] Add feedback mechanism for users to rate simplifications
- [ ] Support for more languages (French, Spanish, etc.)

---

### 🧪 Testing Recommendations

See [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for comprehensive testing instructions.

**Priority tests:**
1. ✅ Language selection and persistence
2. ✅ Both simplification modes (page vs selection)
3. ✅ Restore functionality
4. ✅ Error handling (API down, no selection)
5. ✅ Logging system (check Downloads folder)

---

### 📦 Migration Notes

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

### 🙏 Credits

- Logging system ported from `notebooks/12_demo_logging_setup.ipynb`
- Language support pattern from `demo/app.py`
- UI design follows accessibility guidelines from `.cursorrules`

---

## Questions or Issues?

- Check console for `[KlarText]` debug messages
- Review service worker logs: `chrome://extensions/` → Inspect service worker
- Enable debug: Set `CONFIG.DEBUG = true` in `config.js`
- See [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) for troubleshooting
