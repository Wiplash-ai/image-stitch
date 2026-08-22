import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  commitSnapshot,
  createProject,
  normalizeProject,
  redoProject,
  setCanvasPreset,
  undoProject,
  SHAPE_KINDS,
  cloneImagePresentation,
  cloneArtworkPresentation,
  DEFAULT_IMAGE_ADJUSTMENTS,
  activatePage,
  addProjectPage,
  deleteProjectPage,
  reorderProjectPage,
} from "../src/lib/model";

describe("GlassWare project model", () => {
  it("creates a local square project with serializable starter layers", () => {
    const project = createProject("Birthday card");
    expect(project.schemaVersion).toBe("glassware.project.v1");
    expect(project.residency).toBe("local");
    expect(project.canvas).toMatchObject({ preset: "square", width: 1080, height: 1080 });
    expect(project.objects.map((object) => object.kind)).toEqual(["text", "shape", "text"]);
    expect(project.revisions).toHaveLength(1);
    expect(project.revisions[0].snapshot.objects).toEqual(project.objects);
  });

  it("commits a revision when the canvas preset changes", () => {
    const project = setCanvasPreset(createProject(), "story");
    expect(project.canvas).toMatchObject({ preset: "story", width: 1080, height: 1920 });
    expect(project.revisions).toHaveLength(2);
    expect(project.currentRevisionId).toBe(project.revisions[1].id);
    expect(canUndo(project)).toBe(true);
  });

  it("undoes and redoes complete canvas snapshots", () => {
    const first = createProject("Undo test", false);
    const second = commitSnapshot(first, "Background changed", {
      canvas: { ...first.canvas, background: "#123456" },
      objects: first.objects,
    });
    const undone = undoProject(second);
    expect(undone.canvas.background).toBe(first.canvas.background);
    expect(canRedo(undone)).toBe(true);
    expect(redoProject(undone).canvas.background).toBe("#123456");
  });

  it("drops the redo branch when a new edit follows undo", () => {
    const first = createProject("Branch test", false);
    const second = setCanvasPreset(first, "portrait");
    const third = setCanvasPreset(second, "story");
    const undone = undoProject(third);
    const branched = setCanvasPreset(undone, "landscape");
    expect(branched.revisions).toHaveLength(3);
    expect(branched.canvas.preset).toBe("landscape");
    expect(canRedo(branched)).toBe(false);
  });

  it("recovers the original localStorage-era project shape", () => {
    const recovered = normalizeProject({
      schemaVersion: "glassware.project.v1",
      id: "legacy-project",
      name: "Legacy",
      residency: "local",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      canvas: { preset: "square", width: 1080, height: 1080 },
      objects: [],
      revisions: [{ id: "legacy-revision", number: 1, createdAt: "2026-01-01T00:00:00.000Z", summary: "Created" }],
      currentRevisionId: "legacy-revision",
    });
    expect(recovered?.canvas.background).toBe("#ffffff");
    expect(recovered?.canvas.presentation).toEqual(cloneArtworkPresentation());
    expect(recovered?.revisions[0].snapshot.objects).toEqual([]);
  });

  it("migrates pre-rename project manifests to the GlassWare schema", () => {
    const project = createProject("Brand migration");
    const recovered = normalizeProject({ ...project, schemaVersion: "imagestitch.project.v1" });
    expect(recovered?.schemaVersion).toBe("glassware.project.v1");
    expect(recovered?.id).toBe(project.id);
  });

  it("adds non-destructive defaults when recovering a legacy image layer", () => {
    const project = createProject("Legacy image", false);
    const legacyImage = {
      id: crypto.randomUUID(), kind: "image", name: "Photo", assetId: crypto.randomUUID(),
      x: 0, y: 0, width: 400, height: 300, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
    };
    const recovered = normalizeProject({
      ...project,
      objects: [legacyImage],
      revisions: [{ ...project.revisions[0], snapshot: { canvas: project.canvas, objects: [legacyImage] } }],
    });
    expect(recovered?.objects[0]).toMatchObject({
      kind: "image",
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      presentation: cloneImagePresentation(),
      mask: { enabled: false, inverted: false, feather: 0, strokes: [] },
    });
  });

  it("keeps image presentation settings inside revision snapshots", () => {
    const project = createProject("Presentation history", false);
    const image = {
      id: crypto.randomUUID(), kind: "image" as const, name: "Screenshot", assetId: crypto.randomUUID(),
      x: 0, y: 0, width: 800, height: 500, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      presentation: cloneImagePresentation(),
      mask: { enabled: false, inverted: false, feather: 0, strokes: [] },
    };
    const added = commitSnapshot(project, "Image added", { canvas: project.canvas, objects: [image] });
    const styled = commitSnapshot(added, "Soft shadow", {
      canvas: added.canvas,
      objects: [{ ...image, presentation: { ...image.presentation, shadow: { ...image.presentation.shadow, enabled: true, blur: 48 } } }],
    });
    expect(styled.objects[0]).toMatchObject({ presentation: { shadow: { enabled: true, blur: 48 } } });
    expect(undoProject(styled).objects[0]).toMatchObject({ presentation: { shadow: { enabled: false } } });
    expect(redoProject(undoProject(styled)).objects[0]).toMatchObject({ presentation: { shadow: { enabled: true, blur: 48 } } });
  });

  it("keeps whole-artwork presentation settings inside revision snapshots", () => {
    const project = createProject("Artwork presentation", false);
    const styled = commitSnapshot(project, "Whole artwork floated", {
      canvas: {
        ...project.canvas,
        presentation: {
          ...cloneArtworkPresentation(project.canvas.presentation),
          enabled: true,
          padding: 96,
          background: "#c8d8ff",
        },
      },
      objects: project.objects,
    });

    expect(styled.canvas.presentation).toMatchObject({ enabled: true, padding: 96, background: "#c8d8ff" });
    expect(undoProject(styled).canvas.presentation.enabled).toBe(false);
    expect(redoProject(undoProject(styled)).canvas.presentation.padding).toBe(96);
    expect(setCanvasPreset(styled, "story").canvas.presentation).toMatchObject({ enabled: true, padding: 96 });
  });

  it("keeps rich artwork backdrops inside revision history", () => {
    const project = createProject("Gradient artwork", false);
    const styled = commitSnapshot(project, "Backdrop changed", {
      canvas: {
        ...project.canvas,
        presentation: {
          ...cloneArtworkPresentation(project.canvas.presentation),
          enabled: true,
          backdrop: {
            type: "gradient",
            value: "daybreak",
            opacity: 0.9,
            blur: 0,
            noise: 12,
          },
        },
      },
      objects: project.objects,
    });

    expect(styled.canvas.presentation.backdrop).toEqual({
      type: "gradient",
      value: "daybreak",
      opacity: 0.9,
      blur: 0,
      noise: 12,
    });
    expect(undoProject(styled).canvas.presentation.backdrop.value).toBe("#dedede");
    expect(redoProject(undoProject(styled)).canvas.presentation.backdrop.value).toBe("daybreak");
  });

  it("migrates legacy frame and artwork background settings", () => {
    const project = createProject("Legacy presentation", false);
    const recovered = normalizeProject({
      ...project,
      canvas: {
        ...project.canvas,
        presentation: {
          enabled: true,
          padding: 40,
          background: "#123456",
          frame: { type: "outline-dark", width: 3, color: "#111111" },
          shadow: project.canvas.presentation.shadow,
        },
      },
    });

    expect(recovered?.canvas.presentation).toMatchObject({
      background: "#123456",
      backdrop: { type: "solid", value: "#123456", opacity: 1, blur: 0, noise: 0 },
      frame: { type: "border-dark", width: 3, color: "#111111", padding: 0, title: "" },
    });
  });

  it("normalizes every shape in the starter element library", () => {
    for (const shape of SHAPE_KINDS) {
      const project = createProject(`Shape ${shape}`);
      const shapeNode = project.objects.find((object) => object.kind === "shape")!;
      const candidate = {
        ...project,
        objects: project.objects.map((object) => object.id === shapeNode.id ? { ...object, shape } : object),
      };
      expect(normalizeProject(candidate)?.objects.find((object) => object.kind === "shape")).toMatchObject({ shape });
    }
  });

  it("keeps page canvases, layers, and undo positions independent", () => {
    const original = createProject("Pages", false);
    const firstPageId = original.activePageId;
    const firstEdited = commitSnapshot(original, "First page color", {
      canvas: { ...original.canvas, background: "#ff0000" }, objects: original.objects,
    });
    const second = addProjectPage(firstEdited);
    const secondEdited = commitSnapshot(second, "Second page color", {
      canvas: { ...second.canvas, background: "#0000ff" }, objects: second.objects,
    });
    expect(undoProject(secondEdited).canvas.background).toBe("#ff0000");
    const firstAgain = activatePage(secondEdited, firstPageId);
    expect(firstAgain.canvas.background).toBe("#ff0000");
    expect(firstAgain.currentRevisionId).toBe(firstEdited.currentRevisionId);
  });

  it("duplicates, reorders, and deletes pages without reusing layer ids", () => {
    const project = createProject("Page commands");
    const duplicate = addProjectPage(project, true);
    expect(duplicate.pages).toHaveLength(2);
    expect(duplicate.pages[1].objects.map((object) => object.id)).not.toEqual(duplicate.pages[0].objects.map((object) => object.id));
    const reordered = reorderProjectPage(duplicate, duplicate.activePageId, -1);
    expect(reordered.pages[0].id).toBe(duplicate.activePageId);
    const deleted = deleteProjectPage(reordered, reordered.activePageId);
    expect(deleted.pages).toHaveLength(1);
    expect(deleted.activePageId).toBe(project.activePageId);
  });
});
