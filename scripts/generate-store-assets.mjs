import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "store-assets/screenshots");
const port = 4179;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

await mkdir(output, { recursive: true });
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: process.env.GLASSWARE_CHROME || "/usr/bin/google-chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/app.html`, { waitUntil: "networkidle" });
  await page.locator(".workbench").waitFor();

  await capture("01-editor-workbench.png");
  await openTool("Studio");
  await capture("02-studio-tools.png");
  await openTool("Layers");
  await capture("03-layer-controls.png");
  await openTool("Images");
  await capture("04-image-search-and-upload.png");
  await openTool("Files");
  await capture("05-local-projects.png");

  await context.close();
  console.log(`Generated five 1280x800 store screenshots in ${output}`);

  async function openTool(name) {
    await page.getByRole("button", { name, exact: true }).first().click();
    await page.locator(".panel-heading h1", { hasText: name }).waitFor();
    if (name === "Studio") await page.locator(".studio-controls").waitFor();
    await page.waitForTimeout(80);
  }

  async function capture(name) {
    await page.screenshot({ path: resolve(output, name), animations: "disabled" });
  }
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/app.html`);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Store-asset preview server did not start.\n${serverOutput}`);
}
