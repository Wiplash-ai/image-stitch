import type { AiEditPlan, AiPlanOperation } from "./account-connections";
import {
  ARTWORK_BACKDROP_TYPES,
  BLEND_MODES,
  DEFAULT_IMAGE_MASK,
  IMAGE_FRAME_TYPES,
  SHAPE_KINDS,
  activatePage,
  addProjectPage,
  cloneArtworkPresentation,
  cloneImageMask,
  cloneImagePresentation,
  cloneObjectShadow,
  deleteProjectPage,
  newId,
  renameProjectPage,
  reorderProjectPage,
  type ArtworkBackdropType,
  type BlendMode,
  type CanvasSettings,
  type DesignNode,
  type GlassWareProject,
  type ImageDesignNode,
  type ImageFrameType,
  type ProjectSnapshot,
  type ShapeKind,
} from "./model";
import {
  alignObjects,
  distributeObjects,
  groupObjects,
  ungroupObjects,
  type Alignment,
  type AlignmentReference,
  type DistributionAxis,
} from "./editor-commands";
import { assessExport, type ExportAssetDetail, type ExportFormat, type ExportSettings } from "./export-qa";
import { createTemplateSnapshot, GLASSWARE_TEMPLATES, type GlassWareTemplate } from "./templates";
import type { StoredBrandKit, StoredComponent } from "./storage";

const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s+-]{3,28}\)|[a-z]{3,20})$/i;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f]{1,240}$/;
const GRADIENT_BACKDROPS = ["graphite", "daybreak", "lagoon", "prism", "paper", "midnight"] as const;
const ALIGNMENTS: Alignment[] = ["left", "center", "right", "top", "middle", "bottom"];
const EXPORT_FORMATS: ExportFormat[] = ["png", "jpeg", "webp", "svg", "pdf"];

export const AI_OPERATION_NAMES = [
  "set_canvas_size",
  "set_canvas_background",
  "set_canvas_guides",
  "set_canvas_snapping",
  "set_artwork_presentation",
  "add_text",
  "add_shape",
  "add_attachment_image",
  "search_open_image",
  "generate_image",
  "edit_image_region",
  "update_object",
  "delete_object",
  "duplicate_object",
  "reorder_object",
  "set_layer_states",
  "group_objects",
  "ungroup_objects",
  "align_objects",
  "distribute_objects",
  "set_object_transform",
  "set_image_adjustments",
  "set_image_crop",
  "set_image_mask",
  "set_image_presentation",
  "set_object_shadow",
  "apply_template",
  "insert_component",
  "apply_brand_kit",
  "add_page",
  "duplicate_page",
  "activate_page",
  "rename_page",
  "delete_page",
  "reorder_page",
  "inspect_export",
] as const;

export interface AiEditorResources {
  templates?: readonly GlassWareTemplate[];
  components?: readonly StoredComponent[];
  brandKits?: readonly StoredBrandKit[];
  exportAssets?: ReadonlyMap<string, ExportAssetDetail>;
  qualityFindings?: readonly string[];
}

export interface AiExportInspection {
  format: ExportFormat;
  width: number;
  height: number;
  allPages: boolean;
  warnings: string[];
}

export interface AiPlanApplication {
  project: GlassWareProject;
  snapshot: ProjectSnapshot;
  appliedOperations: string[];
  skippedOperations: string[];
  addedObjectIds: string[];
  receipts: string[];
  exportInspections: AiExportInspection[];
  changed: boolean;
}

export interface AiProjectContext {
  schemaVersion: "glassware.ai-project-context.v2";
  projectId: string;
  projectName: string;
  baseRevisionId: string;
  activePageId: string;
  capabilities: {
    operations: typeof AI_OPERATION_NAMES;
    shapeKinds: typeof SHAPE_KINDS;
    blendModes: typeof BLEND_MODES;
    imageFrameTypes: typeof IMAGE_FRAME_TYPES;
    artworkBackdropTypes: readonly ["solid", "gradient", "image"];
    gradientBackdrops: typeof GRADIENT_BACKDROPS;
    layerOrder: "objects are back-to-front; zIndex 0 is the back layer";
    lockedLayersProtected: true;
    coordinates: "artboard pixels; crop and mask point values are normalized from 0 to 1";
    imageAdjustmentRanges: {
      brightness: readonly [-1, 1];
      contrast: readonly [-100, 100];
      saturation: readonly [-1, 1];
      temperature: readonly [-1, 1];
      tint: readonly [-1, 1];
      sharpen: readonly [0, 1];
      vignette: readonly [0, 1];
      blur: readonly [0, 100];
    };
    maskBrushSize: "normalized image fraction from 0.01 to 0.4; legacy pixel-like values above 1 are divided by 1000";
  };
  canvas: CanvasSettings;
  objects: DesignNode[];
  pages: Array<{
    id: string;
    name: string;
    active: boolean;
    width: number;
    height: number;
    layerCount: number;
    layers: Array<Pick<DesignNode, "id" | "name" | "kind" | "visible" | "locked"> & { groupId?: string }>;
  }>;
  templates: Array<Pick<GlassWareTemplate, "id" | "name" | "category" | "description">>;
  components: Array<{ id: string; name: string; layerCount: number; layerKinds: DesignNode["kind"][] }>;
  brandKits: Array<Pick<StoredBrandKit, "id" | "name" | "colors" | "fontFamilies">>;
  exportFormats: ExportFormat[];
  automaticQuality: string[];
}

function cloneCanvas(canvas: CanvasSettings): CanvasSettings {
  return {
    ...canvas,
    presentation: cloneArtworkPresentation(canvas.presentation),
    guides: canvas.guides.map((guide) => ({ ...guide })),
    snapping: { ...canvas.snapping },
  };
}

function cloneNode(object: DesignNode): DesignNode {
  return object.kind === "image"
    ? {
        ...object,
        crop: { ...object.crop },
        adjustments: { ...object.adjustments },
        presentation: cloneImagePresentation(object.presentation),
        mask: cloneImageMask(object.mask),
      }
    : { ...object, shadow: cloneObjectShadow(object.shadow) };
}

function activePages(project: GlassWareProject): GlassWareProject["pages"] {
  return project.pages.map((page) => page.id === project.activePageId
    ? {
        id: page.id,
        name: page.name,
        currentRevisionId: project.currentRevisionId,
        canvas: cloneCanvas(project.canvas),
        objects: project.objects.map(cloneNode),
      }
    : { ...page, canvas: cloneCanvas(page.canvas), objects: page.objects.map(cloneNode) });
}

function cloneProject(project: GlassWareProject): GlassWareProject {
  return {
    ...project,
    canvas: cloneCanvas(project.canvas),
    objects: project.objects.map(cloneNode),
    pages: activePages(project),
    revisions: [...project.revisions],
  };
}

function flushActive(project: GlassWareProject, canvas: CanvasSettings, objects: DesignNode[]): GlassWareProject {
  const nextCanvas = cloneCanvas(canvas);
  const nextObjects = objects.map(cloneNode);
  return {
    ...project,
    canvas: nextCanvas,
    objects: nextObjects,
    pages: project.pages.map((page) => page.id === project.activePageId
      ? { ...page, currentRevisionId: project.currentRevisionId, canvas: cloneCanvas(nextCanvas), objects: nextObjects.map(cloneNode) }
      : { ...page, canvas: cloneCanvas(page.canvas), objects: page.objects.map(cloneNode) }),
  };
}

export function createAiProjectContext(project: GlassWareProject, resources: AiEditorResources = {}): AiProjectContext {
  const current = cloneProject(project);
  const templates = resources.templates ?? GLASSWARE_TEMPLATES;
  return {
    schemaVersion: "glassware.ai-project-context.v2",
    projectId: project.id,
    projectName: project.name,
    baseRevisionId: project.currentRevisionId,
    activePageId: project.activePageId,
    capabilities: {
      operations: AI_OPERATION_NAMES,
      shapeKinds: SHAPE_KINDS,
      blendModes: BLEND_MODES,
      imageFrameTypes: IMAGE_FRAME_TYPES,
      artworkBackdropTypes: ARTWORK_BACKDROP_TYPES,
      gradientBackdrops: GRADIENT_BACKDROPS,
      layerOrder: "objects are back-to-front; zIndex 0 is the back layer",
      lockedLayersProtected: true,
      coordinates: "artboard pixels; crop and mask point values are normalized from 0 to 1",
      imageAdjustmentRanges: {
        brightness: [-1, 1],
        contrast: [-100, 100],
        saturation: [-1, 1],
        temperature: [-1, 1],
        tint: [-1, 1],
        sharpen: [0, 1],
        vignette: [0, 1],
        blur: [0, 100],
      },
      maskBrushSize: "normalized image fraction from 0.01 to 0.4; legacy pixel-like values above 1 are divided by 1000",
    },
    canvas: cloneCanvas(current.canvas),
    objects: current.objects.map(cloneNode),
    pages: current.pages.map((page) => ({
      id: page.id,
      name: page.name,
      active: page.id === current.activePageId,
      width: page.canvas.width,
      height: page.canvas.height,
      layerCount: page.objects.length,
      layers: page.objects.map((object) => ({
        id: object.id,
        name: object.name,
        kind: object.kind,
        visible: object.visible,
        locked: object.locked,
        ...(object.groupId ? { groupId: object.groupId } : {}),
      })),
    })),
    templates: templates.map(({ id, name, category, description }) => ({ id, name, category, description })),
    components: (resources.components ?? []).map((component) => ({
      id: component.id,
      name: component.name,
      layerCount: component.objects.length,
      layerKinds: [...new Set(component.objects.map((object) => object.kind))],
    })),
    brandKits: (resources.brandKits ?? []).map(({ id, name, colors, fontFamilies }) => ({ id, name, colors: [...colors], fontFamilies: [...fontFamilies] })),
    exportFormats: [...EXPORT_FORMATS],
    automaticQuality: [...(resources.qualityFindings ?? [])].slice(0, 20),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function coordinate(value: number | null | undefined, fallback: number, maximum: number): number {
  return clamp(value ?? fallback, 0, Math.max(0, maximum));
}

function dimension(value: number | null | undefined, fallback: number, maximum: number): number {
  return clamp(value ?? fallback, 8, Math.max(8, maximum));
}

function color(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  return candidate && SAFE_COLOR.test(candidate) ? candidate : null;
}

function textValue(value: string | null | undefined, maximum = 240): string | null {
  const candidate = value?.trim().slice(0, maximum);
  return candidate && SAFE_TEXT.test(candidate) ? candidate : null;
}

function shapeKind(value: string | null | undefined): ShapeKind | null {
  return value && SHAPE_KINDS.includes(value as ShapeKind) ? value as ShapeKind : null;
}

function frameType(value: string | null | undefined): ImageFrameType | null {
  return value && IMAGE_FRAME_TYPES.includes(value as ImageFrameType) ? value as ImageFrameType : null;
}

function blendMode(value: string | null | undefined): BlendMode | null {
  return value && BLEND_MODES.includes(value as BlendMode) ? value as BlendMode : null;
}

function targetIds(operation: AiPlanOperation, objects: DesignNode[]): string[] {
  const requested = operation.targetIds?.filter((id, index, all) => typeof id === "string" && all.indexOf(id) === index) ?? [];
  if (operation.targetId && !requested.includes(operation.targetId)) requested.push(operation.targetId);
  if (operation.layerScope === "all") return objects.map((object) => object.id);
  return requested;
}

function baseNode(operation: AiPlanOperation, canvas: CanvasSettings, width: number, height: number) {
  return {
    id: newId(),
    name: textValue(operation.name) ?? operation.label.slice(0, 120),
    x: coordinate(operation.x, (canvas.width - width) / 2, canvas.width - width),
    y: coordinate(operation.y, (canvas.height - height) / 2, canvas.height - height),
    width,
    height,
    rotation: clamp(operation.rotation ?? 0, -360, 360),
    scaleX: 1,
    scaleY: 1,
    opacity: clamp(operation.opacity ?? 1, 0, 1),
    visible: operation.visible ?? true,
    locked: operation.locked ?? false,
  } as const;
}

function addText(operation: AiPlanOperation, canvas: CanvasSettings): DesignNode | null {
  const text = operation.text?.trim().slice(0, 2_000);
  if (!text) return null;
  const fontSize = clamp(operation.fontSize ?? Math.round(canvas.width * 0.065), 12, 220);
  const width = dimension(operation.width, canvas.width * 0.72, canvas.width);
  const estimatedLines = Math.max(1, Math.ceil(text.length / Math.max(8, width / (fontSize * 0.56))));
  const height = dimension(operation.height, fontSize * 1.2 * estimatedLines, canvas.height);
  return {
    ...baseNode(operation, canvas, width, height),
    kind: "text",
    text,
    fill: color(operation.color) ?? "#111111",
    fontFamily: textValue(operation.fontFamily) ?? "Helvetica",
    fontSize,
    fontStyle: textValue(operation.fontStyle, 40) ?? "bold",
    align: operation.align === "center" || operation.align === "right" ? operation.align : "left",
    lineHeight: clamp(operation.lineHeight ?? 1.05, 0.7, 2),
    shadow: cloneObjectShadow(),
  };
}

function addShape(operation: AiPlanOperation, canvas: CanvasSettings): DesignNode | null {
  const shape = shapeKind(operation.shape);
  if (!shape) return null;
  const linear = shape === "line" || shape === "arrow" || shape === "curved-arrow";
  const width = dimension(operation.width, canvas.width * (linear ? 0.42 : 0.22), canvas.width);
  const height = dimension(operation.height, canvas.height * (linear ? 0.1 : 0.22), canvas.height);
  return {
    ...baseNode(operation, canvas, width, height),
    kind: "shape",
    shape,
    fill: color(operation.color) ?? "#111111",
    cornerRadius: clamp(operation.cornerRadius ?? (shape === "rounded-rect" ? Math.min(28, height / 2) : 0), 0, Math.min(width, height) / 2),
    shadow: cloneObjectShadow(),
  };
}

function updateObject(object: DesignNode, operation: AiPlanOperation, canvas: CanvasSettings): DesignNode | null {
  if (object.locked) return null;
  const width = dimension(operation.width, object.width, canvas.width);
  const height = dimension(operation.height, object.height, canvas.height);
  const common = {
    name: textValue(operation.name) ?? object.name,
    x: coordinate(operation.x, object.x, canvas.width - width),
    y: coordinate(operation.y, object.y, canvas.height - height),
    width,
    height,
    rotation: clamp(operation.rotation ?? object.rotation, -360, 360),
    opacity: clamp(operation.opacity ?? object.opacity, 0, 1),
    visible: operation.visible ?? object.visible,
    locked: operation.locked ?? object.locked,
    blendMode: blendMode(operation.blendMode) ?? object.blendMode,
  };
  if (object.kind === "text") {
    return {
      ...object,
      ...common,
      text: operation.text?.trim().slice(0, 2_000) || object.text,
      fill: color(operation.color) ?? object.fill,
      fontFamily: textValue(operation.fontFamily) ?? object.fontFamily,
      fontSize: clamp(operation.fontSize ?? object.fontSize, 12, 220),
      fontStyle: textValue(operation.fontStyle, 40) ?? object.fontStyle,
      align: operation.align === "left" || operation.align === "center" || operation.align === "right" ? operation.align : object.align,
      lineHeight: clamp(operation.lineHeight ?? object.lineHeight, 0.7, 2),
    };
  }
  if (object.kind === "shape") {
    return {
      ...object,
      ...common,
      fill: color(operation.color) ?? object.fill,
      shape: shapeKind(operation.shape) ?? object.shape,
      cornerRadius: clamp(operation.cornerRadius ?? object.cornerRadius, 0, Math.min(width, height) / 2),
    };
  }
  return { ...object, ...common };
}

function applyImageAdjustments(object: ImageDesignNode, operation: AiPlanOperation): ImageDesignNode {
  return {
    ...object,
    adjustments: {
      ...object.adjustments,
      brightness: clamp(operation.brightness ?? object.adjustments.brightness, -1, 1),
      contrast: clamp(operation.contrast ?? object.adjustments.contrast, -100, 100),
      saturation: clamp(operation.saturation ?? object.adjustments.saturation, -1, 1),
      temperature: clamp(operation.temperature ?? object.adjustments.temperature, -1, 1),
      tint: clamp(operation.tint ?? object.adjustments.tint, -1, 1),
      sharpen: clamp(operation.sharpen ?? object.adjustments.sharpen, 0, 1),
      vignette: clamp(operation.vignette ?? object.adjustments.vignette, 0, 1),
      blur: clamp(operation.blur ?? object.adjustments.blur, 0, 100),
      grayscale: operation.grayscale ?? object.adjustments.grayscale,
      sepia: operation.sepia ?? object.adjustments.sepia,
    },
  };
}

function applyImageCrop(object: ImageDesignNode, operation: AiPlanOperation): ImageDesignNode {
  const x = clamp(operation.cropX ?? object.crop.x, 0, 0.99);
  const y = clamp(operation.cropY ?? object.crop.y, 0, 0.99);
  return {
    ...object,
    crop: {
      x,
      y,
      width: clamp(operation.cropWidth ?? object.crop.width, 0.01, 1 - x),
      height: clamp(operation.cropHeight ?? object.crop.height, 0.01, 1 - y),
    },
  };
}

function applyImageMask(object: ImageDesignNode, operation: AiPlanOperation): ImageDesignNode | null {
  const action = operation.maskAction ?? "set_options";
  if (action === "clear") return { ...object, mask: cloneImageMask(DEFAULT_IMAGE_MASK) };
  const mask = cloneImageMask(object.mask);
  mask.enabled = operation.maskEnabled ?? true;
  mask.inverted = operation.maskInverted ?? mask.inverted;
  mask.feather = clamp(operation.maskFeather ?? mask.feather, 0, 100);
  if (action === "set_options") return { ...object, mask };
  if (action !== "add_stroke") return null;
  const points = operation.maskPoints?.filter((value) => typeof value === "number" && Number.isFinite(value)).slice(0, 2048);
  if (!points || points.length < 4 || points.length % 2 !== 0) return null;
  mask.strokes.push({
    id: newId(),
    mode: operation.maskMode === "reveal" ? "reveal" : "hide",
    size: clamp((operation.maskSize ?? 0.08) > 1 ? (operation.maskSize ?? 80) / 1000 : operation.maskSize ?? 0.08, 0.01, 0.4),
    points: points.map((point) => clamp(point, 0, 1)),
  });
  return { ...object, mask };
}

function applyPresentation(current: ImageDesignNode["presentation"], operation: AiPlanOperation) {
  const next = cloneImagePresentation(current);
  next.cornerRadius = clamp(operation.cornerRadius ?? next.cornerRadius, 0, 500);
  next.frame = {
    type: frameType(operation.frameType) ?? next.frame.type,
    width: clamp(operation.frameWidth ?? next.frame.width, 0, 64),
    color: color(operation.frameColor) ?? next.frame.color,
    opacity: clamp(operation.frameOpacity ?? next.frame.opacity, 0, 1),
    padding: clamp(operation.framePadding ?? next.frame.padding, 0, 256),
    title: operation.frameTitle === null || operation.frameTitle === undefined ? next.frame.title : operation.frameTitle.slice(0, 240),
  };
  next.shadow = {
    enabled: operation.shadowEnabled ?? next.shadow.enabled,
    color: color(operation.shadowColor) ?? next.shadow.color,
    blur: clamp(operation.shadowBlur ?? next.shadow.blur, 0, 200),
    offsetX: clamp(operation.shadowOffsetX ?? next.shadow.offsetX, -200, 200),
    offsetY: clamp(operation.shadowOffsetY ?? next.shadow.offsetY, -200, 200),
    opacity: clamp(operation.shadowOpacity ?? next.shadow.opacity, 0, 1),
  };
  return next;
}

function applyObjectShadow(object: Exclude<DesignNode, ImageDesignNode>, operation: AiPlanOperation) {
  const current = cloneObjectShadow(object.shadow);
  return {
    ...object,
    shadow: {
      enabled: operation.shadowEnabled ?? current.enabled,
      color: color(operation.shadowColor) ?? current.color,
      blur: clamp(operation.shadowBlur ?? current.blur, 0, 200),
      offsetX: clamp(operation.shadowOffsetX ?? current.offsetX, -200, 200),
      offsetY: clamp(operation.shadowOffsetY ?? current.offsetY, -200, 200),
      opacity: clamp(operation.shadowOpacity ?? current.opacity, 0, 1),
    },
  };
}

function updateArtworkPresentation(canvas: CanvasSettings, objects: DesignNode[], operation: AiPlanOperation): CanvasSettings {
  const presentation = cloneArtworkPresentation(canvas.presentation);
  const styled = applyPresentation(presentation, operation);
  const requestedBackdrop = operation.backdropType;
  const backdropType = requestedBackdrop && ARTWORK_BACKDROP_TYPES.includes(requestedBackdrop as ArtworkBackdropType)
    ? requestedBackdrop as ArtworkBackdropType
    : presentation.backdrop.type;
  const referencedImage = operation.targetId
    ? objects.find((object): object is ImageDesignNode => object.id === operation.targetId && object.kind === "image")
    : null;
  const solidValue = color(operation.backdropValue);
  const gradientValue = GRADIENT_BACKDROPS.includes(operation.backdropValue as typeof GRADIENT_BACKDROPS[number]) ? operation.backdropValue! : null;
  const backdropValue = backdropType === "solid"
    ? solidValue ?? presentation.backdrop.value
    : backdropType === "gradient"
      ? gradientValue ?? presentation.backdrop.value
      : presentation.backdrop.value;
  return {
    ...canvas,
    presentation: {
      ...presentation,
      ...styled,
      enabled: operation.presentationEnabled ?? presentation.enabled,
      padding: clamp(operation.presentationPadding ?? presentation.padding, 0, Math.min(canvas.width, canvas.height) * 0.42),
      background: color(operation.color) ?? presentation.background,
      backdrop: {
        ...presentation.backdrop,
        type: backdropType,
        value: backdropValue,
        ...(backdropType === "image" && referencedImage ? { assetId: referencedImage.assetId } : {}),
        opacity: clamp(operation.backdropOpacity ?? presentation.backdrop.opacity, 0, 1),
        blur: clamp(operation.backdropBlur ?? presentation.backdrop.blur, 0, 100),
        noise: clamp(operation.backdropNoise ?? presentation.backdrop.noise, 0, 1),
      },
    },
  };
}

function remapComponent(component: StoredComponent, operation: AiPlanOperation, canvas: CanvasSettings): DesignNode[] {
  const groups = new Map<string, string>();
  const cloned = component.objects.map((object) => {
    const next = cloneNode(object);
    next.id = newId();
    if (next.groupId) {
      if (!groups.has(next.groupId)) groups.set(next.groupId, newId());
      next.groupId = groups.get(next.groupId);
    }
    return next;
  });
  if (!cloned.length) return [];
  const left = Math.min(...cloned.map((object) => object.x));
  const top = Math.min(...cloned.map((object) => object.y));
  const right = Math.max(...cloned.map((object) => object.x + Math.abs(object.width * object.scaleX)));
  const bottom = Math.max(...cloned.map((object) => object.y + Math.abs(object.height * object.scaleY)));
  const offsetX = coordinate(operation.x, (canvas.width - (right - left)) / 2, canvas.width) - left;
  const offsetY = coordinate(operation.y, (canvas.height - (bottom - top)) / 2, canvas.height) - top;
  return cloned.map((object) => ({ ...object, x: object.x + offsetX, y: object.y + offsetY }));
}

function exportSettings(operation: AiPlanOperation, canvas: CanvasSettings): ExportSettings | null {
  const format = EXPORT_FORMATS.includes(operation.exportFormat as ExportFormat) ? operation.exportFormat as ExportFormat : null;
  if (!format) return null;
  const width = Math.round(clamp(operation.exportWidth ?? canvas.width, 1, 16384));
  const height = Math.round(clamp(operation.exportHeight ?? canvas.height * width / canvas.width, 1, 16384));
  return {
    format,
    width,
    height,
    quality: clamp(operation.exportQuality ?? 0.92, 0.1, 1),
    transparent: operation.exportTransparent ?? false,
    dpi: Math.round(clamp(operation.exportDpi ?? (format === "pdf" ? 300 : 96), 36, 1200)),
    allPages: operation.exportAllPages ?? format === "pdf",
  };
}

export function applyAiEditPlan(project: GlassWareProject, plan: AiEditPlan, resources: AiEditorResources = {}): AiPlanApplication {
  let draft = cloneProject(project);
  let canvas = cloneCanvas(draft.canvas);
  let objects = draft.objects.map(cloneNode);
  const appliedOperations: string[] = [];
  const skippedOperations: string[] = [];
  const addedObjectIds: string[] = [];
  const receipts: string[] = [];
  const exportInspections: AiExportInspection[] = [];
  let changed = false;

  const applied = (operation: AiPlanOperation, didChange = true) => {
    appliedOperations.push(operation.label);
    changed ||= didChange;
  };
  const skipped = (operation: AiPlanOperation) => skippedOperations.push(operation.label);
  const flush = () => { draft = flushActive(draft, canvas, objects); };
  const load = () => {
    canvas = cloneCanvas(draft.canvas);
    objects = draft.objects.map(cloneNode);
  };

  for (const operation of plan.operations) {
    if (operation.action === "set_canvas_size") {
      if (operation.width === null || operation.height === null) { skipped(operation); continue; }
      canvas = { ...canvas, preset: "custom", width: Math.round(clamp(operation.width, 64, 8192)), height: Math.round(clamp(operation.height, 64, 8192)) };
      applied(operation);
      continue;
    }
    if (operation.action === "set_canvas_background") {
      const nextColor = color(operation.color);
      if (!nextColor) { skipped(operation); continue; }
      canvas = { ...canvas, background: nextColor };
      applied(operation);
      continue;
    }
    if (operation.action === "set_canvas_guides") {
      if (operation.guideAction === "clear") {
        canvas = { ...canvas, guides: [] };
        applied(operation);
      } else if (operation.guideAction === "remove" && operation.targetId && canvas.guides.some((guide) => guide.id === operation.targetId)) {
        canvas = { ...canvas, guides: canvas.guides.filter((guide) => guide.id !== operation.targetId) };
        applied(operation);
      } else if (operation.guideAction === "add" && (operation.guideAxis === "x" || operation.guideAxis === "y") && operation.guidePosition !== null && operation.guidePosition !== undefined) {
        const maximum = operation.guideAxis === "x" ? canvas.width : canvas.height;
        canvas = { ...canvas, showRulers: true, guides: [...canvas.guides, { id: newId(), axis: operation.guideAxis, position: clamp(operation.guidePosition, 0, maximum) }] };
        applied(operation);
      } else skipped(operation);
      continue;
    }
    if (operation.action === "set_canvas_snapping") {
      canvas = {
        ...canvas,
        snapping: {
          enabled: operation.snapEnabled ?? canvas.snapping.enabled,
          canvas: operation.snapCanvas ?? canvas.snapping.canvas,
          objects: operation.snapObjects ?? canvas.snapping.objects,
          guides: operation.snapGuides ?? canvas.snapping.guides,
          threshold: clamp(operation.snapThreshold ?? canvas.snapping.threshold, 1, 64),
        },
      };
      applied(operation);
      continue;
    }
    if (operation.action === "set_artwork_presentation") {
      canvas = updateArtworkPresentation(canvas, objects, operation);
      applied(operation);
      continue;
    }
    if (operation.action === "add_text" || operation.action === "add_shape") {
      const object = operation.action === "add_text" ? addText(operation, canvas) : addShape(operation, canvas);
      if (!object) { skipped(operation); continue; }
      objects = [...objects, object];
      addedObjectIds.push(object.id);
      applied(operation);
      continue;
    }
    if (operation.action === "add_attachment_image" || operation.action === "search_open_image" || operation.action === "generate_image" || operation.action === "edit_image_region") {
      skipped(operation);
      continue;
    }
    if (operation.action === "set_layer_states") {
      const ids = new Set(targetIds(operation, objects));
      if (!ids.size || (operation.visible === null && operation.visible === undefined && operation.locked === null && operation.locked === undefined)) { skipped(operation); continue; }
      let count = 0;
      objects = objects.map((object) => {
        if (!ids.has(object.id)) return object;
        count += 1;
        return { ...object, visible: operation.visible ?? object.visible, locked: operation.locked ?? object.locked };
      });
      if (!count) skipped(operation); else applied(operation);
      continue;
    }
    if (["group_objects", "ungroup_objects", "align_objects", "distribute_objects"].includes(operation.action)) {
      const ids = targetIds(operation, objects);
      if (!ids.length) { skipped(operation); continue; }
      const before = JSON.stringify(objects);
      if (operation.action === "group_objects") objects = groupObjects(objects, ids, newId());
      else if (operation.action === "ungroup_objects") objects = ungroupObjects(objects, ids);
      else if (operation.action === "align_objects" && ALIGNMENTS.includes(operation.alignment as Alignment)) {
        const reference: AlignmentReference = operation.alignmentReference === "canvas" ? "canvas" : "selection";
        objects = alignObjects(objects, ids, canvas, operation.alignment as Alignment, reference);
      } else if (operation.action === "distribute_objects" && (operation.distributionAxis === "horizontal" || operation.distributionAxis === "vertical")) {
        objects = distributeObjects(objects, ids, operation.distributionAxis as DistributionAxis);
      }
      if (before === JSON.stringify(objects)) skipped(operation); else applied(operation);
      continue;
    }
    if (operation.action === "apply_template") {
      const snapshot = operation.templateId ? createTemplateSnapshot(operation.templateId) : null;
      if (!snapshot) { skipped(operation); continue; }
      canvas = cloneCanvas(snapshot.canvas);
      objects = snapshot.objects.map(cloneNode);
      addedObjectIds.push(...objects.map((object) => object.id));
      applied(operation);
      continue;
    }
    if (operation.action === "insert_component") {
      const component = resources.components?.find((item) => item.id === operation.componentId);
      const inserted = component ? remapComponent(component, operation, canvas) : [];
      if (!inserted.length) { skipped(operation); continue; }
      objects = [...objects, ...inserted];
      addedObjectIds.push(...inserted.map((object) => object.id));
      applied(operation);
      continue;
    }
    if (operation.action === "apply_brand_kit") {
      const kit = resources.brandKits?.find((item) => item.id === operation.brandKitId);
      if (!kit) { skipped(operation); continue; }
      const requestedIds = targetIds(operation, objects);
      const ids = new Set(requestedIds);
      const nextColor = color(operation.color) && kit.colors.includes(operation.color!) ? operation.color! : kit.colors[0];
      const nextFont = operation.fontFamily && kit.fontFamilies.includes(operation.fontFamily) ? operation.fontFamily : kit.fontFamilies[0];
      if (!ids.size && operation.layerScope !== "all") { skipped(operation); continue; }
      objects = objects.map((object) => {
        if (!ids.has(object.id) || object.locked || object.kind === "image") return object;
        if (object.kind === "text") return { ...object, ...(nextColor ? { fill: nextColor } : {}), ...(nextFont ? { fontFamily: nextFont } : {}) };
        return { ...object, ...(nextColor ? { fill: nextColor } : {}) };
      });
      applied(operation);
      continue;
    }
    if (["add_page", "duplicate_page", "activate_page", "rename_page", "delete_page", "reorder_page"].includes(operation.action)) {
      flush();
      const before = JSON.stringify({ pages: draft.pages, activePageId: draft.activePageId });
      if (operation.action === "add_page" || operation.action === "duplicate_page") draft = addProjectPage(draft, operation.action === "duplicate_page");
      else if (operation.action === "activate_page" && operation.pageId) draft = activatePage(draft, operation.pageId);
      else if (operation.action === "rename_page" && operation.pageId && operation.name) draft = renameProjectPage(draft, operation.pageId, operation.name);
      else if (operation.action === "delete_page" && operation.pageId) draft = deleteProjectPage(draft, operation.pageId);
      else if (operation.action === "reorder_page" && operation.pageId && (operation.pageDirection === "previous" || operation.pageDirection === "next")) {
        draft = reorderProjectPage(draft, operation.pageId, operation.pageDirection === "previous" ? -1 : 1);
      }
      load();
      if (before === JSON.stringify({ pages: draft.pages, activePageId: draft.activePageId })) skipped(operation); else applied(operation);
      continue;
    }
    if (operation.action === "inspect_export") {
      const settings = exportSettings(operation, canvas);
      if (!settings) { skipped(operation); continue; }
      flush();
      const pages = settings.allPages ? draft.pages : draft.pages.filter((page) => page.id === draft.activePageId);
      const warnings = pages.flatMap((page) => assessExport({ ...draft, activePageId: page.id, canvas: page.canvas, objects: page.objects }, { ...settings, height: Math.round(page.canvas.height * settings.width / page.canvas.width) }, resources.exportAssets).map((warning) => `${page.name}: ${warning.message}`));
      const inspection = { format: settings.format, width: settings.width, height: settings.height, allPages: settings.allPages, warnings };
      exportInspections.push(inspection);
      receipts.push(warnings.length ? `Export preflight found ${warnings.length} warning${warnings.length === 1 ? "" : "s"}: ${warnings.join(" ")}` : `Export preflight passed for ${settings.format.toUpperCase()} at ${settings.width} x ${settings.height}.`);
      applied(operation, false);
      continue;
    }

    const index = operation.targetId ? objects.findIndex((object) => object.id === operation.targetId) : -1;
    const current = index >= 0 ? objects[index] : null;
    if (!current) { skipped(operation); continue; }
    if (operation.action === "delete_object") {
      if (current.locked) { skipped(operation); continue; }
      objects = objects.filter((object) => object.id !== current.id);
      applied(operation);
      continue;
    }
    if (operation.action === "duplicate_object") {
      if (current.locked) { skipped(operation); continue; }
      const duplicate = cloneNode(current);
      duplicate.id = newId();
      duplicate.name = textValue(operation.name) ?? `${current.name} copy`;
      duplicate.x = coordinate(operation.x, current.x + 24, canvas.width - duplicate.width);
      duplicate.y = coordinate(operation.y, current.y + 24, canvas.height - duplicate.height);
      duplicate.locked = operation.locked ?? false;
      const insertAt = operation.zIndex === null || operation.zIndex === undefined ? index + 1 : Math.round(clamp(operation.zIndex, 0, objects.length));
      objects = [...objects.slice(0, insertAt), duplicate, ...objects.slice(insertAt)];
      addedObjectIds.push(duplicate.id);
      applied(operation);
      continue;
    }
    if (operation.action === "reorder_object") {
      if (current.locked || operation.zIndex === null || operation.zIndex === undefined) { skipped(operation); continue; }
      const reordered = [...objects];
      const [moving] = reordered.splice(index, 1);
      reordered.splice(Math.round(clamp(operation.zIndex, 0, reordered.length)), 0, moving);
      objects = reordered;
      applied(operation);
      continue;
    }
    if (operation.action === "update_object") {
      const updated = updateObject(current, operation, canvas);
      if (!updated) { skipped(operation); continue; }
      objects = objects.map((object, objectIndex) => objectIndex === index ? updated : object);
      applied(operation);
      continue;
    }
    if (operation.action === "set_object_transform") {
      if (current.locked) { skipped(operation); continue; }
      const scaleX = operation.flipHorizontal === null || operation.flipHorizontal === undefined ? current.scaleX : Math.abs(current.scaleX) * (operation.flipHorizontal ? -1 : 1);
      const scaleY = operation.flipVertical === null || operation.flipVertical === undefined ? current.scaleY : Math.abs(current.scaleY) * (operation.flipVertical ? -1 : 1);
      const updated = { ...current, rotation: clamp(operation.rotation ?? current.rotation, -360, 360), scaleX, scaleY };
      objects = objects.map((object, objectIndex) => objectIndex === index ? updated : object);
      applied(operation);
      continue;
    }
    if (operation.action === "set_object_shadow") {
      if (current.kind === "image" || current.locked) { skipped(operation); continue; }
      const updated = applyObjectShadow(current, operation);
      objects = objects.map((object, objectIndex) => objectIndex === index ? updated : object);
      applied(operation);
      continue;
    }
    if (current.kind !== "image" || current.locked) { skipped(operation); continue; }
    const updated = operation.action === "set_image_adjustments"
      ? applyImageAdjustments(current, operation)
      : operation.action === "set_image_crop"
        ? applyImageCrop(current, operation)
        : operation.action === "set_image_mask"
          ? applyImageMask(current, operation)
          : operation.action === "set_image_presentation"
            ? { ...current, presentation: applyPresentation(current.presentation, operation) }
            : null;
    if (!updated) { skipped(operation); continue; }
    objects = objects.map((object, objectIndex) => objectIndex === index ? updated : object);
    applied(operation);
  }

  draft = flushActive(draft, canvas, objects);
  return {
    project: draft,
    snapshot: { canvas: cloneCanvas(draft.canvas), objects: draft.objects.map(cloneNode) },
    appliedOperations,
    skippedOperations,
    addedObjectIds,
    receipts,
    exportInspections,
    changed,
  };
}
