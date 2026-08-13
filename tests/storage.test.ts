import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "../src/lib/model";
import {
  listAssets,
  listFontAssets,
  listProjects,
  loadAsset,
  loadProject,
  resetStorageForTests,
  saveAsset,
  saveFontAsset,
  saveProject,
  type StoredAsset,
  type StoredFontAsset,
} from "../src/lib/storage";

afterEach(async () => {
  await resetStorageForTests();
});

describe("local project storage", () => {
  it("round-trips projects through IndexedDB", async () => {
    const project = createProject("Stored project", false);
    await saveProject(project);
    expect((await loadProject(project.id))?.name).toBe("Stored project");
    expect((await listProjects()).map((item) => item.id)).toEqual([project.id]);
  });

  it("stores image blobs separately from project JSON", async () => {
    const project = createProject("Asset project", false);
    const asset: StoredAsset = {
      id: "asset-1",
      projectId: project.id,
      name: "tiny.png",
      mimeType: "image/png",
      size: 4,
      width: 1,
      height: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      blob: new Blob(["tiny"], { type: "image/png" }),
    };
    await saveAsset(asset);
    expect((await loadAsset(asset.id))?.blob).toBeInstanceOf(Blob);
    expect((await listAssets(project.id)).map((item) => item.name)).toEqual(["tiny.png"]);
  });

  it("stores installed font bytes for offline use", async () => {
    const font: StoredFontAsset = {
      id: "upload:mom-display",
      family: "Mom Display",
      name: "Mom-Display.woff2",
      source: "upload",
      license: "User supplied",
      createdAt: "2026-08-13T00:00:00.000Z",
      faces: [{ mimeType: "font/woff2", size: 4, style: "normal", weight: "400", blob: new Blob(["font"], { type: "font/woff2" }) }],
    };
    await saveFontAsset(font);
    const stored = await listFontAssets();
    expect(stored[0]).toMatchObject({ id: font.id, family: "Mom Display" });
    expect(stored[0].faces[0].blob).toBeInstanceOf(Blob);
  });
});
