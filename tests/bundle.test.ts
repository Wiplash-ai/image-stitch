import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "../src/lib/model";
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
      schemaVersion: "imagestitch.bundle.v1",
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
    await expect(readProjectBundle('{"hello":"world"}')).rejects.toThrow("valid ImageStitch");
  });
});
