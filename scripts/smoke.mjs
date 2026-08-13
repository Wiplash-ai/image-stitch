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
  let openImagePng = Buffer.alloc(0);
  await page.route("https://api.openverse.org/**", async (route) => {
    if (route.request().url().includes("/thumb/")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: openImagePng });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [{
          id: "11111111-1111-4111-8111-111111111111",
          title: "Open flower",
          creator: "Fixture Photographer",
          creator_url: "https://example.com/creator",
          license: "by",
          license_url: "https://creativecommons.org/licenses/by/4.0/",
          attribution: '"Open flower" by Fixture Photographer is licensed under CC BY 4.0.',
          thumbnail: "https://api.openverse.org/v1/images/11111111-1111-4111-8111-111111111111/thumb/",
          foreign_landing_url: "https://example.com/open-flower",
          width: 1200,
          height: 800,
        }],
      }),
    });
  });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".design-canvas canvas").waitFor();
  await mkdir("artifacts", { recursive: true });
  const visualSystem = await page.evaluate(() => {
    const style = (selector) => getComputedStyle(document.querySelector(selector));
    return {
      topbar: style(".topbar").backgroundColor,
      toolrail: style(".toolrail").backgroundColor,
      sidepanel: style(".sidepanel").backgroundColor,
      stage: style(".canvas-stage").backgroundColor,
      headingFont: style(".panel-heading h1").fontFamily,
    };
  });
  assert(visualSystem.topbar === "rgb(255, 255, 255)", "The top bar should use the white editor shell");
  assert(visualSystem.toolrail === "rgb(17, 17, 17)", "The tool rail should use black professional-editor chrome");
  assert(visualSystem.sidepanel === "rgb(255, 255, 255)", "The asset panel should use the white editor shell");
  assert(visualSystem.stage === "rgb(222, 222, 222)", "The artboard stage should use neutral gray");
  assert(!visualSystem.headingFont.toLowerCase().includes("georgia"), "Interface headings should use sans-serif typography");
  await page.getByRole("button", { name: "Layers" }).click();
  assert(await page.locator(".layer-row").count() === 3, "Starter project should have three layers");

  await page.getByRole("button", { name: "Shapes" }).click();
  assert(await page.locator(".shape-library button").count() === 12, "The shape library should expose twelve starter shapes");
  assert(await page.getByText("Bring in an image").count() === 0, "Shapes should not show image-upload settings");
  await page.screenshot({ path: "artifacts/shapes-panel-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add Star" }).click();
  await page.getByRole("button", { name: "Layers" }).click();
  assert(await page.locator(".layer-row").count() === 4, "Adding a shape should create a layer");

  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.locator(".layer-row").count() === 3, "Undo should restore the previous layer snapshot");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.locator(".layer-row").count() === 4, "Redo should restore the shape");
  await page.locator(".layer-row").filter({ hasText: "Star" }).locator(".layer-main").click();
  const fillHex = page.getByLabel("Fill hex value");
  await fillHex.fill("#3f7fff");
  await fillHex.press("Enter");
  const shapeSelect = page.getByLabel("Shape");
  for (const shape of ["rect", "rounded-rect", "ellipse", "triangle", "diamond", "pentagon", "hexagon", "heart", "speech-bubble", "line", "arrow", "star"]) {
    await shapeSelect.selectOption(shape);
    assert(await shapeSelect.inputValue() === shape, `The ${shape} renderer should remain selectable`);
  }

  await page.getByRole("button", { name: "Text", exact: true }).click();
  assert(await page.getByRole("button", { name: "Add a heading" }).isVisible(), "Text should offer task-specific type presets");
  assert(await page.getByText("Bring in an image").count() === 0, "Text should not show image-upload settings");
  await page.screenshot({ path: "artifacts/text-panel-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add a heading" }).click();
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 120, height: 60 } });
  openImagePng = png;
  await page.locator('input[type="file"][accept^="image/"]').setInputFiles({ name: "smoke.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Images", exact: true }).click();
  assert(await page.getByRole("button", { name: "Upload from computer" }).isVisible(), "Images should keep local upload visible");
  await page.getByLabel("Search open images").fill("flowers");
  await page.locator(".image-search-form").getByRole("button", { name: "Search" }).click();
  await page.getByText("Open flower", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/image-search-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add Open flower" }).click();
  await page.locator(".toast").waitFor();
  assert((await page.locator(".toast").innerText()).includes("Added “Open flower”"), `Searched image import failed: ${await page.locator(".toast").innerText()}\n${browserErrors.join("\n")}`);
  await page.getByRole("button", { name: "Layers" }).click();
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).waitFor();
  assert(await page.locator(".layer-row").count() === 7, "Text, local uploads, and searched images should become durable layers");
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
  assert(await page.locator(".layer-row").count() === 7, "Layers should survive a browser reload");
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  await page.keyboard.press("Control+d");
  assert(await page.locator(".layer-row").count() === 8, "The duplicate shortcut should copy the active layer");
  await page.locator(".layer-row.selected").filter({ hasText: "smoke.png copy" }).waitFor();
  await page.waitForTimeout(300);
  await page.keyboard.press("Delete");
  assert(await page.locator(".layer-row").count() === 7, "Delete should remove the active layer");

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

  await page.screenshot({ path: "artifacts/editor-smoke.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  assert(await page.locator(".canvas-stage").isVisible(), "The editor stage should remain visible at 1280 by 800");
  assert(await page.locator(".inspector").isVisible(), "The inspector should remain visible at 1280 by 800");
  await page.screenshot({ path: "artifacts/editor-smoke-1280.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole("button", { name: "Files", exact: true }).click();
  const projectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save a portable copy" }).click();
  const downloadedProject = await projectDownload;
  assert(downloadedProject.suggestedFilename().endsWith(".imagestitch.json"), "Project export should create a portable bundle");
  const projectBundle = JSON.parse((await downloadBuffer(downloadedProject)).toString("utf8"));
  assert(projectBundle.schemaVersion === "imagestitch.bundle.v1", "Project export should use the public bundle schema");
  assert(projectBundle.assets.some((asset) => asset.name === "smoke.png" && asset.dataUrl.startsWith("data:image/png;base64,")), "Portable bundles should include original image bytes");
  const openAsset = projectBundle.assets.find((asset) => asset.name === "Open-flower.png");
  assert(openAsset?.source?.provider === "openverse" && openAsset.source.license === "BY", "Searched images should retain their Openverse license receipt");
  const editedPhoto = projectBundle.project.objects.find((object) => object.kind === "image" && object.name === "smoke.png");
  assert(editedPhoto, `Portable project should contain smoke.png; got ${JSON.stringify(projectBundle.project.objects.map(({ kind, name }) => ({ kind, name })))}`);
  assert(editedPhoto.adjustments.contrast === 22 && editedPhoto.adjustments.brightness === 0.05, "Portable projects should retain photo adjustments");
  assert(editedPhoto.crop.width < 1 || editedPhoto.crop.height < 1, "Portable projects should retain non-destructive crops");
  assert(Math.abs(editedPhoto.x - 510) < 0.01, "Near-center drags should snap the cropped photo to the artboard center");
  assert(projectBundle.project.objects.find((object) => object.name === "Headline").fontFamily === "Helvetica", "Portable projects should retain typography edits");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill("mom.example@example.com");
  await page.getByRole("button", { name: "Preview sign in" }).click();
  await page.getByText("Preview account ready for mom.example@example.com.").waitFor();
  assert(await page.getByRole("button", { name: "Mom Example", exact: true }).isVisible(), "Preview sign-in should update the account control");
  await page.getByRole("button", { name: "Ask AI" }).click();
  const subscriptionCard = page.locator(".connection-card").filter({ hasText: "ChatGPT / Codex" });
  await subscriptionCard.getByRole("button", { name: "Preview connection" }).click();
  await subscriptionCard.getByText("Preview connected").waitFor();
  assert(await page.locator('input[type="password"]').count() === 0, "The editor must not expose a provider credential input");
  assert(await page.getByText("key never enters this browser UI").isVisible(), "The API connection should disclose its credential boundary");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ask AI" }).click();
  await page.locator(".connection-card").filter({ hasText: "ChatGPT / Codex" }).getByText("Preview connected").waitFor();
  await page.screenshot({ path: "artifacts/account-ai-connections-smoke.png", fullPage: true });
  assert(browserErrors.length === 0, `Browser emitted errors:\n${browserErrors.join("\n")}`);
  process.stdout.write("ImageStitch browser smoke passed: task-specific tools, color input, shape library, open image search, attribution, persistence, edits, exports, account preview, and AI receipts.\n");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
