import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "../src/lib/model";
import {
  listAssets,
  listProjects,
  loadAsset,
  loadProject,
  resetStorageForTests,
  saveAsset,
  saveProject,
  type StoredAsset,
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
});
