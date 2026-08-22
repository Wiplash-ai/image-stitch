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

function pdfPageCount(bytes) {
  const source = bytes.toString("latin1");
  assert(source.startsWith("%PDF-1.4"), "PDF export should have a valid PDF header");
  assert(source.includes("xref") && source.includes("%%EOF"), "PDF export should include a cross-reference table and trailer");
  return source.match(/\/Type \/Page\b/g)?.length ?? 0;
}

async function downloadBuffer(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function canvasDetailMetric(page, region = { x: 0.32, y: 0.19, width: 0.36, height: 0.05 }) {
  return page.locator(".design-canvas canvas").first().evaluate((canvas, sample) => {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const x = Math.max(0, Math.floor(canvas.width * sample.x));
    const y = Math.max(0, Math.floor(canvas.height * sample.y));
    const width = Math.max(2, Math.floor(canvas.width * sample.width));
    const height = Math.max(2, Math.floor(canvas.height * sample.height));
    const pixels = context.getImageData(x, y, width, height).data;
    const luminance = (index) => pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    let detail = 0;
    let comparisons = 0;
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width - 1; column += 1) {
        const index = (row * width + column) * 4;
        detail += Math.abs(luminance(index) - luminance(index + 4));
        comparisons += 1;
      }
    }
    return comparisons ? detail / comparisons : 0;
  }, region);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: process.env.GLASSWARE_CHROME || process.env.IMAGESTITCH_CHROME || "/usr/bin/google-chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  let openImagePng = Buffer.alloc(0);
  let mockAccountAuthenticated = false;
  const mockAiRequests = [];
  const mockRegionEditRequests = [];
  const mockCancelledAiJobs = new Set();
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
  await page.route("http://127.0.0.1:3010/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": baseUrl,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type,x-glassware-csrf",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
      });
      return;
    }
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === "/v1/ai/jobs/mock-ai-cancel" && route.request().method() === "DELETE" && mockAccountAuthenticated) {
      mockCancelledAiJobs.add("mock-ai-cancel");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
        body: JSON.stringify({ job: {
          id: "mock-ai-cancel", status: "cancelled", connectionId: "smoke-openai-api", model: "gpt-5.6-luna", reasoningEffort: "low",
          createdAt: "2026-08-20T12:00:00.000Z", finishedAt: "2026-08-20T12:00:01.000Z",
        } }),
      });
      return;
    }
    if (requestUrl.pathname === "/v1/ai/jobs/mock-ai-cancel" && route.request().method() === "GET" && mockAccountAuthenticated) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
        body: JSON.stringify({ job: {
          id: "mock-ai-cancel", status: mockCancelledAiJobs.has("mock-ai-cancel") ? "cancelled" : "running", connectionId: "smoke-openai-api", model: "gpt-5.6-luna", reasoningEffort: "low",
          createdAt: "2026-08-20T12:00:00.000Z",
        } }),
      });
      return;
    }
    if (requestUrl.pathname === "/v1/projects" && route.request().method() === "GET" && mockAccountAuthenticated) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
        body: JSON.stringify({ projects: [] }),
      });
      return;
    }
    if (requestUrl.pathname === "/v1/ai/image-edits" && route.request().method() === "POST" && mockAccountAuthenticated) {
      const request = route.request().postDataJSON();
      mockRegionEditRequests.push(request);
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
        body: JSON.stringify({ job: {
          id: "mock-region-edit",
          status: "completed",
          connectionId: request.connectionId,
          model: request.model,
          reasoningEffort: request.reasoningEffort,
          createdAt: "2026-08-21T12:00:00.000Z",
          finishedAt: "2026-08-21T12:00:01.000Z",
          imageEdit: {
            imageDataUrl: `data:image/png;base64,${openImagePng.toString("base64")}`,
            provider: "openai_api",
            model: "gpt-image-2",
          },
        } }),
      });
      return;
    }
    if (requestUrl.pathname === "/v1/ai/jobs" && route.request().method() === "POST" && mockAccountAuthenticated) {
      const request = route.request().postDataJSON();
      mockAiRequests.push(request);
      const pass = request.agentContext?.pass ?? 1;
      if (request.prompt.includes("CANCEL SAFETY")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
          body: JSON.stringify({ job: {
            id: "mock-ai-cancel", status: "running", connectionId: request.connectionId, model: request.model, reasoningEffort: request.reasoningEffort,
            baseRevisionId: request.agentContext.baseRevisionId, createdAt: "2026-08-20T12:00:00.000Z",
          } }),
        });
        return;
      }
      const emptyFields = {
        targetId: null, text: null, color: null, shape: null, align: null,
        x: null, y: null, width: null, height: null, fontSize: null, imagePrompt: null,
      };
      const plan = pass === 1 ? {
        summary: "Added a compact AI label.",
        rationale: "The requested label needs a high-contrast container and readable type.",
        assessment: "The lower-left area can hold the label without covering the focal content.",
        done: false,
        operations: [
          { ...emptyFields, action: "add_shape", label: "Add the AI label background", color: "#111111", shape: "rounded-rect", x: 56, y: 920, width: 300, height: 78 },
          { ...emptyFields, action: "add_text", label: "Add the AI label text", color: "#ffffff", text: "AUTONOMOUS AI", x: 80, y: 940, width: 252, height: 42, fontSize: 30, align: "center" },
          { ...emptyFields, action: "search_open_image", label: "Add a reusable flower image", imageSearchQuery: "flowers", x: 650, y: 760, width: 220, height: 110 },
        ],
      } : pass === 2 ? {
        summary: "Grouped and aligned the AI label.",
        rationale: "Native grouping and canvas alignment keep the label editable and precise.",
        assessment: "The new label is present and can now be treated as one aligned lockup.",
        done: false,
        operations: [
          { ...emptyFields, action: "group_objects", label: "Group the AI label", targetIds: request.project.objects.filter((object) => object.name === "Add the AI label background" || object.name === "Add the AI label text").map((object) => object.id) },
          { ...emptyFields, action: "align_objects", label: "Center the AI label lockup", targetIds: request.project.objects.filter((object) => object.name === "Add the AI label background" || object.name === "Add the AI label text").map((object) => object.id), alignment: "center", alignmentReference: "canvas" },
          { ...emptyFields, action: "set_canvas_guides", label: "Add an AI center guide", guideAction: "add", guideAxis: "x", guidePosition: request.project.canvas.width / 2 },
        ],
      } : pass === 3 ? {
        summary: "Added a generated supporting texture.",
        rationale: "A quiet texture completes the label without competing with it.",
        assessment: "The first focused step is balanced, with room for one supporting image.",
        done: false,
        operations: [
          { ...emptyFields, action: "generate_image", label: "Generate a small supporting texture", name: "AI texture", imagePrompt: "A minimal monochrome geometric texture", imageDataUrl: `data:image/png;base64,${openImagePng.toString("base64")}`, x: 880, y: 760, width: 120, height: 60 },
        ],
      } : pass === 4 ? {
        summary: "Refined and preflighted the generated texture.",
        rationale: "The generated layer should use native image controls and receive output QA.",
        assessment: "The generated image is on the artboard and ready for non-destructive treatment.",
        done: false,
        operations: [
          { ...emptyFields, action: "set_image_adjustments", label: "Warm and sharpen the AI texture", targetId: request.project.objects.find((object) => object.name === "AI texture")?.id, temperature: 0.25, sharpen: 0.4, vignette: 0.15 },
          { ...emptyFields, action: "set_image_mask", label: "Mask the AI texture edge", targetId: request.project.objects.find((object) => object.name === "AI texture")?.id, maskAction: "add_stroke", maskMode: "hide", maskSize: 24, maskFeather: 8, maskPoints: [0.05, 0.5, 0.2, 0.5, 0.3, 0.4] },
          { ...emptyFields, action: "inspect_export", label: "Preflight the artwork PDF", exportFormat: "pdf", exportWidth: 2400, exportDpi: 300, exportAllPages: true },
        ],
      } : {
        summary: "The AI label is balanced and unclipped.",
        rationale: "The rendered result satisfies the request.",
        assessment: "The label has clear contrast, safe spacing, and no visible clipping.",
        done: true,
        operations: [],
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": baseUrl, "access-control-allow-credentials": "true" },
        body: JSON.stringify({ job: {
          id: `mock-ai-job-${pass}`,
          status: "completed",
          connectionId: request.connectionId,
          model: request.model,
          reasoningEffort: request.reasoningEffort,
          baseRevisionId: request.agentContext.baseRevisionId,
          agentSessionId: "019ff774-a54d-7313-b3df-5f2ab8c0484f",
          createdAt: "2026-08-20T12:00:00.000Z",
          finishedAt: "2026-08-20T12:00:01.000Z",
          usage: { inputTokens: 1000 + pass, cachedInputTokens: 100, outputTokens: 200 + pass },
          plan,
        } }),
      });
      return;
    }
    const accountSnapshot = mockAccountAuthenticated ? {
      account: {
        id: "smoke-account",
        email: "mom@example.com",
        displayName: "Mom",
        expiresAt: "2026-09-01T00:00:00.000Z",
        mode: "authenticated",
      },
      connections: [{
        id: "smoke-openai-api",
        kind: "openai_api",
        status: "connected",
        label: "OpenAI API key",
        createdAt: "2026-08-20T12:00:00.000Z",
      }],
      syncEnabled: false,
      csrfToken: "smoke-csrf",
      aiRuntime: { available: true, message: "AI workspace available" },
    } : { account: null, connections: [], syncEnabled: false, csrfToken: "smoke-csrf" };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": baseUrl,
        "access-control-allow-credentials": "true",
      },
      body: JSON.stringify(accountSnapshot),
    });
  });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  await mkdir("artifacts", { recursive: true });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert(await page.getByRole("heading", { name: "Your ideas. Your AI. One canvas." }).isVisible(), "The public landing page should explain GlassWare above the fold");
  assert((await page.locator(".public-nav-cta").getAttribute("href")) === "./app.html", "The public navbar should open the image editor");
  assert((await page.locator(".public-nav-cta").getAttribute("class")).includes("public-button primary"), "The navbar editor action should share the primary CTA interaction treatment");
  assert(await page.locator('.public-nav > nav a:text-is("Demo")').count() === 0, "The public navbar should not include a redundant Demo link");
  assert((await page.locator('.public-nav > nav a:text-is("Pricing")').getAttribute("href")) === "./pricing.html", "The public navbar should link to transparent pricing");
  assert((await page.locator(".hero-actions .primary").getAttribute("href")) === "./app.html", "The hero should open the image editor");
  assert(await page.locator("#demo").count() === 1, "The landing page should include the live product workbench section");
  assert(await page.getByText("A WIPLASH LABS PRODUCT", { exact: true }).isVisible(), "GlassWare should be presented as a real Wiplash Labs product");
  assert(await page.getByText("A WIPLASH LABS DEMO", { exact: true }).count() === 0, "The landing page should not describe GlassWare as a demo");
  assert((await page.locator(".labs-mark img").getAttribute("src")) === "./wiplash-labs-logo.svg", "The Labs section should use the full Wiplash Labs identity rather than the sign-in mark");
  const labsMarkTreatment = await page.locator(".labs-mark").evaluate((mark) => ({
    background: getComputedStyle(mark).backgroundColor,
    border: getComputedStyle(mark).borderTopWidth,
  }));
  assert(labsMarkTreatment.background === "rgba(0, 0, 0, 0)" && labsMarkTreatment.border === "0px", "The Wiplash Labs logo should sit directly on the page without a sticker-like rectangle");
  const landingNavHeight = await page.locator(".public-nav").evaluate((nav) => nav.getBoundingClientRect().height);
  const landingOverflow = await page.evaluate(() => ({ width: document.scrollingElement.scrollWidth, viewport: document.scrollingElement.clientWidth, x: window.scrollX }));
  assert(landingOverflow.width === landingOverflow.viewport && landingOverflow.x === 0, "The landing page should not create a moving horizontal scrollbar at the bottom");
  const publicFooter = await page.locator(".public-footer").evaluate((footer) => {
    const bounds = footer.getBoundingClientRect();
    return { height: bounds.height, linkSize: Number.parseFloat(getComputedStyle(footer.querySelector("nav a")).fontSize) };
  });
  assert(publicFooter.height <= 64 && publicFooter.linkSize >= 12, "The landing footer should be compact while keeping its links readable");
  await page.screenshot({ path: "artifacts/glassware-landing-desktop.png", fullPage: true });
  await page.goto(`${baseUrl}/pricing.html`, { waitUntil: "networkidle" });
  assert(await page.getByRole("heading", { name: "The editor is free. Cloud is the service." }).isVisible(), "The pricing page should lead with the local-free product model");
  assert(await page.getByText("Creator stays $0.00. Designer and Director add the storage you need.", { exact: true }).isVisible(), "The pricing page should present all plans as available today");
  assert((await page.locator(".public-nav").evaluate((nav) => nav.getBoundingClientRect().height)) === landingNavHeight, "The public navbar should keep the same height on landing and pricing pages");
  assert((await page.locator(".active-plan .price-lockup strong").innerText()) === "$0.00", "The free plan should use the final $0.00 price treatment");
  assert(await page.getByRole("heading", { name: "Creator", exact: true }).isVisible(), "The free tier should be named for its user");
  assert(await page.getByRole("heading", { name: "Designer", exact: true }).isVisible(), "The individual cloud tier should be named for its user");
  assert(await page.getByRole("heading", { name: "Director", exact: true }).isVisible(), "The team tier should be named for its user");
  assert((await page.locator(".featured-plan .price-lockup strong").innerText()) === "$5.99", "Annual Cloud pricing should lead with its per-month amount");
  assert((await page.locator(".featured-plan .price-note").innerText()) === "$71.99 billed annually", "Annual Cloud pricing should disclose the full .99 annual charge beneath the headline");
  assert((await page.locator(".future-plan .price-lockup strong").innerText()) === "$11.99", "Annual Teams pricing should lead with its per-seat monthly amount");
  assert((await page.locator(".future-plan .price-note").innerText()) === "$143.99 per seat billed annually", "Annual Teams pricing should disclose the full .99 annual charge beneath the headline");
  assert(await page.getByText("100 GB", { exact: true }).isVisible(), "Cloud should publish its storage allowance");
  assert(await page.getByText("Unlimited", { exact: true }).isVisible(), "Teams should publish unlimited storage");
  await page.getByRole("button", { name: "Monthly", exact: true }).click();
  assert((await page.locator(".featured-plan .price-lockup strong").innerText()) === "$7.99", "The monthly selector should show the accepted $7.99 Cloud price");
  assert((await page.locator(".featured-plan .price-note").innerText()) === "$7.99 billed monthly", "Monthly Cloud subtext should retain the accepted .99 price");
  assert((await page.locator(".future-plan .price-lockup strong").innerText()) === "$14.99", "Teams monthly pricing should use the accepted $14.99 price");
  assert(await page.getByRole("heading", { name: "What is BYOAI?" }).isVisible(), "Pricing should explain the free Bring Your Own AI option");
  assert(await page.getByRole("heading", { name: "What happens if a payment fails?" }).isVisible(), "Pricing should publish the failed-payment and cloud-retention policy");
  assert(await page.getByText(/third unsuccessful attempt.*30 calendar days.*permanently deleted/i).isVisible(), "The failed-payment answer should explain three attempts and the 30-day download window");
  assert(await page.locator(".pricing-faq article").count() === 8, "Pricing should answer plan, storage, account, billing-failure, portability, and AI questions");
  assert(await page.locator(".pricing-card a").count() === 3, "Every available plan should present an actionable CTA");
  assert((await page.getByRole("link", { name: "Upgrade to Designer" }).getAttribute("href")) === "./app.html?subscribe=designer&billing=monthly", "Designer should preserve the selected billing period when starting subscription");
  assert((await page.getByRole("link", { name: "Upgrade to Director" }).getAttribute("href")) === "./app.html?subscribe=director&billing=monthly", "Director should preserve the selected billing period when starting subscription");
  assert(await page.getByText(/coming soon/i).count() === 0, "The final pricing page should not contain coming-soon language");
  const pricingDocument = await page.evaluate(() => ({
    overflowX: getComputedStyle(document.documentElement).overflowX,
    width: document.scrollingElement.scrollWidth,
    viewport: document.scrollingElement.clientWidth,
  }));
  assert(pricingDocument.overflowX === "clip" && pricingDocument.width === pricingDocument.viewport, "The public document should suppress the persistent bottom scrollbar without creating a scrolling frame");
  await page.screenshot({ path: "artifacts/glassware-pricing-desktop.png", fullPage: true });
  await page.goto(`${baseUrl}/privacy.html`, { waitUntil: "networkidle" });
  assert(await page.getByRole("heading", { name: "Privacy, without the fog." }).isVisible(), "The GlassWare privacy notice should render as a dedicated public page");
  assert(await page.getByText("AI connections and creative requests", { exact: true }).isVisible(), "The privacy notice should disclose connected AI processing");
  assert((await page.locator(".policy-section .public-button").getAttribute("href")) === "./app.html", "The privacy page should offer a direct editor action");
  await page.screenshot({ path: "artifacts/glassware-privacy-desktop.png", fullPage: true });
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  assert(await mobilePage.locator(".public-nav-cta").isVisible(), "The editor action should remain visible in the mobile navbar");
  const mobileOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(mobileOverflow <= 1, "The public landing page should not overflow horizontally on mobile");
  await mobilePage.screenshot({ path: "artifacts/glassware-landing-mobile.png", fullPage: true });
  await mobilePage.goto(`${baseUrl}/pricing.html`, { waitUntil: "networkidle" });
  assert((await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, "The pricing page should not overflow horizontally on mobile");
  assert(await mobilePage.getByRole("button", { name: /Annual/ }).isVisible(), "The pricing billing control should remain usable on mobile");
  await mobilePage.screenshot({ path: "artifacts/glassware-pricing-mobile.png", fullPage: true });
  await mobilePage.goto(`${baseUrl}/privacy.html`, { waitUntil: "networkidle" });
  assert((await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, "The privacy page should not overflow horizontally on mobile");
  await mobilePage.screenshot({ path: "artifacts/glassware-privacy-mobile.png", fullPage: true });
  await mobilePage.close();

  await page.goto(`${baseUrl}/app.html`, { waitUntil: "networkidle" });
  await page.locator(".design-canvas canvas").waitFor();
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
  const compactFooter = await page.locator(".product-footer").evaluate((footer) => {
    const bounds = footer.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, fontSize: Number.parseFloat(getComputedStyle(footer).fontSize) };
  });
  assert(compactFooter.height <= 34 && compactFooter.width < 620 && compactFooter.fontSize >= 11, "The editor footer should remain a compact, readable utility strip without reserving an empty layout row");
  assert(await page.getByRole("link", { name: "GlassWare home" }).isVisible(), "The editor footer should provide a visible path back to the landing page");
  assert((await page.getByRole("link", { name: "GlassWare home" }).getAttribute("href")) === "./index.html", "The web editor footer should return to the GlassWare landing page");
  const editorType = await page.evaluate(() => ({
    panelEyebrow: Number.parseFloat(getComputedStyle(document.querySelector(".panel-heading p")).fontSize),
    toolLabel: Number.parseFloat(getComputedStyle(document.querySelector(".toolrail button span")).fontSize),
    footer: Number.parseFloat(getComputedStyle(document.querySelector(".product-footer")).fontSize),
  }));
  assert(editorType.panelEyebrow >= 11 && editorType.toolLabel >= 11 && editorType.footer >= 11, "Primary editor labels should remain legible at 11px or larger");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").count() === 3, "Starter project should have three layers");
  const captionRow = page.locator(".layer-row").filter({ hasText: "Caption" });
  const headlineRow = page.locator(".layer-row").filter({ hasText: "Headline" });
  assert(await headlineRow.getAttribute("draggable") === "true", "The whole layer card should be the drag source");
  await headlineRow.dragTo(captionRow, { targetPosition: { x: 80, y: 2 } });
  assert((await page.locator(".layer-row").first().innerText()).includes("Headline"), "Dragging a layer should move it to the chosen z-order position");
  await page.getByRole("button", { name: "Undo" }).click();
  assert((await page.locator(".layer-row").first().innerText()).includes("Caption"), "Layer drag reordering should be undoable");
  await page.getByRole("button", { name: "Redo" }).click();
  assert((await page.locator(".layer-row").first().innerText()).includes("Headline"), "Layer drag reordering should be redoable");
  assert(await page.getByRole("button", { name: "3D layer depth" }).count() === 0, "Layers should stay in the compact professional list view");

  await page.getByRole("button", { name: "Shapes" }).click();
  assert(await page.locator(".shape-library button").count() === 10, "The shape library should expose editable geometry without duplicating markup tools");
  assert(await page.locator(".annotation-library button").count() === 7, "Shapes should include one focused markup and privacy section");
  assert(await page.getByRole("button", { name: "Annotate" }).count() === 0, "Markup should not be duplicated in a separate Annotate tool");
  assert(await page.getByText("Bring in an image").count() === 0, "Shapes should not show image-upload settings");
  await page.screenshot({ path: "artifacts/shapes-panel-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add Star" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").count() === 4, "Adding a shape should create a layer");

  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.locator(".layer-row").count() === 3, "Undo should restore the previous layer snapshot");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.locator(".layer-row").count() === 4, "Redo should restore the shape");
  await page.locator(".layer-row").filter({ hasText: "Star" }).locator(".layer-main").click();
  const fillHex = page.getByLabel("Fill hex value");
  await fillHex.fill("#3f7fff");
  await fillHex.press("Enter");
  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.getByLabel("Fill hex value").inputValue() === "#d9d9d9", "Undo should restore the shape fill before the color change");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.getByLabel("Fill hex value").inputValue() === "#3f7fff", "Redo should restore the committed shape fill");
  const shapeSelect = page.locator(".shape-select select").first();
  for (const shape of ["rect", "rounded-rect", "ellipse", "triangle", "diamond", "pentagon", "hexagon", "heart", "speech-bubble", "star"]) {
    await shapeSelect.selectOption(shape);
    assert(await shapeSelect.inputValue() === shape, `The ${shape} renderer should remain selectable`);
  }

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "Headline" }).locator(".layer-main").click();
  await page.locator(".layer-row").filter({ hasText: "Caption" }).locator(".layer-main").click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Group selected layers", exact: true }).click();
  assert(await page.locator(".layer-row").filter({ hasText: "grouped" }).count() === 2, "Multi-selected layers should become one editable group");
  await page.locator(".layer-toolbar-layout").getByRole("button", { name: "Align left" }).click();
  await page.getByRole("button", { name: "Ungroup selected layers" }).click();
  assert(await page.locator(".layer-row").filter({ hasText: "grouped" }).count() === 0, "Grouped layers should remain individually editable after ungrouping");
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const guideToggleTops = await page.locator(".guide-toggle-row .switch-row").evaluateAll((toggles) => toggles.map((toggle) => Math.round(toggle.getBoundingClientRect().top)));
  assert(guideToggleTops.length === 2 && guideToggleTops[0] === guideToggleTops[1], "Rulers and snapping toggles should share one row");
  await page.getByText("Show rulers", { exact: true }).click();
  await page.getByRole("button", { name: "+ Vertical" }).click();
  assert(await page.locator(".canvas-ruler.ruler-top").isVisible(), "Canvas rulers should be visible when enabled");
  assert(await page.getByLabel("Vertical guide position").count() === 1, "A precise vertical guide should be stored on the page");

  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Add Curved arrow" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").filter({ hasText: "Curved arrow" }).count() === 1, "Curved arrows should become editable layers");
  await page.getByRole("button", { name: "Undo" }).click();
  await page.locator(".layer-row").filter({ hasText: "Headline" }).locator(".layer-main").click();
  const detailBeforeBlur = await canvasDetailMetric(page);
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Add Blur region" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").filter({ hasText: "Blur region" }).count() === 1, "Blur regions should become editable layers");
  const detailAfterBlur = await canvasDetailMetric(page);
  assert(detailBeforeBlur > 1 && detailAfterBlur < detailBeforeBlur * 0.92, `Blur regions should visibly soften underlying pixels (${detailBeforeBlur.toFixed(2)} -> ${detailAfterBlur.toFixed(2)})`);
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Add Secure redact" }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "Secure redact" }).locator(".layer-main").click();
  assert(await page.getByText("Secure opaque cover", { exact: true }).isVisible(), "Secure redact should explain its intentionally opaque black cover");
  assert(await page.getByLabel("Fill hex value").count() === 0, "Secure redaction should not offer a misleading color control");
  await page.getByRole("button", { name: "Undo" }).click();

  await page.getByRole("button", { name: "Text", exact: true }).click();
  assert(await page.getByRole("button", { name: "Add a heading" }).isVisible(), "Text should offer task-specific type presets");
  assert(await page.getByText("Bring in an image").count() === 0, "Text should not show image-upload settings");
  await page.screenshot({ path: "artifacts/text-panel-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add a heading" }).click();
  const inlineCanvas = await page.locator(".design-canvas").boundingBox();
  const inlineScale = inlineCanvas.width / 1080;
  await page.mouse.dblclick(inlineCanvas.x + 270 * inlineScale, inlineCanvas.y + 250 * inlineScale);
  const inlineEditor = page.locator(".inline-text-editor");
  await inlineEditor.waitFor();
  await inlineEditor.fill("Inline canvas headline");
  await inlineEditor.press("Control+Enter");
  assert(await page.locator(".inspector textarea").inputValue() === "Inline canvas headline", "Double-click text editing should commit canvas text");
  assert(await page.getByRole("button", { name: "Align left" }).getAttribute("title") === "Align left", "Alignment icons should expose tooltips");
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 120, height: 60 } });
  openImagePng = png;
  await page.getByLabel("Upload image file").setInputFiles({ name: "smoke.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Images", exact: true }).click();
  assert(await page.getByRole("button", { name: "Upload from computer" }).isVisible(), "Images should keep local upload visible");
  const searchGroup = page.locator(".image-search-form");
  const searchGroupStyle = await searchGroup.evaluate((element) => {
    const style = getComputedStyle(element);
    return { radius: Number.parseFloat(style.borderRadius), columns: style.gridTemplateColumns };
  });
  assert(searchGroupStyle.radius >= 8 && searchGroupStyle.radius < 16, "Image search should use rounded group corners without becoming a pill");
  assert(searchGroupStyle.columns.split(" ").length === 2, "Image search should group the query field and action into two joined chambers");
  assert(await searchGroup.getByRole("button", { name: "Search" }).innerText() === "Search", "Image search should use a clearly labeled action");
  await page.getByLabel("Search open images").fill("flowers");
  await searchGroup.getByRole("button", { name: "Search" }).click();
  await page.getByText("Open flower", { exact: true }).waitFor();
  await page.screenshot({ path: "artifacts/image-search-smoke.png", fullPage: true });
  await page.getByRole("button", { name: "Add Open flower" }).click();
  await page.locator(".toast").waitFor();
  assert((await page.locator(".toast").innerText()).includes("Added “Open flower”"), `Searched image import failed: ${await page.locator(".toast").innerText()}\n${browserErrors.join("\n")}`);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).waitFor();
  assert(await page.locator(".layer-row").count() === 7, "Text, local uploads, and searched images should become durable layers");
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  await page.getByRole("button", { name: "punch", exact: true }).click();
  await page.getByRole("button", { name: "1:1", exact: true }).click();
  const brightness = page.getByRole("slider", { name: "Brightness" });
  await brightness.focus();
  await brightness.press("ArrowRight");
  for (const control of ["Temperature", "Tint", "Sharpen", "Vignette"]) {
    assert(await page.getByRole("slider", { name: control }).isVisible(), `${control} should be available as a non-destructive photo adjustment`);
  }
  await page.getByRole("slider", { name: "Temperature" }).press("ArrowRight");
  await page.getByRole("slider", { name: "Sharpen" }).press("ArrowRight");

  await page.getByRole("button", { name: "Edit crop" }).click();
  const cropSelection = page.locator(".crop-selection");
  const cropBefore = await cropSelection.evaluate((element) => ({ left: element.style.left, top: element.style.top }));
  const cropBox = await cropSelection.boundingBox();
  assert(cropBox, "Precision crop should expose a draggable crop region");
  await page.mouse.move(cropBox.x + cropBox.width / 2, cropBox.y + cropBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + cropBox.width / 2 + 36, cropBox.y + cropBox.height / 2 + 12, { steps: 5 });
  await page.mouse.up();
  const cropAfter = await cropSelection.evaluate((element) => ({ left: element.style.left, top: element.style.top }));
  assert(cropAfter.left !== cropBefore.left || cropAfter.top !== cropBefore.top, "Dragging the precision crop should change the retained source region");
  await page.getByRole("button", { name: "Apply crop" }).click();

  await page.getByRole("button", { name: "Rotate image clockwise" }).click();
  await page.getByRole("button", { name: "Flip image horizontally" }).click();
  await page.waitForTimeout(180);
  const transformedImage = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("imagestitch");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const projects = await new Promise((resolve, reject) => {
      const request = database.transaction("projects").objectStore("projects").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return projects.flatMap((project) => project.objects).find((object) => object.name === "smoke.png");
  });
  assert(transformedImage.rotation === 90 && transformedImage.scaleX < 0, "Rotate and flip should persist the image transform without flattening it");
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(180);
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(180);

  await page.getByRole("button", { name: "Edit image mask" }).click();
  const maskSurface = page.locator(".mask-editor-surface");
  const maskBox = await maskSurface.boundingBox();
  assert(maskBox, "Image mask should expose a brushable image surface");
  await page.mouse.move(maskBox.x + maskBox.width * 0.35, maskBox.y + maskBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(maskBox.x + maskBox.width * 0.62, maskBox.y + maskBox.height * 0.52, { steps: 8 });
  await page.mouse.up();
  assert(await page.locator(".mask-stroke.hide").count() === 1, "A mask brush gesture should create a reversible hide stroke");
  await page.getByRole("slider", { name: "Mask feather" }).fill("18");
  await page.getByRole("button", { name: "Invert" }).click();
  await page.getByRole("button", { name: "Apply mask" }).click();
  await page.locator(".inspector .shape-select select").last().selectOption("multiply");

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const precisionLayerNames = await page.locator(".layer-row .layer-main strong").allTextContents();
  assert(precisionLayerNames.includes("smoke.png"), `Precision edits should preserve the source layer; found ${precisionLayerNames.join(", ")}`);
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await page.locator(".studio-look-grid button").first().waitFor();
  assert(await page.locator(".studio-look-grid button").count() === 4, "Studio should expose four one-click presentation looks");
  await page.getByRole("button", { name: /^Float/ }).click();
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "18", "The Float look should apply curved corners");
  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "0", "Undo should restore image presentation styling");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "18", "Redo should restore image presentation styling");
  await page.getByRole("button", { name: "Mac light" }).click();
  assert(await page.getByRole("slider", { name: "Frame padding" }).inputValue() === "32", "Browser frames should expose their inner padding");
  await page.screenshot({ path: "artifacts/studio-panel-smoke.png", fullPage: true });

  await page.getByRole("button", { name: "Whole artwork" }).click();
  assert(await page.getByLabel("Enable whole artwork presentation").isChecked() === false, "Whole-artwork styling should start disabled");
  await page.getByRole("button", { name: /^Float/ }).click();
  assert(await page.getByLabel("Enable whole artwork presentation").isChecked(), "A whole-artwork look should enable its presentation");
  assert(await page.getByRole("slider", { name: "Outer spacing" }).inputValue() === "72", "Whole-artwork Studio should expose outer spacing");
  await page.getByRole("button", { name: "gradient", exact: true }).click();
  await page.getByRole("button", { name: "Daybreak gradient" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  assert((await page.getByRole("button", { name: "Graphite gradient" }).getAttribute("class"))?.includes("active"), "Undo should restore the prior artwork gradient");
  await page.getByRole("button", { name: "Redo" }).click();
  assert((await page.getByRole("button", { name: "Daybreak gradient" }).getAttribute("class"))?.includes("active"), "Redo should restore the gradient artwork backdrop");
  await page.waitForTimeout(150);
  const backdropPixel = await page.locator(".design-canvas canvas").first().evaluate((canvas) => {
    const context = canvas.getContext("2d");
    return [...(context?.getImageData(20, 20, 1, 1).data ?? [])];
  });
  assert(backdropPixel[0] > 200 && backdropPixel[1] < 210, "The active Daybreak gradient should render into the artwork backdrop");
  await page.screenshot({ path: "artifacts/studio-whole-artwork-smoke.png", fullPage: true });

  await page.getByLabel("Replace selected image file").setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: png });
  await page.getByText(/Replaced the image source/).waitFor();

  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("tab", { name: "Components" }).click();
  await page.getByRole("button", { name: "Save selected layers" }).click();
  await page.locator(".component-library article").waitFor();
  assert(await page.locator(".component-library article").count() === 1, "A selected image should save as a reusable editable component");
  await page.getByRole("tab", { name: "Brand" }).click();
  await page.getByRole("button", { name: "New kit from this page" }).click();
  await page.locator(".brand-kit-card").waitFor();
  assert(await page.locator(".brand-kit-card").count() === 1, "A page palette and its typefaces should save as a reusable brand kit");
  assert(await page.locator(".brand-kit-card .brand-colors button").count() >= 1, "The brand kit should retain reusable page colors");

  const canvasBeforeZoom = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(canvasBeforeZoom.x + canvasBeforeZoom.width / 2, canvasBeforeZoom.y + canvasBeforeZoom.height / 2);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(150);
  const canvasAfterZoom = await page.locator(".design-canvas").boundingBox();
  assert(canvasAfterZoom.width > canvasBeforeZoom.width, "Scrolling over the canvas should zoom in around the pointer");
  await page.locator(".zoom-controls button").nth(1).click();

  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "Headline" }).locator(".layer-main").click();
  await page.getByLabel("Typeface", { exact: true }).click();
  assert(await page.locator(".font-group").filter({ hasText: "Free Google Fonts" }).locator(".font-option").count() === 22, "The typeface picker should expose the curated Google Fonts catalog");
  await page.screenshot({ path: "artifacts/font-picker-smoke.png", fullPage: true });
  await page.locator(".font-option").filter({ hasText: "Georgia" }).click();
  assert((await page.getByLabel("Typeface", { exact: true }).innerText()).includes("Georgia"), "The custom typeface picker should apply a system font");
  await page.waitForTimeout(300);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Layers", exact: true }).click();
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
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "18", "Image presentation should survive reload");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  const artboard = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(artboard.x + artboard.width / 2, artboard.y + artboard.height / 2);
  await page.mouse.down();
  await page.mouse.move(artboard.x + artboard.width / 2 + 5, artboard.y + artboard.height / 2, { steps: 4 });
  await page.mouse.up();

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.locator(".export-modal").waitFor();
  const exportFormatLabels = await page.locator(".export-format-tabs [role=tab]").allTextContents();
  assert(exportFormatLabels.length === 5, `Export should offer PNG, JPG, WebP, SVG, and PDF outputs; found ${exportFormatLabels.join(", ") || "none"}`);
  assert(await page.getByText("Preflight", { exact: true }).isVisible(), "Export should show output preflight before downloading");
  const imageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
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
  assert(downloadedProject.suggestedFilename().endsWith(".glassware.json"), "Project export should create a portable bundle");
  const projectBundle = JSON.parse((await downloadBuffer(downloadedProject)).toString("utf8"));
  assert(projectBundle.schemaVersion === "glassware.bundle.v1", "Project export should use the public bundle schema");
  assert(projectBundle.assets.some((asset) => asset.name === "smoke.png" && asset.dataUrl.startsWith("data:image/png;base64,")), "Portable bundles should include original image bytes");
  const openAsset = projectBundle.assets.find((asset) => asset.name === "Open-flower.png");
  assert(openAsset?.source?.provider === "openverse" && openAsset.source.license === "BY", "Searched images should retain their Openverse license receipt");
  const editedPhoto = projectBundle.project.objects.find((object) => object.kind === "image" && object.name === "smoke.png");
  assert(editedPhoto, `Portable project should contain smoke.png; got ${JSON.stringify(projectBundle.project.objects.map(({ kind, name }) => ({ kind, name })))}`);
  assert(editedPhoto.adjustments.contrast === 22 && editedPhoto.adjustments.brightness === 0.05 && editedPhoto.adjustments.temperature === 0.05 && editedPhoto.adjustments.sharpen === 0.25, `Portable projects should retain tonal and detail adjustments; got ${JSON.stringify(editedPhoto.adjustments)}`);
  assert(editedPhoto.crop.width < 1 || editedPhoto.crop.height < 1, "Portable projects should retain non-destructive crops");
  assert(editedPhoto.mask.strokes.length === 1 && editedPhoto.mask.feather === 18 && editedPhoto.mask.inverted, "Portable projects should retain editable image masks");
  assert(editedPhoto.blendMode === "multiply", "Portable projects should retain layer blend modes");
  assert(editedPhoto.presentation.cornerRadius === 18 && editedPhoto.presentation.shadow.enabled, "Portable projects should retain Studio presentation styling");
  assert(projectBundle.project.canvas.presentation.enabled && projectBundle.project.canvas.presentation.backdrop.type === "gradient" && projectBundle.project.canvas.presentation.backdrop.value === "daybreak", "Portable projects should retain rich whole-artwork backdrops");
  assert(editedPhoto.presentation.frame.type === "macos-light" && editedPhoto.presentation.frame.title === "GlassWare", "Portable projects should retain browser frame shells");
  assert(Math.abs(editedPhoto.x - 510) < 0.01, "Near-center drags should snap the cropped photo to the artboard center");
  assert(projectBundle.project.objects.find((object) => object.name === "Headline").fontFamily === "Georgia", "Portable projects should retain typography edits");
  assert(projectBundle.project.objects.find((object) => object.text === "Inline canvas headline"), "Portable projects should retain inline canvas text edits");
  assert(projectBundle.components.length === 1 && projectBundle.components[0].objects[0].kind === "image", "Portable projects should include reusable components and their editable layers");

  await page.getByRole("button", { name: "Add blank page" }).click();
  assert(await page.locator(".project-page-row").count() === 2, "Projects should support more than one independent page");
  await page.getByLabel("Name page 2").fill("Template page");
  await page.getByRole("button", { name: "Library" }).click();
  assert(await page.locator(".template-library article").count() === 4, "The library should expose four editable asset-free starter templates");
  await page.locator(".template-preview").first().click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").count() === 5, "Applying a template should create editable layers on only the active page");
  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.locator(".layer-row").count() === 0, "Template application should be one undoable page edit");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.locator(".layer-row").count() === 5, "Redo should restore every template layer");
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByTitle("Open Page 1").click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").count() === 7, "Switching pages should restore the original page's independent layer stack");
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByTitle("Open Template page").click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.locator(".export-modal").waitFor();
  await page.getByRole("tab", { name: "PDF" }).click();
  await page.getByText("Export every page", { exact: true }).click();
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const downloadedPdf = await pdfDownload;
  const pdfBytes = await downloadBuffer(downloadedPdf);
  assert(downloadedPdf.suggestedFilename().endsWith(".pdf") && pdfPageCount(pdfBytes) === 2, "All-pages PDF export should create one PDF containing both project pages");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const signInDialog = page.getByRole("dialog", { name: "Sign in or create an account" });
  await signInDialog.waitFor();
  const wiplashProvider = signInDialog.getByRole("button", { name: /^Continue with Wiplash.ai/ });
  assert(await wiplashProvider.isVisible(), "The sign-in modal should use the shared Wiplash.ai account entry");
  assert((await wiplashProvider.innerText()).includes("Choose Google, GitHub, GitLab, or use your existing session"), "The Wiplash.ai action should explain its provider choices");
  assert(await signInDialog.locator(".modal-wiplash-mark").isVisible(), "The Wiplash.ai action should show the Wiplash mark");
  assert(await signInDialog.getByRole("status").count() === 0, "A healthy sign-in service should not show a redundant readiness message");
  assert(!(await signInDialog.innerText()).includes("ecosystem"), "The sign-in modal should avoid ecosystem marketing copy");
  await page.screenshot({ path: "artifacts/sign-in-modal-smoke.png", fullPage: true });
  await signInDialog.getByRole("button", { name: "Keep creating without an account" }).click();
  await signInDialog.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Ask AI" }).click();
  await page.getByText("Connect your AI", { exact: true }).waitFor();
  assert(await page.getByText("Connect your AI", { exact: true }).isVisible(), "AI should present one clear connection entry");
  assert(await page.locator('input[type="password"]').count() === 0, "The editor must not expose a provider credential input");
  assert(!(await page.locator("body").innerText()).includes("Preview"), "Account surfaces should not use prototype preview language");
  assert(!(await page.locator("body").innerText()).includes("Sandbox ready"), "The editor should not describe itself as a sandbox");

  await page.reload({ waitUntil: "networkidle" });
  assert(await page.getByRole("button", { name: "Sign in", exact: true }).isVisible(), "Continuing without an account should stay accountless after reload");
  await page.screenshot({ path: "artifacts/account-ai-connections-smoke.png", fullPage: true });

  mockAccountAuthenticated = true;
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByTitle("Open Page 1").click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "smoke.png" }).locator(".layer-main").click();
  const layersBeforeRegionEdit = await page.locator(".layer-row").count();
  await page.getByRole("button", { name: "AI region edit" }).click();
  const regionDialog = page.getByRole("dialog", { name: "Paint what may change." });
  await regionDialog.waitFor();
  const regionSurface = regionDialog.locator(".region-edit-surface");
  const regionBox = await regionSurface.boundingBox();
  assert(regionBox, "Region editing should expose a brushable selected-image surface");
  await page.mouse.move(regionBox.x + regionBox.width * 0.35, regionBox.y + regionBox.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(regionBox.x + regionBox.width * 0.62, regionBox.y + regionBox.height * 0.48, { steps: 8 });
  await page.mouse.up();
  assert(await regionDialog.locator(".region-selection-stroke.hide").count() === 1, "Region editing should create an explicit editable selection stroke");
  await regionDialog.getByLabel("Region edit prompt").fill("Remove the selected distraction and reconstruct the background");
  await regionDialog.getByRole("button", { name: "Edit selected region" }).click();
  await regionDialog.waitFor({ state: "detached" });
  assert(mockRegionEditRequests.length === 1, "A painted region should create exactly one protected image-edit job");
  assert(mockRegionEditRequests[0].sourceDataUrl.startsWith("data:image/png;base64,") && mockRegionEditRequests[0].maskDataUrl.startsWith("data:image/png;base64,"), "The region job should receive a bounded PNG crop and same-format alpha mask");
  assert(!Object.hasOwn(mockRegionEditRequests[0], "project"), "Region jobs should not receive the project bundle or unrelated layers");
  assert(await page.locator(".layer-row").count() === layersBeforeRegionEdit + 1, "The default safe result should add the edited raster as a new layer");
  assert((await page.locator(".asset-source-receipt.ai-edit-receipt").innerText()).toLowerCase().includes("gpt-image-2"), "The edited layer should retain provider and model provenance without the prompt");
  await page.getByRole("button", { name: "Undo" }).click();
  assert(await page.locator(".layer-row").count() === layersBeforeRegionEdit, "Normal undo should remove the new region-edit layer");
  await page.getByRole("button", { name: "Redo" }).click();
  assert(await page.locator(".layer-row").count() === layersBeforeRegionEdit + 1, "Normal redo should restore the region-edit layer");
  const visibleLayersBeforeBulk = await page.locator(".layer-row").count();
  await page.getByRole("button", { name: "Hide all layers" }).click();
  assert(await page.locator(".layer-row svg.lucide-eye-off").count() === visibleLayersBeforeBulk, "Hide all should hide the complete layer stack");
  await page.getByRole("button", { name: "Show all layers" }).click();
  await page.getByRole("button", { name: "Lock all layers", exact: true }).click();
  assert(await page.locator(".layer-row svg.lucide-lock").count() === visibleLayersBeforeBulk, "Lock all should protect the complete layer stack");
  await page.getByRole("button", { name: "Unlock all layers", exact: true }).click();
  const layersBeforeAi = await page.locator(".layer-row").count();
  const revisionBeforeAi = Number((await page.locator(".local-status").innerText()).match(/Revision (\d+)/)?.[1]);
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  const aiWidget = page.getByRole("region", { name: "GlassWare AI creative workspace" });
  await aiWidget.waitFor();
  assert((await page.locator(".toolrail button.active").innerText()) === "Layers", "Opening Ask AI should not replace the active left sidebar");
  const reasoningMenu = aiWidget.getByRole("button", { name: "Reasoning effort: Low" });
  assert(await reasoningMenu.isVisible(), "New AI chats should default to Low reasoning in a custom menu");
  await reasoningMenu.click();
  assert(await aiWidget.getByRole("option", { name: /^Low/ }).isVisible(), "The reasoning setting should open a custom listbox");
  assert(await aiWidget.getByRole("option", { name: /None|Default/ }).count() === 0, "Reasoning choices should not show None or Default");
  await aiWidget.getByRole("option", { name: /^Low/ }).click();
  const widgetBeforeDrag = await aiWidget.boundingBox();
  const titlebar = aiWidget.locator(".ai-widget-titlebar");
  const titlebarBox = await titlebar.boundingBox();
  await page.mouse.move(titlebarBox.x + 180, titlebarBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(titlebarBox.x + 100, titlebarBox.y + 70, { steps: 5 });
  await page.mouse.up();
  const widgetAfterDrag = await aiWidget.boundingBox();
  assert(Math.abs(widgetAfterDrag.x - widgetBeforeDrag.x) >= 50, "Ask AI should move with its draggable title bar");
  await aiWidget.getByRole("button", { name: "Minimize Ask AI" }).click();
  assert((await aiWidget.getAttribute("class")).includes("minimized"), "Ask AI should minimize into a compact widget");
  await aiWidget.getByRole("button", { name: "Restore Ask AI" }).click();
  await aiWidget.locator('input[type="file"]').setInputFiles({ name: "brief.md", mimeType: "text/markdown", buffer: Buffer.from("# Keep the label minimal and high contrast") });
  await aiWidget.getByRole("button", { name: "Remove brief.md" }).waitFor();
  assert(await aiWidget.getByRole("button", { name: "Remove brief.md" }).isVisible(), "Ask AI should accept Markdown references");
  await aiWidget.getByLabel("Message GlassWare AI").fill("Add an AUTONOMOUS AI label and inspect the result.");
  await aiWidget.getByRole("button", { name: "Send to GlassWare AI" }).click();
  await aiWidget.getByText("Artboard updated", { exact: true }).waitFor();
  assert(mockAiRequests.length === 5, "The AI agent should run focused edit, layout, image, preflight, and completion steps without another approval");
  assert(mockAiRequests[0].attachments.some((attachment) => attachment.name === "brief.md"), "The first AI pass should receive the uploaded Markdown reference");
  assert(mockAiRequests.every((request) => request.attachments.some((attachment) => attachment.name.startsWith("glassware-artboard-pass-"))), "Every AI pass should receive a clean rendered artboard preview");
  assert(!Object.hasOwn(mockAiRequests[0].project, "revisions"), "AI requests should omit project revision history");
  assert(mockAiRequests[1].agentContext.sessionId === "019ff774-a54d-7313-b3df-5f2ab8c0484f", "Later visual steps should resume the same Codex thread");
  assert(mockAiRequests[0].project.capabilities.operations.includes("set_image_mask"), "The AI context should advertise native image masks");
  assert(mockAiRequests[0].project.capabilities.operations.includes("insert_component"), "The AI context should advertise reusable component insertion");
  assert(mockAiRequests[0].project.capabilities.operations.includes("inspect_export"), "The AI context should advertise export preflight");
  assert(mockAiRequests[0].project.components.length === 1 && mockAiRequests[0].project.brandKits.length === 1, "The agent should receive the saved component and brand-kit catalogs");
  assert(mockAiRequests[1].agentContext.completedSteps.length === 3, "The next Codex turn should receive the completed focused-step labels");
  assert(mockAiRequests[1].project.objects.length === mockAiRequests[0].project.objects.length + 3, "The second visual step should inspect the first focused batch");
  assert(mockAiRequests[2].project.canvas.guides.some((guide) => guide.axis === "x"), "The next visual review should receive the guide added by the agent");
  assert(mockAiRequests[2].project.objects.filter((object) => object.name.startsWith("Add the AI label")).every((object) => object.groupId), "The next visual review should receive the editable AI group");
  assert(mockAiRequests[3].project.objects.length === mockAiRequests[0].project.objects.length + 4, "The image-tool pass should receive every prior edit including the generated image");
  const reviewedTexture = mockAiRequests[4].project.objects.find((object) => object.name === "AI texture");
  assert(reviewedTexture.adjustments.temperature === 0.25 && reviewedTexture.adjustments.sharpen === 0.4, "The final agent review should receive non-destructive image adjustments");
  assert(reviewedTexture.mask.strokes.length === 1, "The final agent review should receive the native image mask stroke");
  assert(mockAiRequests[4].agentContext.completedSteps.some((step) => step.includes("Export preflight found")), "The completion pass should receive the export preflight receipt");
  assert((await aiWidget.innerText()).includes("1 image generated") && (await aiWidget.innerText()).includes("1 open image added"), "AI completion should explicitly receipt generated and reusable images");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  assert(await page.locator(".layer-row").count() === layersBeforeAi + 4, "A completed AI session should create real canvas layers for every supported media path");
  const revisionAfterAi = Number((await page.locator(".local-status").innerText()).match(/Revision (\d+)/)?.[1]);
  assert(revisionAfterAi === revisionBeforeAi + 1, "A multi-pass AI session should commit exactly one project revision");
  await aiWidget.getByRole("button", { name: "Undo AI edits" }).click();
  assert(await page.locator(".layer-row").count() === layersBeforeAi, "Undo AI edits should reverse the complete session in one action");
  assert(await aiWidget.getByRole("button", { name: "Redo AI edits" }).isEnabled(), "Undoing an AI session should expose a redo action");
  await page.keyboard.press("Control+Shift+z");
  assert(await page.locator(".layer-row").count() === layersBeforeAi + 4, "Ctrl+Shift+Z should restore an undone AI session");
  await aiWidget.getByRole("button", { name: "Undo AI edits" }).click();
  await aiWidget.getByRole("button", { name: "Redo AI edits" }).click();
  assert(await page.locator(".layer-row").count() === layersBeforeAi + 4, "Redo AI edits should restore the complete session in one action");
  const revisionBeforeCancellation = Number((await page.locator(".local-status").innerText()).match(/Revision (\d+)/)?.[1]);
  const layersBeforeCancellation = await page.locator(".layer-row").count();
  await aiWidget.getByLabel("Message GlassWare AI").fill("CANCEL SAFETY: make a change that must never be committed.");
  await aiWidget.getByRole("button", { name: "Send to GlassWare AI" }).click();
  await page.waitForFunction(() => window.fetch !== undefined);
  await aiWidget.getByRole("button", { name: "Cancel AI run" }).click();
  await aiWidget.getByText("AI run cancelled. No partial AI edits were kept.", { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector(".ai-run-editor-lock") === null);
  assert(mockCancelledAiJobs.has("mock-ai-cancel"), "Cancelling from Ask AI should cancel the active protected runner job");
  assert(await page.locator(".layer-row").count() === layersBeforeCancellation, "Cancelling AI should preserve the pre-run layer stack");
  const revisionAfterCancellation = Number((await page.locator(".local-status").innerText()).match(/Revision (\d+)/)?.[1]);
  assert(revisionAfterCancellation === revisionBeforeCancellation, "Cancelling AI should not create a project revision");

  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByRole("button", { name: "Try Studio Playground" }).click();
  await page.waitForFunction(() => document.querySelector(".project-name input")?.value === "Studio Playground");
  assert(await page.locator(".toolrail button.active").innerText() === "Studio", "The Studio Playground should open directly in Studio");
  assert(await page.locator(".inspector").getByText("Studio dashboard screenshot", { exact: true }).isVisible(), "The sample screenshot should be selected");
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "0", "The sample screenshot should start with neutral styling");
  await page.getByRole("button", { name: "Photo White print border" }).click();
  await page.getByRole("button", { name: "Strong", exact: true }).click();
  assert(await page.getByRole("slider", { name: "Radius" }).inputValue() === "3", "The sample should accept Studio looks immediately");
  await page.screenshot({ path: "artifacts/studio-playground-smoke.png", fullPage: true });
  assert(browserErrors.length === 0, `Browser emitted errors:\n${browserErrors.join("\n")}`);
  process.stdout.write("GlassWare browser smoke passed: responsive landing/privacy pages, compact footer and guide controls, visible region blur and secure redaction, multi-select/groups, precision crop and masks, protected region-aware raster edits, Studio, portable exports, shared sign-in, and resumable/cancellable AI editing with undo/redo.\n");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
