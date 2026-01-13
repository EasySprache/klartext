// MV3 service worker (module)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SIMPLIFY_ACTIVE_TAB") return;

  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ ok: false, error: "NO_ACTIVE_TAB" });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/simplify.js"],
    });

    sendResponse({ ok: true });
  })().catch((err) => {
    sendResponse({ ok: false, error: String(err?.message ?? err) });
  });

  return true;
});
