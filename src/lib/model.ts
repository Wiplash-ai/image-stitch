export type CanvasPreset = "square" | "portrait" | "story" | "landscape" | "custom";

export interface CanvasGuide {
  id: string;
  axis: "x" | "y";
  position: number;
}

export interface SnappingSettings {
  enabled: boolean;
  canvas: boolean;
  objects: boolean;
  guides: boolean;
  threshold: number;
}

export interface CanvasSettings {
  preset: CanvasPreset;
  width: number;
  height: number;
  background: string;
  presentation: ArtworkPresentation;
  guides: CanvasGuide[];
  showRulers: boolean;
  snapping: SnappingSettings;
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
  groupId?: string;
  blendMode?: BlendMode;
}

export const BLEND_MODES = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion"] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

export interface TextDesignNode extends BaseDesignNode {
  kind: "text";
  text: string;
  fill: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  shadow?: ImageShadow;
}

export const SHAPE_KINDS = [
  "rect",
  "rounded-rect",
  "ellipse",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "star",
  "heart",
  "speech-bubble",
  "line",
  "arrow",
  "curved-arrow",
  "blur",
  "redact",
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];

export interface ShapeDesignNode extends BaseDesignNode {
  kind: "shape";
  shape: ShapeKind;
  fill: string;
  cornerRadius: number;
  shadow?: ImageShadow;
}

export interface ImageDesignNode extends BaseDesignNode {
  kind: "image";
  assetId: string;
  crop: NormalizedCrop;
  adjustments: ImageAdjustments;
  presentation: ImagePresentation;
  mask: ImageMask;
}

export interface ImageMaskStroke {
  id: string;
  mode: "hide" | "reveal";
  size: number;
  points: number[];
}

export interface ImageMask {
  enabled: boolean;
  inverted: boolean;
  feather: number;
  strokes: ImageMaskStroke[];
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
  temperature: number;
  tint: number;
  sharpen: number;
  vignette: number;
  blur: number;
  grayscale: boolean;
  sepia: boolean;
}

export const IMAGE_FRAME_TYPES = [
  "none",
  "arc-light",
  "arc-dark",
  "macos-light",
  "macos-dark",
  "windows-light",
  "windows-dark",
  "photograph",
  "glass-light",
  "glass-dark",
  "outline-light",
  "border-light",
  "border-dark",
] as const;

export type ImageFrameType = (typeof IMAGE_FRAME_TYPES)[number];

export interface ImageFrame {
  type: ImageFrameType;
  width: number;
  color: string;
  opacity: number;
  padding: number;
  title: string;
}

export interface ImageShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface ImagePresentation {
  cornerRadius: number;
  frame: ImageFrame;
  shadow: ImageShadow;
}

export const ARTWORK_BACKDROP_TYPES = ["solid", "gradient", "image"] as const;

export type ArtworkBackdropType = (typeof ARTWORK_BACKDROP_TYPES)[number];

export interface ArtworkBackdrop {
  type: ArtworkBackdropType;
  value: string;
  assetId?: string;
  opacity: number;
  blur: number;
  noise: number;
}

export interface ArtworkPresentation extends ImagePresentation {
  enabled: boolean;
  padding: number;
  background: string;
  backdrop: ArtworkBackdrop;
}

export type DesignNode = TextDesignNode | ShapeDesignNode | ImageDesignNode;

export interface ProjectSnapshot {
  canvas: CanvasSettings;
  objects: DesignNode[];
}

export interface DesignPage extends ProjectSnapshot {
  id: string;
  name: string;
  currentRevisionId: string;
}

export interface ProjectDocumentState {
  activePageId: string;
  pages: DesignPage[];
}

export interface AiProjectTransaction {
  id: string;
  before: ProjectDocumentState;
  after: ProjectDocumentState;
}

export interface Revision {
  id: string;
  pageId: string;
  number: number;
  createdAt: string;
  summary: string;
  snapshot: ProjectSnapshot;
  aiProjectTransaction?: AiProjectTransaction;
  aiSessionId?: string;
}

export interface GlassWareProject {
  schemaVersion: "glassware.project.v1";
  id: string;
  name: string;
  residency: "local";
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSettings;
  objects: DesignNode[];
  pages: DesignPage[];
  activePageId: string;
  revisions: Revision[];
  currentRevisionId: string;
}

const DEFAULT_BACKGROUND = "#ffffff";

export const FULL_IMAGE_CROP: NormalizedCrop = { x: 0, y: 0, width: 1, height: 1 };
export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  sharpen: 0,
  vignette: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
};
export const DEFAULT_IMAGE_MASK: ImageMask = {
  enabled: false,
  inverted: false,
  feather: 0,
  strokes: [],
};
export const DEFAULT_IMAGE_PRESENTATION: ImagePresentation = {
  cornerRadius: 0,
  frame: {
    type: "none",
    width: 0,
    color: "#111111",
    opacity: 1,
    padding: 0,
    title: "",
  },
  shadow: {
    enabled: false,
    color: "#111111",
    blur: 24,
    offsetX: 0,
    offsetY: 8,
    opacity: 0.24,
  },
};

export const DEFAULT_OBJECT_SHADOW: ImageShadow = {
  enabled: false,
  color: "#111111",
  blur: 24,
  offsetX: 0,
  offsetY: 8,
  opacity: 0.24,
};

export function cloneObjectShadow(shadow: ImageShadow = DEFAULT_OBJECT_SHADOW): ImageShadow {
  return { ...shadow };
}

export const DEFAULT_ARTWORK_PRESENTATION: ArtworkPresentation = {
  enabled: false,
  padding: 72,
  background: "#dedede",
  backdrop: {
    type: "solid",
    value: "#dedede",
    opacity: 1,
    blur: 0,
    noise: 0,
  },
  cornerRadius: 18,
  frame: {
    type: "none",
    width: 0,
    color: "#111111",
    opacity: 1,
    padding: 0,
    title: "",
  },
  shadow: {
    enabled: true,
    color: "#111111",
    blur: 48,
    offsetX: 0,
    offsetY: 12,
    opacity: 0.28,
  },
};

export function cloneImagePresentation(
  presentation: ImagePresentation = DEFAULT_IMAGE_PRESENTATION,
): ImagePresentation {
  return {
    cornerRadius: presentation.cornerRadius,
    frame: { ...presentation.frame },
    shadow: { ...presentation.shadow },
  };
}

export function cloneImageMask(mask: ImageMask = DEFAULT_IMAGE_MASK): ImageMask {
  return {
    enabled: mask.enabled,
    inverted: mask.inverted,
    feather: mask.feather,
    strokes: mask.strokes.map((stroke) => ({ ...stroke, points: [...stroke.points] })),
  };
}

export function cloneArtworkPresentation(
  presentation: ArtworkPresentation = DEFAULT_ARTWORK_PRESENTATION,
): ArtworkPresentation {
  return {
    enabled: presentation.enabled,
    padding: presentation.padding,
    background: presentation.background,
    backdrop: { ...presentation.backdrop },
    ...cloneImagePresentation(presentation),
  };
}

export const DEFAULT_SNAPPING: SnappingSettings = {
  enabled: true,
  canvas: true,
  objects: true,
  guides: true,
  threshold: 8,
};

function cloneCanvasSettings(canvas: CanvasSettings): CanvasSettings {
  return {
    ...canvas,
    presentation: cloneArtworkPresentation(canvas.presentation),
    guides: (canvas.guides ?? []).map((guide) => ({ ...guide })),
    snapping: { ...DEFAULT_SNAPPING, ...(canvas.snapping ?? {}) },
  };
}

export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, "custom">, CanvasSettings> = {
  square: { preset: "square", width: 1080, height: 1080, background: DEFAULT_BACKGROUND, presentation: cloneArtworkPresentation(), guides: [], showRulers: false, snapping: { ...DEFAULT_SNAPPING } },
  portrait: { preset: "portrait", width: 1080, height: 1350, background: DEFAULT_BACKGROUND, presentation: cloneArtworkPresentation(), guides: [], showRulers: false, snapping: { ...DEFAULT_SNAPPING } },
  story: { preset: "story", width: 1080, height: 1920, background: DEFAULT_BACKGROUND, presentation: cloneArtworkPresentation(), guides: [], showRulers: false, snapping: { ...DEFAULT_SNAPPING } },
  landscape: { preset: "landscape", width: 1200, height: 628, background: DEFAULT_BACKGROUND, presentation: cloneArtworkPresentation(), guides: [], showRulers: false, snapping: { ...DEFAULT_SNAPPING } },
};

const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    canvas: cloneCanvasSettings(snapshot.canvas),
    objects: snapshot.objects.map((object) => object.kind === "image"
      ? {
          ...object,
          crop: { ...object.crop },
          adjustments: { ...object.adjustments },
          presentation: cloneImagePresentation(object.presentation),
          mask: cloneImageMask(object.mask),
        }
      : { ...object, shadow: cloneObjectShadow(object.shadow) }),
  };
}

function clonePage(page: DesignPage): DesignPage {
  const snapshot = cloneSnapshot(page);
  return { ...snapshot, id: page.id, name: page.name, currentRevisionId: page.currentRevisionId };
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
      fill: "#111111",
      fontFamily: "Helvetica",
      fontSize: 98,
      fontStyle: "bold",
      align: "left",
      lineHeight: 0.98,
      shadow: cloneObjectShadow(),
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
      fill: "#111111",
      cornerRadius: 9,
      shadow: cloneObjectShadow(),
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
      fill: "#111111",
      fontFamily: "Arial",
      fontSize: 34,
      fontStyle: "normal",
      align: "left",
      lineHeight: 1.25,
      shadow: cloneObjectShadow(),
    },
  ];
}

export function createProject(name = "Untitled stitch", starter = true): GlassWareProject {
  const createdAt = now();
  const revisionId = newId();
  const pageId = newId();
  const snapshot: ProjectSnapshot = {
    canvas: cloneCanvasSettings(CANVAS_PRESETS.square),
    objects: starter ? createStarterObjects() : [],
  };
  return {
    schemaVersion: "glassware.project.v1",
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
        pageId,
        number: 1,
        createdAt,
        summary: "Project created",
        snapshot: cloneSnapshot(snapshot),
      },
    ],
    pages: [{ ...cloneSnapshot(snapshot), id: pageId, name: "Page 1", currentRevisionId: revisionId }],
    activePageId: pageId,
    currentRevisionId: revisionId,
  };
}

export function projectSnapshot(project: GlassWareProject): ProjectSnapshot {
  return cloneSnapshot({ canvas: project.canvas, objects: project.objects });
}

export function currentRevisionIndex(project: GlassWareProject): number {
  const index = project.revisions.findIndex((revision) => revision.id === project.currentRevisionId);
  return index === -1 ? project.revisions.length - 1 : index;
}

export function canUndo(project: GlassWareProject): boolean {
  const revisions = project.revisions.filter((revision) => revision.pageId === project.activePageId);
  return revisions.findIndex((revision) => revision.id === project.currentRevisionId) > 0;
}

export function canRedo(project: GlassWareProject): boolean {
  const revisions = project.revisions.filter((revision) => revision.pageId === project.activePageId);
  const index = revisions.findIndex((revision) => revision.id === project.currentRevisionId);
  return index >= 0 && index < revisions.length - 1;
}

export function commitSnapshot(
  project: GlassWareProject,
  summary: string,
  snapshot: ProjectSnapshot,
): GlassWareProject {
  const createdAt = now();
  const pageRevisions = project.revisions.filter((item) => item.pageId === project.activePageId);
  const currentPageIndex = pageRevisions.findIndex((item) => item.id === project.currentRevisionId);
  const retainedPageRevisionIds = new Set(pageRevisions.slice(0, Math.max(0, currentPageIndex) + 1).map((item) => item.id));
  const revisions = project.revisions.filter((item) => item.pageId !== project.activePageId || retainedPageRevisionIds.has(item.id));
  const revision: Revision = {
    id: newId(),
    pageId: project.activePageId,
    number: Math.max(0, ...revisions.map((item) => item.number)) + 1,
    createdAt,
    summary,
    snapshot: cloneSnapshot(snapshot),
  };
  const next = cloneSnapshot(snapshot);
  const pages = project.pages.map((page) => page.id === project.activePageId
    ? { ...cloneSnapshot(next), id: page.id, name: page.name, currentRevisionId: revision.id }
    : clonePage(page));
  return {
    ...project,
    updatedAt: createdAt,
    canvas: next.canvas,
    objects: next.objects,
    pages,
    revisions: [...revisions, revision].slice(-100),
    currentRevisionId: revision.id,
  };
}

function moveToRevision(project: GlassWareProject, delta: -1 | 1): GlassWareProject {
  const pageRevisions = project.revisions.filter((revision) => revision.pageId === project.activePageId);
  const currentIndex = pageRevisions.findIndex((revision) => revision.id === project.currentRevisionId);
  const revision = pageRevisions[currentIndex + delta];
  if (!revision) return project;
  const snapshot = cloneSnapshot(revision.snapshot);
  const pages = project.pages.map((page) => page.id === project.activePageId
    ? { ...cloneSnapshot(snapshot), id: page.id, name: page.name, currentRevisionId: revision.id }
    : clonePage(page));
  return {
    ...project,
    updatedAt: now(),
    canvas: snapshot.canvas,
    objects: snapshot.objects,
    pages,
    currentRevisionId: revision.id,
  };
}

export function undoProject(project: GlassWareProject): GlassWareProject {
  return moveToRevision(project, -1);
}

export function redoProject(project: GlassWareProject): GlassWareProject {
  return moveToRevision(project, 1);
}

export function activatePage(project: GlassWareProject, pageId: string): GlassWareProject {
  if (pageId === project.activePageId) return project;
  const target = project.pages.find((page) => page.id === pageId);
  if (!target) return project;
  const pages = project.pages.map((page) => page.id === project.activePageId
    ? { ...cloneSnapshot({ canvas: project.canvas, objects: project.objects }), id: page.id, name: page.name, currentRevisionId: project.currentRevisionId }
    : clonePage(page));
  const active = pages.find((page) => page.id === pageId)!;
  return {
    ...project,
    updatedAt: now(),
    canvas: cloneCanvasSettings(active.canvas),
    objects: cloneSnapshot(active).objects,
    pages,
    activePageId: pageId,
    currentRevisionId: active.currentRevisionId,
  };
}

function remapPageObjects(objects: DesignNode[]): DesignNode[] {
  const groups = new Map<string, string>();
  return cloneSnapshot({ canvas: CANVAS_PRESETS.square, objects }).objects.map((object) => ({
    ...object,
    id: newId(),
    ...(object.groupId ? { groupId: groups.get(object.groupId) ?? (() => { const id = newId(); groups.set(object.groupId!, id); return id; })() } : {}),
  }));
}

export function addProjectPage(project: GlassWareProject, duplicate = false): GlassWareProject {
  const pageId = newId();
  const revisionId = newId();
  const snapshot: ProjectSnapshot = {
    canvas: cloneCanvasSettings(project.canvas),
    objects: duplicate ? remapPageObjects(project.objects) : [],
  };
  const revision: Revision = {
    id: revisionId,
    pageId,
    number: Math.max(0, ...project.revisions.map((item) => item.number)) + 1,
    createdAt: now(),
    summary: duplicate ? "Page duplicated" : "Page created",
    snapshot: cloneSnapshot(snapshot),
  };
  const current = project.pages.map((page) => page.id === project.activePageId
    ? { ...cloneSnapshot({ canvas: project.canvas, objects: project.objects }), id: page.id, name: page.name, currentRevisionId: project.currentRevisionId }
    : clonePage(page));
  const page: DesignPage = { ...cloneSnapshot(snapshot), id: pageId, name: `Page ${current.length + 1}`, currentRevisionId: revisionId };
  return {
    ...project,
    updatedAt: revision.createdAt,
    canvas: cloneCanvasSettings(page.canvas),
    objects: cloneSnapshot(page).objects,
    pages: [...current, page],
    activePageId: pageId,
    revisions: [...project.revisions, revision].slice(-100),
    currentRevisionId: revisionId,
  };
}

export function deleteProjectPage(project: GlassWareProject, pageId: string): GlassWareProject {
  if (project.pages.length <= 1 || !project.pages.some((page) => page.id === pageId)) return project;
  const index = project.pages.findIndex((page) => page.id === pageId);
  const pages = project.pages.filter((page) => page.id !== pageId).map(clonePage);
  const target = pageId === project.activePageId ? pages[Math.min(index, pages.length - 1)] : pages.find((page) => page.id === project.activePageId)!;
  return {
    ...project,
    updatedAt: now(),
    canvas: cloneCanvasSettings(target.canvas),
    objects: cloneSnapshot(target).objects,
    pages,
    activePageId: target.id,
    revisions: project.revisions.filter((revision) => revision.pageId !== pageId),
    currentRevisionId: target.currentRevisionId,
  };
}

export function renameProjectPage(project: GlassWareProject, pageId: string, name: string): GlassWareProject {
  const normalized = name.trim().slice(0, 80);
  if (!normalized) return project;
  return { ...project, updatedAt: now(), pages: project.pages.map((page) => page.id === pageId ? { ...clonePage(page), name: normalized } : clonePage(page)) };
}

export function reorderProjectPage(project: GlassWareProject, pageId: string, direction: -1 | 1): GlassWareProject {
  const index = project.pages.findIndex((page) => page.id === pageId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= project.pages.length) return project;
  const pages = project.pages.map(clonePage);
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return { ...project, updatedAt: now(), pages };
}

export function setCanvasPreset(
  project: GlassWareProject,
  preset: Exclude<CanvasPreset, "custom">,
): GlassWareProject {
  const canvas = {
    ...cloneCanvasSettings(CANVAS_PRESETS[preset]),
    background: project.canvas.background,
    presentation: cloneArtworkPresentation(project.canvas.presentation),
    guides: project.canvas.guides.map((guide) => ({ ...guide })),
    showRulers: project.canvas.showRulers,
    snapping: { ...project.canvas.snapping },
  };
  return commitSnapshot(project, `Canvas set to ${preset}`, { canvas, objects: project.objects });
}

function finiteNumber(value: unknown, minimum = -Infinity, maximum = Infinity): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function normalizeImagePresentation(
  value: unknown,
  fallback: ImagePresentation = DEFAULT_IMAGE_PRESENTATION,
): ImagePresentation {
  const presentationValue = value as Partial<ImagePresentation> | undefined;
  const frameValue = presentationValue?.frame as Partial<ImageFrame> | undefined;
  const shadowValue = presentationValue?.shadow as Partial<ImageShadow> | undefined;
  const frameType = (frameValue?.type as string | undefined) === "outline-dark"
    ? "border-dark"
    : frameValue?.type;
  return {
    cornerRadius: finiteNumber(presentationValue?.cornerRadius, 0, 500)
      ? presentationValue.cornerRadius
      : fallback.cornerRadius,
    frame: frameValue && IMAGE_FRAME_TYPES.includes(frameType as ImageFrameType)
      ? {
          type: frameType as ImageFrameType,
          width: finiteNumber(frameValue.width, 0, 64) ? frameValue.width : fallback.frame.width,
          color: typeof frameValue.color === "string" && frameValue.color ? frameValue.color : fallback.frame.color,
          opacity: finiteNumber(frameValue.opacity, 0, 1) ? frameValue.opacity : fallback.frame.opacity,
          padding: finiteNumber(frameValue.padding, 0, 256) ? frameValue.padding : fallback.frame.padding,
          title: typeof frameValue.title === "string" ? frameValue.title.slice(0, 240) : fallback.frame.title,
        }
      : { ...fallback.frame },
    shadow: shadowValue &&
      typeof shadowValue.enabled === "boolean" &&
      typeof shadowValue.color === "string" && shadowValue.color &&
      finiteNumber(shadowValue.blur, 0, 200) &&
      finiteNumber(shadowValue.offsetX, -200, 200) &&
      finiteNumber(shadowValue.offsetY, -200, 200) &&
      finiteNumber(shadowValue.opacity, 0, 1)
      ? {
          enabled: shadowValue.enabled,
          color: shadowValue.color,
          blur: shadowValue.blur,
          offsetX: shadowValue.offsetX,
          offsetY: shadowValue.offsetY,
          opacity: shadowValue.opacity,
        }
      : { ...fallback.shadow },
  };
}

function normalizeObjectShadow(value: unknown): ImageShadow {
  return normalizeImagePresentation({ shadow: value }, { ...DEFAULT_IMAGE_PRESENTATION, shadow: DEFAULT_OBJECT_SHADOW }).shadow;
}

function normalizeArtworkPresentation(value: unknown): ArtworkPresentation {
  const presentation = value as Partial<ArtworkPresentation> | undefined;
  const style = normalizeImagePresentation(value, DEFAULT_ARTWORK_PRESENTATION);
  const legacyBackground = typeof presentation?.background === "string" && presentation.background
    ? presentation.background
    : DEFAULT_ARTWORK_PRESENTATION.background;
  const backdropValue = presentation?.backdrop as Partial<ArtworkBackdrop> | undefined;
  const backdropType = ARTWORK_BACKDROP_TYPES.includes(backdropValue?.type as ArtworkBackdropType)
    ? backdropValue!.type!
    : "solid";
  return {
    enabled: typeof presentation?.enabled === "boolean" ? presentation.enabled : DEFAULT_ARTWORK_PRESENTATION.enabled,
    padding: finiteNumber(presentation?.padding, 0, 4096) ? presentation.padding : DEFAULT_ARTWORK_PRESENTATION.padding,
    background: legacyBackground,
    backdrop: {
      type: backdropType,
      value: typeof backdropValue?.value === "string" && backdropValue.value
        ? backdropValue.value
        : legacyBackground,
      ...(typeof backdropValue?.assetId === "string" && backdropValue.assetId
        ? { assetId: backdropValue.assetId }
        : {}),
      opacity: finiteNumber(backdropValue?.opacity, 0, 1) ? backdropValue.opacity : 1,
      blur: finiteNumber(backdropValue?.blur, 0, 100) ? backdropValue.blur : 0,
      noise: finiteNumber(backdropValue?.noise, 0, 100) ? backdropValue.noise : 0,
    },
    ...style,
  };
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
    ...(typeof node.groupId === "string" && node.groupId ? { groupId: node.groupId } : {}),
    blendMode: BLEND_MODES.includes(node.blendMode as BlendMode) ? node.blendMode as BlendMode : "source-over",
  };
  if (node.kind === "text") {
    if (
      typeof node.text !== "string" || typeof node.fill !== "string" || !node.fill ||
      typeof node.fontFamily !== "string" || !node.fontFamily ||
      !finiteNumber(node.fontSize, Number.EPSILON) || typeof node.fontStyle !== "string" || !node.fontStyle ||
      !["left", "center", "right"].includes(String(node.align)) || !finiteNumber(node.lineHeight, Number.EPSILON)
    ) return null;
    return { ...common, kind: "text", text: node.text, fill: node.fill, fontFamily: node.fontFamily, fontSize: node.fontSize, fontStyle: node.fontStyle, align: node.align as TextDesignNode["align"], lineHeight: node.lineHeight, shadow: normalizeObjectShadow(node.shadow) };
  }
  if (node.kind === "shape") {
    if (!SHAPE_KINDS.includes(node.shape as ShapeKind) || typeof node.fill !== "string" || !node.fill || !finiteNumber(node.cornerRadius, 0)) return null;
    return { ...common, kind: "shape", shape: node.shape as ShapeDesignNode["shape"], fill: node.fill, cornerRadius: node.cornerRadius, shadow: normalizeObjectShadow(node.shadow) };
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
          temperature: finiteNumber(adjustmentValue.temperature, -1, 1) ? adjustmentValue.temperature : 0,
          tint: finiteNumber(adjustmentValue.tint, -1, 1) ? adjustmentValue.tint : 0,
          sharpen: finiteNumber(adjustmentValue.sharpen, 0, 1) ? adjustmentValue.sharpen : 0,
          vignette: finiteNumber(adjustmentValue.vignette, 0, 1) ? adjustmentValue.vignette : 0,
          blur: adjustmentValue.blur,
          grayscale: adjustmentValue.grayscale,
          sepia: adjustmentValue.sepia,
        }
      : { ...DEFAULT_IMAGE_ADJUSTMENTS };
    const presentation = normalizeImagePresentation(node.presentation);
    const maskValue = node.mask as Partial<ImageMask> | undefined;
    const mask: ImageMask = maskValue && Array.isArray(maskValue.strokes)
      ? {
          enabled: typeof maskValue.enabled === "boolean" ? maskValue.enabled : false,
          inverted: typeof maskValue.inverted === "boolean" ? maskValue.inverted : false,
          feather: finiteNumber(maskValue.feather, 0, 100) ? maskValue.feather : 0,
          strokes: maskValue.strokes.slice(0, 500).flatMap((stroke) => {
            if (!stroke || typeof stroke !== "object") return [];
            const value = stroke as Partial<ImageMaskStroke>;
            if (typeof value.id !== "string" || !value.id || !["hide", "reveal"].includes(String(value.mode)) ||
              !finiteNumber(value.size, 0.001, 1) || !Array.isArray(value.points) || value.points.length < 4 || value.points.length > 4000 || value.points.length % 2 !== 0 ||
              value.points.some((point) => !finiteNumber(point, 0, 1))) return [];
            return [{ id: value.id, mode: value.mode as ImageMaskStroke["mode"], size: value.size, points: [...value.points] }];
          }),
        }
      : cloneImageMask();
    return { ...common, kind: "image", assetId: node.assetId, crop, adjustments, presentation, mask };
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
    presentation: normalizeArtworkPresentation(canvas.presentation),
    guides: Array.isArray(canvas.guides)
      ? canvas.guides.flatMap((guide) => {
          if (!guide || typeof guide !== "object") return [];
          const value = guide as Partial<CanvasGuide>;
          if (typeof value.id !== "string" || !value.id || !["x", "y"].includes(String(value.axis)) || !finiteNumber(value.position, -16384, 32768)) return [];
          return [{ id: value.id, axis: value.axis as CanvasGuide["axis"], position: value.position }];
        })
      : [],
    showRulers: typeof canvas.showRulers === "boolean" ? canvas.showRulers : false,
    snapping: {
      enabled: typeof canvas.snapping?.enabled === "boolean" ? canvas.snapping.enabled : DEFAULT_SNAPPING.enabled,
      canvas: typeof canvas.snapping?.canvas === "boolean" ? canvas.snapping.canvas : DEFAULT_SNAPPING.canvas,
      objects: typeof canvas.snapping?.objects === "boolean" ? canvas.snapping.objects : DEFAULT_SNAPPING.objects,
      guides: typeof canvas.snapping?.guides === "boolean" ? canvas.snapping.guides : DEFAULT_SNAPPING.guides,
      threshold: finiteNumber(canvas.snapping?.threshold, 1, 64) ? canvas.snapping.threshold : DEFAULT_SNAPPING.threshold,
    },
  };
}

function normalizeProjectDocumentState(value: unknown): ProjectDocumentState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProjectDocumentState>;
  if (!Array.isArray(candidate.pages) || !candidate.pages.length || typeof candidate.activePageId !== "string") return null;
  const pages = candidate.pages.map((page, index): DesignPage | null => {
    if (!page || typeof page !== "object") return null;
    const canvas = normalizeCanvas(page.canvas);
    const objects = normalizeObjects(page.objects);
    if (typeof page.id !== "string" || !page.id || !canvas || !objects) return null;
    return {
      id: page.id,
      name: typeof page.name === "string" && page.name ? page.name.slice(0, 80) : `Page ${index + 1}`,
      currentRevisionId: typeof page.currentRevisionId === "string" ? page.currentRevisionId : "",
      canvas,
      objects,
    };
  });
  if (pages.some((page) => !page) || !pages.some((page) => page!.id === candidate.activePageId)) return null;
  return { activePageId: candidate.activePageId, pages: (pages as DesignPage[]).map(clonePage) };
}

export function normalizeProject(value: unknown): GlassWareProject | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GlassWareProject> & {
    canvas?: Partial<CanvasSettings>;
    objects?: Array<Record<string, unknown>>;
    pages?: Array<Partial<DesignPage>>;
    revisions?: Array<Partial<Revision>>;
  };
  if (!["glassware.project.v1", "imagestitch.project.v1"].includes(String(candidate.schemaVersion)) || !candidate.id || !candidate.name) {
    return null;
  }

  const fallbackCanvas = normalizeCanvas(candidate.canvas);
  const objects = normalizeObjects(candidate.objects);
  if (!fallbackCanvas || !objects) return null;
  const fallbackSnapshot = cloneSnapshot({ canvas: fallbackCanvas, objects });
  const legacyPageId = typeof candidate.activePageId === "string" && candidate.activePageId
    ? candidate.activePageId
    : typeof candidate.pages?.[0]?.id === "string" && candidate.pages[0].id
      ? candidate.pages[0].id
      : newId();
  const normalizedPages = Array.isArray(candidate.pages) && candidate.pages.length
    ? candidate.pages.map((page, index): DesignPage | null => {
        const canvas = normalizeCanvas(page.canvas);
        const pageObjects = normalizeObjects(page.objects);
        if (typeof page.id !== "string" || !page.id || !canvas || !pageObjects) return null;
        return {
          id: page.id,
          name: typeof page.name === "string" && page.name ? page.name.slice(0, 80) : `Page ${index + 1}`,
          canvas,
          objects: pageObjects,
          currentRevisionId: typeof page.currentRevisionId === "string" ? page.currentRevisionId : "",
        };
      })
    : [{ ...cloneSnapshot(fallbackSnapshot), id: legacyPageId, name: "Page 1", currentRevisionId: String(candidate.currentRevisionId ?? "") }];
  if (normalizedPages.some((page) => !page)) return null;
  let pages = normalizedPages as DesignPage[];
  const activePageId = typeof candidate.activePageId === "string" && pages.some((page) => page.id === candidate.activePageId)
    ? candidate.activePageId
    : pages[0].id;
  pages = pages.map((page) => page.id === activePageId
    ? { ...cloneSnapshot(fallbackSnapshot), id: page.id, name: page.name, currentRevisionId: page.currentRevisionId }
    : clonePage(page));
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
      const transaction = revision.aiProjectTransaction && typeof revision.aiProjectTransaction === "object"
        ? {
            id: typeof revision.aiProjectTransaction.id === "string" ? revision.aiProjectTransaction.id : "",
            before: normalizeProjectDocumentState(revision.aiProjectTransaction.before),
            after: normalizeProjectDocumentState(revision.aiProjectTransaction.after),
          }
        : null;
      const normalizedTransaction = transaction?.id && transaction.before && transaction.after
        ? { id: transaction.id, before: transaction.before, after: transaction.after }
        : undefined;
      return {
        id: revision.id ?? newId(),
        pageId: typeof revision.pageId === "string" && revision.pageId ? revision.pageId : legacyPageId,
        number: revision.number ?? index + 1,
        createdAt: revision.createdAt ?? candidate.updatedAt ?? now(),
        summary: revision.summary ?? "Recovered revision",
        snapshot: cloneSnapshot(snapshot),
        ...(normalizedTransaction ? { aiProjectTransaction: normalizedTransaction } : {}),
        ...(typeof revision.aiSessionId === "string" && revision.aiSessionId ? { aiSessionId: revision.aiSessionId } : {}),
      };
    });
    if (normalized.some((revision) => !revision)) return null;
    revisions = normalized as Revision[];
  } else {
    revisions = [
        {
          id: newId(),
          pageId: activePageId,
          number: 1,
          createdAt: candidate.createdAt ?? now(),
          summary: "Recovered project",
          snapshot: cloneSnapshot(fallbackSnapshot),
        },
      ];
  }
  pages = pages.map((page) => {
    const pageRevisions = revisions.filter((revision) => revision.pageId === page.id);
    const currentRevisionId = pageRevisions.some((revision) => revision.id === page.currentRevisionId)
      ? page.currentRevisionId
      : pageRevisions.at(-1)?.id;
    if (currentRevisionId) return { ...clonePage(page), currentRevisionId };
    const revision: Revision = {
      id: newId(), pageId: page.id, number: Math.max(0, ...revisions.map((item) => item.number)) + 1,
      createdAt: candidate.updatedAt ?? now(), summary: "Recovered page", snapshot: cloneSnapshot(page),
    };
    revisions.push(revision);
    return { ...clonePage(page), currentRevisionId: revision.id };
  });
  const activePage = pages.find((page) => page.id === activePageId)!;
  const currentRevisionId = activePage.currentRevisionId;

  return {
    schemaVersion: "glassware.project.v1",
    id: candidate.id,
    name: candidate.name,
    residency: "local",
    createdAt: candidate.createdAt ?? now(),
    updatedAt: candidate.updatedAt ?? now(),
    canvas: cloneCanvasSettings(activePage.canvas),
    objects: cloneSnapshot(activePage).objects,
    pages: pages.map(clonePage),
    activePageId,
    revisions,
    currentRevisionId,
  };
}
