/**
 * KlarText Chrome Extension - Service Worker (Background Script)
 * 
 * Handles messages from popup and manages content script injection.
 * MV3 service worker (module-based).
 */

const DEBUG = true;

/**
 * Check if a URL can have content scripts injected
 * Chrome restricts extensions on certain pages for security
 */
function isInjectableURL(url) {
  if (!url) return false;
  
  // Cannot inject into chrome:// pages
  if (url.startsWith('chrome://')) return false;
  if (url.startsWith('chrome-extension://')) return false;
  
  // Cannot inject into some Google internal pages
  if (url.startsWith('https://chrome.google.com/webstore')) return false;
  
  // Edge browser pages
  if (url.startsWith('edge://')) return false;
  
  // New tab pages
  if (url.startsWith('about:')) return false;
  
  return true;
}

/**
 * Get user-friendly error message for injection failures
 */
function getErrorMessage(error, tabUrl) {
  const errorStr = String(error?.message || error);
  
  if (!isInjectableURL(tabUrl)) {
    return 'Cannot simplify this page (browser extension pages are protected)';
  }
  
  if (errorStr.includes('Cannot access')) {
    return 'Cannot access this page. Try a different website.';
  }
  
  if (errorStr.includes('Frame with ID')) {
    return 'Page structure not compatible. Try refreshing.';
  }
  
  if (errorStr.includes('No tab with id')) {
    return 'Tab not found. Please try again.';
  }
  
  // Generic error
  return `Extension error: ${errorStr}`;
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle SIMPLIFY_ACTIVE_TAB messages
  if (message?.type !== 'SIMPLIFY_ACTIVE_TAB') {
    return false;
  }
  
  // Handle async operation
  (async () => {
    try {
      if (DEBUG) {
        console.log('[KlarText] Received SIMPLIFY_ACTIVE_TAB message');
      }
      
      // Get active tab
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (!tab?.id) {
        sendResponse({ 
          ok: false, 
          error: 'No active tab found' 
        });
        return;
      }
      
      if (DEBUG) {
        console.log(`[KlarText] Active tab: ${tab.url}`);
      }
      
      // Check if URL is injectable
      if (!isInjectableURL(tab.url)) {
        sendResponse({ 
          ok: false, 
          error: 'Cannot simplify browser extension pages or chrome:// URLs' 
        });
        return;
      }
      
      // Inject configuration first, then content script
      // This ensures CONFIG is available when simplify.js runs
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['config.js', 'content/simplify.js'],
      });
      
      if (DEBUG) {
        console.log('[KlarText] Content script injected successfully');
      }
      
      // Success
      sendResponse({ ok: true });
      
    } catch (error) {
      console.error('[KlarText] Injection failed:', error);
      
      // Get user-friendly error message
      const errorMsg = getErrorMessage(error, tab?.url);
      
      sendResponse({ 
        ok: false, 
        error: errorMsg 
      });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

// Log when service worker starts
if (DEBUG) {
  console.log('[KlarText] Service worker started');
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[KlarText] Extension installed!');
    // Could open a welcome page here in the future
  } else if (details.reason === 'update') {
    console.log('[KlarText] Extension updated to', chrome.runtime.getManifest().version);
  }
});
