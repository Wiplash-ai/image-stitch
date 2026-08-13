const status = document.querySelector("#status");

document.querySelector("#capture").addEventListener("click", async () => {
  status.textContent = "Capturing…";
  const result = await chrome.runtime.sendMessage({ type: "imagestitch.capture-visible" });
  if (!result?.ok) status.textContent = result?.error || "Capture failed.";
  else window.close();
});

document.querySelector("#open").addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("app/index.html") });
  window.close();
});
