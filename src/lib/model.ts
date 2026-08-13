export type CanvasPreset = "square" | "portrait" | "story" | "landscape" | "custom";

export interface CanvasSettings {
  preset: CanvasPreset;
  width: number;
  height: number;
  background: string;
}

export interface BaseDesignNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface TextDesignNode extends BaseDesignNode {
  kind: "text";
  text: string;
  fill: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ShapeDesignNode extends BaseDesignNode {
  kind: "shape";
  shape: "rect" | "ellipse";
  fill: string;
  cornerRadius: number;
}

export interface ImageDesignNode extends BaseDesignNode {
  kind: "image";
  assetId: string;
  crop: NormalizedCrop;
  adjustments: ImageAdjustments;
}

export interface NormalizedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: boolean;
  sepia: boolean;
}

export type DesignNode = TextDesignNode | ShapeDesignNode | ImageDesignNode;

export interface ProjectSnapshot {
  canvas: CanvasSettings;
  objects: DesignNode[];
}

export interface Revision {
  id: string;
  number: number;
  createdAt: string;
  summary: string;
  snapshot: ProjectSnapshot;
}

export interface ImageStitchProject {
  schemaVersion: "imagestitch.project.v1";
  id: string;
  name: string;
  residency: "local";
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSettings;
  objects: DesignNode[];
  revisions: Revision[];
  currentRevisionId: string;
}

const DEFAULT_BACKGROUND = "#f8f0df";

export const FULL_IMAGE_CROP: NormalizedCrop = { x: 0, y: 0, width: 1, height: 1 };
export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
};

export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, "custom">, CanvasSettings> = {
  square: { preset: "square", width: 1080, height: 1080, background: DEFAULT_BACKGROUND },
  portrait: { preset: "portrait", width: 1080, height: 1350, background: DEFAULT_BACKGROUND },
  story: { preset: "story", width: 1080, height: 1920, background: DEFAULT_BACKGROUND },
  landscape: { preset: "landscape", width: 1200, height: 628, background: DEFAULT_BACKGROUND },
};

const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    canvas: { ...snapshot.canvas },
    objects: snapshot.objects.map((object) => object.kind === "image"
      ? { ...object, crop: { ...object.crop }, adjustments: { ...object.adjustments } }
      : { ...object }),
  };
}

export function createStarterObjects(): DesignNode[] {
  return [
    {
      id: newId(),
      kind: "text",
      name: "Headline",
      text: "Make something\nworth keeping.",
      x: 120,
      y: 125,
      width: 840,
      height: 235,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#19352e",
      fontFamily: "Georgia",
      fontSize: 98,
      fontStyle: "bold",
      align: "left",
      lineHeight: 0.98,
    },
    {
      id: newId(),
      kind: "shape",
      name: "Accent",
      shape: "rect",
      x: 125,
      y: 550,
      width: 190,
      height: 18,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#db5d3f",
      cornerRadius: 9,
    },
    {
      id: newId(),
      kind: "text",
      name: "Caption",
      text: "Your ideas stay on this device until you choose otherwise.",
      x: 125,
      y: 625,
      width: 670,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.84,
      visible: true,
      locked: false,
      fill: "#19352e",
      fontFamily: "Arial",
      fontSize: 34,
      fontStyle: "normal",
      align: "left",
      lineHeight: 1.25,
    },
  ];
}

export function createProject(name = "Untitled stitch", starter = true): ImageStitchProject {
  const createdAt = now();
  const revisionId = newId();
  const snapshot: ProjectSnapshot = {
    canvas: { ...CANVAS_PRESETS.square },
    objects: starter ? createStarterObjects() : [],
  };
  return {
    schemaVersion: "imagestitch.project.v1",
    id: newId(),
    name,
    residency: "local",
    createdAt,
    updatedAt: createdAt,
    canvas: snapshot.canvas,
    objects: snapshot.objects,
    revisions: [
      {
        id: revisionId,
        number: 1,
        createdAt,
        summary: "Project created",
        snapshot: cloneSnapshot(snapshot),
      },
    ],
    currentRevisionId: revisionId,
  };
}

export function projectSnapshot(project: ImageStitchProject): ProjectSnapshot {
  return cloneSnapshot({ canvas: project.canvas, objects: project.objects });
}

export function currentRevisionIndex(project: ImageStitchProject): number {
  const index = project.revisions.findIndex((revision) => revision.id === project.currentRevisionId);
  return index === -1 ? project.revisions.length - 1 : index;
}

export function canUndo(project: ImageStitchProject): boolean {
  return currentRevisionIndex(project) > 0;
}

export function canRedo(project: ImageStitchProject): boolean {
  return currentRevisionIndex(project) < project.revisions.length - 1;
}

export function commitSnapshot(
  project: ImageStitchProject,
  summary: string,
  snapshot: ProjectSnapshot,
): ImageStitchProject {
  const createdAt = now();
  const currentIndex = currentRevisionIndex(project);
  const revisions = project.revisions.slice(0, currentIndex + 1);
  const revision: Revision = {
    id: newId(),
    number: (revisions.at(-1)?.number ?? 0) + 1,
    createdAt,
    summary,
    snapshot: cloneSnapshot(snapshot),
  };
  const next = cloneSnapshot(snapshot);
  return {
    ...project,
    updatedAt: createdAt,
    canvas: next.canvas,
    objects: next.objects,
    revisions: [...revisions, revision].slice(-100),
    currentRevisionId: revision.id,
  };
}

function moveToRevision(project: ImageStitchProject, index: number): ImageStitchProject {
  const revision = project.revisions[index];
  if (!revision) return project;
  const snapshot = cloneSnapshot(revision.snapshot);
  return {
    ...project,
    updatedAt: now(),
    canvas: snapshot.canvas,
    objects: snapshot.objects,
    currentRevisionId: revision.id,
  };
}

export function undoProject(project: ImageStitchProject): ImageStitchProject {
  return moveToRevision(project, currentRevisionIndex(project) - 1);
}

export function redoProject(project: ImageStitchProject): ImageStitchProject {
  return moveToRevision(project, currentRevisionIndex(project) + 1);
}

export function setCanvasPreset(
  project: ImageStitchProject,
  preset: Exclude<CanvasPreset, "custom">,
): ImageStitchProject {
  const canvas = { ...CANVAS_PRESETS[preset], background: project.canvas.background };
  return commitSnapshot(project, `Canvas set to ${preset}`, { canvas, objects: project.objects });
}

function finiteNumber(value: unknown, minimum = -Infinity, maximum = Infinity): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function normalizeDesignNode(value: unknown): DesignNode | null {
  if (!value || typeof value !== "object") return null;
  const node = value as Record<string, unknown>;
  if (
    typeof node.id !== "string" || !node.id ||
    typeof node.name !== "string" || !node.name ||
    !finiteNumber(node.x) || !finiteNumber(node.y) ||
    !finiteNumber(node.width, 0) || !finiteNumber(node.height, 0) ||
    !finiteNumber(node.rotation) || !finiteNumber(node.scaleX) || !finiteNumber(node.scaleY) ||
    !finiteNumber(node.opacity, 0, 1) || typeof node.visible !== "boolean" || typeof node.locked !== "boolean"
  ) return null;
  const common: BaseDesignNode = {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    visible: node.visible,
    locked: node.locked,
  };
  if (node.kind === "text") {
    if (
      typeof node.text !== "string" || typeof node.fill !== "string" || !node.fill ||
      typeof node.fontFamily !== "string" || !node.fontFamily ||
      !finiteNumber(node.fontSize, Number.EPSILON) || typeof node.fontStyle !== "string" || !node.fontStyle ||
      !["left", "center", "right"].includes(String(node.align)) || !finiteNumber(node.lineHeight, Number.EPSILON)
    ) return null;
    return { ...common, kind: "text", text: node.text, fill: node.fill, fontFamily: node.fontFamily, fontSize: node.fontSize, fontStyle: node.fontStyle, align: node.align as TextDesignNode["align"], lineHeight: node.lineHeight };
  }
  if (node.kind === "shape") {
    if (! ["rect", "ellipse"].includes(String(node.shape)) || typeof node.fill !== "string" || !node.fill || !finiteNumber(node.cornerRadius, 0)) return null;
    return { ...common, kind: "shape", shape: node.shape as ShapeDesignNode["shape"], fill: node.fill, cornerRadius: node.cornerRadius };
  }
  if (node.kind === "image") {
    if (typeof node.assetId !== "string" || !node.assetId) return null;
    const cropValue = node.crop as Partial<NormalizedCrop> | undefined;
    const crop: NormalizedCrop = cropValue &&
      finiteNumber(cropValue.x, 0, 1) && finiteNumber(cropValue.y, 0, 1) &&
      finiteNumber(cropValue.width, Number.EPSILON, 1) && finiteNumber(cropValue.height, Number.EPSILON, 1) &&
      cropValue.x + cropValue.width <= 1.000001 && cropValue.y + cropValue.height <= 1.000001
      ? { x: cropValue.x, y: cropValue.y, width: cropValue.width, height: cropValue.height }
      : { ...FULL_IMAGE_CROP };
    const adjustmentValue = node.adjustments as Partial<ImageAdjustments> | undefined;
    const adjustments: ImageAdjustments = adjustmentValue &&
      finiteNumber(adjustmentValue.brightness, -1, 1) &&
      finiteNumber(adjustmentValue.contrast, -100, 100) &&
      finiteNumber(adjustmentValue.saturation, -2, 2) &&
      finiteNumber(adjustmentValue.blur, 0, 40) &&
      typeof adjustmentValue.grayscale === "boolean" && typeof adjustmentValue.sepia === "boolean"
      ? {
          brightness: adjustmentValue.brightness,
          contrast: adjustmentValue.contrast,
          saturation: adjustmentValue.saturation,
          blur: adjustmentValue.blur,
          grayscale: adjustmentValue.grayscale,
          sepia: adjustmentValue.sepia,
        }
      : { ...DEFAULT_IMAGE_ADJUSTMENTS };
    return { ...common, kind: "image", assetId: node.assetId, crop, adjustments };
  }
  return null;
}

function normalizeObjects(value: unknown): DesignNode[] | null {
  if (!Array.isArray(value)) return null;
  const objects = value.map(normalizeDesignNode);
  return objects.some((object) => !object) ? null : objects as DesignNode[];
}

function normalizeCanvas(value: unknown): CanvasSettings | null {
  if (!value || typeof value !== "object") return null;
  const canvas = value as Partial<CanvasSettings>;
  if (
    !["square", "portrait", "story", "landscape", "custom"].includes(String(canvas.preset)) ||
    !finiteNumber(canvas.width, 1, 16384) || !Number.isInteger(canvas.width) ||
    !finiteNumber(canvas.height, 1, 16384) || !Number.isInteger(canvas.height)
  ) return null;
  return {
    preset: canvas.preset!,
    width: canvas.width,
    height: canvas.height,
    background: typeof canvas.background === "string" && canvas.background ? canvas.background : DEFAULT_BACKGROUND,
  };
}

export function normalizeProject(value: unknown): ImageStitchProject | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ImageStitchProject> & {
    canvas?: Partial<CanvasSettings>;
    objects?: Array<Record<string, unknown>>;
    revisions?: Array<Partial<Revision>>;
  };
  if (candidate.schemaVersion !== "imagestitch.project.v1" || !candidate.id || !candidate.name) {
    return null;
  }

  const fallbackCanvas = normalizeCanvas(candidate.canvas);
  const objects = normalizeObjects(candidate.objects);
  if (!fallbackCanvas || !objects) return null;
  const fallbackSnapshot = cloneSnapshot({ canvas: fallbackCanvas, objects });
  let revisions: Revision[];
  if (Array.isArray(candidate.revisions) && candidate.revisions.length) {
    const normalized = candidate.revisions.map((revision, index): Revision | null => {
      let snapshot = fallbackSnapshot;
      if (revision.snapshot) {
        const canvas = normalizeCanvas(revision.snapshot.canvas);
        const revisionObjects = normalizeObjects(revision.snapshot.objects);
        if (!canvas || !revisionObjects) return null;
        snapshot = { canvas, objects: revisionObjects };
      }
      return {
        id: revision.id ?? newId(),
        number: revision.number ?? index + 1,
        createdAt: revision.createdAt ?? candidate.updatedAt ?? now(),
        summary: revision.summary ?? "Recovered revision",
        snapshot: cloneSnapshot(snapshot),
      };
    });
    if (normalized.some((revision) => !revision)) return null;
    revisions = normalized as Revision[];
  } else {
    revisions = [
        {
          id: newId(),
          number: 1,
          createdAt: candidate.createdAt ?? now(),
          summary: "Recovered project",
          snapshot: cloneSnapshot(fallbackSnapshot),
        },
      ];
  }
  const currentRevisionId = revisions.some((revision) => revision.id === candidate.currentRevisionId)
    ? candidate.currentRevisionId!
    : revisions.at(-1)!.id;

  return {
    schemaVersion: "imagestitch.project.v1",
    id: candidate.id,
    name: candidate.name,
    residency: "local",
    createdAt: candidate.createdAt ?? now(),
    updatedAt: candidate.updatedAt ?? now(),
    canvas: fallbackCanvas,
    objects,
    revisions,
    currentRevisionId,
  };
}
