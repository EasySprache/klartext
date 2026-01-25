# KlarText Chrome Extension - Testing Guide

This guide helps you test the extension locally before deployment.

---

## Prerequisites & Setup

### 1. API Must Be Running

The extension requires the KlarText API at `http://localhost:8000`:

```bash
# Terminal 1: Start the API
cd services/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Verify it's running
curl http://localhost:8000/healthz
# Should return: {"ok":true}

# Test the simplify endpoint
curl -X POST http://localhost:8000/v1/simplify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Der Antragsteller muss die erforderlichen Unterlagen einreichen.",
    "target_lang": "de",
    "level": "easy"
  }'
```

**If the API is not running, the extension will show:** "Cannot reach KlarText API. Make sure it's running at localhost:8000"

### 2. Extension Files Complete

Verify all required files exist:

```bash
cd apps/extension
ls -1
# Should show:
# README.md
# TESTING_GUIDE.md
# background/
# config.js
# content/
# extension_logger.js
# icons/
# manifest.json
# sidepanel/

ls -1 icons/
# Should show:
# icon16.png
# icon48.png
# icon128.png
```

---

## Loading the Extension

### Step 1: Open Chrome Extensions Page

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right corner)

### Step 2: Load Unpacked Extension

1. Click **Load unpacked** button
2. Navigate to the extension folder:
   ```
   /Users/esmahoney/Projects/klartext/klartext/apps/extension
   ```
3. Select the folder and click **Open**

### Step 3: Verify Loading

The extension should appear in your extensions list:
- **Name**: KlarText - Easy Language
- **Version**: 0.1.0
- **Status**: No errors

**If you see errors:**
- Check console for specific error messages
- Verify all files are present
- Check `manifest.json` syntax

### Step 4: Pin Extension (Recommended)

1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "KlarText - Easy Language"
3. Click the pin icon to keep it visible

---

## Test Plan

### Test 1: Basic Simplification

**Goal:** Verify the extension can simplify text on a page.

**Steps:**
1. Navigate to a test page with German text:
   ```
   https://de.wikipedia.org/wiki/K%C3%BCnstliche_Intelligenz
   ```
2. Click the KlarText extension icon (opens sidepanel)
3. Click "Simplify Entire Page" button
4. Observe:
   - Loading overlay appears
   - Status message shows "Simplifying..."
   - After processing, success message appears
   - Page text changes to simpler language

**Expected result:**
- ✅ Page remains interactive during processing
- ✅ Progress shows in sidepanel button
- ✅ Text on page is simplified
- ✅ Success banner appears: "✓ Simplified X text section(s)"
- ✅ No JavaScript errors in console

**To undo:** Refresh the page (Ctrl/Cmd + R)

---

### Test 2: Language Support

**Goal:** Test German and English language support with persistence.

**Steps:**
1. Open the extension sidepanel on any webpage
2. Select "English" from the language dropdown
3. Click "Simplify Entire Page"
4. Verify page text is simplified in English
5. Close and reopen the sidepanel
6. Verify language selection persisted

**Expected:**
- ✅ Language selection persists when reopening sidepanel
- ✅ API receives `target_lang: "en"` parameter
- ✅ Simplified text is in English

**Repeat for German:**
- Select "Deutsch (German)"
- Simplify a page with German text
- Verify German simplification

---

### Test 3: Selection Mode

**Goal:** Test simplifying only selected text.

**Steps:**
1. Open any webpage with text (e.g., Wikipedia article)
2. Select a paragraph of text (highlight it, 20+ characters)
3. Open extension sidepanel
4. Click "Simplify Selection" button
5. Check the page - only selected text should be simplified

**Expected:**
- ✅ Only the selected text is replaced
- ✅ Rest of page remains unchanged
- ✅ Success message shows
- ✅ Min threshold: 20 characters (CONFIG.MIN_SELECTION_LENGTH)

**Edge case - No selection:**
- Open sidepanel without selecting text
- Click "Simplify Selection"
- Should show error: "Please select text on the page first"

**Edge case - Selection too short:**
- Select < 20 characters
- Click "Simplify Selection"
- Expected error: "Please select text on the page first (at least 20 characters)"

---

### Test 4: Progress Indicators

**Goal:** Verify detailed progress tracking during batch processing.

**Steps:**
1. Navigate to a long article (e.g., https://scrumm.ing/posts/clarifying-frameworks)
2. Open extension sidepanel
3. Click "Simplify Entire Page"
4. Watch the sidepanel button for progress updates

**Expected progress format:**
- Start: `"[domain] Batch 1/4 (0% - 0/45 chunks) ~60s remaining..."`
- After batch 1: `"[domain] Batch 1/4 complete (22% - 10/45 chunks)"`
- After batch 2: `"[domain] Batch 2/4 complete (44% - 20/45 chunks)"`
- Etc.

**Expected:**
- ✅ Domain name shown in brackets (e.g., `[scrumm.ing]`)
- ✅ Real percentage based on completed chunks
- ✅ Chunk count progress (e.g., `10/45 chunks`)
- ✅ Estimated time remaining
- ✅ Updates in real-time as batches complete

---

### Test 5: Navigation Detection

**Goal:** Verify UI cleanup when navigating away during processing.

**Steps:**
1. Start simplification on a page
2. While processing, navigate to a different page (click a link or use back button)
3. Check that loading overlay disappears automatically
4. Console should show: `"[KlarText] Page unloading, cleaning up UI"`

**Expected:**
- ✅ UI cleans up automatically on navigation
- ✅ No orphaned loading overlays
- ✅ No errors in console

---

### Test 6: Timeout & Cancellation

**Goal:** Test timeout handling and cancellation on long operations.

**Option A - Large page test:**
1. Find a very long Wikipedia article (e.g., https://en.wikipedia.org/wiki/Machine_learning)
2. Click "Simplify Entire Page"
3. Wait for 120 seconds

**Expected after 120s:**
- ✅ Cancel button appears in loading overlay
- ✅ Message: "Taking longer than expected. You can cancel and select specific text instead."
- ✅ Click cancel → Loading stops
- ✅ Error message: "Simplification cancelled. Try selecting specific text instead (Simplify Selection)."

**Option B - Quick test (for development):**
Temporarily change in `config.js`:
```javascript
REQUEST_TIMEOUT: 5000, // 5 seconds instead of 60000
```
Then test on any page - timeout will trigger quickly.

---

### Test 7: Error Handling - API Not Running

**Goal:** Verify error handling when API is unreachable.

**Steps:**
1. **Stop the API** (Ctrl+C in terminal)
2. Navigate to any website
3. Click KlarText extension icon
4. Click "Simplify Entire Page"

**Expected result:**
- ✅ Error banner appears: "Cannot reach KlarText API. Make sure it's running at localhost:8000"
- ✅ Extension doesn't crash
- ✅ Can try again after restarting API

---

### Test 8: Protected Pages

**Goal:** Verify handling of pages where extensions can't run.

**Steps:**
1. Navigate to `chrome://extensions`
2. Try to click KlarText extension icon
3. Observe the error message

**Expected result:**
- ✅ Error message: "Cannot simplify browser extension pages or chrome:// URLs"
- ✅ Clear explanation provided

---

### Test 9: Page with No Text

**Goal:** Handle pages with insufficient text.

**Steps:**
1. Navigate to a mostly-image page (e.g., Google Images search)
2. Click KlarText extension
3. Click "Simplify Entire Page"

**Expected result:**
- ✅ Error message: "No text found to simplify on this page"
- ✅ No JavaScript errors

---

### Test 10: Long Page (Multiple Batches)

**Goal:** Verify batch processing works for large pages.

**Steps:**
1. Navigate to a long article:
   ```
   https://de.wikipedia.org/wiki/Geschichte_Deutschlands
   ```
2. Click KlarText extension
3. Click "Simplify Entire Page"
4. Watch the progress messages

**Expected result:**
- ✅ Progress updates: "Simplifying batch 1/N..."
- ✅ All text sections get simplified
- ✅ Success message shows total count
- ✅ Completes in < 30 seconds (performance check)

---

### Test 11: Refresh to Restore

**Goal:** Verify undo functionality via page refresh.

**Steps:**
1. Simplify any page (e.g., Wikipedia article)
2. Verify text is simplified
3. Press F5 or Ctrl/Cmd + R to refresh
4. Verify original text is restored

**Expected result:**
- ✅ Original text returns after refresh
- ✅ No artifacts or broken layout

---

### Test 12: Keyboard Navigation

**Goal:** Verify accessibility for keyboard users.

**Steps:**
1. Click extension icon to open sidepanel
2. Press Tab key
3. Verify button receives focus
4. Press Enter key
5. Verify simplification starts

**Expected result:**
- ✅ Button has visible focus outline (yellow)
- ✅ Enter key activates button
- ✅ Tab order is logical
- ✅ All interactive elements are keyboard accessible

---

### Test 13: Loading States

**Goal:** Verify all loading/progress states work.

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Throttle to "Slow 3G"
4. Try simplifying a page
5. Observe loading states

**Expected result:**
- ✅ Sidepanel button shows loading state immediately
- ✅ Progress messages update with batch info
- ✅ Spinner animates (if motion not reduced)
- ✅ Success/error message appears at end
- ✅ Non-blocking notification banner shows at top of page

---

### Test 14: Debug Logging

**Goal:** Verify debug logs help with troubleshooting.

**Steps:**
1. Open DevTools on any webpage (F12)
2. Go to Console tab
3. Click KlarText extension → "Simplify Entire Page"
4. Watch console output

**Expected logs:**
```
[KlarText] Starting page simplification...
[KlarText] Collected N text chunks to simplify
[KlarText] Calling API: http://localhost:8000/v1/simplify/batch
[KlarText] Texts to simplify: N
[KlarText] API response: {...}
[KlarText] Done! Success: N, Failed: 0
```

**No errors should appear** unless intentionally testing error cases.

---

### Test 15: Service Worker Console

**Goal:** Verify background script works correctly.

**Steps:**
1. Go to `chrome://extensions`
2. Find KlarText extension
3. Click "service worker" link (appears when active)
4. Try simplifying a page
5. Watch service worker console

**Expected logs:**
```
[KlarText] Service worker started
[KlarText] Received SIMPLIFY_ACTIVE_TAB message
[KlarText] Active tab: https://...
[KlarText] Content script injected successfully
```

---

### Test 16: Structured Logging System

**Goal:** Verify logging system tracks metrics correctly.

**Steps:**
1. After running simplifications, check for log entries
2. Open Chrome DevTools Console (F12)
3. Look for `[KlarText]` messages about logging
4. Check your Downloads folder for: `klartext/extension_logs/[timestamp].jsonl`

**Verify log structure:**
```json
{
  "timestamp": "2026-01-23T...",
  "source_text": "...",
  "output_text": "...",
  "model": "api-backend",
  "template": "en-template",
  "language": "en",
  "metrics": {
    "avg_sentence_len_words": 8.5,
    "pct_sentences_gt20": 0.0,
    "ari_score": 7.0,
    "meaning_cosine": 0.65
  },
  "guardrails_passed": 3,
  "guardrails_total": 4,
  "guardrails_failed": ["Preserves Meaning"]
}
```

**Expected:**
- ✅ Logs created with readability metrics (LIX score, sentence length, etc.)
- ✅ Word/syllable counts tracked
- ✅ Template version info included

**Note:** Due to Chrome extension restrictions, logs are individual files rather than appended to a single JSONL.

---

### Test 17: Dynamic Content

**Goal:** Test on single-page apps with dynamic loading.

**Test sites:**
- Twitter/X feed
- Reddit
- GitHub issues page

**Expected:**
- ✅ Simplifies visible text at time of click
- ⚠️ Dynamically loaded content won't be simplified (future feature)

---

### Test 18: Multiple Languages on Same Page

**Goal:** Handle mixed-language content.

**Steps:**
1. Find page with German and English text
2. Simplify page
3. Verify both languages processed

**Expected:**
- ✅ Extension uses selected language from dropdown
- ✅ All text processed with same target language
- 📝 Future: Auto-detect language per section

---

### Test 19: Special Characters

**Goal:** Handle non-ASCII characters correctly.

**Test text:** Emojis, umlauts (ä, ö, ü), special symbols

**Expected:**
- ✅ Characters preserved after simplification
- ✅ No encoding issues

---

### Test 20: Multiple Tabs

**Goal:** Verify extension works when simplifying multiple tabs.

**Steps:**
1. Open 3 tabs with different pages
2. Simplify Tab 1
3. Switch to Tab 2 while Tab 1 processing
4. Simplify Tab 2

**Expected:**
- ✅ Each tab processes independently
- ✅ No interference between tabs
- ✅ Domain indicators show which page is being processed

---

## Accessibility Testing

### High Contrast Mode

**Goal:** Verify extension works in high contrast mode.

**Steps:**
1. Enable high contrast in OS settings:
   - **Windows**: Settings → Ease of Access → High Contrast
   - **Mac**: System Preferences → Accessibility → Display → Increase Contrast
2. Open extension sidepanel
3. Check readability

**Expected:**
- ✅ Text is readable with high contrast
- ✅ Focus indicators are visible
- ✅ Button has sufficient contrast

### Focus Management

**Checklist:**
- [ ] All interactive elements are keyboard accessible
- [ ] Focus visible on all interactive elements (yellow outline)
- [ ] Focus order is logical
- [ ] Screen reader announces status messages (aria-live regions)
- [ ] Color contrast is sufficient (18px text, AA minimum)

### Reduced Motion

**Expected:**
- ✅ Spinner animations respect `prefers-reduced-motion`
- ✅ No animated backgrounds or unnecessary motion

---

## Performance Testing

### Small Page Test

**Page:** Short article (~500 words)

**Expected:**
- ✅ Completes in < 5 seconds
- ✅ Feels responsive
- ✅ No timeout warnings

---

### Large Page Test

**Page:** Long article (~5000 words, 50+ paragraphs)
- Test on: https://en.wikipedia.org/wiki/Machine_learning

**Expected:**
- ✅ Completes in < 30 seconds (with good API)
- ✅ Progress updates visible
- ✅ No timeout errors
- ✅ Cancel button appears after 120s if still processing
- ✅ Page remains interactive throughout

---

### Very Long Text

**Goal:** Handle individual paragraphs over 5000 characters.

**Expected:**
- ✅ Long paragraphs processed (API handles chunking internally)
- ⚠️ May be slower for very long sections
- ✅ No timeout errors (60s limit per request)

---

## Known Limitations (MVP)

These are expected and documented:

1. **No automatic language detection per section**: Uses selected language from dropdown
2. **No level selection**: Uses DEFAULT_LEVEL from config  
3. **Dynamic content**: Only simplifies what's visible when button clicked
4. **Chrome internal pages**: Cannot run on `chrome://` URLs
5. **Sidepanel persistence**: Sidepanel stays visible across tabs (workaround: domain indicators)

These will be addressed in future phases.

---

## Common Issues & Fixes

### Issue: Extension not loading
**Fix:** 
- Check manifest.json is valid
- Reload extension in chrome://extensions/
- Check console for errors

### Issue: Logging not working
**Fix:**
- Check Downloads permission in manifest.json
- Check Chrome DevTools console for errors
- Verify extension_logger.js is loaded (check Network tab)

### Issue: Language not persisting
**Fix:**
- Check Chrome Storage permission in manifest.json
- Open DevTools → Application → Storage → Extension Storage
- Should see `preferredLanguage` key

### Issue: Selection mode not finding text
**Fix:**
- Make sure text is actually selected (highlighted)
- Check minimum length (20 chars)
- Try selecting a single paragraph rather than across multiple elements

### Issue: Progress not showing in sidepanel
**Fix:**
- Check service worker console for message sending
- Verify message format: `{ type: 'PROGRESS_UPDATE', status, message }`
- Reload extension

---

## Regression Testing

After any code changes, always test:
- [ ] Test 1: Basic simplification
- [ ] Test 2: Language support
- [ ] Test 3: Selection mode
- [ ] Test 7: Error handling (API down)
- [ ] Test 12: Keyboard navigation
- [ ] Both languages (English & German)
- [ ] Language preference persistence

---

## Bug Reporting Template

If you find a bug, report with this information:

```
**Environment:**
- Chrome version: 
- Extension version: 0.1.0
- API running: Yes/No
- API version: 

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**


**Actual behavior:**


**Console errors:**


**Screenshot (if relevant):**

```

---

## Success Criteria

The extension is ready for production when:

- ✅ All 20 tests pass
- ✅ No console errors during normal use
- ✅ Works on 5+ different websites
- ✅ Error handling is graceful
- ✅ Loading states are clear
- ✅ Accessible via keyboard
- ✅ High contrast mode works
- ✅ Logging system functional
- ✅ README is complete and accurate
- ✅ Code is clean and commented

---

**Next Steps After Testing:**
1. Fix any bugs found
2. Update version in manifest.json
3. Package for Chrome Web Store (see README)
4. Submit for review
