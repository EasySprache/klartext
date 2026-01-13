const statusEl = document.getElementById("status");
const simplifyBtn = document.getElementById("simplify");

simplifyBtn.addEventListener("click", async () => {
  statusEl.textContent = "Simplifying…";

  const response = await chrome.runtime.sendMessage({
    type: "SIMPLIFY_ACTIVE_TAB",
  });

  if (response?.ok) {
    statusEl.textContent = "Done. Refresh the page to restore.";
  } else {
    statusEl.textContent = `Error: ${response?.error ?? "UNKNOWN"}`;
  }
});
