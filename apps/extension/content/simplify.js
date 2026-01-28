/**
 * KlarText Chrome Extension - Content Script
 * 
 * This script runs on web pages and handles text simplification.
 * It collects text nodes, sends them to the KlarText API, and updates the page.
 * 
 * Configuration is loaded from config.js (injected by service worker before this script).
 */

// CONFIG is loaded from config.js - see background/service-worker.js
// If CONFIG is not defined, something went wrong with script injection order
if (typeof CONFIG === 'undefined') {
  console.error('[KlarText] FATAL: CONFIG not loaded. Check service worker script injection order.');
  throw new Error('KlarText configuration not loaded');
}

// Global AbortController for user-initiated cancellation
// Separate from per-batch timeout controllers to prevent cascading failures
// 
// To implement user cancellation:
// 1. Add "Cancel" button in sidepanel UI during processing
// 2. Send message from sidepanel: chrome.tabs.sendMessage(tabId, { type: 'CANCEL_SIMPLIFICATION' })
// 3. In content script message listener, call: userCancellationController?.abort()
// 4. All in-flight and pending batches will stop gracefully
let userCancellationController = null;

// Re-entry guard to prevent overlapping simplifications
// This prevents race conditions where multiple simplifications run simultaneously
let isSimplificationActive = false;

/**
 * Check if an element should be skipped during text collection
 */
function isSkippableElement(element) {
  if (!element) return true;
  
  const tag = element.tagName?.toLowerCase();
  
  // Skip non-content elements
  const skipTags = [
    'script', 'style', 'noscript', 'iframe', 'object', 'embed',
    'textarea', 'input', 'select', 'option', 'button',
    'code', 'pre', 'svg', 'canvas', 'audio', 'video',
    'nav', 'header', 'footer', 'aside', // Navigation/structural
  ];
  
  if (skipTags.includes(tag)) return true;
  
  // Skip elements with contenteditable
  if (element.closest('[contenteditable="true"]')) return true;
  
  // Skip elements already simplified
  if (element.dataset?.klartextSimplified === '1') return true;
  
  // Skip hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  
  return false;
}

/**
 * Collect text nodes from the document that should be simplified
 * Groups text nodes by their parent element for coherent simplification
 */
function collectTextChunks() {
  const chunks = [];
  const processedParents = new Set();
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        
        // Skip if parent should be skipped
        if (!parent || isSkippableElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip empty or very short text
        const value = node.nodeValue ?? '';
        if (!value.trim() || value.trim().length < CONFIG.MIN_TEXT_LENGTH) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  
  // Collect all text nodes
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  
  // Group text nodes by parent element
  const parentGroups = new Map();
  
  for (const textNode of textNodes) {
    const parent = textNode.parentElement;
    if (!parent || processedParents.has(parent)) continue;
    
    // Get all text content from this parent
    const parentText = parent.textContent?.trim();
    if (!parentText || parentText.length < CONFIG.MIN_TEXT_LENGTH) continue;
    
    // Skip if text is too long (will be chunked by API)
    // But warn if it's extremely long
    if (parentText.length > CONFIG.MAX_TEXT_LENGTH) {
      if (CONFIG.DEBUG) {
        console.log(`[KlarText] Long text in <${parent.tagName}>: ${parentText.length} chars (will be processed in chunks)`);
      }
    }
    
    // Find all text nodes within this parent
    const parentTextNodes = [];
    const parentWalker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          const p = n.parentElement;
          if (!p || isSkippableElement(p)) return NodeFilter.FILTER_REJECT;
          const val = n.nodeValue ?? '';
          if (!val.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    
    let parentTextNode;
    while ((parentTextNode = parentWalker.nextNode())) {
      parentTextNodes.push(parentTextNode);
    }
    
    if (parentTextNodes.length > 0) {
      chunks.push({
        parent,
        textNodes: parentTextNodes,
        originalText: parentText,
      });
      processedParents.add(parent);
    }
  }
  
  if (CONFIG.DEBUG) {
    console.log(`[KlarText] Collected ${chunks.length} text chunks to simplify`);
  }
  
  return chunks;
}

/**
 * Optimize chunks by combining small adjacent chunks
 * This reduces the number of API calls needed
 * 
 * Phase 1 Optimization: Smart Chunking
 * Combines small text chunks that are near each other to reduce API calls
 * while staying under the API's character limit per text.
 */
function optimizeChunks(chunks) {
  const optimized = [];
  const TARGET_CHUNK_SIZE = 1500; // Sweet spot for combining chunks
  const MAX_CHUNK_SIZE = 4000;    // Stay under API limit of 5000 with buffer
  
  let currentBatch = {
    parents: [],
    textNodes: [],
    originalText: '',
    combinedLength: 0
  };
  
  for (const chunk of chunks) {
    const chunkLength = chunk.originalText.length;
    
    // If this chunk alone is large, keep it separate
    if (chunkLength > TARGET_CHUNK_SIZE) {
      // First, save any accumulated batch
      if (currentBatch.textNodes.length > 0) {
        optimized.push(currentBatch);
        currentBatch = { parents: [], textNodes: [], originalText: '', combinedLength: 0 };
      }
      // Then add the large chunk as-is
      optimized.push(chunk);
      continue;
    }
    
    // Try to combine with current batch
    const wouldBe = currentBatch.combinedLength + chunkLength + 2; // +2 for separator
    
    if (wouldBe <= MAX_CHUNK_SIZE && currentBatch.textNodes.length > 0) {
      // Combine chunks - add separator between different text sections
      currentBatch.parents.push(chunk.parent);
      currentBatch.textNodes.push(...chunk.textNodes);
      currentBatch.originalText += '\n\n' + chunk.originalText;
      currentBatch.combinedLength = wouldBe;
    } else {
      // Start new batch
      if (currentBatch.textNodes.length > 0) {
        optimized.push(currentBatch);
      }
      currentBatch = {
        parents: [chunk.parent],
        textNodes: chunk.textNodes,
        originalText: chunk.originalText,
        combinedLength: chunkLength
      };
    }
  }
  
  // Don't forget last batch
  if (currentBatch.textNodes.length > 0) {
    optimized.push(currentBatch);
  }
  
  if (CONFIG.DEBUG) {
    console.log(`[KlarText Smart Chunking] Optimized ${chunks.length} chunks → ${optimized.length} combined chunks`);
    console.log(`[KlarText Smart Chunking] Reduction: ${((1 - optimized.length / chunks.length) * 100).toFixed(1)}%`);
  }
  
  return optimized;
}

/**
 * Call the KlarText API to simplify text(s)
 * Uses batch endpoint if available, falls back to single endpoint
 */
async function callAPI(texts, targetLanguage) {
  const url = `${CONFIG.API_ENDPOINT}${CONFIG.API_ROUTES.SIMPLIFY_BATCH}`;
  
  if (CONFIG.DEBUG) {
    console.log(`[KlarText] Calling API: ${url}`);
    console.log(`[KlarText] Texts to simplify: ${texts.length}`);
    console.log(`[KlarText] Target language: ${targetLanguage}`);
  }
  
  try {
    // Check if user has cancelled before making request
    if (userCancellationController?.signal.aborted) {
      throw new Error('Simplification cancelled by user');
    }
    
    // Create a fresh timeout controller for THIS batch only
    // This prevents one timeout from affecting subsequent batches
    const batchTimeoutController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      batchTimeoutController.abort();
    }, CONFIG.REQUEST_TIMEOUT);
    
    // Combine both abort signals: user cancellation OR timeout
    // This allows the fetch to be aborted by either condition
    const combinedSignal = userCancellationController 
      ? AbortSignal.any([userCancellationController.signal, batchTimeoutController.signal])
      : batchTimeoutController.signal;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: texts,
        target_lang: targetLanguage || CONFIG.DEFAULT_LANG,
        level: CONFIG.DEFAULT_LEVEL,
      }),
      signal: combinedSignal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMsg = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch (e) {
        // Could not parse error response
      }
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    if (CONFIG.DEBUG) {
      console.log(`[KlarText] API response:`, data);
      console.log(`[KlarText] Response has ${data.results?.length || 0} results`);
    }
    
    // Handle batch response format
    if (data.results && Array.isArray(data.results)) {
      const mapped = data.results.map(r => ({
        simplified_text: r.simplified_text,
        error: r.error,
      }));
      if (CONFIG.DEBUG) {
        console.log(`[KlarText] Mapped results:`, mapped);
        console.log(`[KlarText] First result:`, mapped[0]);
      }
      return mapped;
    }
    
    // Fallback: single simplify response
    if (data.simplified_text) {
      return [{ simplified_text: data.simplified_text, error: null }];
    }
    
    throw new Error('Unexpected API response format');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // Check which signal caused the abort
      if (userCancellationController?.signal.aborted) {
        throw new Error('Simplification cancelled by user');
      } else {
        throw new Error('Request timed out. The page may be too large.');
      }
    }
    throw error;
  }
}

/**
 * Process chunks in batches and call API with detailed progress tracking
 */
async function simplifyInBatches(chunks, targetLanguage) {
  const results = [];
  const totalBatches = Math.ceil(chunks.length / CONFIG.MAX_BATCH_SIZE);
  const totalChunks = chunks.length;
  let completedChunks = 0;
  let successfulBatches = 0;
  let failedBatches = 0;
  let batchTimes = [];
  
  // Extract domain for progress messages
  let domain = 'this page';
  try {
    domain = new URL(window.location.href).hostname;
  } catch (e) {
    // Use fallback
  }
  
  for (let i = 0; i < chunks.length; i += CONFIG.MAX_BATCH_SIZE) {
    // Check if user has cancelled before processing next batch
    if (userCancellationController?.signal.aborted) {
      throw new Error('Simplification cancelled by user');
    }
    
    const batch = chunks.slice(i, i + CONFIG.MAX_BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.MAX_BATCH_SIZE) + 1;
    
    // Calculate progress percentage based on completed chunks
    const progressPercent = Math.round((completedChunks / totalChunks) * 100);
    
    // Estimate remaining time based on average batch time
    let estimatedSeconds = null;
    if (batchTimes.length > 0 && batchNum < totalBatches) {
      const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const remainingBatches = totalBatches - batchNum + 1;
      estimatedSeconds = Math.ceil(avgBatchTime * remainingBatches);
    }
    
    // Send structured progress update
    try {
      chrome.runtime.sendMessage({
        type: 'PROGRESS_UPDATE',
        status: 'processing',
        pageInfo: {
          domain: domain,
          title: document.title,
          url: window.location.href
        },
        progress: {
          percent: progressPercent,
          current: batchNum,
          total: totalBatches,
          eta: estimatedSeconds,
          message: `Processing batch ${batchNum} of ${totalBatches}`
        },
        message: `Processing batch ${batchNum} of ${totalBatches}`
      });
    } catch (e) {
      // Non-critical, continue
      if (CONFIG.DEBUG) {
        console.log('[KlarText] Could not send progress update:', e);
      }
    }
    
    // Extract texts from chunks
    const texts = batch.map(chunk => chunk.originalText);
    
    const batchStartTime = Date.now();
    
    try {
      // Call API with target language
      const apiResults = await callAPI(texts, targetLanguage);
      successfulBatches++;
      
      const batchTime = (Date.now() - batchStartTime) / 1000;
      batchTimes.push(batchTime);
      
      if (CONFIG.DEBUG) {
        console.log(`[KlarText] Batch ${batchNum}/${totalBatches} completed in ${batchTime.toFixed(1)}s`);
      }
      
      // Match results back to chunks
      for (let j = 0; j < batch.length; j++) {
        const simplified = apiResults[j]?.simplified_text || null;
        const error = apiResults[j]?.error || null;
        
        results.push({
          chunk: batch[j],
          simplified: simplified,
          error: error,
        });
        
        if (simplified && !error) {
          completedChunks++;
        }
      }
      
      // Send updated progress after batch completion
      const newProgressPercent = Math.round((completedChunks / totalChunks) * 100);
      try {
        chrome.runtime.sendMessage({
          type: 'PROGRESS_UPDATE',
          status: 'processing',
          pageInfo: {
            domain: domain,
            title: document.title,
            url: window.location.href
          },
          progress: {
            percent: newProgressPercent,
            current: batchNum,
            total: totalBatches,
            eta: estimatedSeconds,
            message: `Batch ${batchNum} complete`
          },
          message: `Batch ${batchNum} of ${totalBatches} complete`
        });
      } catch (e) {
        // Non-critical
        if (CONFIG.DEBUG) {
          console.log('[KlarText] Could not send progress update:', e);
        }
      }
      
    } catch (error) {
      failedBatches++;
      console.error(`[KlarText] Batch ${batchNum} failed:`, error);
      
      // Mark all chunks in this batch as failed
      for (const chunk of batch) {
        results.push({
          chunk,
          simplified: null,
          error: error.message,
        });
      }
    }
  }
  
  if (CONFIG.DEBUG) {
    console.log(`[KlarText] Batches: ${successfulBatches} successful, ${failedBatches} failed`);
  }
  
  return results;
}

/**
 * Update text nodes with simplified text
 * Handles both single chunks and combined chunks (from smart chunking)
 */
function updateTextNodes(results) {
  let successCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    if (result.simplified && !result.error) {
      const { chunk, simplified } = result;
      
      // Check if this is a combined chunk (has multiple parents)
      const isCombinedChunk = Array.isArray(chunk.parents) && chunk.parents.length > 0;
      
      if (isCombinedChunk) {
        // Combined chunk - split simplified text and update each parent
        // The API should return text with same structure (separated by \n\n)
        const simplifiedSections = simplified.split('\n\n');
        
        try {
          for (let i = 0; i < chunk.parents.length && i < simplifiedSections.length; i++) {
            const parent = chunk.parents[i];
            parent.textContent = simplifiedSections[i].trim();
            parent.dataset.klartextSimplified = '1';
            parent.dataset.klartextOriginal = chunk.originalText; // Store full original for restore
          }
          successCount += chunk.parents.length;
        } catch (error) {
          console.error('[KlarText] Failed to update combined chunk:', error);
          failCount++;
        }
      } else {
        // Single chunk - update single parent
        try {
          chunk.parent.textContent = simplified;
          chunk.parent.dataset.klartextSimplified = '1';
          chunk.parent.dataset.klartextOriginal = chunk.originalText;
          successCount++;
        } catch (error) {
          console.error('[KlarText] Failed to update element:', error);
          failCount++;
        }
      }
    } else {
      failCount++;
      if (CONFIG.DEBUG && result.error) {
        console.error(`[KlarText] Chunk failed:`, result.error);
      }
    }
  }
  
  return { successCount, failCount };
}

// Store selection listener and languages globally for cleanup
let selectionListener = null;
let selectionLanguages = { source: 'en', target: 'en' };

/**
 * Show selection dialog prompting user to select text
 */
function showSelectionDialog(sourceLanguage = 'en', targetLanguage = 'en') {
  // Store languages for when selection happens
  selectionLanguages = { source: sourceLanguage, target: targetLanguage };
  
  // Check if dialog already exists
  if (document.getElementById('klartext-selection-dialog')) {
    return;
  }
  
  const dialog = document.createElement('div');
  dialog.id = 'klartext-selection-dialog';
  
  // Get icon URL from extension
  const iconUrl = chrome.runtime.getURL('icons/selecttext.png');
  
  dialog.innerHTML = `
    <button class="klartext-dialog-close" aria-label="Close">×</button>
    <img src="${iconUrl}" class="klartext-dialog-icon" alt="Select text">
    <div class="klartext-dialog-content">
      <div class="klartext-dialog-title">Highlight the text you want to simplify</div>
      <div class="klartext-dialog-subtitle">Simplification will start automatically</div>
    </div>
  `;
  
  // Non-blocking notification banner at top of screen
  dialog.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 500px;
    width: 90%;
    display: flex;
    align-items: center;
    gap: 16px;
    pointer-events: auto;
    animation: slideDown 0.3s ease-out;
  `;
  
  // Add slide-down animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  const icon = dialog.querySelector('.klartext-dialog-icon');
  icon.style.cssText = `
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    object-fit: contain;
  `;
  
  const content = dialog.querySelector('.klartext-dialog-content');
  content.style.cssText = `
    flex: 1;
    text-align: left;
  `;
  
  const title = dialog.querySelector('.klartext-dialog-title');
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    color: hsl(220 20% 20%);
    margin: 0 0 4px 0;
  `;
  
  const subtitle = dialog.querySelector('.klartext-dialog-subtitle');
  subtitle.style.cssText = `
    font-size: 14px;
    color: hsl(220 20% 50%);
    margin: 0;
  `;
  
  const closeBtn = dialog.querySelector('.klartext-dialog-close');
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 28px;
    color: hsl(220 20% 50%);
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    transition: color 0.2s;
    flex-shrink: 0;
    margin-left: auto;
  `;
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = 'hsl(220 20% 20%)';
  });
  
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = 'hsl(220 20% 50%)';
  });
  
  closeBtn.addEventListener('click', () => {
    dialog.remove();
    
    // Remove selection listener if exists
    if (selectionListener) {
      document.removeEventListener('mouseup', selectionListener);
      selectionListener = null;
    }
    
    // Reset selection prompt state (defined globally at top of listener)
    if (typeof selectionPromptShown !== 'undefined') {
      selectionPromptShown = false;
    }
    
    // Notify sidepanel that dialog was dismissed
    try {
      chrome.runtime.sendMessage({
        type: 'PROGRESS_UPDATE',
        status: 'idle',
        message: ''
      });
    } catch (e) {
      // Ignore
    }
  });
  
  document.body.appendChild(dialog);
  
  // Set up automatic selection detection
  selectionListener = function(event) {
    const selection = window.getSelection();
    const selectedText = selection?.toString()?.trim() || '';
    
    if (selectedText && selectedText.length >= CONFIG.MIN_SELECTION_LENGTH) {
      if (CONFIG.DEBUG) {
        console.log('[KlarText] Text selected automatically, starting simplification');
        console.log('[KlarText] Selected text length:', selectedText.length);
      }
      
      // Hide dialog
      hideSelectionDialog();
      
      // Remove this listener
      document.removeEventListener('mouseup', selectionListener);
      selectionListener = null;
      
      // Reset prompt state
      if (typeof selectionPromptShown !== 'undefined') {
        selectionPromptShown = false;
      }
      
      // Start simplification automatically
      simplifyPage('selection', selectionLanguages.source, selectionLanguages.target);
    }
  };
  
  // Listen for text selection (mouseup event)
  document.addEventListener('mouseup', selectionListener);
  
  // Auto-cleanup listener after 60 seconds
  setTimeout(() => {
    if (selectionListener) {
      document.removeEventListener('mouseup', selectionListener);
      selectionListener = null;
      hideSelectionDialog();
    }
  }, 60000);
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Selection dialog shown with automatic detection');
  }
}

/**
 * Hide selection dialog
 */
function hideSelectionDialog() {
  const dialog = document.getElementById('klartext-selection-dialog');
  if (dialog) {
    dialog.remove();
  }
  
  // Clean up selection listener if exists
  if (selectionListener) {
    document.removeEventListener('mouseup', selectionListener);
    selectionListener = null;
  }
}

/**
 * Send progress message to sidepanel (non-blocking)
 */
function showLoading(message = 'Simplifying page text...') {
  // Send message to sidepanel to update status
  try {
    chrome.runtime.sendMessage({
      type: 'PROGRESS_UPDATE',
      status: 'processing',
      message: message
    });
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Could not send progress to sidepanel:', error);
    }
  }
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText Progress]', message);
  }
}

/**
 * Update progress message in sidepanel
 */
function updateProgress(message) {
  showLoading(message);
}

/**
 * Send completion message to sidepanel
 */
function hideLoading() {
  // Notify sidepanel that processing is complete
  try {
    chrome.runtime.sendMessage({
      type: 'PROGRESS_UPDATE',
      status: 'idle',
      message: ''
    });
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Could not send completion to sidepanel:', error);
    }
  }
}

/**
 * Show error message (non-blocking banner + sidepanel notification)
 */
function showError(message) {
  // Send error to sidepanel
  try {
    chrome.runtime.sendMessage({
      type: 'PROGRESS_UPDATE',
      status: 'error',
      message: message
    });
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Could not send error to sidepanel:', error);
    }
  }
  
  // Show non-blocking error banner on page
  const errorDiv = document.createElement('div');
  errorDiv.id = 'klartext-error-banner';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(0 70% 45%);
    color: white;
    padding: 16px 24px;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 18px;
    z-index: 1000000;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

/**
 * Show success message (non-blocking banner + sidepanel notification)
 */
function showSuccess(message) {
  // Send success to sidepanel
  try {
    chrome.runtime.sendMessage({
      type: 'PROGRESS_UPDATE',
      status: 'complete',
      message: message
    });
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Could not send success to sidepanel:', error);
    }
  }
  
  // Show non-blocking success banner on page
  const successDiv = document.createElement('div');
  successDiv.id = 'klartext-success-banner';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: hsl(120 50% 35%);
    color: white;
    padding: 16px 24px;
    border-radius: 4px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 18px;
    z-index: 1000000;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(successDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

/**
 * Show "Restore Original" button - DEPRECATED
 * Restore button is now in sidepanel, not on page
 */
function showRestoreButton() {
  // No-op: Button now shown in sidepanel instead
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Restore button now handled by sidepanel');
  }
}

/**
 * Hide "Restore Original" button - DEPRECATED
 * Restore button is now in sidepanel, not on page
 */
function hideRestoreButton() {
  // No-op: Button now handled by sidepanel
}

/**
 * Main function - simplify all text on the page
 * @param {string} mode - 'page' or 'selection'
 * @param {string} sourceLanguage - Source language code (e.g. 'en', 'de')
 * @param {string} targetLanguage - Target language code (e.g. 'en', 'de')
 */
async function simplifyPage(mode = 'page', sourceLanguage = 'en', targetLanguage = 'en') {
  // Re-entry guard: Prevent overlapping simplifications
  if (isSimplificationActive) {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Ignoring new simplification request - one is already active');
    }
    showError('A simplification is already in progress. Please wait or cancel it first.');
    return;
  }
  
  // Set active flag and create cancellation controller
  isSimplificationActive = true;
  const startTime = Date.now();
  const errorLog = [];
  
  // Create fresh cancellation controller for this simplification run
  // This allows user to cancel via sidepanel in future implementation
  userCancellationController = new AbortController();
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Starting page simplification...');
    console.log('[KlarText] Mode:', mode, 'Source:', sourceLanguage, 'Target:', targetLanguage);
  }
  
  // Capture errors - save original console.error to restore later
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0]?.includes?.('[KlarText]')) {
      errorLog.push({
        timestamp: new Date().toISOString(),
        message: args.map(a => String(a)).join(' '),
      });
    }
    originalConsoleError.apply(console, args);
  };
  
  try {
    // Handle selection mode
    if (mode === 'selection') {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim() || '';
      
      if (!selectedText || selectedText.length < CONFIG.MIN_SELECTION_LENGTH) {
        hideLoading();
        showError(`Please select at least ${CONFIG.MIN_SELECTION_LENGTH} characters of text to simplify.`);
        return;
      }
      
      if (CONFIG.DEBUG) {
        console.log('[KlarText] Selected text:', selectedText.substring(0, 100) + '...');
        console.log('[KlarText] Selected text length:', selectedText.length);
      }
      
      // Send progress update - processing
      try {
        chrome.runtime.sendMessage({
          type: 'PROGRESS_UPDATE',
          status: 'processing',
          pageInfo: {
            domain: new URL(window.location.href).hostname,
            title: document.title,
            url: window.location.href
          },
          progress: {
            percent: 50,
            current: 1,
            total: 1,
            eta: null,
            message: 'Simplifying selected text'
          },
          message: 'Simplifying selected text...',
          buttonId: 'simplify-selection'
        });
      } catch (e) {
        // Non-critical
      }
      
      try {
        const apiResult = await callAPI([selectedText], targetLanguage);
        const simplified = apiResult[0]?.simplified_text;
        
        if (simplified) {
          // Replace selected text with simplified version
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(simplified);
          range.insertNode(textNode);
          
          // Send completion update
          try {
            chrome.runtime.sendMessage({
              type: 'PROGRESS_UPDATE',
              status: 'complete',
              message: '✓ Simplified selected text',
              buttonId: 'simplify-selection'
            });
          } catch (e) {
            // Non-critical
          }
          
          if (CONFIG.DEBUG) {
            console.log('[KlarText] Selection simplified successfully');
          }
        } else {
          // Send error update
          try {
            chrome.runtime.sendMessage({
              type: 'PROGRESS_UPDATE',
              status: 'error',
              message: 'Failed to simplify selected text',
              buttonId: 'simplify-selection'
            });
          } catch (e) {
            // Non-critical
          }
        }
      } catch (error) {
        console.error('[KlarText] Selection simplification failed:', error);
        // Send error update
        try {
          chrome.runtime.sendMessage({
            type: 'PROGRESS_UPDATE',
            status: 'error',
            message: 'Failed to simplify selected text: ' + error.message,
            buttonId: 'simplify-selection'
          });
        } catch (e) {
          // Non-critical
        }
      }
      
      return; // Exit early for selection mode
    }
    
    // Page mode: Show loading
    showLoading('Analyzing page...');
    
    // Phase 1: Collect and optimize text chunks
    const rawChunks = collectTextChunks();
    
    if (rawChunks.length === 0) {
      hideLoading();
      showError('No text found to simplify on this page.');
      return;
    }
    
    // Apply smart chunking optimization
    const optimizationStartTime = Date.now();
    const chunks = optimizeChunks(rawChunks);
    const optimizationTime = Date.now() - optimizationStartTime;
    
    // Log Phase 1 metrics
    const metrics = {
      phase: 'smart-chunking',
      rawChunks: rawChunks.length,
      optimizedChunks: chunks.length,
      reductionPercent: ((1 - chunks.length / rawChunks.length) * 100).toFixed(1),
      optimizationTimeMs: optimizationTime,
      estimatedBatches: Math.ceil(chunks.length / CONFIG.MAX_BATCH_SIZE),
      originalBatches: Math.ceil(rawChunks.length / CONFIG.MAX_BATCH_SIZE)
    };
    
    console.log('[KlarText Performance - Phase 1]', JSON.stringify(metrics, null, 2));
    
    // Simplify in batches
    showLoading(`Simplifying ${chunks.length} text sections...`);
    const batchStartTime = Date.now();
    const results = await simplifyInBatches(chunks, targetLanguage);
    const batchEndTime = Date.now();
    
    // Update page
    showLoading('Updating page...');
    const { successCount, failCount } = updateTextNodes(results);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    const apiTime = (batchEndTime - batchStartTime) / 1000;
    
    // Hide loading
    hideLoading();
    
    // Log summary with Phase 1 metrics comparison
    const summary = {
      totalChunks: chunks.length,
      successCount,
      failCount,
      totalTime: `${totalTime.toFixed(1)}s`,
      apiTime: `${apiTime.toFixed(1)}s`,
      // Phase 1 metrics
      phase1_rawChunks: metrics.rawChunks,
      phase1_optimizedChunks: metrics.optimizedChunks,
      phase1_reduction: `${metrics.reductionPercent}%`,
      phase1_batchesSaved: metrics.originalBatches - metrics.estimatedBatches
    };
    
    console.log('[KlarText] Summary:', summary);
    console.log(`[KlarText Phase 1 Impact] Smart chunking reduced API calls by ${metrics.reductionPercent}% (${metrics.originalBatches} batches → ${metrics.estimatedBatches} batches)`);
    
    // Show result first
    if (successCount > 0) {
      showSuccess(`✓ Simplified ${successCount} text section(s) in ${totalTime.toFixed(0)}s. Refresh to restore.`);
      // Show "Restore Original" button in lower right corner
      showRestoreButton();
    } else {
      showError(`Failed to simplify text. ${failCount} section(s) failed.`);
    }
    
    if (CONFIG.DEBUG) {
      console.log(`[KlarText] Done! Success: ${successCount}, Failed: ${failCount}, Errors logged: ${errorLog.length}`);
    }
    
  } catch (error) {
    hideLoading();
    
    // Check if it was cancelled (user clicked cancel button)
    if (error.message?.includes('cancelled by user')) {
      if (CONFIG.DEBUG) {
        console.log('[KlarText] Simplification was cancelled by user');
      }
      // Send idle status to reset sidepanel UI
      try {
        chrome.runtime.sendMessage({
          type: 'PROGRESS_UPDATE',
          status: 'error',
          message: 'Simplification cancelled'
        });
      } catch (e) {
        // Non-critical
      }
      return;
    }
    
    console.error('[KlarText] Simplification failed:', error);
    
    // User-friendly error messages
    let errorMsg = 'Simplification failed. ';
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMsg += 'Cannot reach KlarText API. Make sure it\'s running at localhost:8000';
    } else if (error.message.includes('timed out')) {
      errorMsg += 'Request timed out. Try refreshing and simplifying again.';
    } else {
      errorMsg += error.message;
    }
    
    showError(errorMsg);
  } finally {
    // CRITICAL: Restore original console.error to avoid polluting the page's global scope
    console.error = originalConsoleError;
    
    // Clean up cancellation controller
    userCancellationController = null;
    
    // Clear active flag to allow future simplifications
    isSimplificationActive = false;
  }
}

// Listen for simplification start message from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SIMPLIFICATION') {
    const { mode, sourceLanguage, targetLanguage } = message;
    
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Received START_SIMPLIFICATION message');
      console.log('[KlarText] Mode:', mode, 'Source:', sourceLanguage, 'Target:', targetLanguage);
    }
    
    // Handle selection mode with automatic detection
    if (mode === 'selection') {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim() || '';
      
      // If text is already selected, start immediately
      if (selectedText && selectedText.length >= CONFIG.MIN_SELECTION_LENGTH) {
        if (CONFIG.DEBUG) {
          console.log('[KlarText] Text already selected, starting immediately');
        }
        simplifyPage(mode, sourceLanguage, targetLanguage);
        sendResponse({ ok: true });
        return true;
      }
      
      // No text selected - show dialog and wait for selection
      if (CONFIG.DEBUG) {
        console.log('[KlarText] No text selected - showing selection dialog');
      }
      showSelectionDialog(sourceLanguage, targetLanguage);
      sendResponse({ ok: true });
      return true;
    } else {
      // Page mode: start immediately
      simplifyPage(mode, sourceLanguage, targetLanguage);
      sendResponse({ ok: true });
    }
  }
  
  // Handle cancellation
  if (message.type === 'CANCEL_SIMPLIFICATION') {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Cancellation requested');
    }
    
    // Abort any ongoing API requests
    if (userCancellationController) {
      userCancellationController.abort();
      // Don't set to null yet - let the simplification's finally block clean it up
    }
    
    // Hide any dialogs
    hideSelectionDialog();
    hideLoading();
    hideRestoreButton();
    
    // DON'T reset isSimplificationActive here!
    // Let the original simplification's finally block do it
    // This prevents new operations from starting while the cancelled one is still cleaning up
    
    sendResponse({ ok: true });
  }
  
  // Handle restore original text
  if (message.type === 'RESTORE_ORIGINAL') {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Restore original requested - reloading page');
    }
    
    // Reload the page to restore original content
    window.location.reload();
    
    sendResponse({ ok: true });
  }
  
  // Handle show selection dialog
  if (message.type === 'SHOW_SELECTION_DIALOG') {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Show selection dialog requested');
    }
    
    // Use stored languages from previous selection or defaults
    showSelectionDialog(selectionLanguages.source, selectionLanguages.target);
    
    sendResponse({ ok: true });
  }
  
  return true;
});

// Navigation detection - cleanup UI when navigating away
try {
  // Detect page unload
  window.addEventListener('beforeunload', () => {
    hideLoading();
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Page unloading, cleaning up UI');
    }
  });
  
  // Detect SPA navigation (history.pushState/replaceState)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    hideLoading();
    if (CONFIG.DEBUG) {
      console.log('[KlarText] SPA navigation detected (pushState), cleaning up UI');
    }
    return originalPushState.apply(this, args);
  };
  
  history.replaceState = function(...args) {
    hideLoading();
    if (CONFIG.DEBUG) {
      console.log('[KlarText] SPA navigation detected (replaceState), cleaning up UI');
    }
    return originalReplaceState.apply(this, args);
  };
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Navigation detection initialized');
  }
} catch (error) {
  console.error('[KlarText] Failed to initialize navigation detection:', error);
}
