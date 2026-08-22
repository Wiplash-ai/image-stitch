import { describe, expect, it } from "vitest";
import {
  commitAiProjectSession,
  findLatestRedoableAiRevision,
  findLatestUndoableAiRevision,
  redoLatestAiSession,
  undoLatestAiSession,
} from "../src/lib/ai-undo";
import { addProjectPage, commitSnapshot, createProject, newId, normalizeProject, renameProjectPage, type ShapeDesignNode, type TextDesignNode } from "../src/lib/model";

function shape(): ShapeDesignNode {
  return {
    id: newId(), kind: "shape", name: "AI accent", shape: "rect", fill: "#111111",
    x: 100, y: 100, width: 180, height: 40, rotation: 0, scaleX: 1, scaleY: 1,
    opacity: 1, visible: true, locked: false, cornerRadius: 0,
  };
}

function text(): TextDesignNode {
  return {
    id: newId(), kind: "text", name: "Manual note", text: "Keep me", fill: "#111111",
    x: 80, y: 300, width: 400, height: 90, rotation: 0, scaleX: 1, scaleY: 1,
    opacity: 1, visible: true, locked: false, fontFamily: "Helvetica", fontSize: 42,
    fontStyle: "normal", align: "left", lineHeight: 1.1,
  };
}

describe("AI session undo", () => {
  it("undoes the current AI revision through normal history", () => {
    const original = createProject("Undo AI", false);
    const ai = commitSnapshot(original, "AI session: Add an accent", { canvas: original.canvas, objects: [shape()] });
    expect(findLatestUndoableAiRevision(ai)?.revision.id).toBe(ai.currentRevisionId);
    const result = undoLatestAiSession(ai)!;
    expect(result.selective).toBe(false);
    expect(result.project.objects).toHaveLength(0);
    expect(findLatestRedoableAiRevision(result.project)?.revision.id).toBe(ai.currentRevisionId);
    const redone = redoLatestAiSession(result.project)!;
    expect(redone.selective).toBe(false);
    expect(redone.project.objects).toHaveLength(1);
    expect(findLatestUndoableAiRevision(redone.project)?.revision.id).toBe(ai.currentRevisionId);
  });

  it("selectively removes AI work while preserving later manual edits", () => {
    const original = createProject("Selective AI undo", false);
    const accent = shape();
    const ai = commitSnapshot(original, "AI session: Add an accent", { canvas: original.canvas, objects: [accent] });
    const manual = text();
    const later = commitSnapshot(ai, "Text added", { canvas: ai.canvas, objects: [...ai.objects, manual] });
    const result = undoLatestAiSession(later)!;
    expect(result.selective).toBe(true);
    expect(result.conflictCount).toBe(0);
    expect(result.project.objects).toEqual([expect.objectContaining({ id: manual.id, text: "Keep me" })]);
    expect(findLatestUndoableAiRevision(result.project)).toBeNull();
    expect(findLatestRedoableAiRevision(result.project)?.revision.id).toBe(ai.currentRevisionId);

    const redone = redoLatestAiSession(result.project)!;
    expect(redone.selective).toBe(true);
    expect(redone.conflictCount).toBe(0);
    expect(redone.project.objects.map((object) => object.id)).toEqual([accent.id, manual.id]);
    expect(findLatestUndoableAiRevision(redone.project)?.revision.id).toBe(ai.currentRevisionId);
  });

  it("keeps later manual changes to an AI-created layer and reports the conflict", () => {
    const original = createProject("AI conflict", false);
    const accent = shape();
    const ai = commitSnapshot(original, "AI session: Add an accent", { canvas: original.canvas, objects: [accent] });
    const changed = { ...accent, x: 420 };
    const later = commitSnapshot(ai, "Accent moved manually", { canvas: ai.canvas, objects: [changed] });
    const result = undoLatestAiSession(later)!;
    expect(result.conflictCount).toBe(1);
    expect(result.project.objects[0]).toMatchObject({ id: accent.id, x: 420 });
    const redone = redoLatestAiSession(result.project)!;
    expect(redone.conflictCount).toBe(1);
    expect(redone.project.objects[0]).toMatchObject({ id: accent.id, x: 420 });
  });

  it("undoes and redoes a complete multi-page AI transaction, including after persistence", () => {
    const original = createProject("AI pages", false);
    let draft = addProjectPage(original, false);
    const accent = shape();
    draft = { ...draft, objects: [accent], pages: draft.pages.map((page) => page.id === draft.activePageId ? { ...page, objects: [accent] } : page) };
    draft = renameProjectPage(draft, draft.activePageId, "AI campaign");
    const committed = commitAiProjectSession(original, draft, "Create the campaign page");
    expect(committed.pages).toHaveLength(2);
    expect(committed.objects).toEqual([expect.objectContaining({ id: accent.id })]);
    expect(findLatestUndoableAiRevision(committed)?.revision.aiProjectTransaction).toBeTruthy();

    const persisted = normalizeProject(JSON.parse(JSON.stringify(committed)))!;
    const undone = undoLatestAiSession(persisted)!;
    expect(undone.conflictCount).toBe(0);
    expect(undone.project.pages).toHaveLength(1);
    expect(undone.project.activePageId).toBe(original.activePageId);
    expect(undone.project.objects).toHaveLength(0);

    const redone = redoLatestAiSession(undone.project)!;
    expect(redone.conflictCount).toBe(0);
    expect(redone.project.pages).toHaveLength(2);
    expect(redone.project.pages.find((page) => page.name === "AI campaign")?.objects).toEqual([expect.objectContaining({ id: accent.id })]);

    const renameDraft = renameProjectPage(redone.project, redone.project.activePageId, "Agent parity proof");
    const renamed = commitAiProjectSession(redone.project, renameDraft, "Rename the AI page");
    const renameRevisionId = renamed.currentRevisionId;
    const renameUndone = undoLatestAiSession(renamed)!;
    expect(renameUndone.project.pages.find((page) => page.id === renameUndone.project.activePageId)?.name).toBe("AI campaign");
    expect(findLatestRedoableAiRevision(renameUndone.project)?.revision.id).toBe(renameRevisionId);
    const renameRedone = redoLatestAiSession(renameUndone.project)!;
    expect(renameRedone.project.pages.find((page) => page.id === renameRedone.project.activePageId)?.name).toBe("Agent parity proof");
  });
});
