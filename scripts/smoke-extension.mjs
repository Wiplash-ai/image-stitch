import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(import.meta.dirname, "..");
const extensionPath = resolve(root, "artifacts/glassware-extension");
const manifest = JSON.parse(await readFile(resolve(extensionPath, "manifest.json"), "utf8"));
const executablePath = process.env.GLASSWARE_EXTENSION_CHROME
  || "/home/jordanculver/.local/opt/browseros/usr/lib/browseros/browseros";
const profile = await mkdtemp(resolve(tmpdir(), "glassware-extension-smoke-"));
const sourceHtml = `<!doctype html><html><body style="margin:0;background:#f7f7f5;font:28px Arial"><main style="padding:80px"><h1>GlassWare capture fixture</h1><p>Visible-page capture keeps this source editable.</p></main></body></html>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(sourceHtml);
});
await new Promise((resolvePromise, reject) => server.listen(0, "127.0.0.1", (error) => error ? reject(error) : resolvePromise()));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Extension smoke server did not bind to a TCP port.");

let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless: true,
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--enable-unsafe-extension-debugging",
      "--no-sandbox",
      "--disable-gpu",
    ],
  });
  const browser = context.browser();
  if (!browser) throw new Error("Extension smoke could not access the Chromium browser session.");
  const browserSession = await browser.newBrowserCDPSession();
  const installed = await browserSession.send("Extensions.getExtensions");
  const extension = installed.extensions.find((item) => item.name === manifest.name && item.version === manifest.version);
  assert(extension?.enabled, "GlassWare was not enabled in the isolated Chromium profile");

  const initialTargets = await browserSession.send("Target.getTargets");
  const initialPage = initialTargets.targetInfos.find((target) => target.type === "page");
  assert(initialPage?.browserContextId, "the isolated Chromium tab context was not available");
  const { tab } = await browserSession.send("Browser.createTab", {
    url: `http://127.0.0.1:${address.port}/`,
    browserContextId: initialPage.browserContextId,
  });
  const source = await waitForPage(context, (page) => page.url() === `http://127.0.0.1:${address.port}/`);
  await source.waitForLoadState("networkidle");
  await source.bringToFront();
  const capture = await source.screenshot({ type: "png" });
  await browserSession.send("Browser.createTab", {
    url: `chrome-extension://${extension.id}/popup.html`,
    browserContextId: initialPage.browserContextId,
  });
  const popup = await waitForPage(context, (page) => page.url() === `chrome-extension://${extension.id}/popup.html`);
  await popup.evaluate(async (values) => {
    await chrome.storage.local.set(values);
  }, {
      "glassware.pendingCapture.v1": {
        dataUrl: `data:image/png;base64,${capture.toString("base64")}`,
        sourceUrl: source.url(),
        capturedAt: new Date().toISOString(),
      },
  });
  await popup.close();
  await browserSession.send("Browser.createTab", {
    url: `chrome-extension://${extension.id}/app/app.html`,
    browserContextId: initialPage.browserContextId,
  });

  const editor = await waitForPage(context, (page) => page.url() === `chrome-extension://${extension.id}/app/app.html`);
  await editor.locator(".workbench").waitFor();
  await editor.getByText(/Revision 2/).waitFor();
  await editor.getByRole("button", { name: "Layers", exact: true }).click();
  await editor.getByText("Browser capture.png", { exact: true }).first().waitFor();
  const storage = await editor.evaluate(async () => chrome.storage.local.get("glassware.pendingCapture.v1"));
  assert(!storage["glassware.pendingCapture.v1"], "the pending capture should be consumed exactly once");

  const projectName = editor.getByRole("textbox", { name: "Project" });
  await projectName.fill("Browser extension verification");
  await projectName.press("Enter");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await editor.reload({ waitUntil: "networkidle" });
  await editor.locator(".workbench").waitFor();
  assert(await projectName.inputValue() === "Browser extension verification", "the packaged editor did not restore its local project");

  await editor.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = editor.waitForEvent("download");
  await editor.getByRole("button", { name: "Download PNG", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const firstChunk = await new Promise((resolvePromise, reject) => {
    stream.once("data", resolvePromise);
    stream.once("error", reject);
  });
  assert(Buffer.from(firstChunk).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "the extension export was not a PNG");

  console.log(`GlassWare extension smoke passed in isolated Chromium: ${extension.id}, packaged pending-capture import, local restore, and PNG export.`);
} finally {
  await context?.close();
  await new Promise((resolvePromise) => server.close(resolvePromise));
  await rm(profile, { recursive: true, force: true });
}

async function waitForPage(context, predicate) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const page = context.pages().find(predicate);
    if (page) return page;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error("The packaged GlassWare editor page did not open.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
