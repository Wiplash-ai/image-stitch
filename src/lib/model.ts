export type CanvasPreset = "square" | "portrait" | "story" | "landscape" | "custom";

export interface CanvasSize {
  preset: CanvasPreset;
  width: number;
  height: number;
}

export interface StitchObject {
  id: string;
  kind: "image" | "text" | "shape";
  name: string;
  locked: boolean;
  hidden: boolean;
  node: Record<string, unknown>;
}

export interface Revision {
  id: string;
  number: number;
  createdAt: string;
  summary: string;
}

export interface ImageStitchProject {
  schemaVersion: "imagestitch.project.v1";
  id: string;
  name: string;
  residency: "local";
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSize;
  objects: StitchObject[];
  revisions: Revision[];
  currentRevisionId: string;
}

export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, "custom">, CanvasSize> = {
  square: { preset: "square", width: 1080, height: 1080 },
  portrait: { preset: "portrait", width: 1080, height: 1350 },
  story: { preset: "story", width: 1080, height: 1920 },
  landscape: { preset: "landscape", width: 1200, height: 628 },
};

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function createProject(name = "Untitled stitch"): ImageStitchProject {
  const createdAt = now();
  const revisionId = id();
  return {
    schemaVersion: "imagestitch.project.v1",
    id: id(),
    name,
    residency: "local",
    createdAt,
    updatedAt: createdAt,
    canvas: CANVAS_PRESETS.square,
    objects: [],
    revisions: [{ id: revisionId, number: 1, createdAt, summary: "Project created" }],
    currentRevisionId: revisionId,
  };
}

export function commitRevision(project: ImageStitchProject, summary: string): ImageStitchProject {
  const createdAt = now();
  const revision: Revision = {
    id: id(),
    number: project.revisions.length + 1,
    createdAt,
    summary,
  };
  return {
    ...project,
    updatedAt: createdAt,
    revisions: [...project.revisions, revision],
    currentRevisionId: revision.id,
  };
}

export function setCanvasPreset(
  project: ImageStitchProject,
  preset: Exclude<CanvasPreset, "custom">,
): ImageStitchProject {
  return commitRevision({ ...project, canvas: CANVAS_PRESETS[preset] }, `Canvas set to ${preset}`);
}
