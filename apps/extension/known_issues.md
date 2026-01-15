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

## Future Investigation Tasks
- [ ] Research Chrome extension permission best practices for localhost
- [ ] Test with chrome.permissions.request() API
- [ ] Consider moving API calls to background service worker
- [ ] Test behavior across different Chrome versions
- [ ] Check if this affects other Chromium-based browsers (Edge, Brave, etc.)
