import {
  canRedo,
  cloneImageMask,
  commitSnapshot,
  currentRevisionIndex,
  redoProject,
  undoProject,
  newId,
  type DesignNode,
  type GlassWareProject,
  type ProjectDocumentState,
  type ProjectSnapshot,
  type Revision,
} from "./model";

const AI_SESSION_PREFIX = "AI session:";
const AI_UNDO_PREFIX = "AI undo:";
const AI_REDO_PREFIX = "AI redo:";

export interface AiUndoTarget {
  revision: Revision;
  index: number;
}

export interface AiUndoResult {
  project: GlassWareProject;
  undoneRevisionId: string;
  selective: boolean;
  conflictCount: number;
}

export interface AiRedoResult {
  project: GlassWareProject;
  redoneRevisionId: string;
  selective: boolean;
  conflictCount: number;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneNode(object: DesignNode): DesignNode {
  return object.kind === "image"
    ? {
        ...object,
        crop: { ...object.crop },
        adjustments: { ...object.adjustments },
        presentation: {
          ...object.presentation,
          frame: { ...object.presentation.frame },
          shadow: { ...object.presentation.shadow },
        },
        mask: cloneImageMask(object.mask),
      }
    : { ...object, ...(object.shadow ? { shadow: { ...object.shadow } } : {}) };
}

function cloneDocumentState(state: ProjectDocumentState): ProjectDocumentState {
  return {
    activePageId: state.activePageId,
    pages: state.pages.map((page) => ({
      id: page.id,
      name: page.name,
      currentRevisionId: page.currentRevisionId,
      canvas: { ...page.canvas, presentation: { ...page.canvas.presentation, frame: { ...page.canvas.presentation.frame }, shadow: { ...page.canvas.presentation.shadow }, backdrop: { ...page.canvas.presentation.backdrop } }, guides: page.canvas.guides.map((guide) => ({ ...guide })), snapping: { ...page.canvas.snapping } },
      objects: page.objects.map(cloneNode),
    })),
  };
}

function projectDocumentState(project: GlassWareProject): ProjectDocumentState {
  return cloneDocumentState({
    activePageId: project.activePageId,
    pages: project.pages.map((page) => page.id === project.activePageId
      ? { id: page.id, name: page.name, currentRevisionId: project.currentRevisionId, canvas: project.canvas, objects: project.objects }
      : page),
  });
}

function documentVisual(state: ProjectDocumentState) {
  return {
    activePageId: state.activePageId,
    pages: state.pages.map(({ currentRevisionId: _currentRevisionId, ...page }) => page),
  };
}

function pageVisual(page: ProjectDocumentState["pages"][number] | undefined) {
  if (!page) return null;
  const { currentRevisionId: _currentRevisionId, ...visual } = page;
  return visual;
}

function restoreDocumentState(project: GlassWareProject, state: ProjectDocumentState): GlassWareProject {
  const next = cloneDocumentState(state);
  const active = next.pages.find((page) => page.id === next.activePageId) ?? next.pages[0];
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    pages: next.pages,
    activePageId: active.id,
    currentRevisionId: active.currentRevisionId,
    canvas: active.canvas,
    objects: active.objects,
  };
}

function appendAiEvent(project: GlassWareProject, summary: string): GlassWareProject {
  const createdAt = new Date().toISOString();
  const id = newId();
  const snapshot = { canvas: project.canvas, objects: project.objects.map(cloneNode) };
  const revision: Revision = {
    id,
    pageId: project.activePageId,
    number: Math.max(0, ...project.revisions.map((item) => item.number)) + 1,
    createdAt,
    summary,
    snapshot,
  };
  return {
    ...project,
    updatedAt: createdAt,
    currentRevisionId: id,
    pages: project.pages.map((page) => page.id === project.activePageId
      ? { ...page, currentRevisionId: id, canvas: snapshot.canvas, objects: snapshot.objects.map(cloneNode) }
      : page),
    revisions: [...project.revisions, revision].slice(-100),
  };
}

export function commitAiProjectSession(original: GlassWareProject, draft: GlassWareProject, summary: string): GlassWareProject {
  const before = projectDocumentState(original);
  const draftAfter = projectDocumentState(draft);
  if (equal(documentVisual(before), documentVisual(draftAfter))) return original;
  const beforeById = new Map(before.pages.map((page) => [page.id, page]));
  const afterById = new Map(draftAfter.pages.map((page) => [page.id, page]));
  const changedPageIds = new Set([...beforeById.keys(), ...afterById.keys()].filter((pageId) => !equal(pageVisual(beforeById.get(pageId)), pageVisual(afterById.get(pageId)))));
  changedPageIds.add(draftAfter.activePageId);
  const sessionId = newId();
  const revisionIds = new Map([...changedPageIds].filter((pageId) => afterById.has(pageId)).map((pageId) => [pageId, newId()]));
  const after: ProjectDocumentState = {
    activePageId: draftAfter.activePageId,
    pages: draftAfter.pages.map((page) => ({
      ...page,
      currentRevisionId: revisionIds.get(page.id) ?? beforeById.get(page.id)?.currentRevisionId ?? page.currentRevisionId,
    })),
  };
  const retained = original.revisions.filter((revision) => {
    if (!changedPageIds.has(revision.pageId)) return true;
    const page = beforeById.get(revision.pageId);
    if (!page) return false;
    const pageRevisions = original.revisions.filter((item) => item.pageId === revision.pageId);
    const currentIndex = pageRevisions.findIndex((item) => item.id === page.currentRevisionId);
    return pageRevisions.indexOf(revision) <= currentIndex;
  });
  const createdAt = new Date().toISOString();
  let number = Math.max(0, ...retained.map((revision) => revision.number));
  const primaryRevisionId = revisionIds.get(after.activePageId)!;
  const revisions = after.pages.flatMap((page) => {
    const id = revisionIds.get(page.id);
    if (!id) return [];
    number += 1;
    return [{
      id,
      pageId: page.id,
      number,
      createdAt,
      summary: `AI session: ${summary}`,
      snapshot: { canvas: page.canvas, objects: page.objects.map(cloneNode) },
      aiSessionId: sessionId,
      ...(id === primaryRevisionId ? { aiProjectTransaction: { id: sessionId, before: cloneDocumentState(before), after: cloneDocumentState(after) } } : {}),
    }];
  });
  const active = after.pages.find((page) => page.id === after.activePageId)!;
  return {
    ...draft,
    updatedAt: createdAt,
    pages: cloneDocumentState(after).pages,
    activePageId: after.activePageId,
    currentRevisionId: primaryRevisionId,
    canvas: active.canvas,
    objects: active.objects.map(cloneNode),
    revisions: [...retained, ...revisions].slice(-100),
  };
}

interface AiRevisionState extends AiUndoTarget {
  applied: boolean;
  lastEventIndex: number;
}

function aiRevisionStates(project: GlassWareProject): AiRevisionState[] {
  const pageEntries = project.revisions.map((revision, index) => ({ revision, index }))
    .filter((entry) => entry.revision.pageId === project.activePageId);
  const pageCurrentIndex = pageEntries.findIndex((entry) => entry.revision.id === project.currentRevisionId);
  const activeRevisions = pageEntries.slice(0, pageCurrentIndex + 1);
  const states = new Map<string, AiRevisionState>();
  for (let pageIndex = 1; pageIndex < activeRevisions.length; pageIndex += 1) {
    const { revision, index } = activeRevisions[pageIndex];
    if (revision.summary.startsWith(AI_SESSION_PREFIX) && !revision.aiSessionId) {
      states.set(revision.id, { revision, index, applied: true, lastEventIndex: index });
    }
  }
  for (const [index, revision] of project.revisions.entries()) {
    if (revision.aiProjectTransaction) states.set(revision.id, { revision, index, applied: true, lastEventIndex: index });
  }
  for (const [index, revision] of project.revisions.entries()) {
    const prefix = revision.summary.startsWith(AI_UNDO_PREFIX) ? AI_UNDO_PREFIX : revision.summary.startsWith(AI_REDO_PREFIX) ? AI_REDO_PREFIX : null;
    if (!prefix) continue;
    const target = states.get(revision.summary.slice(prefix.length).trim());
    if (!target) continue;
    target.applied = prefix === AI_REDO_PREFIX;
    target.lastEventIndex = index;
  }
  return [...states.values()];
}

export function findLatestUndoableAiRevision(project: GlassWareProject): AiUndoTarget | null {
  const target = aiRevisionStates(project)
    .filter((state) => state.applied)
    .sort((left, right) => right.lastEventIndex - left.lastEventIndex)[0];
  return target ? { revision: target.revision, index: target.index } : null;
}

export function findLatestRedoableAiRevision(project: GlassWareProject): AiUndoTarget | null {
  const pageEntries = project.revisions.map((revision, index) => ({ revision, index }))
    .filter((entry) => entry.revision.pageId === project.activePageId);
  const pageCurrentIndex = pageEntries.findIndex((entry) => entry.revision.id === project.currentRevisionId);
  const next = pageEntries[pageCurrentIndex + 1];
  if (next?.revision.summary.startsWith(AI_SESSION_PREFIX)) return next;
  const target = aiRevisionStates(project)
    .filter((state) => !state.applied)
    .sort((left, right) => right.lastEventIndex - left.lastEventIndex)[0];
  return target ? { revision: target.revision, index: target.index } : null;
}

function selectivelyRevertSnapshot(
  before: ProjectSnapshot,
  after: ProjectSnapshot,
  current: ProjectSnapshot,
): { snapshot: ProjectSnapshot; conflictCount: number } {
  if (equal(current, after)) return { snapshot: before, conflictCount: 0 };

  const beforeById = new Map(before.objects.map((object) => [object.id, object]));
  const afterById = new Map(after.objects.map((object) => [object.id, object]));
  const currentById = new Map(current.objects.map((object) => [object.id, object]));
  const changedIds = new Set([...beforeById.keys(), ...afterById.keys()].filter((id) => !equal(beforeById.get(id), afterById.get(id))));
  let conflictCount = 0;
  const nextById = new Map(current.objects.map((object) => [object.id, cloneNode(object)]));

  for (const id of changedIds) {
    const beforeObject = beforeById.get(id);
    const afterObject = afterById.get(id);
    const currentObject = currentById.get(id);
    if (!beforeObject && afterObject) {
      if (equal(currentObject, afterObject)) nextById.delete(id);
      else conflictCount += 1;
    } else if (beforeObject && !afterObject) {
      if (!currentObject) nextById.set(id, cloneNode(beforeObject));
      else conflictCount += 1;
    } else if (beforeObject && afterObject) {
      if (equal(currentObject, afterObject)) nextById.set(id, cloneNode(beforeObject));
      else conflictCount += 1;
    }
  }

  const currentOrder = current.objects.map((object) => object.id).filter((id) => afterById.has(id));
  const afterOrder = after.objects.map((object) => object.id).filter((id) => currentById.has(id));
  const orderStillMatchesAi = equal(currentOrder, afterOrder);
  const preferredOrder = orderStillMatchesAi ? before.objects.map((object) => object.id) : current.objects.map((object) => object.id);
  if (!orderStillMatchesAi && !equal(before.objects.map((object) => object.id), after.objects.map((object) => object.id))) conflictCount += 1;
  const orderedIds = [...preferredOrder, ...current.objects.map((object) => object.id), ...nextById.keys()]
    .filter((id, index, all) => nextById.has(id) && all.indexOf(id) === index);

  return {
    snapshot: {
      canvas: equal(current.canvas, after.canvas) ? before.canvas : current.canvas,
      objects: orderedIds.map((id) => cloneNode(nextById.get(id)!)),
    },
    conflictCount: conflictCount + (!equal(current.canvas, after.canvas) && !equal(before.canvas, after.canvas) ? 1 : 0),
  };
}

function selectivelyReapplySnapshot(
  before: ProjectSnapshot,
  after: ProjectSnapshot,
  current: ProjectSnapshot,
): { snapshot: ProjectSnapshot; conflictCount: number } {
  if (equal(current, before)) return { snapshot: after, conflictCount: 0 };

  const beforeById = new Map(before.objects.map((object) => [object.id, object]));
  const afterById = new Map(after.objects.map((object) => [object.id, object]));
  const currentById = new Map(current.objects.map((object) => [object.id, object]));
  const changedIds = new Set([...beforeById.keys(), ...afterById.keys()].filter((id) => !equal(beforeById.get(id), afterById.get(id))));
  let conflictCount = 0;
  const nextById = new Map(current.objects.map((object) => [object.id, cloneNode(object)]));

  for (const id of changedIds) {
    const beforeObject = beforeById.get(id);
    const afterObject = afterById.get(id);
    const currentObject = currentById.get(id);
    if (!beforeObject && afterObject) {
      if (!currentObject) nextById.set(id, cloneNode(afterObject));
      else if (!equal(currentObject, afterObject)) conflictCount += 1;
    } else if (beforeObject && !afterObject) {
      if (equal(currentObject, beforeObject)) nextById.delete(id);
      else if (currentObject) conflictCount += 1;
    } else if (beforeObject && afterObject) {
      if (equal(currentObject, beforeObject)) nextById.set(id, cloneNode(afterObject));
      else if (!equal(currentObject, afterObject)) conflictCount += 1;
    }
  }

  const currentOrder = current.objects.map((object) => object.id).filter((id) => beforeById.has(id));
  const beforeOrder = before.objects.map((object) => object.id).filter((id) => currentById.has(id));
  const orderStillMatchesBefore = equal(currentOrder, beforeOrder);
  const preferredOrder = orderStillMatchesBefore ? after.objects.map((object) => object.id) : current.objects.map((object) => object.id);
  if (!orderStillMatchesBefore && !equal(before.objects.map((object) => object.id), after.objects.map((object) => object.id))) conflictCount += 1;
  const orderedIds = [...preferredOrder, ...current.objects.map((object) => object.id), ...nextById.keys()]
    .filter((id, index, all) => nextById.has(id) && all.indexOf(id) === index);

  return {
    snapshot: {
      canvas: equal(current.canvas, before.canvas) ? after.canvas : current.canvas,
      objects: orderedIds.map((id) => cloneNode(nextById.get(id)!)),
    },
    conflictCount: conflictCount + (!equal(current.canvas, before.canvas) && !equal(before.canvas, after.canvas) ? 1 : 0),
  };
}

function selectivelyMoveDocument(
  desired: ProjectDocumentState,
  source: ProjectDocumentState,
  current: ProjectDocumentState,
  mergeSnapshot: (desired: ProjectSnapshot, source: ProjectSnapshot, current: ProjectSnapshot) => { snapshot: ProjectSnapshot; conflictCount: number },
): { state: ProjectDocumentState; conflictCount: number } {
  if (equal(documentVisual(current), documentVisual(source))) return { state: cloneDocumentState(desired), conflictCount: 0 };
  const desiredById = new Map(desired.pages.map((page) => [page.id, page]));
  const sourceById = new Map(source.pages.map((page) => [page.id, page]));
  const currentById = new Map(current.pages.map((page) => [page.id, page]));
  const merged = new Map(current.pages.map((page) => [page.id, cloneDocumentState({ activePageId: page.id, pages: [page] }).pages[0]]));
  let conflictCount = 0;

  for (const pageId of new Set([...desiredById.keys(), ...sourceById.keys()])) {
    const desiredPage = desiredById.get(pageId);
    const sourcePage = sourceById.get(pageId);
    const currentPage = currentById.get(pageId);
    if (!desiredPage && sourcePage) {
      if (currentPage && equal(pageVisual(currentPage), pageVisual(sourcePage))) merged.delete(pageId);
      else if (currentPage) conflictCount += 1;
      continue;
    }
    if (desiredPage && !sourcePage) {
      if (!currentPage) merged.set(pageId, cloneDocumentState({ activePageId: pageId, pages: [desiredPage] }).pages[0]);
      else if (!equal(pageVisual(currentPage), pageVisual(desiredPage))) conflictCount += 1;
      continue;
    }
    if (!desiredPage || !sourcePage || !currentPage) {
      if (desiredPage && !currentPage) merged.set(pageId, cloneDocumentState({ activePageId: pageId, pages: [desiredPage] }).pages[0]);
      continue;
    }
    const result = mergeSnapshot(desiredPage, sourcePage, currentPage);
    const name = currentPage.name === sourcePage.name ? desiredPage.name : currentPage.name;
    if (currentPage.name !== sourcePage.name && desiredPage.name !== sourcePage.name) conflictCount += 1;
    merged.set(pageId, { ...currentPage, name, canvas: result.snapshot.canvas, objects: result.snapshot.objects });
    conflictCount += result.conflictCount;
  }

  const currentOrder = current.pages.map((page) => page.id);
  const sourceOrder = source.pages.map((page) => page.id);
  const desiredOrder = desired.pages.map((page) => page.id);
  const orderMatchesSource = equal(currentOrder, sourceOrder);
  if (!orderMatchesSource && !equal(sourceOrder, desiredOrder)) conflictCount += 1;
  const preferredOrder = orderMatchesSource ? desiredOrder : currentOrder;
  const orderedIds = [...preferredOrder, ...desiredOrder, ...currentOrder, ...merged.keys()].filter((id, index, all) => merged.has(id) && all.indexOf(id) === index);
  const activePageId = current.activePageId === source.activePageId && merged.has(desired.activePageId)
    ? desired.activePageId
    : merged.has(current.activePageId)
      ? current.activePageId
      : orderedIds[0];
  if (current.activePageId !== source.activePageId && source.activePageId !== desired.activePageId) conflictCount += 1;
  return { state: { activePageId, pages: orderedIds.map((id) => merged.get(id)!) }, conflictCount };
}

export function undoLatestAiSession(project: GlassWareProject): AiUndoResult | null {
  const target = findLatestUndoableAiRevision(project);
  if (!target) return null;
  if (target.revision.aiProjectTransaction) {
    const transaction = target.revision.aiProjectTransaction;
    const current = projectDocumentState(project);
    const exact = project.currentRevisionId === target.revision.id || equal(documentVisual(current), documentVisual(transaction.after));
    const moved = exact
      ? { state: cloneDocumentState(transaction.before), conflictCount: 0 }
      : selectivelyMoveDocument(transaction.before, transaction.after, current, (before, after, snapshot) => selectivelyRevertSnapshot(before, after, snapshot));
    const restored = restoreDocumentState(project, moved.state);
    return {
      project: appendAiEvent(restored, `${AI_UNDO_PREFIX}${target.revision.id}`),
      undoneRevisionId: target.revision.id,
      selective: !exact,
      conflictCount: moved.conflictCount,
    };
  }
  if (target.index === currentRevisionIndex(project)) {
    return {
      project: undoProject(project),
      undoneRevisionId: target.revision.id,
      selective: false,
      conflictCount: 0,
    };
  }
  const targetPageRevisions = project.revisions.filter((revision) => revision.pageId === target.revision.pageId);
  const targetPageIndex = targetPageRevisions.findIndex((revision) => revision.id === target.revision.id);
  const before = targetPageRevisions[targetPageIndex - 1]?.snapshot;
  if (!before) return null;
  const current = { canvas: project.canvas, objects: project.objects };
  const reverted = selectivelyRevertSnapshot(before, target.revision.snapshot, current);
  return {
    project: commitSnapshot(project, `${AI_UNDO_PREFIX}${target.revision.id}`, reverted.snapshot),
    undoneRevisionId: target.revision.id,
    selective: true,
    conflictCount: reverted.conflictCount,
  };
}

export function redoLatestAiSession(project: GlassWareProject): AiRedoResult | null {
  const target = findLatestRedoableAiRevision(project);
  if (!target) return null;
  if (target.revision.aiProjectTransaction) {
    const transaction = target.revision.aiProjectTransaction;
    const current = projectDocumentState(project);
    const currentRevision = project.revisions.find((revision) => revision.id === project.currentRevisionId);
    const exact = currentRevision?.summary === `${AI_UNDO_PREFIX}${target.revision.id}` || equal(documentVisual(current), documentVisual(transaction.before));
    const moved = exact
      ? { state: cloneDocumentState(transaction.after), conflictCount: 0 }
      : selectivelyMoveDocument(transaction.after, transaction.before, current, (after, before, snapshot) => selectivelyReapplySnapshot(before, after, snapshot));
    const restored = restoreDocumentState(project, moved.state);
    return {
      project: appendAiEvent(restored, `${AI_REDO_PREFIX}${target.revision.id}`),
      redoneRevisionId: target.revision.id,
      selective: !exact,
      conflictCount: moved.conflictCount,
    };
  }
  const pageEntries = project.revisions.map((revision, index) => ({ revision, index })).filter((entry) => entry.revision.pageId === project.activePageId);
  const currentPageIndex = pageEntries.findIndex((entry) => entry.revision.id === project.currentRevisionId);
  if (canRedo(project) && pageEntries[currentPageIndex + 1]?.revision.id === target.revision.id) {
    return {
      project: redoProject(project),
      redoneRevisionId: target.revision.id,
      selective: false,
      conflictCount: 0,
    };
  }
  const targetPageRevisions = project.revisions.filter((revision) => revision.pageId === target.revision.pageId);
  const targetPageIndex = targetPageRevisions.findIndex((revision) => revision.id === target.revision.id);
  const before = targetPageRevisions[targetPageIndex - 1]?.snapshot;
  if (!before) return null;
  const current = { canvas: project.canvas, objects: project.objects };
  const reapplied = selectivelyReapplySnapshot(before, target.revision.snapshot, current);
  return {
    project: commitSnapshot(project, `${AI_REDO_PREFIX}${target.revision.id}`, reapplied.snapshot),
    redoneRevisionId: target.revision.id,
    selective: true,
    conflictCount: reapplied.conflictCount,
  };
}
