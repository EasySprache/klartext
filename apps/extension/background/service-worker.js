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
 * Handle messages from sidepanel and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageType = message?.type;
  
  if (DEBUG) {
    console.log('[KlarText Service Worker] Received message:', messageType);
  }
  
  // Handle GET_ACTIVE_TAB request from sidepanel
  if (messageType === 'GET_ACTIVE_TAB') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ 
          active: true, 
          currentWindow: true 
        });
        
        if (!tab) {
          sendResponse({ ok: false, error: 'No active tab found' });
          return;
        }
        
        if (DEBUG) {
          console.log('[KlarText] Found active tab:', tab.id, tab.url);
        }
        
        sendResponse({ ok: true, tab: tab });
      } catch (error) {
        console.error('[KlarText] Failed to get active tab:', error);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Handle simplification requests from sidepanel
  if (messageType === 'SIMPLIFY_PAGE' || messageType === 'SIMPLIFY_SELECTION') {
    handleSimplification(message, sender, sendResponse);
    return true;
  }
  
  // Unknown message type
  return false;
});

/**
 * Handle simplification requests from sidepanel
 */
async function handleSimplification(message, sender, sendResponse) {
  try {
    const { type, tabId, sourceLanguage, targetLanguage } = message;
    const mode = type === 'SIMPLIFY_PAGE' ? 'page' : 'selection';
    
    if (DEBUG) {
      console.log(`[KlarText] Handling ${type} for tab ${tabId} (source: ${sourceLanguage}, target: ${targetLanguage})`);
    }
    
    if (!tabId) {
      sendResponse({ 
        ok: false, 
        error: 'No tab ID provided' 
      });
      return;
    }
    
    // Get tab info
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab) {
      sendResponse({ 
        ok: false, 
        error: 'Tab not found' 
      });
      return;
    }
    
    if (DEBUG) {
      console.log(`[KlarText] Tab URL: ${tab.url}`);
    }
    
    // Check if URL is injectable
    if (tab.url && !isInjectableURL(tab.url)) {
      sendResponse({ 
        ok: false, 
        error: 'Cannot simplify browser extension pages or chrome:// URLs' 
      });
      return;
    }
    
    // Check if extension_logger.js exists, inject it if available
    const filesToInject = ['config.js'];
    try {
      // Try to inject logger if it exists
      const loggerExists = await fetch(chrome.runtime.getURL('extension_logger.js'))
        .then(() => true)
        .catch(() => false);
      if (loggerExists) {
        filesToInject.push('extension_logger.js');
      }
    } catch (e) {
      // Logger not available, continue without it
    }
    filesToInject.push('content/simplify.js');
    
    // Inject configuration and content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: filesToInject,
    });
    
    // Send message to content script with mode and languages
    await chrome.tabs.sendMessage(tabId, {
      type: 'START_SIMPLIFICATION',
      mode: mode,
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage: targetLanguage || 'en'
    });
    
    if (DEBUG) {
      console.log('[KlarText] Content script injected and simplification started');
    }
    
    // Success
    sendResponse({ ok: true });
    
  } catch (error) {
    console.error('[KlarText] Simplification failed:', error);
    
    const errorMsg = getErrorMessage(error, null);
    
    sendResponse({ 
      ok: false, 
      error: errorMsg 
    });
  }
}

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
