# KlarText Extension - Improvements & Future Work

This document tracks potential improvements and features that are partially implemented or could enhance the extension.

---

## 🔴 HIGH PRIORITY

### 1. Integrate Logging Functionality

**Status**: Infrastructure complete, not integrated

**Description**:
The `extension_logger.js` module is fully implemented and injected, but never actually called. This means we're not collecting any metrics on simplification quality or API performance.

**What Exists**:
- ✅ Complete logger implementation (`extension_logger.js`)
- ✅ Metrics computation (ARI score, sentence length, meaning preservation)
- ✅ Guardrail evaluation (4 quality checks)
- ✅ Privacy-first design (SHA256 hash, no raw text sent)
- ✅ API endpoint ready (`/v1/log-run`)
- ✅ Global API exposed (`window.KlarTextLogger`)

**What's Missing**:
- ❌ No calls to `log_simplification()` in `content/simplify.js`
- ❌ No metrics being sent to API
- ❌ No quality tracking data being collected

**Implementation Steps**:

1. **Add logging after successful simplification** in `content/simplify.js`:

```javascript
// Around line 406-410 in simplifyInBatches() function
// After we get successful API results:

if (simplified && !error) {
  // Log the simplification (non-blocking)
  if (window.KlarTextLogger) {
    window.KlarTextLogger.log_simplification(
      batch[j].originalText,    // source text
      simplified,                // output text
      'groq',                    // model (get from CONFIG if available)
      CONFIG.CURRENT_TEMPLATE_VERSION,  // template version
      sourceLanguage,            // source language
      targetLanguage,            // target language
      batchTime * 1000          // latency in ms
    ).catch(err => {
      // Don't block on logging errors
      if (CONFIG.DEBUG) {
        console.log('[KlarText] Logging failed:', err);
      }
    });
  }
}
```

2. **Verify CONFIG has required fields**:
   - Check that `CONFIG.CURRENT_TEMPLATE_VERSION` exists in `config.js`
   - Add model name to CONFIG if not present

3. **Test logging**:
   - Simplify a page
   - Check browser console for logging activity
   - Verify API receives log data at `/v1/log-run`
   - Confirm no user text is sent (only hash + metrics)

4. **Optional - Add to selection mode** (lines 958-995 in `simplify.js`):
   - Log selection simplifications too
   - Use same privacy-first approach

**Benefits**:
- Track simplification quality over time
- Identify which content fails guardrails
- Measure API performance/latency
- Build dataset for model improvements
- No privacy impact (only hashes sent)

**Files to Modify**:
- `apps/extension/content/simplify.js` (add logging calls)
- `apps/extension/config.js` (verify/add model name)

**Testing Checklist**:
- [ ] Logging works in page mode
- [ ] Logging works in selection mode
- [ ] API receives correct data format
- [ ] No raw user text in requests
- [ ] Logging failures don't block simplification
- [ ] DEBUG mode shows logging activity

---

## 🟡 MEDIUM PRIORITY

### 2. Improve Text Formatting After Simplification

**Status**: Not implemented

**Description**:
Simplified text (both selection and page mode) can be hard to read due to lost formatting, unclear visual distinction from original text, and poor readability styling.

**Current Issues**:
- Original formatting (bold, italic, links) is lost
- No visual indicator that text has been simplified
- Paragraph structure may be lost
- Line breaks and spacing inconsistent
- Hard to distinguish simplified sections from original
- Font size/style may not match accessibility needs

**Proposed Solutions**:

**Option 1: Preserve Original Styling** (Recommended for page mode)
```javascript
// In updateTextNodes() - preserve parent element styling
// Instead of: chunk.parent.textContent = simplified;

// Create a wrapper to maintain structure
const simplifiedWrapper = document.createElement('span');
simplifiedWrapper.className = 'klartext-simplified';
simplifiedWrapper.innerHTML = simplified; // or use textContent + preserve linebreaks

// Apply enhanced readability styles
simplifiedWrapper.style.cssText = `
  line-height: 1.6;
  word-spacing: 0.1em;
`;

// Replace content while preserving parent
chunk.parent.innerHTML = '';
chunk.parent.appendChild(simplifiedWrapper);
```

**Option 2: Add Visual Indicators**
- Subtle background highlight (light yellow/blue tint)
- Left border stripe to mark simplified sections
- Small badge/icon showing "simplified" status
- Optional: Add to `content/styles.css`:

```css
.klartext-simplified {
  background-color: rgba(255, 248, 220, 0.3); /* Light yellow tint */
  border-left: 3px solid hsl(45, 100%, 60%);
  padding-left: 8px;
  line-height: 1.6;
  word-spacing: 0.16em; /* Improved readability */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .klartext-simplified {
    background-color: rgba(255, 255, 0, 0.15);
    border-left-width: 4px;
  }
}
```

**Option 3: Enhanced Typography** (Accessibility-focused)
- Increase font size slightly (1.05-1.1em)
- Use more readable font stack (system fonts)
- Better line height (1.5-1.7)
- Improved letter spacing
- Preserve paragraph breaks (`\n\n` → `<p>` tags)

**Implementation Steps**:

1. **Add CSS class to simplified text** (`content/simplify.js` lines 496-499)
   - Mark simplified elements with `klartext-simplified` class
   - Preserve `data-klartext-simplified` attribute

2. **Create styling in `content/styles.css`**
   - Add readability enhancements
   - Ensure accessibility (contrast, motion, font-size)
   - Test with various website styles

3. **Preserve structure for combined chunks** (lines 476-492)
   - Split on `\n\n` and create paragraph elements
   - Maintain lists, headings structure where possible
   - Use `innerHTML` carefully (sanitize if needed)

4. **Add toggle for visual indicators** (optional)
   - User preference: "Show highlighting on simplified text"
   - Store in chrome.storage
   - Apply class conditionally

**Testing Checklist**:
- [ ] Simplified text is visually distinct
- [ ] Formatting improves readability
- [ ] Works on dark mode websites
- [ ] High contrast mode supported
- [ ] Line breaks preserved
- [ ] Font size meets accessibility standards (18-20px base)
- [ ] Works with both page and selection modes
- [ ] Styling doesn't conflict with website CSS
- [ ] Print styles considered (remove highlights when printing)

**Files to Modify**:
- `apps/extension/content/simplify.js` (add class to simplified elements)
- `apps/extension/content/styles.css` (add readability styles)
- `apps/extension/config.js` (add formatting preferences if needed)

**Priority Rationale**:
Medium priority because it affects core user experience and accessibility, but extension is functional without it.

---

### 3. User Cancellation for Selection Mode

**Status**: Implemented for page mode only

**Description**:
Users can cancel page simplification but not selection simplification. The cancellation infrastructure exists but isn't fully wired for selection mode.

**Implementation**:
- Add cancel button visibility check for selection mode
- Test abort controller works for selection API calls

---

### 3. Smart Chunking Analytics

**Status**: Working, could surface to user

**Description**:
The smart chunking system (Phase 1 optimization) reduces API calls by 30-70% but metrics are only logged to console.

**Potential Enhancement**:
- Show "Optimized X chunks → Y combined chunks" in UI
- Display estimated API call savings
- Add to success message: "Simplified in Y batches (saved Z calls)"

---

## 🟢 LOW PRIORITY / NICE TO HAVE

### 4. Language Detection Enhancement

**Status**: Basic implementation

**Current**: Falls back to default language if detection fails  
**Enhancement**: Use browser language API or page `<html lang>` attribute as better fallback

---

### 5. Offline Support

**Status**: Not implemented

**Description**: 
- Cache successful simplifications (IndexedDB)
- Show cached version if API unavailable
- Clear on page reload

---

### 6. Metrics Dashboard

**Status**: Not implemented

**Description**:
- Show user their usage stats (# simplifications, time saved)
- Display guardrail pass rates
- "You've simplified X pages this week"

---

## 📝 Notes

- See `extension_logger.js` for complete logging implementation details
- See `TESTING_GUIDE.md` for testing procedures
- See `known_issues.md` for bugs and workarounds
