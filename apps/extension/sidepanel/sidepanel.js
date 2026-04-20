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
let uiLocale = 'en';
const localeCatalogs = {};
const SUPPORTED_UI_LOCALES = new Set(['en', 'de']);

function t(key, fallback = '') {
  const localized = localeCatalogs[uiLocale]?.[key]?.message || chrome.i18n?.getMessage?.(key);
  return localized || fallback;
}

function tFormat(key, substitutions, fallback = '') {
  const localizedTemplate = localeCatalogs[uiLocale]?.[key]?.message;
  if (localizedTemplate) {
    const values = Array.isArray(substitutions) ? substitutions : [substitutions];
    return values.reduce((msg, value, index) => {
      return msg.replaceAll(`$${index + 1}`, String(value));
    }, localizedTemplate);
  }
  const localized = chrome.i18n?.getMessage?.(key, substitutions);
  return localized || fallback;
}

function getLanguageLabel(code) {
  return code === 'de'
    ? t('langGermanLabel', 'Deutsch')
    : t('langEnglishLabel', 'English');
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const localized = t(key, el.textContent || '');
    if (localized) el.textContent = localized;
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (!key) return;
    const localized = t(key, el.getAttribute('aria-label') || '');
    if (localized) el.setAttribute('aria-label', localized);
  });
}

async function ensureLocaleCatalog(locale) {
  if (localeCatalogs[locale]) return;
  const localePath = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
  const response = await fetch(localePath);
  if (!response.ok) {
    throw new Error(`Failed to load locale catalog: ${locale}`);
  }
  localeCatalogs[locale] = await response.json();
}

function normalizeUiLocale(locale) {
  return SUPPORTED_UI_LOCALES.has(locale) ? locale : 'en';
}

function applyDynamicLocalizedText() {
  // Refresh button labels/status text that can be changed dynamically during runtime.
  const pageBtnText = document.querySelector('#simplify-page .button-text');
  if (pageBtnText && !simplifyPageBtn?.classList.contains('processing')) {
    pageBtnText.textContent = t('simplifyPageButton', 'Simplify full page');
  }
  const selectionBtnText = document.querySelector('#simplify-selection .button-text');
  if (selectionBtnText && !simplifySelectionBtn?.classList.contains('processing')) {
    selectionBtnText.textContent = t('simplifySelectionButton', 'Simplify selection');
  }

  if (isPageProcessing) {
    disableSelectionButton();
  } else {
    enableSelectionButton();
  }

  if (detectedLangEl) {
    detectedLangEl.textContent = getLanguageLabel(detectedLanguage);
  }
}

async function setUiLocale(locale) {
  const normalized = normalizeUiLocale(locale);
  await ensureLocaleCatalog(normalized);
  uiLocale = normalized;
  applyStaticI18n();
  applyDynamicLocalizedText();
}

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
  
  if (loading) {
    button.classList.add('processing');
    button.disabled = true;
    
    if (spinner) spinner.style.display = 'inline-block';
    
    // Show progress text if provided, otherwise default
    if (textSpan) {
      textSpan.textContent = progressText || t('statusSimplifying', 'Simplifying...');
    }
  } else {
    button.classList.remove('processing');
    button.disabled = false;
    
    if (spinner) spinner.style.display = 'none';
    
    // Restore original text
    if (buttonId === 'simplify-page') {
      if (textSpan) textSpan.textContent = t('simplifyPageButton', 'Simplify full page');
    } else {
      if (textSpan) textSpan.textContent = t('simplifySelectionButton', 'Simplify selection');
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
      updateStatus(t('statusWaitForPageCompletion', 'Please wait for page simplification to complete'), "error");
      setTimeout(() => updateStatus("", "info"), 3000);
      return;
    }
    
    // Clear any previous status messages
    updateStatus("", "info");
    
    // Use detected/overridden language (same for source and target in v1)
    const language = detectedLanguage;
    
    // Update UI to loading state
    const buttonId = mode === 'page' ? 'simplify-page' : 'simplify-selection';
    setButtonLoading(buttonId, true, t('statusStarting', 'Starting...'));
    updateStatus(t('statusStartingSimplification', 'Starting simplification...'), "loading");
    
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
      const errorMsg = response?.error || t('errorUnknown', 'Unknown error occurred');
      updateStatus(tFormat('errorWithDetail', [errorMsg], `Error: ${errorMsg}`), "error");
      setButtonLoading(buttonId, false);
    }
    
  } catch (error) {
    console.error("[KlarText Sidepanel] Error:", error);
    updateStatus(t('errorFailedCommunication', 'Failed to communicate with extension'), "error");
    const buttonId = mode === 'page' ? 'simplify-page' : 'simplify-selection';
    setButtonLoading(buttonId, false);
  }
}

/**
 * Show/hide progress container and update progress bar
 */
function updateProgressBar(progress) {
  const progressContainer = document.getElementById('progress-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  const progressDetails = document.getElementById('progress-details');
  
  if (!progress) {
    // Hide progress container
    if (progressContainer) progressContainer.style.display = 'none';
    return;
  }
  
  // Show progress container
  if (progressContainer) progressContainer.style.display = 'block';
  
  // Update progress bar
  if (progressBarFill) progressBarFill.style.width = `${progress.percent || 0}%`;
  if (progressText) progressText.textContent = `${progress.percent || 0}%`;
  
  // Update details (batch info + ETA)
  if (progressDetails) {
    let detailsText = '';
    if (progress.current && progress.total) {
      detailsText = tFormat(
        'progressBatchOfTotal',
        [String(progress.current), String(progress.total)],
        `Batch ${progress.current} of ${progress.total}`
      );
    }
    if (progress.eta) {
      detailsText += ` • ${progress.eta}s remaining`;
    }
    progressDetails.textContent = detailsText;
  }
}

/**
 * Show/hide page indicator
 */
function updatePageIndicator(pageInfo) {
  const pageIndicator = document.getElementById('page-indicator');
  const pageName = document.getElementById('page-name');
  
  if (!pageInfo) {
    if (pageIndicator) pageIndicator.style.display = 'none';
    return;
  }
  
  if (pageIndicator) pageIndicator.style.display = 'flex';
  if (pageName) {
    pageName.textContent = pageInfo.domain || pageInfo.title || t('pageNameCurrent', 'Current page');
  }
}

/**
 * Show/hide success indicator
 */
function showSuccessIndicator(message) {
  const successIndicator = document.getElementById('success-indicator');
  const successMessage = document.getElementById('success-message');
  
  if (successIndicator) {
    successIndicator.style.display = 'flex';
    if (successMessage) successMessage.textContent = message || t('statusSuccess', 'Success!');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successIndicator.style.display = 'none';
    }, 5000);
  }
}

function hideSuccessIndicator() {
  const successIndicator = document.getElementById('success-indicator');
  if (successIndicator) successIndicator.style.display = 'none';
}

function resolveRuntimeMessage(messageKey, messageArgs, fallbackMessage, status) {
  if (messageKey) {
    if (Array.isArray(messageArgs) && messageArgs.length > 0) {
      return tFormat(messageKey, messageArgs, fallbackMessage || '');
    }
    return t(messageKey, fallbackMessage || '');
  }

  if (fallbackMessage) {
    const knownMessageKeys = {
      'Simplifying...': 'statusSimplifying',
      'Simplifying selected text...': 'statusSimplifying',
      '✓ Simplified selected text': 'statusSelectionSimplified',
      'Failed to simplify selected text': 'errorFailedSelection',
      'Simplification cancelled': 'statusSimplificationCancelled',
      'Error occurred': 'errorOccurred',
      'Processing...': 'statusProcessing',
      'Simplification complete!': 'statusSimplificationComplete',
    };

    if (knownMessageKeys[fallbackMessage]) {
      return t(knownMessageKeys[fallbackMessage], fallbackMessage);
    }

    if (fallbackMessage.startsWith('Failed to simplify selected text: ')) {
      const detail = fallbackMessage.replace('Failed to simplify selected text: ', '');
      return tFormat('errorFailedSelectionWithDetail', [detail], fallbackMessage);
    }
  }

  if (status === 'processing') return t('statusSimplifying', 'Simplifying...');
  if (status === 'complete') return t('statusSimplificationComplete', 'Simplification complete!');
  if (status === 'error') return t('errorOccurred', 'Error occurred');
  return fallbackMessage || '';
}

/**
 * Show/hide restore button
 */
function showRestoreButton() {
  const restoreButton = document.getElementById('restore-button');
  if (restoreButton) restoreButton.style.display = 'flex';
}

function hideRestoreButton() {
  const restoreButton = document.getElementById('restore-button');
  if (restoreButton) restoreButton.style.display = 'none';
}

/**
 * Show/hide select new text button
 */
function showSelectNewButton() {
  const selectNewButton = document.getElementById('select-new-button');
  if (selectNewButton) selectNewButton.style.display = 'flex';
}

function hideSelectNewButton() {
  const selectNewButton = document.getElementById('select-new-button');
  if (selectNewButton) selectNewButton.style.display = 'none';
}

/**
 * Listen for progress updates from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROGRESS_UPDATE') {
    const { status, message: progressMessage, messageKey, messageArgs, progress, pageInfo, buttonId } = message;
    const localizedMessage = resolveRuntimeMessage(messageKey, messageArgs, progressMessage, status);
    
    if (status === 'processing') {
      // Show progress bar and page indicator
      updateProgressBar(progress);
      updatePageIndicator(pageInfo);
      
      // Show cancel button
      showCancelButton();
      
      // Update button state (use buttonId from message, default to page)
      setButtonLoading(buttonId || 'simplify-page', true, localizedMessage || t('statusSimplifying', 'Simplifying...'));
      updateStatus("", "info");
      isPageProcessing = true;
      
      // Hide completion UI
      hideSuccessIndicator();
      hideRestoreButton();
      hideSelectNewButton();
      
    } else if (status === 'complete') {
      // Hide progress UI
      updateProgressBar(null);
      updatePageIndicator(null);
      hideCancelButton();
      
      // Show success indicator
      showSuccessIndicator(localizedMessage || t('statusSimplificationComplete', 'Simplification complete!'));
      
      // Show restore button
      showRestoreButton();
      
      // Show select new text button (only for selection mode)
      // We'll determine mode based on button context
      if (buttonId === 'simplify-selection') {
        showSelectNewButton();
      }
      
      // Reset button states
      setButtonLoading('simplify-page', false);
      setButtonLoading('simplify-selection', false);
      isPageProcessing = false;
      
    } else if (status === 'error') {
      // Hide progress UI
      updateProgressBar(null);
      updatePageIndicator(null);
      hideCancelButton();
      
      // Show error
      updateStatus(localizedMessage || t('errorOccurred', 'Error occurred'), "error");
      
      // Reset button states
      setButtonLoading('simplify-page', false);
      setButtonLoading('simplify-selection', false);
      isPageProcessing = false;
      
      // Clear error after 5 seconds
      setTimeout(() => {
        updateStatus("", "info");
      }, 5000);
      
    } else if (status === 'idle') {
      // Reset everything to idle
      updateProgressBar(null);
      updatePageIndicator(null);
      hideCancelButton();
      hideSuccessIndicator();
      setButtonLoading('simplify-page', false);
      setButtonLoading('simplify-selection', false);
      isPageProcessing = false;
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
  simplifySelectionBtn.title = t('statusWaitForPageCompletion', 'Please wait for page simplification to complete');
  
  // Update hint text to explain why it's disabled
  const hintText = document.querySelector('.hint-text');
  if (hintText) {
    hintText.textContent = t(
      'hintSelectionDisabledProcessing',
      'Page simplification in progress. Selection mode will be available when complete.'
    );
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
    hintText.textContent = t('hintText', 'Highlight text on the page to simplify specific sections');
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
    await setUiLocale(detectedLanguage);
    
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
      updateStatus(t('statusSimplificationCancelled', 'Simplification cancelled'), "error");
      
      setTimeout(() => updateStatus("", "info"), 3000);
    } catch (error) {
      console.error('[KlarText Sidepanel] Failed to cancel:', error);
      updateStatus(t('errorFailedCancel', 'Failed to cancel simplification'), "error");
    }
  });
}

// Add restore button handler
const restoreBtn = document.getElementById('restore-button');
if (restoreBtn) {
  restoreBtn.addEventListener("click", async () => {
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
      updateStatus(t('errorFailedRestore', 'Failed to restore original text'), "error");
    }
  });
}

// Add select new text button handler
const selectNewBtn = document.getElementById('select-new-button');
if (selectNewBtn) {
  selectNewBtn.addEventListener("click", async () => {
    try {
      // Reset UI state
      hideSuccessIndicator();
      hideRestoreButton();
      hideSelectNewButton();
      updateStatus(t('statusSelectTextThenSimplify', 'Select text on the page, then click "Simplify Selection"'), 'info');
      enableSelectionButton();
      
      // Optionally show selection dialog
      await chrome.tabs.sendMessage(currentTabId, {
        type: 'SHOW_SELECTION_DIALOG',
        sourceLanguage: detectedLanguage,
        targetLanguage: detectedLanguage,
      });
      
      // Clear status after 3 seconds
      setTimeout(() => updateStatus("", "info"), 3000);
    } catch (error) {
      console.error('[KlarText Sidepanel] Failed to reset selection:', error);
      // Non-critical error, just log it
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
    await ensureLocaleCatalog('en');
    
    // Reset processing state (Quick Win #2)
    isPageProcessing = false;
    enableSelectionButton();
    
    // Clear any previous status
    updateStatus("", "info");
    
    // Ask service worker for active tab (more reliable than querying from sidepanel context)
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    
    if (!response?.ok || !response?.tab) {
      console.error('[KlarText Sidepanel] Failed to get active tab:', response);
      updateStatus(t('errorNoActiveTab', 'Could not find active tab. Please navigate to a webpage.'), "error");
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
      await setUiLocale(detectedLanguage);
      console.log('[KlarText Sidepanel] Using saved language:', detectedLanguage);
    } else {
      // Request detection from content script (optional - page may not have content script yet)
      try {
        const langResponse = await chrome.tabs.sendMessage(currentTabId, { 
          type: 'DETECT_LANGUAGE' 
        });
        detectedLanguage = langResponse.language || 'en';
        await setUiLocale(detectedLanguage);
        console.log('[KlarText Sidepanel] Detected language:', detectedLanguage);
      } catch (e) {
        // Page not ready or content script not injected yet - use fallback
        console.log('[KlarText Sidepanel] Content script not ready, using default language');
        detectedLanguage = 'en';
        await setUiLocale('en');
      }
    }
  } catch (error) {
    console.error('[KlarText Sidepanel] Failed to initialize:', error);
    updateStatus(tFormat('errorInitialization', [String(error.message || '')], `Initialization error: ${error.message}`), "error");
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
setUiLocale('en').catch((error) => {
  console.error('[KlarText Sidepanel] Failed to initialize locale:', error);
});
updateStatus("", "info");
initializeSidepanel();
initializeWebappFeatures();
