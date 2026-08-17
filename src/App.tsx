import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Bold,
  BringToFront,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FilePlus2,
  Frame,
  FolderOpen,
  GripVertical,
  ImagePlus,
  PenTool,
  Replace,
  Italic,
  Layers3,
  Lock,
  LoaderCircle,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  SendToBack,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Unlock,
  UserRound,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  CANVAS_PRESETS,
  DEFAULT_ARTWORK_PRESENTATION,
  DEFAULT_IMAGE_ADJUSTMENTS,
  DEFAULT_IMAGE_PRESENTATION,
  FULL_IMAGE_CROP,
  canRedo,
  canUndo,
  commitSnapshot,
  cloneArtworkPresentation,
  cloneImagePresentation,
  createProject,
  currentRevisionIndex,
  newId,
  redoProject,
  setCanvasPreset,
  undoProject,
  type ArtworkPresentation,
  type CanvasSettings,
  type CanvasPreset,
  type DesignNode,
  type ImageAdjustments,
  type ImageDesignNode,
  type ImagePresentation,
  type GlassWareProject,
  type NormalizedCrop,
  type ShapeKind,
} from "./lib/model";
import {
  DESIGN_OBJECT_NAME,
  applyDesignFill,
  applyImageEdits,
  applyImagePresentation,
  applyLockedState,
  createImageFrameShell,
  designNodeToKonva,
  findDesignNode,
  serializeLayer,
  updatePresentationFrameShell,
} from "./lib/canvas";
import {
  bootstrapProject,
  consumeExtensionCapture,
  createStoredAsset,
  dataUrlToBlob,
  listProjects,
  listFontAssets,
  loadAsset,
  loadProject,
  saveAsset,
  saveFontAsset,
  saveProject,
  type AssetSource,
  type StoredFontAsset,
} from "./lib/storage";
import { buildProjectBundle, downloadTextFile, readProjectBundle, safeFilename } from "./lib/bundle";
import { PHOTO_PRESETS, centerCropForAspect, fitDisplayBoxToAspect, type PhotoPreset } from "./lib/image-edits";
import { AccountPanel } from "./components/AccountPanel";
import {
  StudioPanel,
  type ArtworkPresentationPatch,
  type ImagePresentationPatch,
  type StudioTarget,
} from "./components/StudioPanel";
import {
  applyScreenshotStudioOperations,
  findBackdropPreset,
  type ScreenshotStudioPresentationOperation,
} from "./lib/screenshot-studio";
import {
  STUDIO_PLAYGROUND_NAME,
  createStudioPlaygroundImage,
  createStudioPlaygroundProject,
} from "./lib/studio-playground";
import { AiConnectionsPanel } from "./components/AiConnectionsPanel";
import { AiSettingsModal } from "./components/AiSettingsModal";
import { SignInModal } from "./components/SignInModal";
import { useAccountConnections } from "./hooks/use-account-connections";
import {
  downloadOpenverseImage,
  openverseAssetSource,
  searchOpenverseImages,
  type OpenverseImage,
} from "./lib/openverse";
import {
  GOOGLE_FONT_CHOICES,
  SYSTEM_FONTS,
  createUploadedFont,
  downloadGoogleFont,
  registerFont,
} from "./lib/fonts";

const COLOR_SWATCHES = [
  "#111111", "#ffffff", "#d9d9d9", "#8b8b8b", "#ff5d42", "#ffb000",
  "#ffe14d", "#35a36f", "#24a8a8", "#3f7fff", "#7454d6", "#e6499a",
];
const MAX_STAGE_SIZE = 640;

const SHAPE_OPTIONS: Array<{ kind: ShapeKind; label: string }> = [
  { kind: "rect", label: "Rectangle" },
  { kind: "rounded-rect", label: "Rounded" },
  { kind: "ellipse", label: "Circle" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "star", label: "Star" },
  { kind: "heart", label: "Heart" },
  { kind: "speech-bubble", label: "Speech" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
  { kind: "curved-arrow", label: "Curved arrow" },
  { kind: "blur", label: "Blur region" },
  { kind: "redact", label: "Redact" },
];

const ANNOTATION_OPTIONS: Array<{ kind: ShapeKind; label: string; note: string }> = [
  { kind: "arrow", label: "Arrow", note: "Point to a detail" },
  { kind: "curved-arrow", label: "Curved arrow", note: "Call out around content" },
  { kind: "rect", label: "Rectangle", note: "Box an interface area" },
  { kind: "ellipse", label: "Circle", note: "Ring a focal point" },
  { kind: "line", label: "Line", note: "Divide or underline" },
  { kind: "blur", label: "Blur", note: "Visually soften an area" },
  { kind: "redact", label: "Redact", note: "Safely cover private data" },
];

type TextPreset = "heading" | "subheading" | "body";

type SaveState = "saving" | "saved" | "error";
type ToolName = "Select" | "Images" | "Studio" | "Annotate" | "Text" | "Shapes" | "Layers" | "Files" | "AI" | "Account";
type LayerDropTarget = { id: string; edge: "before" | "after" };

function artworkLayout(canvas: CanvasSettings, presentation: ArtworkPresentation) {
  if (!presentation.enabled) return { x: 0, y: 0, scale: 1 };
  const padding = Math.min(presentation.padding, Math.min(canvas.width, canvas.height) * 0.42);
  const scale = Math.max(0.16, Math.min(
    (canvas.width - padding * 2) / canvas.width,
    (canvas.height - padding * 2) / canvas.height,
  ));
  return {
    x: (canvas.width - canvas.width * scale) / 2,
    y: (canvas.height - canvas.height * scale) / 2,
    scale,
  };
}

function roundedArtworkClip(width: number, height: number, radius: number) {
  return (context: Konva.Context) => {
    const corner = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(corner, 0);
    context.lineTo(width - corner, 0);
    context.quadraticCurveTo(width, 0, width, corner);
    context.lineTo(width, height - corner);
    context.quadraticCurveTo(width, height, width - corner, height);
    context.lineTo(corner, height);
    context.quadraticCurveTo(0, height, 0, height - corner);
    context.lineTo(0, corner);
    context.quadraticCurveTo(0, 0, corner, 0);
    context.closePath();
  };
}

function noiseTile(): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = 96;
  tile.height = 96;
  const context = tile.getContext("2d");
  if (!context) return tile;
  const image = context.createImageData(tile.width, tile.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = (index * 17 + Math.floor(index / 97) * 31) % 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 95;
  }
  context.putImageData(image, 0, 0);
  return tile;
}

function blobImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The backdrop image could not be decoded."));
    };
    image.src = url;
  });
}

function App() {
  const [project, setProject] = useState<GlassWareProject | null>(null);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void bootstrapProject()
      .then((loaded) => !cancelled && setProject(loaded))
      .catch((error: unknown) => !cancelled && setBootError(error instanceof Error ? error.message : "Unable to open GlassWare"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) {
    return <div className="boot-screen"><img src="./glassware-mark.svg" alt="" /><h1>GlassWare could not open.</h1><p>{bootError}</p></div>;
  }
  if (!project) {
    return <div className="boot-screen"><img src="./glassware-mark.svg" alt="" /><h1>Opening your local workbench…</h1><p>Loading projects and image assets from this device.</p></div>;
  }
  return <Editor key={project.id} initialProject={project} replaceProject={setProject} />;
}

function Editor({
  initialProject,
  replaceProject,
}: {
  initialProject: GlassWareProject;
  replaceProject: (project: GlassWareProject) => void;
}) {
  const canvasElement = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const artworkGroupRef = useRef<Konva.Group | null>(null);
  const artworkCardRef = useRef<Konva.Rect | null>(null);
  const artworkBackdropRef = useRef<Konva.Group | null>(null);
  const artworkFrameRef = useRef<Konva.Group | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);
  const projectRef = useRef(initialProject);
  const zoomRef = useRef(1);
  const renderVersionRef = useRef(0);
  const zoomVersionRef = useRef(0);
  const saveVersionRef = useRef(0);
  const liveArtworkPresentationRef = useRef(
    cloneArtworkPresentation(initialProject.canvas.presentation ?? DEFAULT_ARTWORK_PRESENTATION),
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceImageInput = useRef<HTMLInputElement>(null);
  const backdropImageInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const canvasViewport = useRef<HTMLElement>(null);
  const inlineEditorCleanupRef = useRef<(() => void) | null>(null);
  const [project, setProject] = useState(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(initialProject.objects[0]?.id ?? null);
  const [activeTool, setActiveTool] = useState<ToolName>(
    initialProject.name === STUDIO_PLAYGROUND_NAME ? "Studio" : "Select",
  );
  const [studioTarget, setStudioTarget] = useState<StudioTarget>(
    initialProject.objects[0]?.kind === "image" ? "image" : "artwork",
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [recentProjects, setRecentProjects] = useState<GlassWareProject[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedAssetSource, setSelectedAssetSource] = useState<AssetSource | null>(null);
  const [fontAssets, setFontAssets] = useState<StoredFontAsset[]>([]);
  const [fontLoading, setFontLoading] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [layerDropTarget, setLayerDropTarget] = useState<LayerDropTarget | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const accountConnections = useAccountConnections();
  const selectedObject = project.objects.find((object) => object.id === selectedId) ?? null;
  const selectedAssetId = selectedObject?.kind === "image" ? selectedObject.assetId : null;
  const fitScale = Math.min(MAX_STAGE_SIZE / project.canvas.width, MAX_STAGE_SIZE / project.canvas.height);
  const viewScale = fitScale * zoom;
  const stageWidth = Math.round(project.canvas.width * viewScale);
  const stageHeight = Math.round(project.canvas.height * viewScale);

  useEffect(() => {
    const selected = projectRef.current.objects.find((object) => object.id === selectedId);
    setStudioTarget(selected?.kind === "image" ? "image" : "artwork");
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedAssetId) {
      setSelectedAssetSource(null);
      return;
    }
    void loadAsset(selectedAssetId).then((asset) => {
      if (!cancelled) setSelectedAssetSource(asset?.source ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedAssetId]);

  useEffect(() => {
    let cancelled = false;
    void listFontAssets().then(async (fonts) => {
      await Promise.all(fonts.map((font) => registerFont(font).catch((error) => console.error(error))));
      if (cancelled) return;
      setFontAssets(fonts);
      await renderProject(projectRef.current, selectedId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrentProject(next: GlassWareProject) {
    projectRef.current = next;
    setProject(next);
  }

  async function persist(next = projectRef.current) {
    const version = ++saveVersionRef.current;
    setSaveState("saving");
    try {
      await saveProject(next);
      if (version === saveVersionRef.current) setSaveState("saved");
    } catch (error) {
      console.error(error);
      if (version === saveVersionRef.current) setSaveState("error");
    }
  }

  function displayDimensions(next: GlassWareProject) {
    const scale = Math.min(MAX_STAGE_SIZE / next.canvas.width, MAX_STAGE_SIZE / next.canvas.height) * zoomRef.current;
    return {
      scale,
      width: Math.round(next.canvas.width * scale),
      height: Math.round(next.canvas.height * scale),
    };
  }

  function selectById(designId: string | null) {
    const layer = layerRef.current;
    const transformer = transformerRef.current;
    if (!layer || !transformer) return;
    const node = designId ? findDesignNode(layer, designId) : null;
    selectedNodeRef.current = node;
    transformer.nodes(node?.visible() ? [node] : []);
    const locked = Boolean(node?.getAttr("designLocked"));
    transformer.resizeEnabled(!locked);
    transformer.rotateEnabled(!locked);
    setSelectedId(node ? designId : null);
    layer.batchDraw();
  }

  function beginInlineTextEdit(node: Konva.Text) {
    if (node.getAttr("designLocked")) return;
    inlineEditorCleanupRef.current?.();
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;

    const containerRect = stage.container().getBoundingClientRect();
    const position = node.getAbsolutePosition();
    const scale = node.getAbsoluteScale();
    const textarea = document.createElement("textarea");
    const original = node.text();
    let closed = false;
    textarea.className = "inline-text-editor";
    textarea.setAttribute("aria-label", "Edit text on canvas");
    textarea.value = original;
    Object.assign(textarea.style, {
      left: `${containerRect.left + position.x}px`,
      top: `${containerRect.top + position.y}px`,
      width: `${Math.max(80, node.width() * scale.x)}px`,
      minHeight: `${Math.max(34, node.height() * scale.y)}px`,
      fontFamily: node.fontFamily(),
      fontSize: `${node.fontSize() * scale.y}px`,
      fontStyle: node.fontStyle().includes("italic") ? "italic" : "normal",
      fontWeight: node.fontStyle().includes("bold") ? "700" : "400",
      lineHeight: String(node.lineHeight()),
      color: String(node.fill()),
      textAlign: node.align(),
      transform: `rotate(${node.getAbsoluteRotation()}deg)`,
    });
    document.body.append(textarea);
    node.hide();
    transformer.hide();
    layerRef.current?.batchDraw();

    const finish = (commit: boolean) => {
      if (closed) return;
      closed = true;
      textarea.removeEventListener("blur", onBlur);
      textarea.removeEventListener("keydown", onKeyDown);
      const nextText = textarea.value;
      textarea.remove();
      node.show();
      transformer.show();
      inlineEditorCleanupRef.current = null;
      if (commit && nextText !== original) {
        node.text(nextText);
        transformer.forceUpdate();
        commitCanvas("Text edited on canvas");
      } else {
        layerRef.current?.batchDraw();
      }
    };
    const onBlur = () => finish(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        finish(true);
      }
    };
    textarea.addEventListener("blur", onBlur);
    textarea.addEventListener("keydown", onKeyDown);
    inlineEditorCleanupRef.current = () => finish(false);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  async function createArtworkBackdrop(
    canvas: CanvasSettings,
    presentation: ArtworkPresentation,
  ): Promise<Konva.Group> {
    const group = new Konva.Group({
      id: "presentation-backdrop",
      width: canvas.width,
      height: canvas.height,
      listening: false,
    });
    const backdrop = presentation.enabled
      ? presentation.backdrop
      : { ...presentation.backdrop, type: "solid" as const, value: canvas.background, opacity: 1, blur: 0, noise: 0 };

    if (backdrop.type === "image" && backdrop.assetId) {
      const asset = await loadAsset(backdrop.assetId);
      if (asset) {
        const source = await blobImage(asset.blob);
        const sourceAspect = asset.width / asset.height;
        const targetAspect = canvas.width / canvas.height;
        const crop = sourceAspect > targetAspect
          ? { x: (asset.width - asset.height * targetAspect) / 2, y: 0, width: asset.height * targetAspect, height: asset.height }
          : { x: 0, y: (asset.height - asset.width / targetAspect) / 2, width: asset.width, height: asset.width / targetAspect };
        const image = new Konva.Image({
          id: "backdrop-image",
          image: source,
          width: canvas.width,
          height: canvas.height,
          crop,
          listening: false,
        });
        if (backdrop.blur > 0) {
          image.cache({ pixelRatio: 1 });
          image.blurRadius(backdrop.blur);
          image.filters([Konva.Filters.Blur]);
        }
        group.add(image);
      }
    }

    if (!group.hasChildren()) {
      const base = new Konva.Rect({
        id: "backdrop-base",
        width: canvas.width,
        height: canvas.height,
        fill: backdrop.type === "solid" ? backdrop.value : presentation.background,
        listening: false,
      });
      if (backdrop.type === "gradient") {
        const preset = findBackdropPreset(backdrop.value);
        const stops = preset.colors.length === 3
          ? [0, preset.colors[0], 0.52, preset.colors[1], 1, preset.colors[2]!]
          : [0, preset.colors[0], 1, preset.colors[1]];
        base.setAttrs({
          fill: undefined,
          fillPriority: "linear-gradient",
          fillLinearGradientStartPoint: { x: 0, y: 0 },
          fillLinearGradientEndPoint: { x: canvas.width, y: canvas.height },
          fillLinearGradientColorStops: stops,
        });
      }
      group.add(base);
    }
    if (backdrop.noise > 0) {
      group.add(new Konva.Rect({
        id: "backdrop-noise",
        width: canvas.width,
        height: canvas.height,
        fillPatternImage: noiseTile() as unknown as HTMLImageElement,
        fillPatternRepeat: "repeat",
        opacity: Math.min(0.28, backdrop.noise / 280),
        listening: false,
      }));
    }
    group.opacity(backdrop.opacity);
    return group;
  }

  function applyArtworkPresentationToStage(
    canvas: CanvasSettings,
    presentation: ArtworkPresentation,
  ) {
    const group = artworkGroupRef.current;
    const card = artworkCardRef.current;
    const backdrop = artworkBackdropRef.current;
    const frameShell = artworkFrameRef.current;
    if (!group || !card || !backdrop || !frameShell) return;
    const layout = artworkLayout(canvas, presentation);
    const enabled = presentation.enabled;
    backdrop.opacity(enabled ? presentation.backdrop.opacity : 1);
    backdrop.findOne("#backdrop-noise")?.opacity(Math.min(0.28, presentation.backdrop.noise / 280));
    const backdropImage = backdrop.findOne("#backdrop-image");
    if (backdropImage instanceof Konva.Image) {
      backdropImage.blurRadius(presentation.backdrop.blur);
      backdropImage.filters(presentation.backdrop.blur > 0 ? [Konva.Filters.Blur] : []);
      if (presentation.backdrop.blur > 0 && !backdropImage.isCached()) backdropImage.cache({ pixelRatio: 1 });
    }
    card.setAttrs({
      x: layout.x,
      y: layout.y,
      width: canvas.width * layout.scale,
      height: canvas.height * layout.scale,
      fill: canvas.background,
      cornerRadius: enabled ? presentation.cornerRadius * layout.scale : 0,
      strokeEnabled: false,
      shadowEnabled: enabled && presentation.shadow.enabled && presentation.frame.type === "none",
      shadowColor: presentation.shadow.color,
      shadowBlur: presentation.shadow.blur * layout.scale,
      shadowOffsetX: presentation.shadow.offsetX * layout.scale,
      shadowOffsetY: presentation.shadow.offsetY * layout.scale,
      shadowOpacity: presentation.shadow.opacity,
    });
    group.setAttrs({
      x: layout.x,
      y: layout.y,
      scaleX: layout.scale,
      scaleY: layout.scale,
      clipFunc: roundedArtworkClip(
        canvas.width,
        canvas.height,
        enabled ? presentation.cornerRadius : 0,
      ),
    });
    updatePresentationFrameShell(
      frameShell,
      canvas.width * layout.scale,
      canvas.height * layout.scale,
      presentation,
    );
    frameShell.setAttrs({
      x: layout.x,
      y: layout.y,
      visible: enabled && presentation.frame.type !== "none",
    });
    liveArtworkPresentationRef.current = cloneArtworkPresentation(presentation);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
  }

  async function renderProject(next: GlassWareProject, selectAfter: string | null = null) {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    const renderVersion = ++renderVersionRef.current;
    const dimensions = displayDimensions(next);
    stage.size({ width: dimensions.width, height: dimensions.height });
    layer.destroyChildren();
    layer.scale({ x: dimensions.scale, y: dimensions.scale });
    const backdrop = await createArtworkBackdrop(next.canvas, next.canvas.presentation);
    if (renderVersion !== renderVersionRef.current) return;
    const card = new Konva.Rect({ id: "artwork-card", listening: false });
    const artworkGroup = new Konva.Group({ id: "artwork-content" });
    const artworkFrame = new Konva.Group({ id: "artwork-frame-shell", listening: false });
    artworkGroup.add(new Konva.Rect({
      id: "background",
      width: next.canvas.width,
      height: next.canvas.height,
      fill: next.canvas.background,
      listening: false,
    }));
    artworkBackdropRef.current = backdrop;
    artworkCardRef.current = card;
    artworkGroupRef.current = artworkGroup;
    artworkFrameRef.current = artworkFrame;
    layer.add(backdrop);
    layer.add(card);
    layer.add(artworkGroup);
    layer.add(artworkFrame);
    for (const object of next.objects) {
      const node = await designNodeToKonva(object, loadAsset, artworkGroup);
      if (renderVersion !== renderVersionRef.current) return;
      if (node instanceof Konva.Image && object.kind === "image") {
        artworkGroup.add(createImageFrameShell(node, object.presentation));
      }
      artworkGroup.add(node);
    }
    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      borderStroke: "#111111",
      borderStrokeWidth: 2 / dimensions.scale,
      anchorFill: "#ffffff",
      anchorStroke: "#111111",
      anchorStrokeWidth: 2 / dimensions.scale,
      anchorSize: 12 / dimensions.scale,
      padding: 4 / dimensions.scale,
    });
    transformerRef.current = transformer;
    layer.add(transformer);
    applyArtworkPresentationToStage(next.canvas, next.canvas.presentation);
    layer.draw();
    selectById(selectAfter && next.objects.some((object) => object.id === selectAfter) ? selectAfter : null);
  }

  function commitCanvas(summary: string) {
    const layer = layerRef.current;
    if (!layer) return;
    const next = commitSnapshot(projectRef.current, summary, {
      canvas: { ...projectRef.current.canvas },
      objects: serializeLayer(layer),
    });
    setCurrentProject(next);
    if (next.objects.some((object) => object.kind === "shape" && object.shape === "blur")) {
      void renderProject(next, selectedId);
    }
    void persist(next);
  }

  function clearSnapGuides() {
    layerRef.current?.find(".snap-guide").forEach((guide) => guide.destroy());
  }

  function snapDraggedNode(node: Konva.Node) {
    const layer = layerRef.current;
    const artworkGroup = artworkGroupRef.current;
    if (!layer || !artworkGroup) return;
    clearSnapGuides();
    const canvas = projectRef.current.canvas;
    const xGuides = [0, canvas.width / 2, canvas.width];
    const yGuides = [0, canvas.height / 2, canvas.height];
    for (const other of layer.find(`.${DESIGN_OBJECT_NAME}`)) {
      if (other === node || !other.visible()) continue;
      const rect = other.getClientRect({ relativeTo: artworkGroup, skipShadow: true, skipStroke: true });
      xGuides.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
      yGuides.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
    }
    const rect = node.getClientRect({ relativeTo: artworkGroup, skipShadow: true, skipStroke: true });
    const ownX = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
    const ownY = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
    const artworkScale = artworkLayout(canvas, liveArtworkPresentationRef.current).scale;
    const activeScale = displayDimensions(projectRef.current).scale * artworkScale;
    const threshold = 8 / activeScale;
    const xMatch = xGuides
      .flatMap((guide) => ownX.map((point) => ({ guide, delta: guide - point })))
      .filter((match) => Math.abs(match.delta) <= threshold)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
    const yMatch = yGuides
      .flatMap((guide) => ownY.map((point) => ({ guide, delta: guide - point })))
      .filter((match) => Math.abs(match.delta) <= threshold)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
    if (xMatch) node.x(node.x() + xMatch.delta);
    if (yMatch) node.y(node.y() + yMatch.delta);
    const strokeWidth = 1.5 / activeScale;
    if (xMatch) artworkGroup.add(new Konva.Line({ name: "snap-guide", points: [xMatch.guide, 0, xMatch.guide, canvas.height], stroke: "#111111", strokeWidth, dash: [10 / activeScale, 7 / activeScale], listening: false }));
    if (yMatch) artworkGroup.add(new Konva.Line({ name: "snap-guide", points: [0, yMatch.guide, canvas.width, yMatch.guide], stroke: "#111111", strokeWidth, dash: [10 / activeScale, 7 / activeScale], listening: false }));
    transformerRef.current?.moveToTop();
    layer.batchDraw();
  }

  useEffect(() => {
    if (!canvasElement.current) return;
    let cancelled = false;
    const dimensions = displayDimensions(initialProject);
    const stage = new Konva.Stage({
      container: canvasElement.current,
      width: dimensions.width,
      height: dimensions.height,
    });
    const layer = new Konva.Layer();
    stage.add(layer);
    stageRef.current = stage;
    layerRef.current = layer;

    stage.on("pointerdown", (event) => {
      const target = event.target;
      if (target.hasName("_anchor") || target instanceof Konva.Transformer) return;
      const designNode = target.hasName(DESIGN_OBJECT_NAME)
        ? target
        : target.findAncestor(`.${DESIGN_OBJECT_NAME}`);
      selectById(designNode ? String((designNode as Konva.Node).getAttr("designId")) : null);
    });
    stage.on("dblclick dbltap", (event) => {
      const target = event.target;
      const designNode = target.hasName(DESIGN_OBJECT_NAME)
        ? target
        : target.findAncestor(`.${DESIGN_OBJECT_NAME}`);
      if (!(designNode instanceof Konva.Text)) return;
      selectById(String(designNode.getAttr("designId")));
      beginInlineTextEdit(designNode);
    });
    stage.on("dragmove", (event) => {
      if (event.target.hasName(DESIGN_OBJECT_NAME)) snapDraggedNode(event.target);
    });
    stage.on("dragend", (event) => {
      clearSnapGuides();
      if (event.target.hasName(DESIGN_OBJECT_NAME)) commitCanvas("Object moved");
    });
    stage.on("transformend", (event) => {
      if (event.target.hasName(DESIGN_OBJECT_NAME)) commitCanvas("Object transformed");
    });

    void renderProject(initialProject, initialProject.objects[0]?.id ?? null).then(async () => {
      if (cancelled) return;
      const capture = await consumeExtensionCapture();
      if (!capture || cancelled) return;
      const blob = await dataUrlToBlob(capture);
      await addImageBlob(new File([blob], "Browser capture.png", { type: blob.type || "image/png" }));
    });
    void listProjects().then((projects) => !cancelled && setRecentProjects(projects));

    return () => {
      cancelled = true;
      renderVersionRef.current += 1;
      inlineEditorCleanupRef.current?.();
      stage.destroy();
      stageRef.current = null;
      layerRef.current = null;
      artworkGroupRef.current = null;
      artworkCardRef.current = null;
      artworkBackdropRef.current = null;
      artworkFrameRef.current = null;
      transformerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewport = canvasViewport.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      void changeZoom(event.deltaY < 0 ? 0.1 : -0.1, { clientX: event.clientX, clientY: event.clientY });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function isTyping(target: EventTarget | null) {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (command && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persist();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeRef.current) {
        event.preventDefault();
        deleteSelected();
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && selectedNodeRef.current) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const node = selectedNodeRef.current;
        if (event.key === "ArrowLeft") node.x(node.x() - amount);
        if (event.key === "ArrowRight") node.x(node.x() + amount);
        if (event.key === "ArrowUp") node.y(node.y() - amount);
        if (event.key === "ArrowDown") node.y(node.y() + amount);
        layerRef.current?.batchDraw();
        commitCanvas("Object nudged");
      }
    }
    function onPaste(event: ClipboardEvent) {
      if (isTyping(event.target)) return;
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith("image/"));
      if (image) void addImageBlob(image);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  async function addImageBlob(file: Blob & { name?: string }, source?: AssetSource): Promise<boolean> {
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file to add to the canvas.");
      return false;
    }
    try {
      const asset = await createStoredAsset(projectRef.current.id, file, source);
      await saveAsset(asset);
      const maxWidth = projectRef.current.canvas.width * 0.7;
      const maxHeight = projectRef.current.canvas.height * 0.7;
      const scale = Math.min(1, maxWidth / asset.width, maxHeight / asset.height);
      const width = Math.max(1, asset.width * scale);
      const height = Math.max(1, asset.height * scale);
      const design: DesignNode = {
        id: newId(),
        kind: "image",
        name: asset.name,
        assetId: asset.id,
        crop: { ...FULL_IMAGE_CROP },
        adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
        presentation: cloneImagePresentation(),
        x: (projectRef.current.canvas.width - width) / 2,
        y: (projectRef.current.canvas.height - height) / 2,
        width,
        height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
      };
      const artworkGroup = artworkGroupRef.current;
      const node = await designNodeToKonva(design, loadAsset, artworkGroup ?? undefined);
      if (artworkGroup) {
        if (node instanceof Konva.Image && design.kind === "image") artworkGroup.add(createImageFrameShell(node, design.presentation));
        artworkGroup.add(node);
      }
      transformerRef.current?.moveToTop();
      selectById(design.id);
      commitCanvas("Image added");
      setActiveTool("Images");
      setMessage("");
      return true;
    } catch (error) {
      console.error(error);
      setMessage("That image could not be added. Try PNG, JPEG, or WebP.");
      return false;
    }
  }

  async function addOpenverseImage(image: OpenverseImage): Promise<boolean> {
    try {
      const file = await downloadOpenverseImage(image);
      const added = await addImageBlob(file, openverseAssetSource(image));
      if (added) setMessage(`Added “${image.title}” with its ${image.license} source receipt.`);
      return added;
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "That open image could not be added.");
      return false;
    }
  }

  function handleUpload(file?: File) {
    if (file) void addImageBlob(file);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function replaceSelectedImage(file?: File) {
    const targetId = selectedId;
    const target = projectRef.current.objects.find((object) => object.id === targetId);
    if (!file || !targetId || target?.kind !== "image") return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
      const asset = await createStoredAsset(projectRef.current.id, file);
      await saveAsset(asset);
      const current = projectRef.current;
      const objects = current.objects.map((object) => object.id === targetId && object.kind === "image"
        ? { ...object, assetId: asset.id }
        : object);
      const next = commitSnapshot(current, "Image source replaced", { canvas: current.canvas, objects });
      setCurrentProject(next);
      await renderProject(next, targetId);
      void persist(next);
      setMessage(`Replaced the image source with “${asset.name}” and kept its layout and Studio styling.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "That image could not be used as a replacement.");
    } finally {
      if (replaceImageInput.current) replaceImageInput.current.value = "";
    }
  }

  async function uploadArtworkBackdrop(file?: File) {
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file for the artwork backdrop.");
      const asset = await createStoredAsset(projectRef.current.id, file);
      await saveAsset(asset);
      setStudioTarget("artwork");
      updateArtworkPresentation({
        backdrop: { type: "image", value: asset.name, assetId: asset.id },
      }, "Artwork image backdrop changed");
      setMessage(`Using “${asset.name}” as the artwork backdrop.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "That backdrop image could not be added.");
    } finally {
      if (backdropImageInput.current) backdropImageInput.current.value = "";
    }
  }

  async function addText(preset: TextPreset) {
    const styles = {
      heading: { name: "Heading", text: "Add a heading", fontSize: 86, fontStyle: "bold", width: 820, height: 150 },
      subheading: { name: "Subheading", text: "Add a subheading", fontSize: 52, fontStyle: "bold", width: 760, height: 100 },
      body: { name: "Body text", text: "Add a little bit of body text", fontSize: 32, fontStyle: "normal", width: 680, height: 120 },
    }[preset];
    const design: DesignNode = {
      id: newId(),
      kind: "text",
      name: styles.name,
      text: styles.text,
      x: projectRef.current.canvas.width * 0.16,
      y: projectRef.current.canvas.height * (preset === "heading" ? 0.2 : preset === "subheading" ? 0.42 : 0.64),
      width: Math.min(projectRef.current.canvas.width * 0.68, styles.width),
      height: styles.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#111111",
      fontFamily: "Helvetica",
      fontSize: styles.fontSize,
      fontStyle: styles.fontStyle,
      align: "left",
      lineHeight: 1.05,
    };
    artworkGroupRef.current?.add(await designNodeToKonva(design, loadAsset, artworkGroupRef.current ?? undefined));
    transformerRef.current?.moveToTop();
    selectById(design.id);
    commitCanvas("Text added");
    setActiveTool("Text");
  }

  async function addShape(shape: ShapeKind) {
    const annotation = activeTool === "Annotate"
      ? ANNOTATION_OPTIONS.find((option) => option.kind === shape)
      : undefined;
    const isLinear = shape === "line" || shape === "arrow" || shape === "curved-arrow";
    const isRedaction = shape === "blur" || shape === "redact";
    const isWide = isLinear || isRedaction || shape === "speech-bubble";
    const width = projectRef.current.canvas.width * (isWide ? 0.42 : 0.28);
    const height = projectRef.current.canvas.height * (isLinear ? 0.16 : isRedaction ? 0.12 : shape === "speech-bubble" ? 0.2 : 0.28);
    const label = annotation?.label ?? SHAPE_OPTIONS.find((option) => option.kind === shape)?.label ?? "Shape";
    const design: DesignNode = {
      id: newId(),
      kind: "shape",
      name: label,
      shape,
      x: (projectRef.current.canvas.width - width) / 2,
      y: (projectRef.current.canvas.height - height) / 2,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: shape === "redact" ? "#111111" : annotation ? "#ff5d42" : "#d9d9d9",
      cornerRadius: shape === "rounded-rect" ? 28 : isRedaction ? 10 : 0,
    };
    artworkGroupRef.current?.add(await designNodeToKonva(design, loadAsset, artworkGroupRef.current ?? undefined));
    transformerRef.current?.moveToTop();
    selectById(design.id);
    commitCanvas(annotation ? `${label} annotation added` : "Shape added");
    setActiveTool(annotation ? "Annotate" : "Shapes");
  }

  function updateSelectedLive(attributes: Record<string, unknown>) {
    const node = selectedNodeRef.current;
    if (!node) return;
    node.setAttrs(attributes);
    layerRef.current?.batchDraw();
  }

  function previewFill(color: string) {
    if (!selectedNodeRef.current || selectedObject?.kind === "image") return;
    applyDesignFill(selectedNodeRef.current, color);
    layerRef.current?.batchDraw();
  }

  function setFill(color: string) {
    const current = projectRef.current.objects.find((object) => object.id === selectedId);
    previewFill(color);
    if (!current || current.kind === "image" || current.fill.toLowerCase() === color.toLowerCase()) return;
    commitCanvas("Color changed");
  }

  function previewBackground(color: string) {
    const layer = layerRef.current;
    if (!layer) return;
    layer.findOne("#background")?.setAttr("fill", color);
    layer.findOne("#artwork-card")?.setAttr("fill", color);
    if (!liveArtworkPresentationRef.current.enabled) {
      layer.findOne("#backdrop-base")?.setAttr("fill", color);
    }
    layer.batchDraw();
  }

  function setBackground(color: string) {
    const layer = layerRef.current;
    if (!layer) return;
    previewBackground(color);
    if (projectRef.current.canvas.background.toLowerCase() === color.toLowerCase()) return;
    const next = commitSnapshot(projectRef.current, "Background changed", {
      canvas: { ...projectRef.current.canvas, background: color },
      objects: serializeLayer(layer),
    });
    setCurrentProject(next);
    layer.draw();
    void persist(next);
  }

  function updateSelectedName(name: string) {
    if (!selectedNodeRef.current || !name.trim()) return;
    selectedNodeRef.current.setAttr("designName", name.trim());
    commitCanvas("Layer renamed");
  }

  function updateSelectedText(text: string) {
    if (!(selectedNodeRef.current instanceof Konva.Text)) return;
    selectedNodeRef.current.text(text);
    layerRef.current?.draw();
    commitCanvas("Text edited");
  }

  function updateTextProperty(attributes: Record<string, unknown>, summary: string, commit = true) {
    const node = selectedNodeRef.current;
    if (!(node instanceof Konva.Text)) return;
    node.setAttrs(attributes);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    if (commit) commitCanvas(summary);
  }

  async function chooseFont(family: string) {
    const targetId = selectedId;
    const target = targetId && projectRef.current.objects.find((object) => object.id === targetId);
    if (!target || target.kind !== "text") return;
    if (target.fontFamily === family) return;
    setFontLoading(family);
    try {
      let font = fontAssets.find((asset) => asset.family === family);
      if (!font && GOOGLE_FONT_CHOICES.some((choice) => choice.family === family)) {
        font = await downloadGoogleFont(family);
        await saveFontAsset(font);
        setFontAssets((current) => [...current.filter((asset) => asset.id !== font!.id), font!].sort((a, b) => a.family.localeCompare(b.family)));
        setMessage(`${family} downloaded for offline use in GlassWare.`);
      }
      if (font) await registerFont(font);
      const node = layerRef.current && findDesignNode(layerRef.current, targetId);
      if (!(node instanceof Konva.Text)) return;
      node.fontFamily(family);
      transformerRef.current?.forceUpdate();
      layerRef.current?.batchDraw();
      commitCanvas("Typeface changed");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : `The ${family} font could not be loaded.`);
    } finally {
      setFontLoading(null);
    }
  }

  async function uploadFont(file?: File) {
    if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024 || !/\.(woff2?|ttf|otf)$/i.test(file.name)) {
        throw new Error("Choose a WOFF, WOFF2, TTF, or OTF font file under 25 MB.");
      }
      const font = createUploadedFont(file);
      setFontLoading(font.family);
      await registerFont(font);
      await saveFontAsset(font);
      setFontAssets((current) => [...current.filter((asset) => asset.id !== font.id), font].sort((a, b) => a.family.localeCompare(b.family)));
      await chooseFont(font.family);
      setMessage(`${font.family} is installed locally. Confirm its license before sharing a portable project.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "That font file could not be installed.");
    } finally {
      setFontLoading(null);
      if (fontInput.current) fontInput.current.value = "";
    }
  }

  function toggleTextStyle(style: "bold" | "italic") {
    const node = selectedNodeRef.current;
    if (!(node instanceof Konva.Text)) return;
    const active = new Set(node.fontStyle().split(" ").filter((value) => value !== "normal"));
    active.has(style) ? active.delete(style) : active.add(style);
    updateTextProperty({ fontStyle: active.size ? [...active].join(" ") : "normal" }, "Typography changed");
  }

  function changeShapeType(shape: ShapeKind) {
    if (!selectedId) return;
    const nextObjects = projectRef.current.objects.map((object) =>
      object.id === selectedId && object.kind === "shape" ? { ...object, shape } : object,
    );
    const next = commitSnapshot(projectRef.current, "Shape changed", {
      canvas: projectRef.current.canvas,
      objects: nextObjects,
    });
    setCurrentProject(next);
    void renderProject(next, selectedId);
    void persist(next);
  }

  function liveImageState(): {
    node: Konva.Image;
    crop: NormalizedCrop;
    adjustments: ImageAdjustments;
    presentation: ImagePresentation;
  } | null {
    const node = selectedNodeRef.current;
    if (!(node instanceof Konva.Image)) return null;
    return {
      node,
      crop: { ...(node.getAttr("normalizedCrop") ?? FULL_IMAGE_CROP) },
      adjustments: { ...(node.getAttr("imageAdjustments") ?? DEFAULT_IMAGE_ADJUSTMENTS) },
      presentation: cloneImagePresentation(node.getAttr("imagePresentation") ?? DEFAULT_IMAGE_PRESENTATION),
    };
  }

  function updateImageAdjustments(patch: Partial<ImageAdjustments>, summary: string, commit = true) {
    const current = liveImageState();
    if (!current) return;
    const adjustments = { ...current.adjustments, ...patch };
    applyImageEdits(current.node, current.crop, adjustments);
    layerRef.current?.batchDraw();
    if (commit) commitCanvas(summary);
  }

  function applyPhotoPreset(preset: PhotoPreset) {
    const current = liveImageState();
    if (!current) return;
    applyImageEdits(current.node, current.crop, PHOTO_PRESETS[preset]);
    layerRef.current?.batchDraw();
    commitCanvas(`Photo preset: ${preset}`);
  }

  function updateImagePresentation(patch: ImagePresentationPatch, summary: string, commit = true) {
    const current = liveImageState();
    if (!current) return;
    const presentation: ImagePresentation = {
      cornerRadius: patch.cornerRadius ?? current.presentation.cornerRadius,
      frame: { ...current.presentation.frame, ...patch.frame },
      shadow: { ...current.presentation.shadow, ...patch.shadow },
    };
    applyImagePresentation(current.node, presentation);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    if (commit) commitCanvas(summary);
  }

  function commitArtworkPresentation(presentation: ArtworkPresentation, summary: string) {
    const layer = layerRef.current;
    if (!layer) return;
    const current = projectRef.current;
    const next = commitSnapshot(current, summary, {
      canvas: { ...current.canvas, presentation: cloneArtworkPresentation(presentation) },
      objects: serializeLayer(layer),
    });
    setCurrentProject(next);
    void renderProject(next, selectedId);
    void persist(next);
  }

  function updateArtworkPresentation(
    patch: ArtworkPresentationPatch,
    summary: string,
    commit = true,
  ) {
    const current = liveArtworkPresentationRef.current;
    const presentation: ArtworkPresentation = {
      enabled: patch.enabled ?? true,
      padding: patch.padding ?? current.padding,
      background: patch.background ?? (patch.backdrop?.type === "solid" ? patch.backdrop.value ?? current.background : current.background),
      backdrop: { ...current.backdrop, ...patch.backdrop },
      cornerRadius: patch.cornerRadius ?? current.cornerRadius,
      frame: { ...current.frame, ...patch.frame },
      shadow: { ...current.shadow, ...patch.shadow },
    };
    applyArtworkPresentationToStage(projectRef.current.canvas, presentation);
    if (commit) commitArtworkPresentation(presentation, summary);
  }

  function updateStudioPresentation(
    patch: ArtworkPresentationPatch,
    summary: string,
    commit = true,
  ) {
    if (studioTarget === "artwork") {
      updateArtworkPresentation(patch, summary, commit);
      return;
    }
    updateImagePresentation(patch, summary, commit);
  }

  function applyStudioOperations(operations: ScreenshotStudioPresentationOperation[], summary: string) {
    if (studioTarget === "artwork") {
      const current = liveArtworkPresentationRef.current;
      const style = applyScreenshotStudioOperations(current, operations);
      const presentation: ArtworkPresentation = {
        ...cloneArtworkPresentation(current),
        ...style,
        enabled: true,
      };
      applyArtworkPresentationToStage(projectRef.current.canvas, presentation);
      commitArtworkPresentation(presentation, summary);
      return;
    }
    const current = liveImageState();
    if (!current) return;
    applyImagePresentation(current.node, applyScreenshotStudioOperations(current.presentation, operations));
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    commitCanvas(summary);
  }

  function applyCropAspect(targetAspect: number | null, label: string) {
    const current = liveImageState();
    if (!current) return;
    const source = current.node.image();
    if (!source || !("width" in source) || !("height" in source)) return;
    const sourceWidth = Number(source.width);
    const sourceHeight = Number(source.height);
    const aspect = targetAspect ?? sourceWidth / sourceHeight;
    const crop = targetAspect ? centerCropForAspect(sourceWidth, sourceHeight, targetAspect) : { ...FULL_IMAGE_CROP };
    const box = fitDisplayBoxToAspect({ x: current.node.x(), y: current.node.y(), width: current.node.width(), height: current.node.height() }, aspect);
    current.node.position({ x: box.x, y: box.y });
    current.node.width(box.width);
    current.node.height(box.height);
    applyImageEdits(current.node, crop, current.adjustments);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    commitCanvas(`Crop set to ${label}`);
  }

  function resetPhotoEdits() {
    const current = liveImageState();
    if (!current) return;
    const source = current.node.image();
    if (!source || !("width" in source) || !("height" in source)) return;
    const box = fitDisplayBoxToAspect(
      { x: current.node.x(), y: current.node.y(), width: current.node.width(), height: current.node.height() },
      Number(source.width) / Number(source.height),
    );
    current.node.position({ x: box.x, y: box.y });
    current.node.width(box.width);
    current.node.height(box.height);
    applyImageEdits(current.node, FULL_IMAGE_CROP, DEFAULT_IMAGE_ADJUSTMENTS);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    commitCanvas("Photo edits reset");
  }

  async function changeZoom(delta: number | "fit", anchor?: { clientX: number; clientY: number }) {
    const viewport = canvasViewport.current;
    const stage = stageRef.current;
    const beforeRect = stage?.container().getBoundingClientRect();
    const beforeScale = displayDimensions(projectRef.current).scale;
    const designPoint = anchor && beforeRect
      ? { x: (anchor.clientX - beforeRect.left) / beforeScale, y: (anchor.clientY - beforeRect.top) / beforeScale }
      : null;
    const nextZoom = delta === "fit" ? 1 : Math.min(3, Math.max(0.5, zoomRef.current + delta));
    if (nextZoom === zoomRef.current) return;
    const version = ++zoomVersionRef.current;
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    const activeSelection = selectedNodeRef.current?.getAttr("designId") as string | undefined;
    await renderProject(projectRef.current, activeSelection ?? null);
    if (!viewport || !anchor || !designPoint || version !== zoomVersionRef.current || !stageRef.current) return;
    requestAnimationFrame(() => {
      const nextRect = stageRef.current?.container().getBoundingClientRect();
      if (!nextRect) return;
      const nextScale = displayDimensions(projectRef.current).scale;
      viewport.scrollLeft += nextRect.left + designPoint.x * nextScale - anchor.clientX;
      viewport.scrollTop += nextRect.top + designPoint.y * nextScale - anchor.clientY;
    });
  }

  function toggleVisibility(designId: string) {
    const node = layerRef.current && findDesignNode(layerRef.current, designId);
    if (!node) return;
    node.visible(!node.visible());
    if (!node.visible() && selectedId === designId) selectById(null);
    commitCanvas(node.visible() ? "Layer shown" : "Layer hidden");
  }

  function toggleLock(designId: string) {
    const node = layerRef.current && findDesignNode(layerRef.current, designId);
    if (!node) return;
    const locked = !Boolean(node.getAttr("designLocked"));
    applyLockedState(node, locked);
    if (selectedId === designId) selectById(designId);
    commitCanvas(locked ? "Layer locked" : "Layer unlocked");
  }

  function reorder(designId: string, direction: "up" | "down" | "front" | "back") {
    const current = projectRef.current;
    const objects = current.objects.map((object) => ({ ...object }));
    const index = objects.findIndex((object) => object.id === designId);
    if (index === -1) return;
    const [object] = objects.splice(index, 1);
    const target = direction === "front"
      ? objects.length
      : direction === "back"
        ? 0
        : direction === "up"
          ? Math.min(objects.length, index + 1)
          : Math.max(0, index - 1);
    objects.splice(target, 0, object);
    const next = commitSnapshot(current, "Layers rearranged", { canvas: current.canvas, objects });
    setCurrentProject(next);
    void renderProject(next, designId);
    void persist(next);
  }

  function reorderLayerByDrop(sourceId: string, targetId: string, edge: LayerDropTarget["edge"]) {
    if (sourceId === targetId) return;
    const current = projectRef.current;
    const visualOrder = [...current.objects].reverse();
    const sourceIndex = visualOrder.findIndex((object) => object.id === sourceId);
    if (sourceIndex === -1) return;
    const [source] = visualOrder.splice(sourceIndex, 1);
    const targetIndex = visualOrder.findIndex((object) => object.id === targetId);
    if (targetIndex === -1) return;
    visualOrder.splice(targetIndex + (edge === "after" ? 1 : 0), 0, source);
    const objects = visualOrder.reverse().map((object) => ({ ...object }));
    if (objects.every((object, index) => object.id === current.objects[index]?.id)) return;
    const next = commitSnapshot(current, "Layer order changed", { canvas: current.canvas, objects });
    setCurrentProject(next);
    setLayerDropTarget(null);
    setDraggedLayerId(null);
    void renderProject(next, sourceId);
    void persist(next);
  }

  function layerDragStart(event: React.DragEvent<HTMLDivElement>, designId: string) {
    setDraggedLayerId(designId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", designId);
    const bounds = event.currentTarget.getBoundingClientRect();
    const preview = event.currentTarget.cloneNode(true) as HTMLDivElement;
    preview.classList.remove("dragging", "drop-before", "drop-after");
    preview.classList.add("layer-drag-preview");
    preview.style.width = `${bounds.width}px`;
    document.body.append(preview);
    event.dataTransfer.setDragImage(
      preview,
      Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    );
    window.setTimeout(() => preview.remove(), 0);
  }

  function layerDragOver(event: React.DragEvent, targetId: string) {
    if (!draggedLayerId || draggedLayerId === targetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setLayerDropTarget((current) => current?.id === targetId && current.edge === edge ? current : { id: targetId, edge });
  }

  function layerDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedLayerId;
    const edge = layerDropTarget?.id === targetId ? layerDropTarget.edge : "before";
    if (sourceId) reorderLayerByDrop(sourceId, targetId, edge);
  }

  function finishLayerDrag() {
    setDraggedLayerId(null);
    setLayerDropTarget(null);
  }

  function duplicateSelected() {
    const currentSelectedId = selectedNodeRef.current?.getAttr("designId") as string | undefined;
    if (!currentSelectedId) return;
    const source = projectRef.current.objects.find((object) => object.id === currentSelectedId);
    if (!source) return;
    const copy = { ...source, id: newId(), name: `${source.name} copy`, x: source.x + 28, y: source.y + 28 } as DesignNode;
    const next = commitSnapshot(projectRef.current, "Layer duplicated", {
      canvas: projectRef.current.canvas,
      objects: [...projectRef.current.objects, copy],
    });
    setCurrentProject(next);
    selectedNodeRef.current = null;
    transformerRef.current?.nodes([]);
    setSelectedId(copy.id);
    void renderProject(next, copy.id);
    void persist(next);
  }

  function deleteSelected() {
    const currentSelectedId = selectedNodeRef.current?.getAttr("designId") as string | undefined;
    if (!currentSelectedId) return;
    const next = commitSnapshot(projectRef.current, "Layer deleted", {
      canvas: projectRef.current.canvas,
      objects: projectRef.current.objects.filter((object) => object.id !== currentSelectedId),
    });
    setCurrentProject(next);
    setSelectedId(null);
    void renderProject(next);
    void persist(next);
  }

  function undo() {
    if (!canUndo(projectRef.current)) return;
    const next = undoProject(projectRef.current);
    setCurrentProject(next);
    void renderProject(next, selectedId);
    void persist(next);
  }

  function redo() {
    if (!canRedo(projectRef.current)) return;
    const next = redoProject(projectRef.current);
    setCurrentProject(next);
    void renderProject(next, selectedId);
    void persist(next);
  }

  function changePreset(preset: Exclude<CanvasPreset, "custom">) {
    const next = setCanvasPreset(projectRef.current, preset);
    setCurrentProject(next);
    void renderProject(next, selectedId);
    void persist(next);
  }

  function exportImage(mimeType: "image/png" | "image/jpeg" | "image/webp") {
    const stage = stageRef.current;
    if (!stage) return;
    const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
    const selected = selectedId;
    transformerRef.current?.nodes([]);
    layerRef.current?.draw();
    const anchor = document.createElement("a");
    anchor.download = `${safeFilename(projectRef.current.name)}.${extension}`;
    anchor.href = stage.toDataURL({
      pixelRatio: 1 / displayDimensions(projectRef.current).scale,
      mimeType,
      quality: 0.92,
    });
    anchor.click();
    selectById(selected);
  }

  async function exportProjectFile() {
    try {
      const bundle = await buildProjectBundle(projectRef.current);
      downloadTextFile(JSON.stringify(bundle, null, 2), `${safeFilename(projectRef.current.name)}.glassware.json`);
    } catch (error) {
      console.error(error);
      setMessage("The project file could not be prepared.");
    }
  }

  async function importProjectFile(file?: File) {
    if (!file) return;
    try {
      const imported = await readProjectBundle(await file.text());
      for (const asset of imported.assets) await saveAsset(asset);
      for (const font of imported.fonts) {
        await registerFont(font);
        await saveFontAsset(font);
      }
      await saveProject(imported.project);
      replaceProject(imported.project);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "That project file could not be opened.");
    } finally {
      if (projectInput.current) projectInput.current.value = "";
    }
  }

  async function createNewProject() {
    const next = createProject("Untitled stitch", false);
    await saveProject(next);
    replaceProject(next);
  }

  async function createStudioPlayground() {
    try {
      const draft = createProject(STUDIO_PLAYGROUND_NAME, false);
      const image = await createStudioPlaygroundImage();
      const asset = await createStoredAsset(draft.id, image);
      const next = createStudioPlaygroundProject(asset.id, draft);
      await saveAsset(asset);
      await saveProject(next);
      replaceProject(next);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "The Studio playground could not be created.");
    }
  }

  async function switchProject(projectId: string) {
    if (projectId === projectRef.current.id) return;
    const next = await loadProject(projectId);
    if (next) replaceProject(next);
  }

  function renameProject(name: string) {
    const next = { ...projectRef.current, name, updatedAt: new Date().toISOString() };
    setCurrentProject(next);
  }

  function renderSidePanel() {
    if (activeTool === "Layers") {
      return (
        <div className="layers-panel">
          <div className="panel-heading"><p>DOCUMENT STACK</p><h1>Layers</h1></div>
          <div className="layer-list">
            {[...project.objects].reverse().map((object) => {
              const dropClass = layerDropTarget?.id === object.id ? `drop-${layerDropTarget.edge}` : "";
              return (
                <div
                  className={`layer-row ${selectedId === object.id ? "selected" : ""} ${draggedLayerId === object.id ? "dragging" : ""} ${dropClass}`}
                  draggable
                  key={object.id}
                  onDragStart={(event) => layerDragStart(event, object.id)}
                  onDragEnd={finishLayerDrag}
                  onDragOver={(event) => layerDragOver(event, object.id)}
                  onDrop={(event) => layerDrop(event, object.id)}
                >
                  <button className="layer-drag-handle" title={`Drag ${object.name} to reorder`} aria-label={`Drag ${object.name} to reorder`}><GripVertical size={15} /></button>
                  <button className="layer-icon-button" title={object.visible ? "Hide layer" : "Show layer"} aria-label={object.visible ? "Hide layer" : "Show layer"} onClick={() => toggleVisibility(object.id)}>{object.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button className="layer-main" title={`Select ${object.name}`} onClick={() => selectById(object.id)}>
                    <span className={`layer-thumbnail kind-${object.kind}`}>{object.kind === "text" ? <Type size={18} /> : object.kind === "image" ? <ImagePlus size={17} /> : <Shapes size={17} />}</span>
                    <span><strong>{object.name}</strong><small>{object.kind}</small></span>
                  </button>
                  <button className="layer-icon-button" title={object.locked ? "Unlock layer" : "Lock layer"} aria-label={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => toggleLock(object.id)}>{object.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                </div>
              );
            })}
          </div>
          {!project.objects.length && <p className="empty-note">This artboard is empty. Add text, a shape, or an image to begin.</p>}
          <div className="layer-toolbar" aria-label="Layer actions">
            <button title="Add text layer" aria-label="Add text layer" onClick={() => void addText("body")}><Plus size={16} /></button>
            <button title="Duplicate selected layer" aria-label="Duplicate selected layer" disabled={!selectedObject} onClick={duplicateSelected}><Copy size={15} /></button>
            <button title="Raise selected layer" aria-label="Raise selected layer" disabled={!selectedObject} onClick={() => selectedObject && reorder(selectedObject.id, "up")}><ChevronUp size={16} /></button>
            <button title="Lower selected layer" aria-label="Lower selected layer" disabled={!selectedObject} onClick={() => selectedObject && reorder(selectedObject.id, "down")}><ChevronDown size={16} /></button>
            <span />
            <button className="danger" title="Delete selected layer" aria-label="Delete selected layer" disabled={!selectedObject} onClick={deleteSelected}><Trash2 size={16} /></button>
          </div>
        </div>
      );
    }
    if (activeTool === "Files") {
      return (
        <>
          <div className="panel-heading"><p>LOCAL PROJECTS</p><h1>Files</h1></div>
          <div className="file-actions">
            <button onClick={() => void createNewProject()}><FilePlus2 size={18} /><span><strong>New project</strong><small>Start with an empty artboard</small></span></button>
            <button title="Create a local sample project for the Studio controls" onClick={() => void createStudioPlayground()}><Frame size={18} /><span><strong>Try Studio Playground</strong><small>Sample screenshot, selected and ready</small></span></button>
            <button onClick={() => projectInput.current?.click()}><FolderOpen size={18} /><span><strong>Open a project</strong><small>Import an .glassware.json file</small></span></button>
            <button onClick={() => void exportProjectFile()}><Save size={18} /><span><strong>Save a portable copy</strong><small>Includes every local image asset</small></span></button>
          </div>
          {recentProjects.length > 1 && (
            <div className="panel-section">
              <label className="field-label" htmlFor="recent-project">Recent on this device</label>
              <select id="recent-project" value={project.id} onChange={(event) => void switchProject(event.target.value)}>
                {recentProjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </div>
          )}
        </>
      );
    }
    if (activeTool === "AI") {
      return <AiConnectionsPanel model={accountConnections} project={project} openSettings={() => setAiSettingsOpen(true)} />;
    }
    if (activeTool === "Account") {
      return <AccountPanel model={accountConnections} openSignIn={() => setSignInOpen(true)} />;
    }
    if (activeTool === "Images") {
      return <ImagePanel upload={() => fileInput.current?.click()} addOpenImage={addOpenverseImage} />;
    }
    if (activeTool === "Studio") {
      return (
        <StudioPanel
          target={studioTarget}
          setTarget={setStudioTarget}
          image={selectedObject?.kind === "image" ? selectedObject : null}
          artwork={project.canvas.presentation}
          maxArtworkPadding={Math.floor(Math.min(project.canvas.width, project.canvas.height) * 0.4)}
          uploadBackdrop={() => backdropImageInput.current?.click()}
          applyOperations={applyStudioOperations}
          updatePresentation={updateStudioPresentation}
        />
      );
    }
    if (activeTool === "Annotate") {
      return (
        <>
          <div className="panel-heading"><p>SCREENSHOT MARKUP</p><h1>Annotate</h1></div>
          <div className="annotation-library">
            {ANNOTATION_OPTIONS.map((option) => (
              <button key={option.kind} onClick={() => void addShape(option.kind)} aria-label={`Add ${option.label}`}>
                <ShapeIcon shape={option.kind} />
                <span><strong>{option.label}</strong><small>{option.note}</small></span>
              </button>
            ))}
          </div>
          <div className="panel-section hint-card"><strong>Blur is visual, redact is private</strong><p>Use Blur for presentation polish. Use Redact when information must be irreversibly covered in an exported image.</p></div>
        </>
      );
    }
    if (activeTool === "Text") {
      return (
        <>
          <div className="panel-heading"><p>TYPE TOOL</p><h1>Text</h1></div>
          <div className="text-preset-list">
            <button className="text-preset heading" onClick={() => void addText("heading")}><Plus size={17} /><span><strong>Add a heading</strong><small>Bold display text</small></span></button>
            <button className="text-preset subheading" onClick={() => void addText("subheading")}><Plus size={17} /><span><strong>Add a subheading</strong><small>Supporting emphasis</small></span></button>
            <button className="text-preset body" onClick={() => void addText("body")}><Plus size={17} /><span><strong>Add body text</strong><small>Readable paragraphs and captions</small></span></button>
          </div>
          <div className="panel-section hint-card"><strong>Edit where you work</strong><p>Double-click text on the canvas to type in place, or use the Inspector for precise typography.</p></div>
        </>
      );
    }
    if (activeTool === "Shapes") {
      return (
        <>
          <div className="panel-heading"><p>ELEMENT LIBRARY</p><h1>Shapes</h1></div>
          <div className="shape-library">
            {SHAPE_OPTIONS.map((option) => (
              <button key={option.kind} onClick={() => void addShape(option.kind)} aria-label={`Add ${option.label}`}>
                <ShapeIcon shape={option.kind} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <div className="panel-section hint-card"><strong>Built to stay editable</strong><p>Every shape can be resized, rotated, recolored, layered, duplicated, and undone.</p></div>
        </>
      );
    }
    return (
      <>
        <div className="panel-heading"><p>ARTBOARD SETUP</p><h1>Canvas</h1></div>
        <div className="panel-section">
          <div className="section-label"><span>Canvas size</span><small>{project.canvas.width} × {project.canvas.height}</small></div>
          <div className="preset-grid">
            {(["square", "portrait", "story", "landscape"] as const).map((preset) => (
              <button className={project.canvas.preset === preset ? "active" : ""} key={preset} onClick={() => changePreset(preset)}>{preset}</button>
            ))}
          </div>
        </div>
        <div className="panel-section"><ColorPicker label="Artboard color" value={project.canvas.background} onPreview={previewBackground} onCommit={setBackground} /></div>
        <div className="panel-section hint-card"><strong>Keyboard friendly</strong><p>Paste images, nudge with arrow keys, duplicate with ⌘/Ctrl+D, and undo with ⌘/Ctrl+Z.</p></div>
      </>
    );
  }

  return (
    <main className="workbench">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveTool("Files")} aria-label="Open GlassWare files">
          <img src="./glassware-mark.svg" alt="" /><span>GlassWare</span><small>LOCAL WORKBENCH</small>
        </button>
        <label className="project-name">
          <span>Project</span>
          <input value={project.name} onChange={(event) => renameProject(event.target.value)} onBlur={() => { if (!projectRef.current.name.trim()) renameProject("Untitled stitch"); void persist(); }} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} />
        </label>
        <div className="top-actions">
          <button className="icon-button" aria-label="Undo" title="Undo (Ctrl/⌘+Z)" disabled={!canUndo(project)} onClick={undo}><Undo2 size={18} /></button>
          <button className="icon-button" aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)" disabled={!canRedo(project)} onClick={redo}><Redo2 size={18} /></button>
          <button className="ai-button" onClick={() => setActiveTool("AI")}><Sparkles size={17} /> Ask AI</button>
          <button className="account-button" onClick={() => accountConnections.snapshot.account ? setActiveTool("Account") : setSignInOpen(true)}><UserRound size={17} /> {accountConnections.snapshot.account?.displayName ?? "Sign in"}</button>
          <button className="export-button" onClick={() => exportImage("image/png")}><Download size={17} /> Export PNG</button>
        </div>
      </header>

      <aside className="toolrail" aria-label="Creative tools">
        <Tool icon={<MousePointer2 />} label="Select" active={activeTool === "Select"} onClick={() => setActiveTool("Select")} />
        <Tool icon={<ImagePlus />} label="Images" active={activeTool === "Images"} onClick={() => setActiveTool("Images")} />
        <Tool icon={<Frame />} label="Studio" active={activeTool === "Studio"} onClick={() => setActiveTool("Studio")} />
        <Tool icon={<PenTool />} label="Annotate" active={activeTool === "Annotate"} onClick={() => setActiveTool("Annotate")} />
        <Tool icon={<Type />} label="Text" active={activeTool === "Text"} onClick={() => setActiveTool("Text")} />
        <Tool icon={<Shapes />} label="Shapes" active={activeTool === "Shapes"} onClick={() => setActiveTool("Shapes")} />
        <Tool icon={<Layers3 />} label="Layers" active={activeTool === "Layers"} onClick={() => setActiveTool("Layers")} />
        <Tool icon={<FolderOpen />} label="Files" active={activeTool === "Files"} onClick={() => setActiveTool("Files")} />
        <input ref={fileInput} aria-label="Upload image file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => handleUpload(event.target.files?.[0])} />
        <input ref={replaceImageInput} aria-label="Replace selected image file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => void replaceSelectedImage(event.target.files?.[0])} />
        <input ref={backdropImageInput} aria-label="Artwork backdrop file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => void uploadArtworkBackdrop(event.target.files?.[0])} />
        <input ref={fontInput} type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden onChange={(event) => void uploadFont(event.target.files?.[0])} />
        <input ref={projectInput} type="file" accept=".json,.glassware.json,.imagestitch.json,application/json" hidden onChange={(event) => void importProjectFile(event.target.files?.[0])} />
      </aside>

      <section className="sidepanel">{renderSidePanel()}</section>

      <section
        ref={canvasViewport}
        className={`canvas-stage ${isDraggingFile ? "drop-active" : ""}`}
        aria-label="Design canvas"
        title="Scroll over the canvas to zoom in or out"
        onDragEnter={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDraggingFile(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingFile(false);
          const image = [...event.dataTransfer.files].find((file) => file.type.startsWith("image/"));
          if (image) void addImageBlob(image);
        }}
      >
        <div className="stage-meta" style={{ width: stageWidth }}>
          <span>ARTBOARD 01</span>
          <div className="zoom-controls">
            <button aria-label="Zoom out" title="Zoom out" onClick={() => void changeZoom(-0.25)} disabled={zoom <= 0.5}><ZoomOut size={13} /></button>
            <button aria-label="Fit artboard" onClick={() => void changeZoom("fit")} title="Fit artboard">{Math.round(viewScale * 100)}%</button>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => void changeZoom(0.25)} disabled={zoom >= 3}><ZoomIn size={13} /></button>
          </div>
        </div>
        <div className="paper-wrap"><div ref={canvasElement} className="design-canvas" /></div>
        <p className={`local-status status-${saveState}`}>
          <span /> {saveState === "saving" ? "Saving locally…" : saveState === "error" ? "Local save failed" : "Saved on this device"} · Revision {project.revisions[currentRevisionIndex(project)]?.number ?? 1}
        </p>
        {isDraggingFile && <div className="drop-message"><ImagePlus size={30} />Drop image onto this artboard</div>}
        {message && <button className="toast" onClick={() => setMessage("")}>{message}<small>Click to dismiss</small></button>}
      </section>

      <aside className="inspector">
        <div className="panel-heading"><p>INSPECTOR</p><h2>{selectedObject?.name ?? "Artboard"}</h2></div>
        {selectedObject ? (
          <>
            <label className="inspector-field"><span>Layer name</span><input key={`${selectedObject.id}-name`} defaultValue={selectedObject.name} onBlur={(event) => updateSelectedName(event.target.value)} /></label>
            {selectedObject.kind === "text" && (
              <>
                <label className="inspector-field"><span>Text <small>Double-click on canvas to edit in place</small></span><textarea key={`${selectedObject.id}-text-${selectedObject.text}`} defaultValue={selectedObject.text} rows={4} onBlur={(event) => updateSelectedText(event.target.value)} /></label>
                <div className="typography-controls">
                  <FontPicker value={selectedObject.fontFamily} assets={fontAssets} loading={fontLoading} onChoose={chooseFont} onUpload={() => fontInput.current?.click()} />
                  <label className="control-slider"><span>Size <small>{Math.round(selectedObject.fontSize)} px</small></span><input key={`${selectedObject.id}-font-size`} type="range" min="12" max="220" defaultValue={selectedObject.fontSize} onChange={(event) => updateTextProperty({ fontSize: Number(event.target.value) }, "Text size changed", false)} onPointerUp={() => commitCanvas("Text size changed")} onKeyUp={() => commitCanvas("Text size changed")} /></label>
                  <div className="text-button-row" aria-label="Text style and alignment">
                    <button title="Bold" aria-label="Bold" className={selectedObject.fontStyle.includes("bold") ? "active" : ""} onClick={() => toggleTextStyle("bold")}><Bold size={15} /></button>
                    <button title="Italic" aria-label="Italic" className={selectedObject.fontStyle.includes("italic") ? "active" : ""} onClick={() => toggleTextStyle("italic")}><Italic size={15} /></button>
                    {(["left", "center", "right"] as const).map((align) => {
                      const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                      return <button title={`Align ${align}`} aria-label={`Align ${align}`} className={selectedObject.align === align ? "active" : ""} key={align} onClick={() => updateTextProperty({ align }, "Text aligned")}><Icon size={16} /></button>;
                    })}
                  </div>
                  <label className="control-slider"><span>Line height <small>{selectedObject.lineHeight.toFixed(2)}</small></span><input key={`${selectedObject.id}-line-height`} type="range" min="0.7" max="2" step="0.05" defaultValue={selectedObject.lineHeight} onChange={(event) => updateTextProperty({ lineHeight: Number(event.target.value) }, "Line height changed", false)} onPointerUp={() => commitCanvas("Line height changed")} onKeyUp={() => commitCanvas("Line height changed")} /></label>
                </div>
              </>
            )}
            {selectedObject.kind !== "image" && (
              <ColorPicker label="Fill" value={selectedObject.fill} onPreview={previewFill} onCommit={setFill} compact />
            )}
            {selectedObject.kind === "shape" && (
              <label className="inspector-field shape-select"><span>Shape</span><select value={selectedObject.shape} onChange={(event) => changeShapeType(event.target.value as ShapeKind)}>{SHAPE_OPTIONS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select></label>
            )}
            {selectedObject.kind === "image" && (
              <>
                <button className="replace-image-button" onClick={() => replaceImageInput.current?.click()} title="Replace this image while keeping its layout and Studio styling"><Replace size={15} /><span><strong>Replace image</strong><small>Keep layout and presentation</small></span></button>
                <PhotoInspector
                  image={selectedObject}
                  applyPreset={applyPhotoPreset}
                  updateAdjustments={updateImageAdjustments}
                  applyCrop={applyCropAspect}
                  reset={resetPhotoEdits}
                  source={selectedAssetSource}
                />
              </>
            )}
            <label className="property-row"><span>Opacity <small>{Math.round(selectedObject.opacity * 100)}%</small></span><input key={`${selectedObject.id}-opacity`} type="range" min="0" max="100" defaultValue={selectedObject.opacity * 100} onChange={(event) => updateSelectedLive({ opacity: Number(event.target.value) / 100 })} onPointerUp={() => commitCanvas("Opacity changed")} onKeyUp={() => commitCanvas("Opacity changed")} /></label>
            <div className="coordinate-grid">
              <label><span>X</span><input type="number" key={`${selectedObject.id}-x`} defaultValue={Math.round(selectedObject.x)} onBlur={(event) => { updateSelectedLive({ x: Number(event.target.value) }); commitCanvas("Position changed"); }} /></label>
              <label><span>Y</span><input type="number" key={`${selectedObject.id}-y`} defaultValue={Math.round(selectedObject.y)} onBlur={(event) => { updateSelectedLive({ y: Number(event.target.value) }); commitCanvas("Position changed"); }} /></label>
            </div>
            <div className="property-grid action-grid">
              <button onClick={() => reorder(selectedObject.id, "front")}><BringToFront size={15} /> Front</button>
              <button onClick={() => reorder(selectedObject.id, "back")}><SendToBack size={15} /> Back</button>
              <button onClick={duplicateSelected}><Copy size={15} /> Duplicate</button>
              <button onClick={() => toggleLock(selectedObject.id)}>{selectedObject.locked ? <Unlock size={15} /> : <Lock size={15} />} {selectedObject.locked ? "Unlock" : "Lock"}</button>
            </div>
            <button className="delete-button" onClick={deleteSelected}><Trash2 size={15} /> Delete layer</button>
          </>
        ) : (
          <>
            <div className="artboard-summary"><strong>{project.canvas.width} × {project.canvas.height}</strong><span>{project.canvas.preset} canvas</span><p>Select an object on the artboard or open Layers to edit it precisely.</p></div>
            <div className="panel-section export-formats">
              <span>Export image</span>
              <button onClick={() => exportImage("image/png")}>PNG <small>lossless</small></button>
              <button onClick={() => exportImage("image/jpeg")}>JPG <small>compact</small></button>
              <button onClick={() => exportImage("image/webp")}>WebP <small>modern</small></button>
            </div>
          </>
        )}
        <div className="privacy-stamp"><span>LOCAL BY DEFAULT</span><p>Projects and original image assets are stored in this browser's private database.</p></div>
      </aside>
      <footer className="product-footer">
        <a href="https://labs.wiplash.ai/" target="_blank" rel="noreferrer" title="Visit Wiplash Labs">Wiplash Labs</a>
        <span aria-hidden="true" />
        <a href="https://wiplash.ai/" target="_blank" rel="noreferrer" title="Visit Wiplash.ai">Produced by Wiplash.ai</a>
        <a href="https://wiplash.ai/legal/privacy" target="_blank" rel="noreferrer" title="Read the Wiplash privacy policy">Privacy</a>
      </footer>
      <SignInModal model={accountConnections} open={signInOpen} onClose={() => setSignInOpen(false)} />
      <AiSettingsModal model={accountConnections} project={project} open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} openAccount={() => setSignInOpen(true)} />
    </main>
  );
}

function Tool({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} title={label} aria-label={label} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function FontPicker({
  value,
  assets,
  loading,
  onChoose,
  onUpload,
}: {
  value: string;
  assets: StoredFontAsset[];
  loading: string | null;
  onChoose: (family: string) => Promise<void>;
  onUpload: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (family: string) => !normalizedQuery || family.toLowerCase().includes(normalizedQuery);
  const installedFamilies = new Set(assets.map((asset) => asset.family));
  const installed = assets.filter((asset) => matches(asset.family));
  const system = SYSTEM_FONTS.filter(matches);
  const google = GOOGLE_FONT_CHOICES.filter((font) => matches(font.family));

  function choose(family: string) {
    if (detailsRef.current) detailsRef.current.open = false;
    setQuery("");
    void onChoose(family);
  }

  return (
    <div className="inspector-field font-field">
      <span>Typeface</span>
      <details className="font-picker" ref={detailsRef}>
        <summary aria-label="Typeface" title="Choose or install a typeface">
          <span style={{ fontFamily: value }}>{value}</span>
          {loading ? <LoaderCircle className="spin" size={14} /> : <ChevronDown size={14} />}
        </summary>
        <div className="font-picker-menu">
          <label className="font-search">
            <Search size={14} aria-hidden="true" />
            <input aria-label="Search typefaces" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fonts" />
          </label>
          <button className="font-upload-button" title="Upload WOFF, WOFF2, TTF, or OTF" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; onUpload(); }}>
            <Upload size={14} /> Upload a font file
          </button>
          {installed.length > 0 && (
            <div className="font-group">
              <span>Installed locally</span>
              {installed.map((font) => (
                <button className={font.family === value ? "active font-option" : "font-option"} key={font.id} title={`Use ${font.family}`} onClick={() => choose(font.family)}>
                  <strong style={{ fontFamily: font.family }}>{font.family}</strong><small>{font.source === "google" ? "Google Fonts" : "Uploaded"}</small>
                </button>
              ))}
            </div>
          )}
          {system.length > 0 && (
            <div className="font-group">
              <span>System fonts</span>
              {system.map((family) => (
                <button className={family === value ? "active font-option" : "font-option"} key={family} title={`Use ${family}`} onClick={() => choose(family)}>
                  <strong style={{ fontFamily: family }}>{family}</strong><small>Built in</small>
                </button>
              ))}
            </div>
          )}
          {google.length > 0 && (
            <div className="font-group">
              <span>Free Google Fonts</span>
              {google.map((font) => (
                <button className={font.family === value ? "active font-option" : "font-option"} key={font.family} title={`${installedFamilies.has(font.family) ? "Use" : "Download and use"} ${font.family}`} disabled={Boolean(loading)} onClick={() => choose(font.family)}>
                  <strong style={installedFamilies.has(font.family) ? { fontFamily: font.family } : undefined}>{font.family}</strong>
                  <small>{loading === font.family ? "Downloading…" : installedFamilies.has(font.family) ? "Installed" : font.category}</small>
                </button>
              ))}
            </div>
          )}
          {!installed.length && !system.length && !google.length && <p className="font-empty">No fonts match “{query}.”</p>}
          <p className="font-license-note">Google Fonts are open source. Uploaded fonts stay on this device; check their license before sharing.</p>
        </div>
      </details>
    </div>
  );
}

function normalizeHexColor(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) return `#${[...normalized.slice(1)].map((character) => character.repeat(2)).join("")}`;
  return null;
}

function ColorPicker({
  label,
  value,
  onPreview,
  onCommit,
  compact = false,
}: {
  label: string;
  value: string;
  onPreview: (color: string) => void;
  onCommit: (color: string) => void;
  compact?: boolean;
}) {
  const colorInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [preview, setPreview] = useState(value);
  useEffect(() => {
    setDraft(value);
    setPreview(value);
  }, [value]);
  useEffect(() => {
    const input = colorInput.current;
    if (!input) return;
    const commitNativeColor = () => onCommit(input.value);
    input.addEventListener("change", commitNativeColor);
    return () => input.removeEventListener("change", commitNativeColor);
  }, [onCommit]);

  function commitDraft() {
    const color = normalizeHexColor(draft);
    if (color) {
      setPreview(color);
      onCommit(color);
    }
    else setDraft(value);
  }

  function previewNativeColor(color: string) {
    setPreview(color);
    setDraft(color);
    onPreview(color);
  }

  return (
    <div className={`color-picker ${compact ? "compact" : ""}`}>
      <div className="color-picker-heading"><span>{label}</span><code>{preview.toUpperCase()}</code></div>
      <div className="color-picker-controls">
        <div className="color-wheel-control" title={`Choose any ${label.toLowerCase()}`}>
          <input ref={colorInput} aria-label={`${label} color wheel`} type="color" value={preview} onInput={(event) => previewNativeColor(event.currentTarget.value)} onChange={(event) => previewNativeColor(event.currentTarget.value)} onBlur={(event) => onCommit(event.currentTarget.value)} />
          <Palette size={17} aria-hidden="true" />
        </div>
        <input
          className="hex-color-input"
          aria-label={`${label} hex value`}
          value={draft}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {!compact && (
        <div className="swatches" aria-label={`${label} presets`}>
          {COLOR_SWATCHES.map((color) => <button className={preview.toLowerCase() === color ? "active" : ""} title={`Use ${color}`} key={color} aria-label={`Use ${color} for ${label.toLowerCase()}`} style={{ background: color }} onClick={() => { setPreview(color); setDraft(color); onCommit(color); }} />)}
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ shape }: { shape: ShapeKind }) {
  const common = { fill: "currentColor", stroke: "currentColor", strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 100 72" aria-hidden="true">
      {shape === "rect" && <rect x="10" y="10" width="80" height="52" {...common} />}
      {shape === "rounded-rect" && <rect x="10" y="10" width="80" height="52" rx="15" {...common} />}
      {shape === "ellipse" && <ellipse cx="50" cy="36" rx="38" ry="27" {...common} />}
      {shape === "triangle" && <polygon points="50,7 91,64 9,64" {...common} />}
      {shape === "diamond" && <polygon points="50,5 92,36 50,67 8,36" {...common} />}
      {shape === "pentagon" && <polygon points="50,5 93,32 77,67 23,67 7,32" {...common} />}
      {shape === "hexagon" && <polygon points="27,6 73,6 94,36 73,66 27,66 6,36" {...common} />}
      {shape === "star" && <polygon points="50,4 60,26 86,27 66,43 73,68 50,54 27,68 34,43 14,27 40,26" {...common} />}
      {shape === "heart" && <path d="M50 66C42 55 11 39 11 20 11 4 35 1 50 21 65 1 89 4 89 20 89 39 58 55 50 66Z" {...common} />}
      {shape === "speech-bubble" && <path d="M12 8H88Q96 8 96 16V49Q96 57 88 57H43L24 69 28 57H12Q4 57 4 49V16Q4 8 12 8Z" {...common} />}
      {shape === "line" && <line x1="9" y1="36" x2="91" y2="36" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />}
      {shape === "arrow" && <path d="M8 36H82M64 15L88 36 64 57" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />}
      {shape === "curved-arrow" && <path d="M9 59C24 8 68 8 87 39M68 31L88 40 82 59" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />}
      {shape === "blur" && <><rect x="8" y="9" width="84" height="54" rx="8" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="7 5" /><path d="M12 20L88 52M12 38L65 61M36 11L90 34" fill="none" stroke="currentColor" strokeWidth="7" opacity=".28" /></>}
      {shape === "redact" && <rect x="7" y="20" width="86" height="32" rx="4" {...common} />}
    </svg>
  );
}

function ImagePanel({
  upload,
  addOpenImage,
}: {
  upload: () => void;
  addOpenImage: (image: OpenverseImage) => Promise<boolean>;
}) {
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenverseImage[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "results" | "empty" | "error">("idle");
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function searchImages(nextQuery = query) {
    const normalized = nextQuery.trim();
    if (!normalized) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setQuery(normalized);
    setStatus("searching");
    setError("");
    try {
      const nextResults = await searchOpenverseImages(normalized, fetch, controller.signal);
      setResults(nextResults);
      setStatus(nextResults.length ? "results" : "empty");
    } catch (searchError) {
      if (controller.signal.aborted) return;
      setError(searchError instanceof Error ? searchError.message : "Open image search failed.");
      setStatus("error");
    }
  }

  async function add(image: OpenverseImage) {
    setAddingId(image.id);
    await addOpenImage(image);
    setAddingId(null);
  }

  return (
    <>
      <div className="panel-heading"><p>YOUR MEDIA</p><h1>Images</h1></div>
      <button className="upload-card image-upload" onClick={upload}>
        <Upload size={25} /><span>Upload from computer</span><small>PNG, JPEG, WebP, or GIF</small>
      </button>
      <div className="image-search-section">
        <div className="section-label"><span>Search open images</span><small>OPENVERSE</small></div>
        <form className="image-search-form" role="search" aria-label="Search Openverse images" onSubmit={(event) => { event.preventDefault(); void searchImages(); }}>
          <label className="image-search-input">
            <Search size={16} aria-hidden="true" />
            <input type="search" aria-label="Search open images" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Flowers, sunsets, textures…" maxLength={200} />
          </label>
          <button type="submit" aria-label="Search" title="Search Openverse" disabled={!query.trim() || status === "searching"}>
            {status === "searching" ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}
            <span>Search</span>
          </button>
        </form>
        {status === "idle" && (
          <div className="search-suggestions">
            {["Birthday", "Flowers", "Paper texture"].map((suggestion) => <button key={suggestion} onClick={() => void searchImages(suggestion)}>{suggestion}</button>)}
          </div>
        )}
        {status === "error" && <p className="search-feedback error">{error}</p>}
        {status === "empty" && <p className="search-feedback">No reusable images matched “{query}.” Try a broader search.</p>}
        {status === "results" && (
          <div className="image-results" aria-live="polite">
            {results.map((image) => (
              <article className="image-result" key={image.id}>
                <button className="image-result-add" onClick={() => void add(image)} disabled={addingId !== null} aria-label={`Add ${image.title}`}>
                  <img src={image.thumbnailUrl} alt="" loading="lazy" />
                  <span>{addingId === image.id ? <><LoaderCircle className="spin" size={14} /> Adding</> : <><Plus size={14} /> Add</>}</span>
                </button>
                <strong title={image.title}>{image.title}</strong>
                <small>{image.creator} · {image.license}</small>
                <a href={image.sourceUrl} target="_blank" rel="noreferrer">Check source <ExternalLink size={10} /></a>
              </article>
            ))}
          </div>
        )}
        <p className="openverse-note">Openverse indexes openly licensed work. GlassWare stores its source receipt, but you should verify the license before publishing.</p>
      </div>
    </>
  );
}

function PhotoInspector({
  image,
  applyPreset,
  updateAdjustments,
  applyCrop,
  reset,
  source,
}: {
  image: ImageDesignNode;
  applyPreset: (preset: PhotoPreset) => void;
  updateAdjustments: (patch: Partial<ImageAdjustments>, summary: string, commit?: boolean) => void;
  applyCrop: (aspect: number | null, label: string) => void;
  reset: () => void;
  source: AssetSource | null;
}) {
  return (
    <div className="photo-inspector">
      <div className="inspector-section-title"><span>Looks</span><small>Non-destructive</small></div>
      <div className="photo-presets">
        {(Object.keys(PHOTO_PRESETS) as PhotoPreset[]).map((preset) => <button data-preset={preset} key={preset} onClick={() => applyPreset(preset)}><i /><span>{preset}</span></button>)}
      </div>
      <div className="inspector-section-title"><span>Adjust</span><small>Saved with project</small></div>
      <AdjustmentSlider label="Brightness" value={image.adjustments.brightness} min={-1} max={1} step={0.05} display={Math.round(image.adjustments.brightness * 100)} onChange={(value, commit) => updateAdjustments({ brightness: value }, "Brightness changed", commit)} />
      <AdjustmentSlider label="Contrast" value={image.adjustments.contrast} min={-100} max={100} step={1} display={Math.round(image.adjustments.contrast)} onChange={(value, commit) => updateAdjustments({ contrast: value }, "Contrast changed", commit)} />
      <AdjustmentSlider label="Saturation" value={image.adjustments.saturation} min={-2} max={2} step={0.05} display={Math.round(image.adjustments.saturation * 100)} onChange={(value, commit) => updateAdjustments({ saturation: value }, "Saturation changed", commit)} />
      <AdjustmentSlider label="Blur" value={image.adjustments.blur} min={0} max={20} step={0.5} display={image.adjustments.blur} onChange={(value, commit) => updateAdjustments({ blur: value }, "Blur changed", commit)} />
      <div className="effect-toggles">
        <button className={image.adjustments.grayscale ? "active" : ""} onClick={() => updateAdjustments({ grayscale: !image.adjustments.grayscale }, "Grayscale toggled")}>B&amp;W</button>
        <button className={image.adjustments.sepia ? "active" : ""} onClick={() => updateAdjustments({ sepia: !image.adjustments.sepia }, "Sepia toggled")}>Sepia</button>
      </div>
      <div className="inspector-section-title"><span>Crop</span><small>Centered presets</small></div>
      <div className="crop-presets">
        <button onClick={() => applyCrop(null, "original")}>Original</button>
        <button onClick={() => applyCrop(1, "square")}>1:1</button>
        <button onClick={() => applyCrop(4 / 5, "portrait")}>4:5</button>
        <button onClick={() => applyCrop(16 / 9, "widescreen")}>16:9</button>
      </div>
      <button className="reset-edits" onClick={reset}><RotateCcw size={14} /> Reset photo edits</button>
      {source && (
        <div className="asset-source-receipt">
          <span>IMAGE SOURCE · {source.license}</span>
          <p>{source.attribution}</p>
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">Verify source <ExternalLink size={11} /></a>
        </div>
      )}
    </div>
  );
}

function AdjustmentSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: number;
  onChange: (value: number, commit: boolean) => void;
}) {
  return (
    <label className="control-slider">
      <span>{label} <small>{display}</small></span>
      <input key={`${label}-${value}`} aria-label={label} type="range" min={min} max={max} step={step} defaultValue={value} onChange={(event) => onChange(Number(event.target.value), false)} onPointerUp={(event) => onChange(Number(event.currentTarget.value), true)} onKeyUp={(event) => onChange(Number(event.currentTarget.value), true)} />
    </label>
  );
}

export default App;
