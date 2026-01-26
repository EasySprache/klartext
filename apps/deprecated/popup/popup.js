/**
 * KlarText Chrome Extension - Popup Script
 * Handles user interaction with the popup UI
 */

const statusEl = document.getElementById("status");
const simplifyBtn = document.getElementById("simplify");

/**
 * Update status message with appropriate styling
 */
function updateStatus(message, type = "info") {
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
 * Disable button during processing
 */
function setButtonState(disabled) {
  simplifyBtn.disabled = disabled;
  if (disabled) {
    simplifyBtn.textContent = "Processing...";
  } else {
    simplifyBtn.innerHTML = '<span class="button-icon">✨</span>Simplify Page Text';
  }
}

/**
 * Handle simplify button click
 */
async function handleSimplify() {
  try {
    // Update UI to loading state
    setButtonState(true);
    updateStatus("Starting simplification...", "loading");
    
    // Send message to service worker to inject content script
    const response = await chrome.runtime.sendMessage({
      type: "SIMPLIFY_ACTIVE_TAB",
    });
    
    // Handle response
    if (response?.ok) {
      updateStatus("✓ Simplification started! Check the page.", "success");
      
      // Close popup after brief delay to allow user to see success message
      // This also ensures permission dialog appears on the page tab, not the popup
      setTimeout(() => {
        window.close();
      }, 500);
    } else {
      const errorMsg = response?.error || "Unknown error occurred";
      updateStatus(`Error: ${errorMsg}`, "error");
      setButtonState(false);
    }
    
  } catch (error) {
    console.error("[KlarText Popup] Error:", error);
    updateStatus("Failed to communicate with extension", "error");
    setButtonState(false);
  }
}

// Add click event listener
simplifyBtn.addEventListener("click", handleSimplify);

// Add keyboard support (Enter key)
simplifyBtn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !simplifyBtn.disabled) {
    handleSimplify();
  }
});

// Set initial state
updateStatus("", "info");
