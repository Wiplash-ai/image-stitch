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
      adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false, sepia: false },
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
});
