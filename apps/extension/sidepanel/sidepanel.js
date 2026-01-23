/**
 * KlarText Chrome Extension - Sidepanel Script
 * Handles user interaction with the sidepanel UI
 */

const statusEl = document.getElementById("status");
const simplifyPageBtn = document.getElementById("simplify-page");
const simplifySelectionBtn = document.getElementById("simplify-selection");
const detectedLangEl = document.getElementById('detected-lang');
const changeLangBtn = document.getElementById('change-lang');
const languageOverride = document.getElementById('language-override');
const closePanelBtn = document.getElementById('close-panel');
const cancelBtn = document.getElementById('cancel-button');

let detectedLanguage = 'en';  // Default fallback
let currentDomain = '';
let currentTabId = null; // Store the actual tab ID we're working with
let isPageProcessing = false; // Track if page simplification is active

/**
 * Initialize webapp feature links
 * Note: config.js is loaded as a global script, not a module
 */
function initializeWebappFeatures() {
  // Wait for config to be available (loaded via script tag in HTML)
  if (typeof CONFIG === 'undefined') {
    setTimeout(initializeWebappFeatures, 100);
    return;
  }
  
  const { WEBAPP_URL, WEBAPP_FEATURES } = CONFIG;
  
  // Update feature card links
  WEBAPP_FEATURES.forEach(feature => {
    const link = document.getElementById(`feature-${feature.id}`);
    if (link) {
      link.href = `${WEBAPP_URL}${feature.url}`;
    }
  });
  
  // Update "Powered by" link
  const poweredByLink = document.getElementById('powered-by-link');
  if (poweredByLink) {
    poweredByLink.href = WEBAPP_URL;
  }
}

/**
 * Close sidepanel
 */
if (closePanelBtn) {
  closePanelBtn.addEventListener('click', () => {
    window.close();
  });
}

/**
 * Update status message with appropriate styling
 */
function updateStatus(message, type = "info") {
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = "status-message";
  
  if (type === "loading") {
    statusEl.classList.add("loading");
  } else if (type === "success") {
    statusEl.classList.add("success");
  } else if (type === "error") {
    statusEl.classList.add("error");
  }
}

/**
 * Set button loading state with in-button progress
 */
function setButtonLoading(buttonId, loading, progressText = null) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.warn(`[KlarText] Button not found: ${buttonId}`);
    return;
  }
  
  const textSpan = button.querySelector('.button-text');
  const spinner = button.querySelector('.button-spinner');
  const buttonContent = button.querySelector('.button-content');
  
  if (loading) {
    button.classList.add('processing');
    button.disabled = true;
    
    if (spinner) spinner.style.display = 'inline-block';
    if (buttonContent) {
      const icon = buttonContent.querySelector('.button-icon');
      if (icon) icon.style.display = 'none';
    }
    
    // Show progress text if provided, otherwise default
    if (textSpan) {
      textSpan.textContent = progressText || 'Simplifying...';
    }
  } else {
    button.classList.remove('processing');
    button.disabled = false;
    
    if (spinner) spinner.style.display = 'none';
    if (buttonContent) {
      const icon = buttonContent.querySelector('.button-icon');
      if (icon) icon.style.display = 'inline-block';
    }
    
    // Restore original text
    if (buttonId === 'simplify-page') {
      if (textSpan) textSpan.textContent = 'Simplify Entire Page';
    } else {
      if (textSpan) textSpan.textContent = 'Simplify Selection';
    }
  }
}

/**
 * Handle simplify button click
 */
async function handleSimplify(mode = 'page') {
  try {
    // Quick Win #2: Block selection mode during page processing
    if (mode === 'selection' && isPageProcessing) {
      updateStatus("Please wait for page simplification to complete", "error");
      setTimeout(() => updateStatus("", "info"), 3000);
      return;
    }
    
    // Clear any previous status messages
    updateStatus("", "info");
    
    // Use detected/overridden language (same for source and target in v1)
    const language = detectedLanguage;
    
    // Update UI to loading state
    const buttonId = mode === 'page' ? 'simplify-page' : 'simplify-selection';
    setButtonLoading(buttonId, true, 'Starting...');
    updateStatus("Starting simplification...", "loading");
    
    // CRITICAL: Pass the tabId we stored during initialization
    // The service worker needs this because sidepanel context can't query the active tab reliably
    const messageType = mode === 'page' ? 'SIMPLIFY_PAGE' : 'SIMPLIFY_SELECTION';
    const response = await chrome.runtime.sendMessage({
      type: messageType,
      tabId: currentTabId,  // Pass the tab ID explicitly
      sourceLanguage: language,  // Same as target for v1
      targetLanguage: language   // Same as source for v1
    });
    
    // Handle response
    if (response?.ok) {
      // Don't show success message - wait for progress updates
      // The PROGRESS_UPDATE message will handle UI updates
    } else {
      const errorMsg = response?.error || "Unknown error occurred";
      updateStatus(`Error: ${errorMsg}`, "error");
      setButtonLoading(buttonId, false);
    }
    
  } catch (error) {
    console.error("[KlarText Sidepanel] Error:", error);
    updateStatus("Failed to communicate with extension", "error");
    const buttonId = mode === 'page' ? 'simplify-page' : 'simplify-selection';
    setButtonLoading(buttonId, false);
  }
}

/**
 * Listen for progress updates from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROGRESS_UPDATE') {
    const { progress, buttonId } = message;
    
    if (progress) {
      // Show progress in button
      setButtonLoading(buttonId || 'simplify-page', true, progress);
      updateStatus("", "info"); // Clear any previous status
    } else {
      // Empty progress = done
      setButtonLoading(buttonId || 'simplify-page', false);
      updateStatus("✓ Complete!", "success");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        updateStatus("", "info");
      }, 3000);
    }
    
    sendResponse({ ok: true });
  }
  
  // Quick Win #2: Handle page processing state changes
  if (message.type === 'PAGE_PROCESSING_STARTED') {
    isPageProcessing = true;
    disableSelectionButton();
    showCancelButton(); // Quick Win #1: Show cancel button immediately
    sendResponse({ ok: true });
  }
  
  if (message.type === 'PAGE_PROCESSING_ENDED') {
    isPageProcessing = false;
    enableSelectionButton();
    hideCancelButton(); // Quick Win #1: Hide cancel button when done
    sendResponse({ ok: true });
  }
  
  return true;
});

/**
 * Disable selection button during page processing (Quick Win #2)
 */
function disableSelectionButton() {
  if (!simplifySelectionBtn) return;
  
  simplifySelectionBtn.disabled = true;
  simplifySelectionBtn.style.opacity = '0.5';
  simplifySelectionBtn.style.cursor = 'not-allowed';
  simplifySelectionBtn.title = 'Please wait for page simplification to complete';
  
  // Update hint text to explain why it's disabled
  const hintText = document.querySelector('.hint-text');
  if (hintText) {
    hintText.textContent = 'Page simplification in progress. Selection mode will be available when complete.';
    hintText.style.color = 'hsl(220 20% 50%)';
  }
}

/**
 * Re-enable selection button after page processing (Quick Win #2)
 */
function enableSelectionButton() {
  if (!simplifySelectionBtn) return;
  
  simplifySelectionBtn.disabled = false;
  simplifySelectionBtn.style.opacity = '1';
  simplifySelectionBtn.style.cursor = 'pointer';
  simplifySelectionBtn.title = '';
  
  // Restore original hint text
  const hintText = document.querySelector('.hint-text');
  if (hintText) {
    hintText.textContent = 'Highlight text on the page to simplify specific sections';
    hintText.style.color = 'hsl(220 20% 50%)';
  }
}

/**
 * Show cancel button during page processing (Quick Win #1)
 */
function showCancelButton() {
  if (cancelBtn) {
    cancelBtn.style.display = 'block';
  }
}

/**
 * Hide cancel button after page processing (Quick Win #1)
 */
function hideCancelButton() {
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}

// Show override dropdown
if (changeLangBtn && languageOverride) {
  changeLangBtn.addEventListener('click', () => {
    languageOverride.style.display = 'block';
    languageOverride.value = detectedLanguage;
    changeLangBtn.style.display = 'none';
  });
}

// Save override when changed
if (languageOverride && detectedLangEl) {
  languageOverride.addEventListener('change', async () => {
    detectedLanguage = languageOverride.value;
    detectedLangEl.textContent = detectedLanguage === 'de' ? 'Deutsch' : 'English';
    
    // Save per-domain preference
    const key = `lang_${currentDomain}`;
    await chrome.storage.local.set({ [key]: detectedLanguage });
  });
}

// Add click event listeners
if (simplifyPageBtn) {
  simplifyPageBtn.addEventListener("click", () => handleSimplify('page'));
}
if (simplifySelectionBtn) {
  simplifySelectionBtn.addEventListener("click", () => handleSimplify('selection'));
}

// Add cancel button handler (Quick Win #1)
if (cancelBtn) {
  cancelBtn.addEventListener("click", async () => {
    try {
      // Send cancel message to content script
      await chrome.tabs.sendMessage(currentTabId, { type: 'CANCEL_SIMPLIFICATION' });
      
      // Update UI immediately
      isPageProcessing = false;
      hideCancelButton();
      enableSelectionButton();
      setButtonLoading('simplify-page', false);
      updateStatus("Simplification cancelled", "error");
      
      setTimeout(() => updateStatus("", "info"), 3000);
    } catch (error) {
      console.error('[KlarText Sidepanel] Failed to cancel:', error);
      updateStatus("Failed to cancel simplification", "error");
    }
  });
}

// Add keyboard support (Enter key)
if (simplifyPageBtn) {
  simplifyPageBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !simplifyPageBtn.disabled) {
      handleSimplify('page');
    }
  });
}

if (simplifySelectionBtn) {
  simplifySelectionBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !simplifySelectionBtn.disabled) {
      handleSimplify('selection');
    }
  });
}

// Initialize: Load saved language preference
async function initializeSidepanel() {
  try {
    console.log('[KlarText Sidepanel] Starting initialization...');
    
    // Reset processing state (Quick Win #2)
    isPageProcessing = false;
    enableSelectionButton();
    
    // Clear any previous status
    updateStatus("", "info");
    
    // Ask service worker for active tab (more reliable than querying from sidepanel context)
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    
    if (!response?.ok || !response?.tab) {
      console.error('[KlarText Sidepanel] Failed to get active tab:', response);
      updateStatus("Could not find active tab. Please navigate to a webpage.", "error");
      return;
    }
    
    const tab = response.tab;
    currentTabId = tab.id;
    currentDomain = new URL(tab.url).hostname;
    
    console.log('[KlarText Sidepanel] Initialized with tab:', currentTabId, 'URL:', tab.url, 'domain:', currentDomain);
    
    // Check for saved override for this domain
    const key = `lang_${currentDomain}`;
    const saved = await chrome.storage.local.get(key);
    
    if (saved[key]) {
      // Use saved override
      detectedLanguage = saved[key];
      if (detectedLangEl) {
        detectedLangEl.textContent = detectedLanguage === 'de' ? 'Deutsch' : 'English';
      }
      console.log('[KlarText Sidepanel] Using saved language:', detectedLanguage);
    } else {
      // Request detection from content script (optional - page may not have content script yet)
      try {
        const langResponse = await chrome.tabs.sendMessage(currentTabId, { 
          type: 'DETECT_LANGUAGE' 
        });
        detectedLanguage = langResponse.language || 'en';
        if (detectedLangEl) {
          detectedLangEl.textContent = detectedLanguage === 'de' ? 'Deutsch' : 'English';
        }
        console.log('[KlarText Sidepanel] Detected language:', detectedLanguage);
      } catch (e) {
        // Page not ready or content script not injected yet - use fallback
        console.log('[KlarText Sidepanel] Content script not ready, using default language');
        if (detectedLangEl) {
          detectedLangEl.textContent = 'English';
        }
      }
    }
  } catch (error) {
    console.error('[KlarText Sidepanel] Failed to initialize:', error);
    updateStatus("Initialization error: " + error.message, "error");
  }
}

// Re-initialize when tab changes (e.g., user navigates to a new page)
chrome.tabs.onActivated.addListener(() => {
  initializeSidepanel();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Re-initialize when the current tab's URL changes
  if (tabId === currentTabId && changeInfo.url) {
    initializeSidepanel();
  }
});

// Set initial state
updateStatus("", "info");
initializeSidepanel();
initializeWebappFeatures();
