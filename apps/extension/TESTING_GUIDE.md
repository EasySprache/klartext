# KlarText Extension - Testing Guide

## New Features Implemented

1. **Structured Logging** - Logs simplifications with metrics to track quality
2. **German & English Support** - Language selector with persistent preference
3. **Selection Mode** - Simplify only selected text
4. **Cancellable Batch Processing** - Cancel long-running operations after 120s
5. **Restore Button** - Floating button to restore original text

---

## Prerequisites

1. **API Server Running**:
   ```bash
   cd services/api
   python -m uvicorn app.main:app --reload
   ```
   Should be accessible at `http://localhost:8000`

2. **Extension Loaded**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `apps/extension/` folder
   - Note: Reload extension after any code changes

---

## Test Plan

### 1. Test Language Support

**Steps:**
1. Open the extension popup on any webpage
2. Select "English" from the language dropdown
3. Click "Simplify Entire Page"
4. Verify page text is simplified in English

**Expected:**
- ✓ Language selection persists when reopening popup
- ✓ API receives `target_lang: "en"` parameter
- ✓ Simplified text is in English

**Repeat for German:**
- Select "Deutsch (German)"
- Simplify a page with German text
- Verify German simplification

---

### 2. Test Selection Mode

**Steps:**
1. Open any webpage with text (e.g., Wikipedia article)
2. Select a paragraph of text (highlight it)
3. Open extension popup
4. Click "Simplify Selection" button
5. Check the page - only selected text should be simplified

**Expected:**
- ✓ Only the selected text is replaced
- ✓ Rest of page remains unchanged
- ✓ Restore button appears (bottom-right)
- ✓ Success message shows

**Edge case - No selection:**
- Open popup without selecting text
- Click "Simplify Selection"
- Should show error: "Please select text on the page first"

---

### 3. Test Entire Page Simplification

**Steps:**
1. Open any webpage (suggest: medium.com article)
2. Open extension popup
3. Click "Simplify Entire Page"
4. Wait for processing

**Expected:**
- ✓ Loading overlay appears
- ✓ Progress updates show batch numbers (e.g., "Processing batch 2/5...")
- ✓ All text sections are simplified
- ✓ Restore button appears (bottom-right)
- ✓ Success message includes timing info

---

### 4. Test Timeout & Cancellation

**To trigger timeout (requires large page):**

**Option A - Large page:**
1. Find a page with lots of text (e.g., long Wikipedia article, documentation)
2. Click "Simplify Entire Page"
3. Wait for 120 seconds

**Expected after 120s:**
- ✓ Cancel button appears in loading overlay
- ✓ Message: "Taking longer than expected. You can cancel and select specific text instead."
- ✓ Click cancel → Loading stops
- ✓ Error message: "Simplification cancelled. Try selecting specific text instead (Simplify Selection)."

**Option B - Test with shorter timeout (for quick testing):**
Temporarily change line in `config.js`:
```javascript
REQUEST_TIMEOUT: 5000, // 5 seconds instead of 60000
```
Then test on any page - timeout will trigger quickly.

---

### 5. Test Restore Functionality

**Steps:**
1. Simplify a page (either mode)
2. Look for floating "↺ Restore Original" button (bottom-right)
3. Click the button

**Expected:**
- ✓ Button is visible and accessible
- ✓ All simplified text reverts to original
- ✓ Restore button disappears
- ✓ Success message: "Restored X text section(s) to original"

**Keyboard test:**
- Tab to the Restore button
- Press Enter or Space
- Should restore original text

---

### 6. Test Logging System

**Check logs are created:**

After running simplifications, check for log entries:

1. Open Chrome DevTools Console (F12)
2. Look for `[KlarText]` messages
3. Check if log entries are being created

**Log file location:**
- Logs are downloaded via Chrome Downloads API
- Check your Downloads folder for: `klartext/extension_logs/[timestamp].jsonl`
- Each file contains one JSONL entry

**Verify log structure:**
```json
{
  "timestamp": "2026-01-19T...",
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

**Note:** Due to Chrome extension restrictions, logs are individual files rather than appended to a single JSONL. You may want to consolidate them manually or adjust the implementation to use Chrome Storage API instead.

---

### 7. Test Error Handling

**API not running:**
1. Stop the API server (`Ctrl+C`)
2. Try to simplify text
3. Expected error: "Cannot reach KlarText API. Make sure it's running at localhost:8000"

**Invalid selection:**
1. Select < 20 characters
2. Click "Simplify Selection"
3. Expected error: "Please select text on the page first (at least 20 characters)"

**Protected pages:**
1. Try on `chrome://extensions/`
2. Expected error: "Cannot simplify browser extension pages or chrome:// URLs"

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

### Issue: Restore button not appearing
**Fix:**
- Check if elements have `data-klartext-original` attribute
- Look in bottom-right corner (may be hidden by page elements)
- Check z-index is 999999

---

## Regression Testing

After changes, always test:
- [ ] Both languages (English & German)
- [ ] Both modes (Page & Selection)
- [ ] Restore functionality
- [ ] Error handling (API down, no selection, protected pages)
- [ ] Language preference persistence

---

## Performance Testing

### Large Page Test:
- Test on: https://en.wikipedia.org/wiki/Machine_learning (long article)
- Measure time to complete
- Check if cancel button appears (should take < 120s with good API)

### Small Page Test:
- Test on simple blog post
- Should complete in < 10s
- No cancel button should appear

---

## Accessibility Testing

- [ ] Keyboard navigation works (Tab through buttons)
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces status messages (aria-live regions)
- [ ] Restore button is keyboard accessible (Enter/Space)
- [ ] Color contrast is sufficient (18px text, AA minimum)

---

## Next Steps

After successful testing:
1. Document any bugs found
2. Consider UI improvements based on user feedback
3. Optimize batch sizes for better performance
4. Consider centralizing logs (Chrome Storage API + export feature)
5. Add telemetry to track feature usage

---

## Questions?

- Check console for `[KlarText]` debug messages
- Enable debug mode: `CONFIG.DEBUG = true` in config.js
- Review service-worker logs: chrome://extensions/ → Inspect views: service worker
