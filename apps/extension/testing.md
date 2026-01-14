# KlarText Chrome Extension - Testing Guide

This guide helps you test the extension locally before deployment.

## Pre-Testing Checklist

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
# TESTING.md
# background/
# config.js
# content/
# icons/
# manifest.json
# popup/

ls -1 icons/
# Should show:
# icon16.png
# icon48.png
# icon128.png
```

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

## Functional Testing

### Test 1: Basic Simplification

**Goal:** Verify the extension can simplify text on a page.

**Steps:**
1. Navigate to a test page with German text:
   ```
   https://de.wikipedia.org/wiki/K%C3%BCnstliche_Intelligenz
   ```
2. Click the KlarText extension icon
3. Click "Simplify Page Text" button
4. Observe:
   - Loading overlay appears
   - Status message shows "Simplifying..."
   - After processing, success message appears
   - Page text changes to simpler language

**Expected result:**
- ✅ Loading overlay visible during processing
- ✅ Text on page is simplified
- ✅ Success banner appears: "✓ Simplified X text section(s)"
- ✅ No JavaScript errors in console

**To undo:** Refresh the page (Ctrl/Cmd + R)

### Test 2: Error Handling - API Not Running

**Goal:** Verify error handling when API is unreachable.

**Steps:**
1. **Stop the API** (Ctrl+C in terminal)
2. Navigate to any website
3. Click KlarText extension icon
4. Click "Simplify Page Text"

**Expected result:**
- ✅ Error banner appears: "Cannot reach KlarText API..."
- ✅ Extension doesn't crash
- ✅ Can try again after restarting API

### Test 3: Protected Pages

**Goal:** Verify handling of pages where extensions can't run.

**Steps:**
1. Navigate to `chrome://extensions`
2. Try to click KlarText extension icon
3. Observe the error message

**Expected result:**
- ✅ Error message: "Cannot simplify browser extension pages..."
- ✅ Clear explanation provided

### Test 4: Page with No Text

**Goal:** Handle pages with insufficient text.

**Steps:**
1. Navigate to a mostly-image page (e.g., Google Images search)
2. Click KlarText extension
3. Click "Simplify Page Text"

**Expected result:**
- ✅ Error message: "No text found to simplify on this page"
- ✅ No JavaScript errors

### Test 5: Long Page (Multiple Batches)

**Goal:** Verify batch processing works for large pages.

**Steps:**
1. Navigate to a long article:
   ```
   https://de.wikipedia.org/wiki/Geschichte_Deutschlands
   ```
2. Click KlarText extension
3. Click "Simplify Page Text"
4. Watch the progress messages

**Expected result:**
- ✅ Progress updates: "Simplifying batch 1/N..."
- ✅ All text sections get simplified
- ✅ Success message shows total count

### Test 6: Refresh to Restore

**Goal:** Verify undo functionality.

**Steps:**
1. Simplify any page (e.g., Wikipedia article)
2. Verify text is simplified
3. Press F5 or Ctrl/Cmd + R to refresh
4. Verify original text is restored

**Expected result:**
- ✅ Original text returns after refresh
- ✅ No artifacts or broken layout

## UI/UX Testing

### Test 7: Popup Design

**Goal:** Verify popup looks good and is accessible.

**Checklist:**
- [ ] Popup opens when clicking extension icon
- [ ] Width is appropriate (320px)
- [ ] Header has blue gradient background
- [ ] "KlarText" title is visible
- [ ] Button is large enough (min 48px height)
- [ ] Font size is readable (16-18px)
- [ ] Status messages appear in correct area

### Test 8: Keyboard Navigation

**Goal:** Verify accessibility for keyboard users.

**Steps:**
1. Click extension icon to open popup
2. Press Tab key
3. Verify button receives focus
4. Press Enter key
5. Verify simplification starts

**Expected result:**
- ✅ Button has visible focus outline (yellow)
- ✅ Enter key activates button
- ✅ Tab order is logical

### Test 9: High Contrast Mode

**Goal:** Verify extension works in high contrast mode.

**Steps:**
1. Enable high contrast in OS settings:
   - **Windows**: Settings → Ease of Access → High Contrast
   - **Mac**: System Preferences → Accessibility → Display → Increase Contrast
2. Open extension popup
3. Check readability

**Expected result:**
- ✅ Text is readable with high contrast
- ✅ Focus indicators are visible
- ✅ Button has sufficient contrast

### Test 10: Loading States

**Goal:** Verify all loading/progress states work.

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Throttle to "Slow 3G"
4. Try simplifying a page
5. Observe loading states

**Expected result:**
- ✅ Loading overlay appears immediately
- ✅ Progress messages update ("Analyzing page...", "Simplifying...", "Updating page...")
- ✅ Spinner animates (if motion not reduced)
- ✅ Success/error message appears at end

## Browser Console Testing

### Test 11: Debug Logging

**Goal:** Verify debug logs help with troubleshooting.

**Steps:**
1. Open DevTools on any webpage (F12)
2. Go to Console tab
3. Click KlarText extension → "Simplify Page Text"
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

### Test 12: Service Worker Console

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

## Edge Case Testing

### Test 13: Dynamic Content

**Goal:** Test on single-page apps with dynamic loading.

**Test sites:**
- Twitter/X feed
- Reddit
- GitHub issues page

**Expected:**
- ✅ Simplifies visible text at time of click
- ⚠️ Dynamically loaded content won't be simplified (future feature)

### Test 14: Multiple Languages on Same Page

**Goal:** Handle mixed-language content.

**Steps:**
1. Find page with German and English text
2. Simplify page
3. Verify both languages processed

**Expected:**
- ✅ Extension uses DEFAULT_LANG from config (German)
- ✅ English text may be simplified with German prompts (acceptable for MVP)
- 📝 Future: Auto-detect language per section

### Test 15: Very Long Text

**Goal:** Handle individual paragraphs over 5000 characters.

**Expected:**
- ✅ Long paragraphs processed (API handles chunking internally)
- ⚠️ May be slower for very long sections
- ✅ No timeout errors (60s limit)

### Test 16: Special Characters

**Goal:** Handle non-ASCII characters correctly.

**Test text:** Emojis, umlauts (ä, ö, ü), special symbols

**Expected:**
- ✅ Characters preserved after simplification
- ✅ No encoding issues

## Performance Testing

### Test 17: Speed on Small Page

**Page:** Short article (~500 words)

**Expected:**
- ✅ Completes in < 5 seconds
- ✅ Feels responsive

### Test 18: Speed on Large Page

**Page:** Long article (~5000 words, 50+ paragraphs)

**Expected:**
- ✅ Completes in < 30 seconds
- ✅ Progress updates visible
- ✅ No timeout errors

### Test 19: Multiple Tabs

**Goal:** Verify extension works when simplifying multiple tabs.

**Steps:**
1. Open 3 tabs with different pages
2. Simplify Tab 1
3. Switch to Tab 2 while Tab 1 processing
4. Simplify Tab 2

**Expected:**
- ✅ Each tab processes independently
- ✅ No interference between tabs

## Regression Testing

After any code changes, re-run:
- [ ] Test 1: Basic simplification
- [ ] Test 2: Error handling
- [ ] Test 6: Refresh to restore
- [ ] Test 8: Keyboard navigation

## Known Limitations (MVP)

These are expected and documented:

1. **No language detection**: Uses DEFAULT_LANG from config
2. **No level selection**: Uses DEFAULT_LEVEL from config  
3. **No selective simplification**: Simplifies entire page, not user selection
4. **No undo button**: Must refresh page to restore
5. **Dynamic content**: Only simplifies what's visible when button clicked
6. **Chrome internal pages**: Cannot run on `chrome://` URLs

These will be addressed in future phases (B & C).

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

## Success Criteria

The extension is ready for production when:

- ✅ All 19 tests pass
- ✅ No console errors during normal use
- ✅ Works on 5+ different websites
- ✅ Error handling is graceful
- ✅ Loading states are clear
- ✅ Accessible via keyboard
- ✅ README is complete and accurate
- ✅ Code is clean and commented

---

**Next Steps After Testing:**
1. Fix any bugs found
2. Update version in manifest.json
3. Package for Chrome Web Store (see README)
4. Submit for review
