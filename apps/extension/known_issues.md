# Known Issues - KlarText Chrome Extension

## Issue #1: Duplicate Permission Dialog (Unresolved)

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
1. Removed debug instrumentation fetch calls to localhost:7243 (reduced from potentially 3+ clicks)
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

## Issue #2: Smart Chunking Split Mismatch (Phase 1 Optimization)

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

## Issue #3: Wrong Button Loading State for Selection Mode

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

## Issue #4: Sidepanel Doesn't Open Automatically on First Click

**Status:** Open - Code fix needed  
**Priority:** Medium (UX issue, workaround available)  
**Date Reported:** 2026-01-26

### Description
When users install the extension for the first time and click the extension icon in the toolbar, the sidepanel does not open automatically. Users must right-click the extension icon and select "Open side panel" from the context menu at least once before left-clicking will work automatically.

### Expected Behavior
- User clicks the extension icon (left-click)
- Sidepanel opens immediately on the right side of the browser window
- This should work on first use without requiring any manual configuration

### Current Behavior
**On first installation:**
1. User left-clicks the extension icon
2. Nothing happens - sidepanel does not open
3. User must right-click the icon and select "Open side panel"
4. After opening once, Chrome remembers this preference
5. Subsequent left-clicks work automatically

### Impact
- 🟡 **Medium** - UX friction for new users
- Not discoverable - users may think extension is broken
- Requires workaround knowledge (right-click menu)
- Works fine after first manual open
- Does not affect returning users

### Technical Context
- **Root cause:** Missing sidepanel behavior configuration in service worker
- The extension manifest.json has both `action` and `side_panel` defined
- Chrome MV3 requires explicit configuration to open sidepanel on action click
- Once opened manually, Chrome stores user preference and auto-opens on future clicks
- This is why some users (who opened it once) don't experience the issue

### Solution
Add sidepanel behavior configuration to `background/service-worker.js`:

**Option 1: Set Panel Behavior (Recommended)**
```javascript
// Add after service worker initialization
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[KlarText] Failed to set panel behavior:', error));
```

**Option 2: Add Click Listener**
```javascript
// Add explicit click handler
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
```

### Workaround
**For users:**
1. Right-click the KlarText extension icon in the Chrome toolbar
2. Select "Open side panel" from the context menu
3. The sidepanel will open
4. From then on, left-clicking the icon will work automatically

**For developers:**
Document this requirement in README.md and TESTING_GUIDE.md until the code fix is implemented.

### Files Involved
- `apps/extension/background/service-worker.js` - Needs panel behavior configuration
- `apps/extension/manifest.json` - Already has correct permissions

### Why Some Users Don't Experience This
Chrome stores a per-profile preference when a sidepanel is opened (even manually). If a user:
- Opened the sidepanel via right-click during initial testing
- Had the extension installed previously with sidepanel opened
- Used a Chrome profile where the extension was previously configured

Then Chrome will remember this and automatically open the sidepanel on left-click. This creates inconsistent behavior across different users/profiles.

### References
- Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/sidePanel/
- Manifest V3 action API: https://developer.chrome.com/docs/extensions/reference/action/
- Issue identified during user testing 2026-01-26

---

## Issue #5: Chrome Private Network Access (PNA) CORS Error

**Status:** Fix available  
**Priority:** Critical (blocks extension functionality on public sites)  
**Date Reported:** 2026-01-26

### Description
When testing the extension on public websites (e.g., https://www.dw.com), Chrome blocks fetch requests to the local API (`localhost:8000`) with the error:

```
Access to fetch at 'http://localhost:8000/v1/simplify/batch' from origin 
'https://www.dw.com' has been blocked by CORS policy: Permission was denied 
for this request to access the `loopback` address space.
```

### Expected Behavior
- Extension should be able to communicate with local API from any website
- Fetch requests to `localhost:8000` should succeed after user grants permission

### Current Behavior (Before Fix)
- All API calls fail with CORS error
- Extension cannot simplify text
- Error occurs on all public HTTPS websites

### Impact
- 🔴 **Critical** - Complete functionality failure
- Blocks all simplification operations
- Extension is unusable for its primary purpose

### Technical Context
- **Root cause:** Chrome's Private Network Access (PNA) / CORS-RFC1918 policy
- Introduced in Chrome 94+ as security feature to prevent malicious websites from attacking local networks
- Requires specific CORS headers to allow public websites → localhost communication
- Only affects development setups where API runs on localhost

### Solution
Add PNA headers to the FastAPI CORS configuration in `services/api/app/main.py`:

```python
# Add middleware to handle Private Network Access (PNA) for Chrome extensions
@app.middleware("http")
async def add_pna_headers(request: Request, call_next):
    """
    Add Private Network Access headers for Chrome's CORS-RFC1918 policy.
    Required for browser extensions accessing localhost from public websites.
    """
    response = await call_next(request)
    
    # Only add PNA header in development (localhost API)
    if environment == "development":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    
    return response
```

Also add to CORS middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Access-Control-Allow-Private-Network"],  # Add this line
)
```

### Security Considerations
- ✅ Safe for local development (API only accessible from user's machine)
- ⚠️ Should ONLY enable in development mode (`environment == "development"`)
- ❌ Do NOT enable in production unless API is specifically deployed to private network
- Production APIs should be at public domains, not requiring PNA headers

### Workaround
After applying the fix:
1. Restart the API server
2. Reload extension in Chrome
3. Test on any public website

### Files Involved
- `services/api/app/main.py` - CORS configuration and PNA middleware

### References
- Chrome Private Network Access: https://developer.chrome.com/blog/private-network-access-preflight/
- CORS-RFC1918 specification
- Reported during extension testing on dw.com and scrumm.ing

---

## Issue #6: Progress Bar Appears Stalled During API Calls

**Status:** Open - UX/Design consideration  
**Priority:** Low (cosmetic/perception issue)  
**Date Reported:** 2026-01-26

### Description
The progress bar often appears frozen at 0% or 50% for extended periods during simplification. While the extension is actively processing (waiting for API responses), the progress bar doesn't update, creating the perception that the system is stalled or unresponsive.

### Expected Behavior
- Progress bar shows smooth, continuous updates during processing
- Users can see real-time progress as text is being simplified
- Progress increases gradually throughout the simplification process

### Current Behavior
**Timeline example (10 batches):**
1. T+0s: Shows "0% - Batch 1 of 10"
2. T+0s to T+15s: **Appears frozen at 0%** (waiting for API response)
3. T+15s: Jumps to "10% - Batch 1 complete"
4. T+15s: Shows "10% - Batch 2 of 10"
5. T+15s to T+30s: **Appears frozen at 10%** (waiting for API response)
6. And so on...

**Why it appears at 0% or 50%:**
- Progress is calculated **before** sending each batch to the API
- The bar updates only **after** the API returns results
- Since API calls can take 5-30+ seconds per batch, the bar appears stalled during this time
- For 2-batch jobs: shows 0% → (wait) → 50% → (wait) → 100%

### Impact
- 🟡 **Low** - Perception/UX issue only
- Functionality works correctly
- May cause user confusion about whether processing is happening
- Users may think the extension is frozen or unresponsive
- Particularly noticeable on first batch (0%) and during long API calls

### Technical Context
**Root cause:** Progress calculation timing in `simplifyInBatches()`

**Line 342-343** - Progress calculated BEFORE API call:
```javascript
const progressPercent = Math.round((completedChunks / totalChunks) * 100);
```

**Lines 355-377** - Progress update sent immediately

**Line 386** - API call happens (5-30+ seconds)

**Lines 412-437** - Progress updated again AFTER API completes

**Why no real-time updates:**
The extension has no visibility into the API's internal progress. It only knows:
- When a batch request starts
- When a batch request completes

There's no way to track progress during the API call itself.

### Proposed Solutions

**Option A: Show "Processing" State Instead of Percentage** (Easiest)
- Replace percentage with spinner or "Processing batch X of Y..."
- Don't show percentage until each batch completes
- Manages user expectations better
- No code complexity

**Option B: Optimistic Progress Animation** (Better UX)
- Show gradual progress increase during API calls
- Use estimated time from previous batches to animate progress
- Example: If batch 1 took 15s, animate from 0% to 10% over ~15s for batch 2
- Creates perception of continuous progress
- More complex implementation

**Option C: Incremental Progress Updates** (Most accurate but complex)
- Calculate progress after sending each batch: `(currentBatch / totalBatches) * 100`
- Show different progress value at start vs. completion of each batch
- Example: Batch 1 starts → 5%, completes → 10%; Batch 2 starts → 15%, completes → 20%
- More granular but still has pauses during API calls

**Option D: Move Progress Calculation to After API Call** (Simplest fix)
- Only update progress after each batch completes
- Show 0% until first batch completes, then jump to actual completion percentage
- Most accurate but still has long pauses at 0%

### Workaround
**For users:**
- Wait patiently - the extension is working even when the progress bar appears frozen
- Look for the batch count message which updates more frequently
- Check for the cancel button which indicates active processing

**For developers:**
- Document this behavior in user guides/tooltips
- Consider adding "Processing..." spinner alongside the progress bar
- Add tooltip explaining that progress updates when each batch completes

### Files Involved
- `apps/extension/content/simplify.js:342-377` - Initial progress calculation and update
- `apps/extension/content/simplify.js:386` - API call (blocking operation)
- `apps/extension/content/simplify.js:412-437` - Post-completion progress update
- `apps/extension/sidepanel/sidepanel.js:176-206` - Progress bar UI rendering

### References
- User observation during testing 2026-01-26
- Related to batch processing design in simplifyInBatches()

---

## Issue #7: Race Condition with Overlapping Simplifications

**Status:** Fixed  
**Priority:** High  
**Date Reported:** 2026-01-26  
**Date Fixed:** 2026-01-26

### Description
A race condition occurred when a user cancelled a page simplification and then immediately started a selection simplification. The global `userCancellationController` variable would be overwritten, causing the previous operation to not clean up properly. This led to UI state confusion where the "select new text" button would show page simplification status and cancellation would fail.

### Steps to Reproduce
1. Click "Simplify entire page"
2. Click "Cancel simplification"
3. Click "Simplify selection"
4. Select text
5. After simplification, click "Select new text"

**Expected Result:** User is prompted to select text again

**Original Buggy Behavior:**
- "Simplify page" showed status that it was trying to simplify the page
- Cancel button didn't work
- "Failed to cancel simplification" message appeared
- UI state was confused between page and selection modes

### Root Cause
- `userCancellationController` was a single global variable shared by all simplifications
- When one simplification overwrote the controller, it interfered with another still-running simplification
- No re-entry guard prevented overlapping simplifications
- **Fetch requests only listened to timeout signal, not user cancellation signal**
- Cancellation handler reset `isSimplificationActive` immediately, allowing new operations to start while cancelled one was still running
- Cancelled operations continued in background and sent completion messages to UI

### Solution Implemented
1. **Added re-entry guard:** `isSimplificationActive` flag prevents overlapping simplifications
2. **Early return:** `simplifyPage()` returns early with error if another simplification is active
3. **Proper cleanup:** Flag is cleared in `finally` block to ensure cleanup even on errors
4. **Wired cancellation into fetch:** Used `AbortSignal.any()` to combine user cancellation and timeout signals so fetch can be aborted by either
5. **Fixed cancellation handler:** No longer resets `isSimplificationActive` - lets the original operation's finally block do it
6. **Better error handling:** Distinguishes between user cancellation and timeout errors

### Files Modified
- `apps/extension/content/simplify.js` - Added re-entry guard and fixed cancellation

### Impact
- 🔴 **High** - Complete UI state confusion
- Cancellation didn't work properly
- Users couldn't recover without reloading

---

## Issue #8: Extension Doesn't Always Properly Detect Page Language

**Status:** Open - Investigation needed  
**Priority:** Medium  
**Date Reported:** 2026-01-27

### Description
The extension doesn't always correctly detect the language of the webpage being simplified. This can lead to the API receiving text with an incorrect language parameter, potentially resulting in poor simplification quality or errors.

### Expected Behavior
- Extension should accurately detect the language of the page content
- Language detection should work consistently across different websites
- Detected language should match the primary language of the text being simplified

### Current Behavior
- Language detection is inconsistent or inaccurate in some cases
- May cause API to process text with wrong language parameter
- Impact on simplification quality varies by case

### Impact
- 🟡 **Medium** - Affects simplification quality
- May result in poor or incorrect simplifications
- User may not be aware that wrong language was detected
- Could lead to confusing results

### Technical Context
- Language detection logic needs investigation
- May be related to how page language is determined (HTML lang attribute, content analysis, etc.)
- Could vary by website structure and metadata quality

### Proposed Solutions
- Review and improve language detection algorithm
- Add fallback mechanisms for ambiguous cases
- Consider allowing users to manually specify/override language
- Add logging to track language detection accuracy

### Workaround
None currently documented. Users may need to be aware that simplification quality can vary.

### Files Involved
- Investigation needed to identify specific files handling language detection

### References
- Issue reported: 2026-01-27

---

## Issue #9: Restore Button UI State Cleared Before Message Success

**Status:** Open - Regression introduced  
**Priority:** Medium  
**Date Reported:** 2026-01-27

### Description
The restore button handler now hides UI elements (restore button, select new button, success indicator) and clears status before attempting to send the restore message to the content script. If the message fails (e.g., tab closed or content script error), the buttons are already hidden, so users cannot retry. This is a regression from the previous behavior where buttons remained visible on message failure, allowing retry attempts.

### Expected Behavior
- User clicks "Restore Original"
- Restore message is sent to content script
- If message succeeds: UI elements are hidden and page reloads
- If message fails: Buttons remain visible, error is shown, user can retry

### Current Behavior
1. User clicks "Restore Original"
2. UI elements are hidden immediately (restore button, select new button, success indicator)
3. Status is cleared
4. Restore message is sent to content script
5. **If message fails:** Error message shows but buttons are already gone
6. User has no way to retry without reloading the extension

### Impact
- 🟡 **Medium** - Poor error recovery UX
- Users cannot retry failed restore operations
- Forces users to reload extension or refresh page manually
- Degrades user experience when errors occur
- Particularly problematic if tab is in an unexpected state

### Technical Context
- **Location:** `apps/extension/sidepanel/sidepanel.js:484-493`
- **Root cause:** UI cleanup moved before async message operation
- The change was likely made to provide faster visual feedback, but breaks error handling

**Current problematic code:**
```javascript
try {
  // Hide buttons and clear status immediately
  hideRestoreButton();
  hideSelectNewButton();
  hideSuccessIndicator();
  updateStatus("", "info");
  
  // Send restore message to content script (page will reload immediately)
  await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_ORIGINAL' });
} catch (error) {
  console.error('[KlarText Sidepanel] Failed to restore:', error);
  updateStatus("Failed to restore original text", "error");
  // Buttons are already hidden - user cannot retry!
}
```

### Proposed Solution
Move UI cleanup to after successful message delivery, or restore buttons in catch block:

**Option A: Move UI cleanup after success (Recommended)**
```javascript
try {
  // Send restore message first
  await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_ORIGINAL' });
  
  // Only hide UI after successful message delivery
  hideRestoreButton();
  hideSelectNewButton();
  hideSuccessIndicator();
  updateStatus("", "info");
} catch (error) {
  console.error('[KlarText Sidepanel] Failed to restore:', error);
  updateStatus("Failed to restore original text", "error");
  // Buttons remain visible for retry
}
```

**Option B: Restore buttons in catch block**
```javascript
try {
  hideRestoreButton();
  hideSelectNewButton();
  hideSuccessIndicator();
  updateStatus("", "info");
  
  await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_ORIGINAL' });
} catch (error) {
  console.error('[KlarText Sidepanel] Failed to restore:', error);
  updateStatus("Failed to restore original text", "error");
  
  // Restore buttons on error
  showRestoreButton();
  showSelectNewButton();
}
```

**Option C: Optimistic UI with rollback**
```javascript
try {
  // Provide immediate feedback
  updateStatus("Restoring original text...", "info");
  
  // Send message
  await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_ORIGINAL' });
  
  // Hide UI only after success
  hideRestoreButton();
  hideSelectNewButton();
  hideSuccessIndicator();
  updateStatus("", "info");
} catch (error) {
  console.error('[KlarText Sidepanel] Failed to restore:', error);
  updateStatus("Failed to restore original text", "error");
  // Buttons already visible, user can retry
}
```

### Workaround
**For users:**
If restore fails and buttons disappear:
1. Reload the extension by clicking the extension icon again
2. Or refresh the entire page (Ctrl+R / Cmd+R)
3. Simplified text will be lost, but page returns to original state

**For developers:**
Revert the change or implement one of the proposed solutions above.

### Files Involved
- `apps/extension/sidepanel/sidepanel.js:484-493` - Restore button click handler

### References
- Regression introduced in recent commit (visible in git diff)
- Previous behavior: buttons remained visible on error
- Issue reported: 2026-01-27

---

## Future Investigation Tasks
- [ ] Research Chrome extension permission best practices for localhost
- [ ] Test with chrome.permissions.request() API
- [ ] Consider moving API calls to background service worker
- [ ] Test behavior across different Chrome versions
- [ ] Check if this affects other Chromium-based browsers (Edge, Brave, etc.)
