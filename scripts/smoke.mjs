import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const port = 4178;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Preview server did not start.\n${serverOutput}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function downloadBuffer(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: process.env.IMAGESTITCH_CHROME || "/usr/bin/google-chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".design-canvas canvas").waitFor();
  await page.getByRole("button", { name: "Layers" }).click();
  assert(await page.locator(".layer-row").count() === 3, "Starter project should have three layers");

  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Layers" }).click();
  assert(await page.locator(".layer-row").count() === 4, "Adding a shape should create a layer");

  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.locator(".layer-row").count() === 3, "Undo should restore the previous layer snapshot");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.locator(".layer-row").count() === 4, "Redo should restore the shape");

  await page.getByRole("button", { name: "Text", exact: true }).click();
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 120, height: 60 } });
  await page.locator('input[type="file"][accept^="image/"]').setInputFiles({ name: "smoke.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Layers" }).click();
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).waitFor();
  assert(await page.locator(".layer-row").count() === 6, "Text and image uploads should become durable layers");
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  await page.getByRole("button", { name: "punch", exact: true }).click();
  await page.getByRole("button", { name: "1:1", exact: true }).click();
  const brightness = page.getByRole("slider", { name: "Brightness" });
  await brightness.focus();
  await brightness.press("ArrowRight");

  const canvasBeforeZoom = await page.locator(".design-canvas").boundingBox();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(150);
  const canvasAfterZoom = await page.locator(".design-canvas").boundingBox();
  assert(canvasAfterZoom.width > canvasBeforeZoom.width, "Zoom in should enlarge the working artboard");
  await page.locator(".zoom-controls button").nth(1).click();

  await page.getByRole("button", { name: "Layers" }).click();
  await page.locator(".layer-row").filter({ hasText: "Headline" }).locator(".layer-main").click();
  await page.getByLabel("Typeface").selectOption("Helvetica");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Layers" }).click();
  assert(await page.locator(".layer-row").count() === 6, "Layers should survive a browser reload");
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  await page.keyboard.press("Control+d");
  assert(await page.locator(".layer-row").count() === 7, "The duplicate shortcut should copy the active layer");
  await page.locator(".layer-row.selected").filter({ hasText: "smoke.png copy" }).waitFor();
  await page.waitForTimeout(300);
  await page.keyboard.press("Delete");
  assert(await page.locator(".layer-row").count() === 6, "Delete should remove the active layer");

  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  assert(await page.getByRole("slider", { name: "Contrast" }).inputValue() === "22", "Photo adjustments should survive reload");
  const artboard = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(artboard.x + artboard.width / 2, artboard.y + artboard.height / 2);
  await page.mouse.down();
  await page.mouse.move(artboard.x + artboard.width / 2 + 5, artboard.y + artboard.height / 2, { steps: 4 });
  await page.mouse.up();

  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const downloadedImage = await imageDownload;
  assert(downloadedImage.suggestedFilename().endsWith(".png"), "PNG export should create a PNG download");
  const exportedPng = await downloadBuffer(downloadedImage);
  assert(exportedPng.readUInt32BE(16) === 1080 && exportedPng.readUInt32BE(20) === 1080, "Square export should be exactly 1080 by 1080 pixels");

  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/editor-smoke.png", fullPage: true });

  await page.getByRole("button", { name: "Files", exact: true }).click();
  const projectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save a portable copy" }).click();
  const downloadedProject = await projectDownload;
  assert(downloadedProject.suggestedFilename().endsWith(".imagestitch.json"), "Project export should create a portable bundle");
  const projectBundle = JSON.parse((await downloadBuffer(downloadedProject)).toString("utf8"));
  assert(projectBundle.schemaVersion === "imagestitch.bundle.v1", "Project export should use the public bundle schema");
  assert(projectBundle.assets.some((asset) => asset.name === "smoke.png" && asset.dataUrl.startsWith("data:image/png;base64,")), "Portable bundles should include original image bytes");
  const editedPhoto = projectBundle.project.objects.find((object) => object.kind === "image" && object.name === "smoke.png");
  assert(editedPhoto, `Portable project should contain smoke.png; got ${JSON.stringify(projectBundle.project.objects.map(({ kind, name }) => ({ kind, name })))}`);
  assert(editedPhoto.adjustments.contrast === 22 && editedPhoto.adjustments.brightness === 0.05, "Portable projects should retain photo adjustments");
  assert(editedPhoto.crop.width < 1 || editedPhoto.crop.height < 1, "Portable projects should retain non-destructive crops");
  assert(Math.abs(editedPhoto.x - 510) < 0.01, "Near-center drags should snap the cropped photo to the artboard center");
  assert(projectBundle.project.objects.find((object) => object.name === "Headline").fontFamily === "Helvetica", "Portable projects should retain typography edits");
  assert(browserErrors.length === 0, `Browser emitted errors:\n${browserErrors.join("\n")}`);
  process.stdout.write("ImageStitch browser smoke passed: persistence, photo edits, typography, zoom, undo/redo, uploads, and exports.\n");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
