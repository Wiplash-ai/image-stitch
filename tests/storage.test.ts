import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "../src/lib/model";
import {
  listAssets,
  listBrandKits,
  listComponents,
  listAllAiConversations,
  listAiConversations,
  listAiRuns,
  loadAiRun,
  listFontAssets,
  listProjects,
  loadAsset,
  loadProject,
  resetStorageForTests,
  saveAsset,
  saveBrandKit,
  saveComponent,
  saveAiConversation,
  saveAiRun,
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

  it("keeps AI conversation history scoped to its project", async () => {
    const project = createProject("Conversation project", false);
    const otherProject = createProject("Other project", false);
    await saveAiConversation({
      id: "conversation-1",
      projectId: project.id,
      projectName: project.name,
      accountId: "account-1",
      title: "Add a launch headline",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:01:00.000Z",
      agentSessionId: "019ff774-a54d-7313-b3df-5f2ab8c0484f",
      messages: [{
        id: "message-1",
        role: "user",
        content: "Add a launch headline",
        status: "sent",
        createdAt: "2026-08-20T10:00:00.000Z",
      }],
    });
    expect((await listAiConversations(project.id))[0]).toMatchObject({ title: "Add a launch headline" });
    expect((await listAllAiConversations())[0]).toMatchObject({ projectName: project.name, accountId: "account-1" });
    expect(await listAiConversations(otherProject.id)).toEqual([]);
  });

  it("stores local brand kits and project-scoped reusable components", async () => {
    const project = createProject("Library project");
    await saveBrandKit({
      id: "kit-1", name: "Mom's colors", colors: ["#111111", "#ff4b4b"], fontFamilies: ["Helvetica"],
      createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z",
    });
    await saveComponent({
      id: "component-1", projectId: project.id, name: "Headline lockup",
      objects: project.objects.slice(0, 1), createdAt: "2026-08-21T00:00:00.000Z",
    });
    expect((await listBrandKits())[0]).toMatchObject({ name: "Mom's colors", colors: ["#111111", "#ff4b4b"] });
    expect((await listComponents(project.id))[0]).toMatchObject({ name: "Headline lockup", projectId: project.id });
    expect(await listComponents(createProject("Other", false).id)).toEqual([]);
  });

  it("persists local-only AI run receipts and recovery state", async () => {
    const project = createProject("AI recovery project", false);
    await saveAiRun({
      id: "run-1",
      projectId: project.id,
      baseRevisionId: project.currentRevisionId,
      status: "running",
      startedAt: "2026-08-21T10:00:00.000Z",
      updatedAt: "2026-08-21T10:01:00.000Z",
      currentPass: 1,
      activeJobId: "job-1",
      prompt: "Create a poster",
      connectionId: "connection-1",
      model: "gpt-5.6-luna",
      reasoningEffort: "low",
      completedSteps: ["Headline added"],
      receipts: [{
        pass: 1,
        jobId: "job-1",
        status: "applied",
        startedAt: "2026-08-21T10:00:00.000Z",
        finishedAt: "2026-08-21T10:01:00.000Z",
        summary: "Add the headline",
        assessment: "The hierarchy now has a clear lead.",
        appliedOperations: ["Headline added"],
        skippedOperations: [],
        qualityFindings: ["Automatic QA: no blocking issues"],
      }],
      originalProject: project,
      draftProject: project,
    });
    expect(await loadAiRun("run-1")).toMatchObject({ status: "running", activeJobId: "job-1" });
    expect((await listAiRuns(project.id))[0].receipts[0].appliedOperations).toEqual(["Headline added"]);
  });
});
