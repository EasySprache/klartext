/**
 * KlarText Chrome Extension - Content Script
 * 
 * This script runs on web pages and handles text simplification.
 * It collects text nodes, sends them to the KlarText API, and updates the page.
 */

// Load configuration
const CONFIG = {
  API_ENDPOINT: 'http://localhost:8000',
  API_ROUTES: {
    SIMPLIFY: '/v1/simplify',
    SIMPLIFY_BATCH: '/v1/simplify/batch',
  },
  DEFAULT_LANG: 'en',
  DEFAULT_LEVEL: 'easy',
  MAX_BATCH_SIZE: 10,
  MAX_TEXT_LENGTH: 5000,
  MIN_TEXT_LENGTH: 20,
  REQUEST_TIMEOUT: 60000,
  DEBUG: true,
};

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
async function callAPI(texts) {
  const url = `${CONFIG.API_ENDPOINT}${CONFIG.API_ROUTES.SIMPLIFY_BATCH}`;
  
  if (CONFIG.DEBUG) {
    console.log(`[KlarText] Calling API: ${url}`);
    console.log(`[KlarText] Texts to simplify: ${texts.length}`);
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
        target_lang: CONFIG.DEFAULT_LANG,
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
 * Process chunks in batches and call API
 */
async function simplifyInBatches(chunks) {
  const results = [];
  const totalBatches = Math.ceil(chunks.length / CONFIG.MAX_BATCH_SIZE);
  let successfulBatches = 0;
  let failedBatches = 0;
  
  for (let i = 0; i < chunks.length; i += CONFIG.MAX_BATCH_SIZE) {
    const batch = chunks.slice(i, i + CONFIG.MAX_BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.MAX_BATCH_SIZE) + 1;
    
    // Update progress with more detail
    const progressPercent = Math.round((batchNum / totalBatches) * 100);
    updateProgress(`Processing batch ${batchNum}/${totalBatches} (${progressPercent}%)...`);
    
    // Extract texts from chunks
    const texts = batch.map(chunk => chunk.originalText);
    
    const batchStartTime = Date.now();
    
    try {
      // Call API
      const apiResults = await callAPI(texts);
      successfulBatches++;
      
      const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      
      if (CONFIG.DEBUG) {
        console.log(`[KlarText] Batch ${batchNum}/${totalBatches} completed in ${batchTime}s`);
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
 * Show loading overlay
 */
function showLoading(message = 'Simplifying page text...') {
  // Check if overlay already exists
  let overlay = document.getElementById('klartext-loading-overlay');
  if (overlay) {
    // Update message
    const msgEl = overlay.querySelector('.klartext-loading-message');
    if (msgEl) msgEl.textContent = message;
    return;
  }
  
  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'klartext-loading-overlay';
  overlay.innerHTML = `
    <div class="klartext-loading-content">
      <div class="klartext-loading-spinner"></div>
      <div class="klartext-loading-message">${message}</div>
    </div>
  `;
  
  // Add styles inline (fallback if CSS file fails to load)
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  const content = overlay.querySelector('.klartext-loading-content');
  content.style.cssText = `
    background: hsl(45 30% 96%);
    padding: 32px;
    border-radius: 8px;
    text-align: center;
    max-width: 400px;
  `;
  
  const spinner = overlay.querySelector('.klartext-loading-spinner');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid hsl(220 20% 80%);
    border-top-color: hsl(174 50% 35%);
    border-radius: 50%;
    animation: klartext-spin 1s linear infinite;
    margin: 0 auto 16px;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes klartext-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(overlay);
}

/**
 * Update loading progress message
 */
function updateProgress(message) {
  const overlay = document.getElementById('klartext-loading-overlay');
  if (overlay) {
    const msgEl = overlay.querySelector('.klartext-loading-message');
    if (msgEl) msgEl.textContent = message;
  }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById('klartext-loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Show error message
 */
function showError(message) {
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
 * Show success message
 */
function showSuccess(message) {
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
 */
async function simplifyPage() {
  const startTime = Date.now();
  const errorLog = [];
  
  if (CONFIG.DEBUG) {
    console.log('[KlarText] Starting page simplification...');
  }
  
  // Capture errors
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
    // Show loading
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
    const results = await simplifyInBatches(chunks);
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
  }
}

// Run simplification
simplifyPage();
