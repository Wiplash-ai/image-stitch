const CAPTURE_KEY = "glassware.pendingCapture.v1";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "glassware-capture-page",
    title: "Capture page with GlassWare",
    contexts: ["page"],
  });
});

async function captureAndOpen(tab) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  await chrome.storage.local.set({
    [CAPTURE_KEY]: { dataUrl, sourceUrl: tab.url, capturedAt: new Date().toISOString() },
  });
  await chrome.tabs.create({ url: chrome.runtime.getURL("app/app.html") });
}

chrome.contextMenus.onClicked.addListener((_info, tab) => {
  if (!tab?.id) return;
  void captureAndOpen(tab);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "glassware.capture-visible") return false;
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab) throw new Error("No active tab available");
    return captureAndOpen(tab);
  }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});
