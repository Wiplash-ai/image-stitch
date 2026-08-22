const CAPTURE_KEY = "glassware.pendingCapture.v1";
const EDITOR_TAB_KEY = "glassware.editorTab.v1";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus.removeAll().then(() => {
    chrome.contextMenus.create({
      id: "glassware-capture-page",
      title: "Capture page with GlassWare",
      contexts: ["page"],
    });
  });
});

async function openEditor() {
  const editorUrl = chrome.runtime.getURL("app/app.html");
  const stored = await chrome.storage.session.get(EDITOR_TAB_KEY);
  const tabId = stored[EDITOR_TAB_KEY];
  if (Number.isInteger(tabId)) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url?.startsWith(editorUrl)) {
        await chrome.tabs.update(tabId, { active: true });
        if (Number.isInteger(tab.windowId)) await chrome.windows.update(tab.windowId, { focused: true });
        return tab;
      }
    } catch {
      // The previous editor tab was closed.
    }
  }
  const tab = await chrome.tabs.create({ url: editorUrl });
  if (Number.isInteger(tab.id)) await chrome.storage.session.set({ [EDITOR_TAB_KEY]: tab.id });
  return tab;
}

chrome.action.onClicked.addListener(() => {
  void openEditor();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.get(EDITOR_TAB_KEY).then((stored) => {
    if (stored[EDITOR_TAB_KEY] === tabId) return chrome.storage.session.remove(EDITOR_TAB_KEY);
    return undefined;
  });
});

async function captureAndOpen(tab) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  await chrome.storage.local.set({
    [CAPTURE_KEY]: { dataUrl, sourceUrl: tab.url, capturedAt: new Date().toISOString() },
  });
  await openEditor();
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "glassware-capture-page") return;
  if (!tab?.id) return;
  void captureAndOpen(tab);
});
