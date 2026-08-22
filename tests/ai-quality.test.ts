import { describe, expect, it } from "vitest";
import { assessAiQuality } from "../src/lib/ai-quality";
import { addProjectPage, createProject } from "../src/lib/model";
import { createTemplateSnapshot } from "../src/lib/templates";

describe("AI quality checks", () => {
  it("reports clipping, edge safety, low contrast, and low source resolution", () => {
    const project = createProject();
    const template = createTemplateSnapshot("clean-announcement")!;
    const text = { ...template.objects.find((object) => object.kind === "text")!, x: -20, fill: "#ffffff" };
    const image = {
      ...template.objects[0],
      id: crypto.randomUUID(),
      kind: "image" as const,
      name: "Tiny source",
      assetId: "asset-1",
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, sharpen: 0, vignette: 0, blur: 0, grayscale: false, sepia: false },
      presentation: { cornerRadius: 0, frame: { type: "none" as const, width: 0, color: "#111111", opacity: 1, padding: 0, title: "" }, shadow: { enabled: false, color: "#111111", blur: 0, offsetX: 0, offsetY: 0, opacity: 0 } },
      mask: { enabled: false, inverted: false, feather: 0, strokes: [] },
      width: 800,
      height: 800,
    };
    const next = { ...project, canvas: { ...template.canvas, background: "#ffffff" }, objects: [text, image] };
    const report = assessAiQuality(next, { assets: new Map([["asset-1", { width: 200, height: 200 }]]) });
    expect(report.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["clipped", "safe-zone", "low-contrast", "low-resolution"]));
  });

  it("gates explicit page, group, guide, snapping, generation, and preflight requests", () => {
    const original = createProject();
    const addedPage = addProjectPage(original);
    const template = createTemplateSnapshot("bold-birthday")!;
    const withPage = {
      ...addedPage,
      canvas: template.canvas,
      objects: template.objects,
      pages: addedPage.pages.map((page) => page.id === addedPage.activePageId ? { ...page, name: "Agent proof", canvas: template.canvas, objects: template.objects } : page),
    };
    const activeObjects = withPage.objects.map((object, index) => index < 2 ? { ...object, groupId: "group-1" } : object);
    const project = {
      ...withPage,
      objects: activeObjects,
      canvas: { ...withPage.canvas, guides: [{ id: "guide-1", axis: "x" as const, position: withPage.canvas.width / 2 }], snapping: { ...withPage.canvas.snapping, enabled: true } },
      pages: withPage.pages.map((page) => page.id === withPage.activePageId ? { ...page, name: "Agent proof", objects: activeObjects } : page),
    };
    const report = assessAiQuality(project, {
      originalProject: original,
      prompt: "Create a new page and name it Agent proof, group layers, add a vertical center guide with snapping, generate an image, then preflight PDF export.",
      generatedImageCount: 1,
      completedSteps: ["Export preflight found no blocking issues."],
    });
    expect(report.requestChecks.length).toBeGreaterThanOrEqual(6);
    expect(report.blockingFailures).toEqual([]);
  });
});
