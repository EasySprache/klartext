# Known Issues - KlarText Chrome Extension

## 🐛 Duplicate Permission Dialog (Unresolved)

**Status:** Open - Deferred for later investigation  
**Priority:** Medium  
**Date Reported:** 2026-01-14

### Description
When a user clicks "Simplify Page Text" for the first time (or after clearing localhost permissions), a permission dialog appears asking to "look for and connect to any device on your local network." The user must click "Allow" **twice** before the simplification begins.

### Expected Behavior
User should only need to click "Allow" **once** to grant localhost network permissions.

### Current Behavior
User must click "Allow" **twice**:
1. First click - Dialog appears, user clicks "Allow"
2. Second click - Dialog appears again, user clicks "Allow" again
3. Then simplification proceeds normally

### Impact
- Minor UX friction during first-time setup
- Does not prevent functionality, just requires an extra click
- Only affects first use or after clearing permissions

### Technical Context
- The extension makes fetch calls to `localhost:8000` (KlarText API)
- Chrome's network permission system requires explicit user consent for localhost connections
- Initial investigation suggests this may be related to popup window lifecycle and permission context

### Investigation History
**Attempted fixes (2026-01-14):**
1. Removed debug instrumentation fetch calls to localhost:7243 ✅ (reduced from potentially 3+ clicks)
2. Modified popup close timing (500ms delay) - Did not resolve duplicate dialog
3. Tested immediate window.close() - Caused permission dialog to never appear (blocked requests)

**Hypothesis for future investigation:**
- May be related to Chrome's security model for extension popups vs. content scripts
- Possible timing issue between popup closing and content script permission context
- Could explore alternative approaches:
  - Using chrome.permissions API to request permission explicitly
  - Moving API calls to background service worker
  - Implementing a one-time setup flow

### Workaround
Users need to click "Allow" twice on first use. After that, Chrome remembers the permission and no dialog appears on subsequent uses.

### Files Involved
- `apps/extension/popup/popup.js` - Initiates simplification flow
- `apps/extension/background/service-worker.js` - Injects content script
- `apps/extension/content/simplify.js` - Makes fetch calls to localhost:8000

### References
- Original issue report: User testing session 2026-01-14
- Debug session logs: `.cursor/debug.log` (cleared)

---

## 🐛 Smart Chunking Split Mismatch (Phase 1 Optimization)

**Status:** Open - Deferred for team review  
**Priority:** High  
**Date Reported:** 2026-01-25

### Description
The Phase 1 smart chunking optimization combines multiple text chunks with `\n\n` separators to reduce API calls. However, the API simplifies combined text as a cohesive unit and doesn't guarantee it preserves the exact `\n\n` separators in the same positions. When splitting the simplified result back on `\n\n`, the code may get fewer sections than parent elements, causing some DOM elements to not be updated with simplified text.

### Expected Behavior
- All parent elements in a combined chunk should receive their simplified text
- Text splitting should reliably map simplified sections back to original parent elements

### Current Behavior
1. Multiple chunks combined: `"Text A\n\nText B\n\nText C"` (3 parents)
2. API simplifies as single text, may merge or reformat paragraphs
3. Split on `\n\n` returns 2 sections instead of 3
4. Only 2 out of 3 parent elements get updated
5. Result: **Silent partial failure** - some text simplified, some not

### Impact
- 🔴 **High** - Causes silent data loss
- Users may not notice some text sections weren't simplified
- Defeats the purpose of the optimization (improves speed but reduces reliability)
- Worse UX than no optimization at all in failure cases

### Technical Context
- **Location:** `apps/extension/content/simplify.js:476-492`
- **Root cause:** Assumption that API preserves `\n\n` separators
- Combined chunk creation: Line 195
- Split logic: Line 479
- Safety guard exists (`i < simplifiedSections.length`) but doesn't prevent data loss

### Proposed Solutions
**Option A: Proportional Split** (Recommended - Fast, reasonably accurate)
- Split simplified text proportionally by original chunk character counts
- Maintains performance benefits of smart chunking
- Approximate but usually correct

**Option B: Unique Markers** (Most reliable but API-dependent)
- Use unique markers like `|||KLARTEXT_SECTION_BREAK|||`
- Requires API to preserve markers (may not be guaranteed)
- More reliable if markers are preserved

**Option C: Disable Combined Chunks** (Safest but loses optimization)
- Remove smart chunking for combined chunks
- Only optimize by skipping small chunks
- Loses 30-60% performance improvement

**Option D: Send Separately** (Most reliable but slower)
- Don't combine chunks at all, send each to API separately
- Guaranteed correct mapping
- Loses all performance benefits of Phase 1

### Workaround
Currently no workaround. Smart chunking is active in the current build. Team should decide:
1. Accept the risk and monitor for user reports
2. Implement Option A (proportional split)
3. Disable combined chunks temporarily

### Files Involved
- `apps/extension/content/simplify.js:161-222` - `optimizeChunks()` function
- `apps/extension/content/simplify.js:476-492` - `updateTextNodes()` combined chunk handling

### Performance Context
- Smart chunking provides 30-60% reduction in API calls
- On average: 87 chunks → 34 chunks (60.9% reduction)
- Trade-off: Speed vs. reliability

---

## 🐛 Wrong Button Loading State for Selection Mode

**Status:** Open - Deferred for team review  
**Priority:** Low  
**Date Reported:** 2026-01-25

### Description
When the user clicks "Simplify Selection", the sidepanel receives progress updates with `buttonId: 'simplify-selection'` but incorrectly sets loading state on the "Simplify Page" button instead. The `buttonId` parameter is extracted but not used in the processing status branch.

### Expected Behavior
- Clicking "Simplify Selection" should show loading spinner on the "Simplify Selection" button
- Clicking "Simplify Page" should show loading spinner on the "Simplify Page" button

### Current Behavior
- **Any** simplification (page or selection) shows loading state on "Simplify Page" button
- "Simplify Selection" button never shows loading state during its own processing

### Impact
- 🟡 **Low** - Visual/UX bug only
- Does not break functionality
- Confusing UI but users can still complete actions
- Button state is correctly reset on completion

### Technical Context
- **Location:** `apps/extension/sidepanel/sidepanel.js:291`
- `buttonId` extracted at line 280 but hardcoded as `'simplify-page'` at line 291
- Complete and error branches correctly use both button IDs (lines 317-318, 336-337)
- Only the processing branch has the bug

### Proposed Solution
**One-line fix:**
```javascript
// Change line 291 from:
setButtonLoading('simplify-page', true, progressMessage || 'Processing...');

// To:
setButtonLoading(buttonId || 'simplify-page', true, progressMessage || 'Processing...');
```

### Workaround
None needed - functionality works correctly, just displays loading state on wrong button.

### Files Involved
- `apps/extension/sidepanel/sidepanel.js:280-299` - PROGRESS_UPDATE message handler

---

## Future Investigation Tasks
- [ ] Research Chrome extension permission best practices for localhost
- [ ] Test with chrome.permissions.request() API
- [ ] Consider moving API calls to background service worker
- [ ] Test behavior across different Chrome versions
- [ ] Check if this affects other Chromium-based browsers (Edge, Brave, etc.)
