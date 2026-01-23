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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
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
      signal: controller.signal,
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
      throw new Error('Request timed out. The page may be too large.');
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
    const batch = chunks.slice(i, i + CONFIG.MAX_BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.MAX_BATCH_SIZE) + 1;
    
    // Calculate progress percentage based on completed chunks
    const progressPercent = Math.round((completedChunks / totalChunks) * 100);
    
    // Estimate remaining time based on average batch time
    let etaText = '';
    if (batchTimes.length > 0 && batchNum < totalBatches) {
      const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const remainingBatches = totalBatches - batchNum + 1;
      const estimatedSeconds = Math.ceil(avgBatchTime * remainingBatches);
      etaText = ` ~${estimatedSeconds}s remaining`;
    }
    
    // Show detailed progress
    updateProgress(`[${domain}] Batch ${batchNum}/${totalBatches} (${progressPercent}% - ${completedChunks}/${totalChunks} chunks)${etaText}...`);
    
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
      
      // Show progress after batch completion
      const newProgressPercent = Math.round((completedChunks / totalChunks) * 100);
      updateProgress(`[${domain}] Batch ${batchNum}/${totalBatches} complete (${newProgressPercent}% - ${completedChunks}/${totalChunks} chunks)`);
      
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
 */
function updateTextNodes(results) {
  let successCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    if (result.simplified && !result.error) {
      const { chunk, simplified } = result;
      
      // Replace the text content of the parent element
      // This is simpler than trying to update individual text nodes
      // and preserves the HTML structure
      try {
        chunk.parent.textContent = simplified;
        chunk.parent.dataset.klartextSimplified = '1';
        chunk.parent.dataset.klartextOriginal = chunk.originalText;
        successCount++;
      } catch (error) {
        console.error('[KlarText] Failed to update element:', error);
        failCount++;
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
 * Show "Restore Original" button in lower right corner
 */
function showRestoreButton() {
  // Check if button already exists
  if (document.getElementById('klartext-restore-button')) {
    return;
  }
  
  const restoreBtn = document.createElement('button');
  restoreBtn.id = 'klartext-restore-button';
  restoreBtn.innerHTML = '🔄 Restore Original';
  restoreBtn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: hsl(174 50% 35%);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    z-index: 1000000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
  `;
  
  // Hover effect
  restoreBtn.addEventListener('mouseenter', () => {
    restoreBtn.style.background = 'hsl(174 50% 30%)';
    restoreBtn.style.transform = 'translateY(-2px)';
    restoreBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  });
  
  restoreBtn.addEventListener('mouseleave', () => {
    restoreBtn.style.background = 'hsl(174 50% 35%)';
    restoreBtn.style.transform = 'translateY(0)';
    restoreBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });
  
  // Click handler - reload page to restore original
  restoreBtn.addEventListener('click', () => {
    if (CONFIG.DEBUG) {
      console.log('[KlarText] Restoring original content by reloading page');
    }
    window.location.reload();
  });
  
  document.body.appendChild(restoreBtn);
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Restore button added');
  }
}

/**
 * Hide "Restore Original" button
 */
function hideRestoreButton() {
  const restoreBtn = document.getElementById('klartext-restore-button');
  if (restoreBtn) {
    restoreBtn.remove();
  }
}

/**
 * Save results and logs to downloadable JSON file
 */
function saveResultsToFile(results, metadata, errorLog = []) {
  try {
    // Separate successful and failed results
    const successful = results.filter(r => r.simplified && !r.error);
    const failed = results.filter(r => !r.simplified || r.error);
    
    const data = {
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        successfulCount: successful.length,
        failedCount: failed.length,
        errorCount: errorLog.length,
      },
      errors: errorLog,
      successfulResults: successful.map(r => ({
        originalText: r.chunk?.originalText?.substring(0, 200) + '...' || '',
        simplifiedText: r.simplified?.substring(0, 200) + '...' || '',
        elementTag: r.chunk?.parent?.tagName?.toLowerCase() || 'unknown',
      })),
      failedResults: failed.map(r => ({
        originalText: r.chunk?.originalText?.substring(0, 200) + '...' || '',
        error: r.error || 'Unknown error',
        elementTag: r.chunk?.parent?.tagName?.toLowerCase() || 'unknown',
      })),
    };
    
    console.log('[KlarText] Creating download with', results.length, 'results...');
    console.log('[KlarText] Successful:', successful.length, 'Failed:', failed.length);
    
    // Create downloadable JSON
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const filename = `klartext-results-${Date.now()}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    
    // Try to trigger download
    console.log('[KlarText] Triggering download:', filename);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('[KlarText] ✓ Results saved to:', filename);
    
    const message = `Results saved to Downloads folder:\n${filename}\n\n` +
      `✓ Successful: ${successful.length}\n` +
      `✗ Failed: ${failed.length}\n` +
      `📊 File size: ${(blob.size / 1024).toFixed(1)} KB`;
    
    alert(message);
    
  } catch (error) {
    console.error('[KlarText] Failed to save results:', error);
    alert('Failed to save results file. Check console for details.');
  }
}

/**
 * Main function - simplify all text on the page
 * @param {string} mode - 'page' or 'selection'
 * @param {string} sourceLanguage - Source language code (e.g. 'en', 'de')
 * @param {string} targetLanguage - Target language code (e.g. 'en', 'de')
 */
async function simplifyPage(mode = 'page', sourceLanguage = 'en', targetLanguage = 'en') {
  const startTime = Date.now();
  const errorLog = [];
  
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
      
      // Simplify the selected text
      showLoading('Simplifying selected text...');
      
      try {
        const apiResult = await callAPI([selectedText], targetLanguage);
        const simplified = apiResult[0]?.simplified_text;
        
        if (simplified) {
          // Replace selected text with simplified version
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(simplified);
          range.insertNode(textNode);
          
          hideLoading();
          showSuccess(`✓ Simplified selected text. Refresh to restore.`);
          showRestoreButton();
          
          if (CONFIG.DEBUG) {
            console.log('[KlarText] Selection simplified successfully');
          }
        } else {
          hideLoading();
          showError('Failed to simplify selected text.');
        }
      } catch (error) {
        hideLoading();
        console.error('[KlarText] Selection simplification failed:', error);
        showError('Failed to simplify selected text: ' + error.message);
      }
      
      return; // Exit early for selection mode
    }
    
    // Page mode: Show loading
    showLoading('Analyzing page...');
    
    // Collect text chunks
    const chunks = collectTextChunks();
    
    if (chunks.length === 0) {
      hideLoading();
      showError('No text found to simplify on this page.');
      return;
    }
    
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
    
    // Log summary
    const summary = {
      totalChunks: chunks.length,
      successCount,
      failCount,
      totalTime: `${totalTime.toFixed(1)}s`,
      apiTime: `${apiTime.toFixed(1)}s`,
    };
    
    console.log('[KlarText] Summary:', summary);
    
    // Show result first
    if (successCount > 0) {
      showSuccess(`✓ Simplified ${successCount} text section(s) in ${totalTime.toFixed(0)}s. Refresh to restore.`);
      // Show "Restore Original" button in lower right corner
      showRestoreButton();
    } else {
      showError(`Failed to simplify text. ${failCount} section(s) failed.`);
    }
    
    // Always save results to file for review
    console.log('[KlarText] Preparing to save results...');
    saveResultsToFile(results, summary, errorLog);
    
    if (CONFIG.DEBUG) {
      console.log(`[KlarText] Done! Success: ${successCount}, Failed: ${failCount}, Errors logged: ${errorLog.length}`);
    }
    
  } catch (error) {
    hideLoading();
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
    
    // Start simplification with language parameters
    simplifyPage(mode, sourceLanguage, targetLanguage);
    
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
