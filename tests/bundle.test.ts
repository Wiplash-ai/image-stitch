import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { cloneImagePresentation, createProject } from "../src/lib/model";
import { readProjectBundle } from "../src/lib/bundle";
import { resetStorageForTests } from "../src/lib/storage";

afterEach(async () => {
  await resetStorageForTests();
});

describe("portable project bundles", () => {
  it("imports as a copy and remaps project and asset identifiers", async () => {
    const source = createProject("Postcard", false);
    const assetId = crypto.randomUUID();
    source.objects.push({
      id: crypto.randomUUID(),
      kind: "image",
      name: "Photo",
      assetId,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false, sepia: false },
      presentation: cloneImagePresentation(),
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
    });
    source.revisions[0].snapshot.objects = source.objects.map((object) => ({ ...object }));
    const imported = await readProjectBundle(JSON.stringify({
      schemaVersion: "glassware.bundle.v1",
      exportedAt: "2026-01-01T00:00:00.000Z",
      project: source,
      assets: [{
        id: assetId,
        projectId: source.id,
        name: "dot.png",
        mimeType: "image/png",
        size: 1,
        width: 1,
        height: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        dataUrl: "data:image/png;base64,AA==",
      }],
    }));
    expect(imported.project.id).not.toBe(source.id);
    expect(imported.project.name).toBe("Postcard copy");
    expect(imported.assets[0].id).not.toBe(assetId);
    expect(imported.project.objects[0]).toMatchObject({ kind: "image", assetId: imported.assets[0].id });
  });

  it("rejects unrelated JSON", async () => {
    await expect(readProjectBundle('{"hello":"world"}')).rejects.toThrow("valid GlassWare");
  });

  it("imports pre-rename bundles without carrying the old schema forward", async () => {
    const source = createProject("Old brand", false);
    const imported = await readProjectBundle(JSON.stringify({
      schemaVersion: "imagestitch.bundle.v1",
      exportedAt: "2026-08-13T00:00:00.000Z",
      project: { ...source, schemaVersion: "imagestitch.project.v1" },
      assets: [],
    }));
    expect(imported.project.schemaVersion).toBe("glassware.project.v1");
  });

  it("restores embedded font files from a portable project", async () => {
    const source = createProject("Font card", false);
    const imported = await readProjectBundle(JSON.stringify({
      schemaVersion: "glassware.bundle.v1",
      exportedAt: "2026-08-13T00:00:00.000Z",
      project: source,
      assets: [],
      fonts: [{
        id: "google:dm-sans",
        family: "DM Sans",
        name: "DM Sans",
        source: "google",
        sourceUrl: "https://fonts.google.com/specimen/DM+Sans",
        license: "Open source via Google Fonts",
        createdAt: "2026-08-13T00:00:00.000Z",
        faces: [{ mimeType: "font/woff2", size: 1, style: "normal", weight: "400", dataUrl: "data:font/woff2;base64,AA==" }],
      }],
    }));
    expect(imported.fonts[0]).toMatchObject({ family: "DM Sans", source: "google" });
    expect(imported.fonts[0].faces[0].blob).toBeInstanceOf(Blob);
  });
});
