import { describe, expect, it } from "vitest";
import { applyAiEditPlan, createAiProjectContext } from "../src/lib/ai-plan";
import type { AiEditPlan } from "../src/lib/account-connections";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  DEFAULT_IMAGE_PRESENTATION,
  FULL_IMAGE_CROP,
  commitSnapshot,
  createProject,
  newId,
  undoProject,
  type ImageDesignNode,
} from "../src/lib/model";

const emptyFields = {
  targetId: null,
  text: null,
  color: null,
  shape: null,
  align: null,
  x: null,
  y: null,
  width: null,
  height: null,
  fontSize: null,
  imagePrompt: null,
};

describe("AI edit plan application", () => {
  it("sends only the current visual state instead of project revision history", () => {
    const original = createProject("Compact AI context");
    const project = commitSnapshot(original, "Another revision", {
      canvas: original.canvas,
      objects: original.objects,
    });
    const context = createAiProjectContext(project);
    expect(context.baseRevisionId).toBe(project.currentRevisionId);
    expect(context.objects).toHaveLength(project.objects.length);
    expect(context).not.toHaveProperty("revisions");
    expect(context.capabilities.operations).toContain("delete_object");
    expect(context.capabilities.operations).toContain("search_open_image");
    expect(context.capabilities.operations).toContain("set_image_presentation");
    expect(context.capabilities.operations).toContain("set_object_shadow");
    expect(context.capabilities.shapeKinds).toContain("redact");
    expect(context.capabilities.lockedLayersProtected).toBe(true);
    expect(JSON.stringify(context).length).toBeLessThan(JSON.stringify(project).length);
  });

  it("turns a bounded plan into real canvas objects and one undoable revision", () => {
    const project = createProject("AI canvas", false);
    const plan: AiEditPlan = {
      summary: "Create a launch graphic",
      rationale: "Use a high-contrast launch treatment.",
      assessment: "The blank canvas needs a complete composition.",
      done: false,
      operations: [
        { ...emptyFields, action: "set_canvas_background", label: "Set a dark background", color: "#111111" },
        { ...emptyFields, action: "add_text", label: "Add the launch headline", text: "Wiplash Labs\nLaunch Day", color: "#ffffff", x: 100, y: 120, width: 760, fontSize: 92, align: "left" },
        { ...emptyFields, action: "add_shape", label: "Add a red accent", shape: "rounded-rect", color: "#ff5d42", x: 100, y: 520, width: 220, height: 24 },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    expect(application.appliedOperations).toHaveLength(3);
    expect(application.snapshot.canvas.background).toBe("#111111");
    expect(application.snapshot.objects).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "text", text: "Wiplash Labs\nLaunch Day", fill: "#ffffff" }),
      expect.objectContaining({ kind: "shape", shape: "rounded-rect", fill: "#ff5d42" }),
    ]));

    const committed = commitSnapshot(project, `AI edits: ${plan.summary}`, application.snapshot);
    expect(committed.revisions).toHaveLength(2);
    expect(undoProject(committed).objects).toHaveLength(0);
  });

  it("updates known unlocked layers and skips unsafe or unavailable operations", () => {
    const project = createProject("AI update");
    const text = project.objects.find((object) => object.kind === "text")!;
    const lockedShape = project.objects.find((object) => object.kind === "shape")!;
    lockedShape.locked = true;
    const plan: AiEditPlan = {
      summary: "Refine the composition",
      rationale: "Update only editable layers.",
      assessment: "The headline needs stronger contrast.",
      done: false,
      operations: [
        { ...emptyFields, action: "update_object", label: "Update the headline", targetId: text.id, text: "A real AI edit", color: "#ff5d42", x: -100, fontSize: 120 },
        { ...emptyFields, action: "update_object", label: "Move the locked accent", targetId: lockedShape.id, x: 50 },
        { ...emptyFields, action: "add_shape", label: "Reject an unknown shape", shape: "not-a-shape" },
        { ...emptyFields, action: "set_canvas_background", label: "Reject an unsafe color", color: "url(javascript:alert(1))" },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    expect(application.appliedOperations).toEqual(["Update the headline"]);
    expect(application.skippedOperations).toHaveLength(3);
    expect(application.snapshot.objects.find((object) => object.id === text.id)).toMatchObject({
      kind: "text",
      text: "A real AI edit",
      fill: "#ff5d42",
      x: 0,
      fontSize: 120,
    });
  });

  it("deletes, duplicates, reorders, hides, and locks layers with protected-layer safety", () => {
    const project = createProject("AI layers");
    const [headline, accent, caption] = project.objects;
    const plan: AiEditPlan = {
      summary: "Organize the layer stack",
      rationale: "The requested composition needs a smaller stack.",
      assessment: "The caption is unnecessary and the headline belongs behind the accent.",
      done: false,
      operations: [
        { ...emptyFields, action: "delete_object", label: "Remove the caption", targetId: caption.id },
        { ...emptyFields, action: "reorder_object", label: "Move the headline behind the accent", targetId: headline.id, zIndex: 0 },
        { ...emptyFields, action: "update_object", label: "Hide and lock the accent", targetId: accent.id, visible: false, locked: true },
        { ...emptyFields, action: "duplicate_object", label: "Duplicate the headline", targetId: headline.id, name: "Headline echo", x: 160, y: 350 },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    expect(application.appliedOperations).toHaveLength(4);
    expect(application.snapshot.objects.some((object) => object.id === caption.id)).toBe(false);
    expect(application.snapshot.objects[0].id).toBe(headline.id);
    expect(application.snapshot.objects.find((object) => object.id === accent.id)).toMatchObject({ visible: false, locked: true });
    expect(application.snapshot.objects).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Headline echo", x: 160, y: 350 })]));
  });

  it("applies image adjustments, crop, Studio presentation, and whole-artwork styling", () => {
    const project = createProject("AI Studio", false);
    const image: ImageDesignNode = {
      id: newId(), kind: "image", name: "Screenshot", assetId: "asset-1",
      x: 100, y: 100, width: 600, height: 400, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
      crop: { ...FULL_IMAGE_CROP }, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      mask: { enabled: false, inverted: false, feather: 0, strokes: [] },
      presentation: { ...DEFAULT_IMAGE_PRESENTATION, frame: { ...DEFAULT_IMAGE_PRESENTATION.frame }, shadow: { ...DEFAULT_IMAGE_PRESENTATION.shadow } },
    };
    project.objects = [image];
    const plan: AiEditPlan = {
      summary: "Polish the screenshot",
      rationale: "Use GlassWare image and Studio controls.",
      assessment: "The screenshot needs crop, contrast, and presentation depth.",
      done: false,
      operations: [
        { ...emptyFields, action: "set_canvas_size", label: "Resize the canvas", width: 1400, height: 900 },
        { ...emptyFields, action: "set_image_adjustments", label: "Increase image contrast", targetId: image.id, contrast: 24, saturation: 0.3, grayscale: false },
        { ...emptyFields, action: "set_image_crop", label: "Crop the image", targetId: image.id, cropX: 0.1, cropY: 0.1, cropWidth: 0.8, cropHeight: 0.7 },
        { ...emptyFields, action: "set_image_presentation", label: "Frame the image", targetId: image.id, cornerRadius: 18, frameType: "macos-dark", frameTitle: "GlassWare", shadowEnabled: true, shadowBlur: 48 },
        { ...emptyFields, action: "set_artwork_presentation", label: "Present the artwork", presentationEnabled: true, presentationPadding: 70, backdropType: "gradient", backdropValue: "prism", backdropNoise: 0.1 },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    const edited = application.snapshot.objects[0] as ImageDesignNode;
    expect(application.snapshot.canvas).toMatchObject({ preset: "custom", width: 1400, height: 900 });
    expect(edited.adjustments).toMatchObject({ contrast: 24, saturation: 0.3 });
    expect(edited.crop).toEqual({ x: 0.1, y: 0.1, width: 0.8, height: 0.7 });
    expect(edited.presentation).toMatchObject({ cornerRadius: 18, frame: { type: "macos-dark", title: "GlassWare" }, shadow: { enabled: true, blur: 48 } });
    expect(application.snapshot.canvas.presentation).toMatchObject({ enabled: true, padding: 70, backdrop: { type: "gradient", value: "prism", noise: 0.1 } });
  });

  it("applies real shadows to editable text and shape layers", () => {
    const project = createProject("AI object shadows");
    const headline = project.objects.find((object) => object.kind === "text")!;
    const accent = project.objects.find((object) => object.kind === "shape")!;
    const plan: AiEditPlan = {
      summary: "Add dimensional depth",
      rationale: "The editable layers need separation from the background.",
      assessment: "The title and accent currently look flat.",
      done: false,
      operations: [
        { ...emptyFields, action: "set_object_shadow", label: "Add a soft headline shadow", targetId: headline.id, shadowEnabled: true, shadowBlur: 36, shadowOffsetY: 12, shadowOpacity: 0.26 },
        { ...emptyFields, action: "set_object_shadow", label: "Add a tight accent shadow", targetId: accent.id, shadowEnabled: true, shadowBlur: 14, shadowOffsetY: 5, shadowOpacity: 0.2 },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    expect(application.appliedOperations).toHaveLength(2);
    expect(application.snapshot.objects.find((object) => object.id === headline.id)).toMatchObject({ shadow: { enabled: true, blur: 36, offsetY: 12, opacity: 0.26 } });
    expect(application.snapshot.objects.find((object) => object.id === accent.id)).toMatchObject({ shadow: { enabled: true, blur: 14, offsetY: 5, opacity: 0.2 } });
  });

  it("gives the agent native layout, guide, transform, mask, blend, and batch-layer tools", () => {
    const project = createProject("AI parity");
    const image: ImageDesignNode = {
      id: newId(), kind: "image", name: "Portrait", assetId: "asset-parity",
      x: 240, y: 240, width: 420, height: 420, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
      crop: { ...FULL_IMAGE_CROP }, adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      mask: { enabled: false, inverted: false, feather: 0, strokes: [] },
      presentation: { ...DEFAULT_IMAGE_PRESENTATION, frame: { ...DEFAULT_IMAGE_PRESENTATION.frame }, shadow: { ...DEFAULT_IMAGE_PRESENTATION.shadow } },
    };
    project.objects.push(image);
    const [headline, accent, caption] = project.objects;
    const plan: AiEditPlan = {
      summary: "Use the precision editor",
      rationale: "The composition needs native layout and image treatment.",
      assessment: "Spacing and the portrait treatment are unfinished.",
      done: false,
      operations: [
        { ...emptyFields, action: "group_objects", label: "Group the copy", targetIds: [headline.id, caption.id] },
        { ...emptyFields, action: "align_objects", label: "Center the group", targetIds: [headline.id, caption.id], alignment: "center", alignmentReference: "canvas" },
        { ...emptyFields, action: "set_canvas_guides", label: "Add a center guide", guideAction: "add", guideAxis: "x", guidePosition: project.canvas.width / 2 },
        { ...emptyFields, action: "set_canvas_snapping", label: "Enable precise snapping", snapEnabled: true, snapGuides: true, snapThreshold: 10 },
        { ...emptyFields, action: "update_object", label: "Blend the accent", targetId: accent.id, blendMode: "multiply" },
        { ...emptyFields, action: "set_object_transform", label: "Flip the portrait", targetId: image.id, flipHorizontal: true, rotation: 8 },
        { ...emptyFields, action: "set_image_adjustments", label: "Warm and sharpen the portrait", targetId: image.id, temperature: 0.35, tint: -0.1, sharpen: 0.55, vignette: 0.2 },
        { ...emptyFields, action: "set_image_mask", label: "Mask the portrait edge", targetId: image.id, maskAction: "add_stroke", maskMode: "hide", maskSize: 32, maskFeather: 12, maskPoints: [0.1, 0.1, 0.2, 0.2, 0.3, 0.1] },
        { ...emptyFields, action: "set_layer_states", label: "Lock all layers", layerScope: "all", locked: true },
      ],
    };
    const application = applyAiEditPlan(project, plan);
    const editedImage = application.snapshot.objects.find((object) => object.id === image.id) as ImageDesignNode;
    expect(application.appliedOperations).toHaveLength(plan.operations.length);
    expect(application.snapshot.canvas).toMatchObject({ guides: [expect.objectContaining({ axis: "x", position: project.canvas.width / 2 })], snapping: { enabled: true, guides: true, threshold: 10 } });
    expect(application.snapshot.objects.filter((object) => object.id === headline.id || object.id === caption.id).every((object) => object.groupId)).toBe(true);
    expect(application.snapshot.objects.find((object) => object.id === accent.id)).toMatchObject({ blendMode: "multiply", locked: true });
    expect(editedImage).toMatchObject({ rotation: 8, scaleX: -1, locked: true, adjustments: { temperature: 0.35, tint: -0.1, sharpen: 0.55, vignette: 0.2 }, mask: { enabled: true, feather: 12 } });
    expect(editedImage.mask.strokes[0]).toMatchObject({ mode: "hide", size: 0.032, points: [0.1, 0.1, 0.2, 0.2, 0.3, 0.1] });
  });

  it("gives the agent page, template, component, brand-kit, and export-preflight resources", () => {
    const project = createProject("AI project tools", false);
    const componentSource = createProject("Component source").objects.slice(0, 2);
    const resources = {
      components: [{ id: "component-1", projectId: project.id, name: "Reusable lockup", objects: componentSource, createdAt: "2026-08-21T00:00:00.000Z" }],
      brandKits: [{ id: "brand-1", name: "Wiplash", colors: ["#111111", "#ff5d42"], fontFamilies: ["Helvetica"], createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z" }],
    };
    const first = applyAiEditPlan(project, {
      summary: "Create the campaign page", rationale: "Use an editable starting point.", assessment: "A second page is needed.", done: false,
      operations: [
        { ...emptyFields, action: "add_page", label: "Add a campaign page" },
        { ...emptyFields, action: "apply_template", label: "Apply the birthday template", templateId: "bold-birthday" },
        { ...emptyFields, action: "rename_page", label: "Name the campaign page", pageId: null, name: "Campaign" },
      ],
    }, resources);
    const activePageId = first.project.activePageId;
    const renamed = applyAiEditPlan(first.project, {
      summary: "Finish the campaign resources", rationale: "Use reusable project resources.", assessment: "The page needs its saved component and export check.", done: false,
      operations: [
        { ...emptyFields, action: "rename_page", label: "Name the campaign page", pageId: activePageId, name: "Campaign" },
        { ...emptyFields, action: "insert_component", label: "Insert the lockup", componentId: "component-1", x: 120, y: 120 },
        { ...emptyFields, action: "apply_brand_kit", label: "Apply the Wiplash kit", brandKitId: "brand-1", layerScope: "all", color: "#ff5d42", fontFamily: "Helvetica" },
        { ...emptyFields, action: "inspect_export", label: "Preflight the campaign PDF", exportFormat: "pdf", exportWidth: 2400, exportDpi: 300, exportAllPages: true },
      ],
    }, resources);
    const context = createAiProjectContext(renamed.project, resources);
    expect(renamed.project.pages).toHaveLength(2);
    expect(renamed.project.pages.find((page) => page.id === activePageId)?.name).toBe("Campaign");
    expect(renamed.addedObjectIds).toHaveLength(componentSource.length);
    expect(renamed.exportInspections[0]).toMatchObject({ format: "pdf", width: 2400, allPages: true });
    expect(renamed.receipts[0]).toMatch(/Export preflight found/);
    expect(context.templates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "bold-birthday" })]));
    expect(context.components).toEqual([expect.objectContaining({ id: "component-1", layerCount: 2 })]);
    expect(context.brandKits).toEqual([expect.objectContaining({ id: "brand-1" })]);
    expect(context.capabilities.operations).toEqual(expect.arrayContaining(["set_image_mask", "edit_image_region", "align_objects", "apply_template", "inspect_export"]));
  });
});
