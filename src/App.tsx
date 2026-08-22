import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Konva from "konva";
import {
  Bold,
  BringToFront,
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceBetween,
  BoxSelect,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  Crop,
  Download,
  Eraser,
  Eye,
  EyeOff,
  ExternalLink,
  FilePlus2,
  Frame,
  FolderOpen,
  FlipHorizontal2,
  FlipVertical2,
  GripVertical,
  Group,
  Hand,
  ImagePlus,
  Ruler,
  Replace,
  Italic,
  LayoutTemplate,
  Layers3,
  Lock,
  LoaderCircle,
  MousePointer2,
  Palette,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  SendToBack,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Unlock,
  UserRound,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  CANVAS_PRESETS,
  BLEND_MODES,
  DEFAULT_ARTWORK_PRESENTATION,
  DEFAULT_IMAGE_ADJUSTMENTS,
  DEFAULT_IMAGE_MASK,
  DEFAULT_IMAGE_PRESENTATION,
  FULL_IMAGE_CROP,
  canRedo,
  canUndo,
  activatePage,
  addProjectPage,
  commitSnapshot,
  cloneArtworkPresentation,
  cloneImageMask,
  cloneImagePresentation,
  createProject,
  currentRevisionIndex,
  deleteProjectPage,
  newId,
  redoProject,
  renameProjectPage,
  reorderProjectPage,
  setCanvasPreset,
  undoProject,
  type ArtworkPresentation,
  type CanvasSettings,
  type CanvasPreset,
  type DesignNode,
  type ImageAdjustments,
  type ImageDesignNode,
  type ImageMask,
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
  deleteProject,
  listAssets,
  listProjects,
  listFontAssets,
  listBrandKits,
  listComponents,
  listAiRuns,
  loadAsset,
  loadProject,
  saveAsset,
  saveFontAsset,
  saveBrandKit,
  saveComponent,
  saveAiRun,
  saveProject,
  type AssetSource,
  type StoredAsset,
  type StoredBrandKit,
  type StoredComponent,
  type StoredFontAsset,
  type StoredAiPassReceipt,
  type StoredAiRun,
} from "./lib/storage";
import { buildProjectBundle, downloadTextFile, readProjectBundle, restoreCloudProjectBundle, safeFilename } from "./lib/bundle";
import {
  commitAiProjectSession,
  findLatestRedoableAiRevision,
  findLatestUndoableAiRevision,
  redoLatestAiSession,
  undoLatestAiSession,
} from "./lib/ai-undo";
import {
  DEFAULT_AI_MODEL,
  DEFAULT_AI_REASONING_EFFORT,
  type AiAttachment,
  type AiEditPlan,
} from "./lib/account-connections";
import type { CloudProjectArchive, CloudProjectMetadata } from "./lib/account-connections";
import { PHOTO_PRESETS, centerCropForAspect, fitDisplayBoxToAspect, type PhotoPreset } from "./lib/image-edits";
import { moveCrop, resizeCrop, type CropHandle } from "./lib/image-geometry";
import { assessExport, type ExportAssetDetail, type ExportFormat, type ExportSettings } from "./lib/export-qa";
import {
  alignObjects,
  distributeObjects,
  groupObjects,
  selectionForObject,
  ungroupObjects,
  type Alignment,
  type AlignmentReference,
  type DistributionAxis,
} from "./lib/editor-commands";
import { AccountPanel } from "./components/AccountPanel";
import type { ArtworkPresentationPatch, ImagePresentationPatch, StudioTarget } from "./components/StudioPanel";
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
import type { AiAgentProgress, AiAgentReceipt, AiAgentRequest } from "./components/AiConnectionsPanel";
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
import { applyTemplate, GLASSWARE_TEMPLATES } from "./lib/templates";
import { deleteBrandKit, deleteComponent } from "./lib/storage";
import { aiQualityFeedback, assessAiQuality } from "./lib/ai-quality";
import { buildImagePdf, type PdfImagePage } from "./lib/pdf-export";
import { renderRegionEditMask, renderRegionEditSource } from "./lib/region-edit";
import type { RegionEditRequest } from "./components/RegionEditModal";

const StudioPanel = lazy(() => import("./components/StudioPanel").then((module) => ({ default: module.StudioPanel })));
const AiConnectionsPanel = lazy(() => import("./components/AiConnectionsPanel").then((module) => ({ default: module.AiConnectionsPanel })));
const AiSettingsModal = lazy(() => import("./components/AiSettingsModal").then((module) => ({ default: module.AiSettingsModal })));
const RegionEditModal = lazy(() => import("./components/RegionEditModal").then((module) => ({ default: module.RegionEditModal })));

const COLOR_SWATCHES = [
  "#111111", "#ffffff", "#d9d9d9", "#8b8b8b", "#ff5d42", "#ffb000",
  "#ffe14d", "#35a36f", "#24a8a8", "#3f7fff", "#7454d6", "#e6499a",
];
const MAX_STAGE_SIZE = 640;
const MAX_AI_VISUAL_PASSES = 6;

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
];

const ANNOTATION_OPTIONS: Array<{ kind: ShapeKind; label: string; note: string }> = [
  { kind: "arrow", label: "Arrow", note: "Point to a detail" },
  { kind: "curved-arrow", label: "Curved arrow", note: "Call out around content" },
  { kind: "rect", label: "Highlight box", note: "Tint an interface area" },
  { kind: "ellipse", label: "Highlight circle", note: "Tint a focal point" },
  { kind: "line", label: "Line", note: "Divide or underline" },
  { kind: "blur", label: "Blur region", note: "Blur the layers underneath" },
  { kind: "redact", label: "Secure redact", note: "Opaque cover for private data" },
];

const INSPECTOR_SHAPE_OPTIONS: Array<{ kind: ShapeKind; label: string }> = [
  ...SHAPE_OPTIONS,
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
  { kind: "curved-arrow", label: "Curved arrow" },
  { kind: "blur", label: "Blur region" },
  { kind: "redact", label: "Secure redact" },
];

type TextPreset = "heading" | "subheading" | "body";

type SaveState = "saving" | "saved" | "error";
type CloudSaveState = "local" | "syncing" | "synced" | "retrying" | "conflict";
type ToolName = "Select" | "Images" | "Studio" | "Text" | "Shapes" | "Layers" | "Library" | "Files" | "Account";
type LibraryTab = "templates" | "brand" | "components";
type LayerDropTarget = { id: string; edge: "before" | "after" };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function cloneComponentObjects(objects: DesignNode[], offset = 0): DesignNode[] {
  const groups = new Map<string, string>();
  return objects.map((object) => {
    const groupId = object.groupId
      ? groups.get(object.groupId) ?? (() => { const id = newId(); groups.set(object.groupId!, id); return id; })()
      : undefined;
    const common = { ...object, id: newId(), x: object.x + offset, y: object.y + offset, ...(groupId ? { groupId } : {}) };
    return object.kind === "image"
      ? { ...common, crop: { ...object.crop }, adjustments: { ...object.adjustments }, presentation: cloneImagePresentation(object.presentation), mask: cloneImageMask(object.mask) }
      : { ...common, shadow: object.shadow ? { ...object.shadow } : undefined };
  });
}

function normalizedAiAttachmentName(value: string): string {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+/, "").slice(0, 100).toLocaleLowerCase();
}

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
  const selectedIdsRef = useRef<string[]>(initialProject.objects[0]?.id ? [initialProject.objects[0].id] : []);
  const marqueeRectRef = useRef<Konva.Rect | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const multiDragRef = useRef<{ anchorId: string; anchorX: number; anchorY: number; positions: Map<string, { x: number; y: number }> } | null>(null);
  const projectRef = useRef(initialProject);
  const zoomRef = useRef(1);
  const renderVersionRef = useRef(0);
  const zoomVersionRef = useRef(0);
  const saveVersionRef = useRef(0);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const cloudSyncQueueRef = useRef(Promise.resolve());
  const billingIntentRef = useRef("");
  const liveArtworkPresentationRef = useRef(
    cloneArtworkPresentation(initialProject.canvas.presentation ?? DEFAULT_ARTWORK_PRESENTATION),
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceImageInput = useRef<HTMLInputElement>(null);
  const backdropImageInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const canvasViewport = useRef<HTMLElement>(null);
  const canvasPanRef = useRef<{ pointerId: number; clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const spacePanRef = useRef(false);
  const inlineEditorCleanupRef = useRef<(() => void) | null>(null);
  const [project, setProject] = useState(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(initialProject.objects[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialProject.objects[0]?.id ? [initialProject.objects[0].id] : []);
  const [alignmentReference, setAlignmentReference] = useState<AlignmentReference>("selection");
  const [activeTool, setActiveTool] = useState<ToolName>(
    initialProject.name === STUDIO_PLAYGROUND_NAME ? "Studio" : "Select",
  );
  const [studioTarget, setStudioTarget] = useState<StudioTarget>(
    initialProject.objects[0]?.kind === "image" ? "image" : "artwork",
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>("local");
  const [cloudProjects, setCloudProjects] = useState<CloudProjectMetadata[]>([]);
  const [message, setMessage] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [recentProjects, setRecentProjects] = useState<GlassWareProject[]>([]);
  const [projectStorageBytes, setProjectStorageBytes] = useState<Map<string, number>>(new Map());
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("templates");
  const [brandKits, setBrandKits] = useState<StoredBrandKit[]>([]);
  const [components, setComponents] = useState<StoredComponent[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<StoredAsset | null>(null);
  const [selectedAssetSource, setSelectedAssetSource] = useState<AssetSource | null>(null);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [maskEditorOpen, setMaskEditorOpen] = useState(false);
  const [regionEditorOpen, setRegionEditorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exportAssets, setExportAssets] = useState<Map<string, ExportAssetDetail>>(new Map());
  const [fontAssets, setFontAssets] = useState<StoredFontAsset[]>([]);
  const [fontLoading, setFontLoading] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [layerDropTarget, setLayerDropTarget] = useState<LayerDropTarget | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiWidgetOpen, setAiWidgetOpen] = useState(false);
  const [aiRunActive, setAiRunActive] = useState(false);
  const accountConnections = useAccountConnections();
  const accountConnectionsRef = useRef(accountConnections);
  accountConnectionsRef.current = accountConnections;
  const selectedObjects = project.objects.filter((object) => selectedIds.includes(object.id));
  const selectedObject = selectedIds.length === 1 ? selectedObjects[0] ?? null : null;
  const selectedAssetId = selectedObject?.kind === "image" ? selectedObject.assetId : null;
  const fitScale = Math.min(MAX_STAGE_SIZE / project.canvas.width, MAX_STAGE_SIZE / project.canvas.height);
  const viewScale = fitScale * zoom;
  const stageWidth = Math.round(project.canvas.width * viewScale);
  const stageHeight = Math.round(project.canvas.height * viewScale);

  useEffect(() => {
    const url = new URL(window.location.href);
    const billingReturn = url.searchParams.get("billing");
    if (billingReturn === "success" || billingReturn === "return") {
      const returnKey = `return:${billingReturn}:${url.searchParams.get("session_id") ?? ""}`;
      if (billingIntentRef.current !== returnKey) {
        billingIntentRef.current = returnKey;
        setActiveTool("Account");
        setMessage(billingReturn === "success" ? "Your checkout is complete. Refreshing your GlassWare plan…" : "Billing settings updated.");
        if (accountConnections.snapshot.account?.mode === "authenticated") void accountConnections.refreshBilling();
        url.searchParams.delete("billing");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }

    const plan = url.searchParams.get("subscribe");
    const interval = url.searchParams.get("billing");
    if ((plan !== "designer" && plan !== "director") || (interval !== "monthly" && interval !== "annual")) return;
    setActiveTool("Account");
    if (accountConnections.loading) return;
    if (accountConnections.snapshot.account?.mode !== "authenticated") {
      setSignInOpen(true);
      return;
    }
    if (accountConnections.busy) return;
    const intentKey = `${accountConnections.snapshot.account.id}:${plan}:${interval}`;
    if (billingIntentRef.current === intentKey) return;
    billingIntentRef.current = intentKey;
    void accountConnections.startCheckout(plan, interval).then((started) => {
      if (!started) billingIntentRef.current = "";
    });
  }, [
    accountConnections.loading,
    accountConnections.busy,
    accountConnections.snapshot.account?.id,
    accountConnections.snapshot.account?.mode,
  ]);

  useEffect(() => {
    const selected = projectRef.current.objects.find((object) => object.id === selectedId);
    setStudioTarget(selected?.kind === "image" ? "image" : "artwork");
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedAssetId) {
      setSelectedAsset(null);
      setSelectedAssetSource(null);
      setCropEditorOpen(false);
      setMaskEditorOpen(false);
      setRegionEditorOpen(false);
      return;
    }
    void loadAsset(selectedAssetId).then((asset) => {
      if (!cancelled) {
        setSelectedAsset(asset);
        setSelectedAssetSource(asset?.source ?? null);
      }
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
      await renderProject(projectRef.current, selectedIdsRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listBrandKits(), listComponents(initialProject.id)]).then(([kits, savedComponents]) => {
      if (cancelled) return;
      setBrandKits(kits);
      setComponents(savedComponents);
    });
    return () => { cancelled = true; };
  }, [initialProject.id]);

  useEffect(() => {
    if (accountConnections.loading) return;
    let cancelled = false;
    void (async () => {
      const interrupted = (await listAiRuns(initialProject.id)).filter((run) => run.status === "running");
      if (cancelled || !interrupted.length) return;
      for (const run of interrupted) {
        if (run.activeJobId && accountConnections.snapshot.account?.mode === "authenticated") {
          await accountConnections.cancelAiJob(run.activeJobId).catch(() => undefined);
        }
        await saveAiRun({
          ...run,
          status: "cancelled",
          activeJobId: undefined,
          updatedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          receipts: [...run.receipts, {
            pass: Math.max(1, run.currentPass),
            status: "cancelled",
            startedAt: run.updatedAt,
            finishedAt: new Date().toISOString(),
            summary: "Interrupted browser session recovered safely.",
            assessment: "The last committed project revision was preserved and no partial draft was restored.",
            appliedOperations: [],
            skippedOperations: [],
            qualityFindings: [],
          }],
        });
      }
      if (!cancelled) setMessage("An interrupted AI run was recovered safely. No partial edits were kept.");
    })();
    return () => { cancelled = true; };
  }, [accountConnections.loading, accountConnections.snapshot.account?.id, initialProject.id]);

  useEffect(() => {
    const account = accountConnections.snapshot.account;
    if (account?.mode !== "authenticated" || accountConnections.snapshot.billing.cloudAccess === "none") {
      setCloudProjects([]);
      setCloudSaveState("local");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const remote = await accountConnections.listCloudProjects();
        if (cancelled) return;
        setCloudProjects(remote);
        if (!accountConnections.snapshot.syncEnabled || accountConnections.snapshot.billing.cloudAccess !== "read_write") return;
        const local = await listProjects();
        for (const item of local) {
          if (cancelled) return;
          const cloud = remote.find((entry) => entry.id === item.id);
          if (!cloud || item.updatedAt > cloud.updatedAt) await syncProjectToCloud(item);
        }
        if (!cancelled && local.some((item) => remote.some((entry) => entry.id === item.id && entry.updatedAt >= item.updatedAt))) {
          setCloudSaveState("synced");
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setCloudSaveState("retrying");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountConnections.snapshot.account?.id, accountConnections.snapshot.syncEnabled, accountConnections.snapshot.billing.cloudAccess]);

  useEffect(() => {
    function isTyping(target: EventTarget | null) {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || isTyping(event.target) || event.repeat) return;
      event.preventDefault();
      spacePanRef.current = true;
      setSpacePanActive(true);
    }
    function releaseSpace() {
      spacePanRef.current = false;
      setSpacePanActive(false);
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") releaseSpace();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseSpace);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseSpace);
    };
  }, []);

  function setCurrentProject(next: GlassWareProject) {
    projectRef.current = next;
    setProject(next);
  }

  async function persist(next = projectRef.current, immediateCloud = false) {
    const version = ++saveVersionRef.current;
    setSaveState("saving");
    try {
      await saveProject(next);
      if (version === saveVersionRef.current) setSaveState("saved");
      queueCloudProjectSync(next, immediateCloud);
    } catch (error) {
      console.error(error);
      if (version === saveVersionRef.current) setSaveState("error");
    }
  }

  function createProjectThumbnail(projectId: string): string | undefined {
    if (projectId !== projectRef.current.id) return undefined;
    const stage = stageRef.current;
    if (!stage) return undefined;
    const selection = [...selectedIdsRef.current];
    const primary = selectedId;
    transformerRef.current?.nodes([]);
    layerRef.current?.draw();
    const pixelRatio = Math.min(1, 360 / Math.max(stage.width(), stage.height()));
    const dataUrl = stage.toDataURL({ mimeType: "image/jpeg", quality: 0.78, pixelRatio });
    selectByIds(selection, primary);
    return dataUrl;
  }

  async function saveCloudBundleLocally(archive: CloudProjectArchive) {
    const restored = await restoreCloudProjectBundle(archive.bundle);
    for (const asset of restored.assets) await saveAsset(asset);
    for (const font of restored.fonts) {
      await registerFont(font);
      await saveFontAsset(font);
    }
    for (const component of restored.components) await saveComponent(component);
    await saveProject(restored.project);
    return restored.project;
  }

  async function preserveCloudConflict(localBundle: Awaited<ReturnType<typeof buildProjectBundle>>, remote: CloudProjectArchive) {
    const preserved = await readProjectBundle(JSON.stringify(localBundle));
    for (const asset of preserved.assets) await saveAsset(asset);
    for (const font of preserved.fonts) {
      await registerFont(font);
      await saveFontAsset(font);
    }
    for (const component of preserved.components) await saveComponent(component);
    await saveProject(preserved.project);
    const remoteProject = await saveCloudBundleLocally(remote);
    setMessage(`A newer cloud version was restored. Your device edits were preserved as “${preserved.project.name}”.`);
    setCloudSaveState("conflict");
    setRecentProjects(await listProjects());
    if (remoteProject.id === projectRef.current.id) replaceProject(remoteProject);
  }

  async function syncProjectToCloud(next: GlassWareProject) {
    const model = accountConnectionsRef.current;
    if (model.snapshot.account?.mode !== "authenticated" || !model.snapshot.syncEnabled || model.snapshot.billing.cloudAccess !== "read_write") {
      setCloudSaveState("local");
      return;
    }
    setCloudSaveState("syncing");
    const operation = cloudSyncQueueRef.current.then(async () => {
      const bundle = await buildProjectBundle(next);
      const thumbnailDataUrl = createProjectThumbnail(next.id);
      const archive: CloudProjectArchive = {
        id: next.id,
        name: next.name,
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
        currentRevisionId: next.currentRevisionId,
        ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
        bundle,
      };
      const receipt = await accountConnectionsRef.current.saveCloudProject(archive);
      setCloudProjects((current) => [receipt.project, ...current.filter((entry) => entry.id !== receipt.project.id)]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      if (receipt.status === "kept_remote" && receipt.archive) {
        await preserveCloudConflict(bundle, receipt.archive);
        return;
      }
      setCloudSaveState("synced");
    });
    cloudSyncQueueRef.current = operation.catch(() => undefined);
    try {
      await operation;
    } catch (error) {
      console.error(error);
      setCloudSaveState("retrying");
      setMessage(error instanceof Error ? error.message : "Cloud project sync will retry after the next edit.");
    }
  }

  function queueCloudProjectSync(next: GlassWareProject, immediate = false) {
    const model = accountConnectionsRef.current;
    if (model.snapshot.account?.mode !== "authenticated" || !model.snapshot.syncEnabled || model.snapshot.billing.cloudAccess !== "read_write") {
      setCloudSaveState("local");
      return;
    }
    if (cloudSyncTimerRef.current !== null) window.clearTimeout(cloudSyncTimerRef.current);
    setCloudSaveState("syncing");
    if (immediate) {
      cloudSyncTimerRef.current = null;
      void syncProjectToCloud(next);
      return;
    }
    cloudSyncTimerRef.current = window.setTimeout(() => {
      cloudSyncTimerRef.current = null;
      void syncProjectToCloud(next);
    }, 900);
  }

  async function restoreCloudProject(projectId: string) {
    try {
      setCloudSaveState("syncing");
      const archive = await accountConnectionsRef.current.loadCloudProject(projectId);
      const restored = await saveCloudBundleLocally(archive);
      setCloudSaveState("synced");
      setRecentProjects(await listProjects());
      replaceProject(restored);
    } catch (error) {
      console.error(error);
      setCloudSaveState("retrying");
      setMessage(error instanceof Error ? error.message : "The cloud project could not be restored.");
    }
  }

  async function removeCloudProject(projectId: string) {
    try {
      await accountConnectionsRef.current.deleteCloudProject(projectId);
      setCloudProjects((current) => current.filter((entry) => entry.id !== projectId));
      setMessage("Cloud copy removed. The project remains on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cloud copy could not be removed.");
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

  function selectByIds(designIds: string[], primaryId: string | null = designIds.at(-1) ?? null) {
    const layer = layerRef.current;
    const transformer = transformerRef.current;
    if (!layer || !transformer) return;
    const ids = [...new Set(designIds)].filter((id) => projectRef.current.objects.some((object) => object.id === id));
    const nodes = ids
      .map((id) => findDesignNode(layer, id))
      .filter((node): node is Konva.Shape => Boolean(node?.visible()));
    const primary = primaryId ? findDesignNode(layer, primaryId) : nodes.at(-1) ?? null;
    selectedNodeRef.current = primary;
    selectedIdsRef.current = ids;
    transformer.nodes(nodes);
    const locked = nodes.some((node) => Boolean(node.getAttr("designLocked")));
    transformer.resizeEnabled(!locked);
    transformer.rotateEnabled(!locked);
    setSelectedId(primary ? String(primary.getAttr("designId")) : null);
    setSelectedIds(ids);
    layer.batchDraw();
  }

  function selectById(designId: string | null, additive = false) {
    if (!designId) {
      selectByIds([]);
      return;
    }
    const related = selectionForObject(projectRef.current.objects, designId);
    if (!additive) {
      selectByIds(related, designId);
      return;
    }
    const current = selectedIdsRef.current;
    const remove = related.every((id) => current.includes(id));
    const next = remove ? current.filter((id) => !related.includes(id)) : [...current, ...related];
    selectByIds(next, remove ? next.at(-1) ?? null : designId);
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

  async function renderProject(next: GlassWareProject, selectAfter: string | string[] | null = null) {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    const renderVersion = ++renderVersionRef.current;
    const dimensions = displayDimensions(next);
    const backdrop = await createArtworkBackdrop(next.canvas, next.canvas.presentation);
    if (renderVersion !== renderVersionRef.current) {
      backdrop.destroy();
      return;
    }
    const card = new Konva.Rect({ id: "artwork-card", listening: false });
    const artworkGroup = new Konva.Group({ id: "artwork-content" });
    const artworkFrame = new Konva.Group({ id: "artwork-frame-shell", listening: false });
    const pendingLayer = new Konva.Layer();
    pendingLayer.visible(false);
    pendingLayer.scale({ x: dimensions.scale, y: dimensions.scale });
    stage.add(pendingLayer);
    pendingLayer.add(backdrop);
    pendingLayer.add(card);
    pendingLayer.add(artworkGroup);
    pendingLayer.add(artworkFrame);
    const discardPendingRender = () => {
      pendingLayer.destroy();
    };
    artworkGroup.add(new Konva.Rect({
      id: "background",
      width: next.canvas.width,
      height: next.canvas.height,
      fill: next.canvas.background,
      listening: false,
    }));
    for (const guide of next.canvas.guides) {
      artworkGroup.add(new Konva.Line({
        name: "canvas-guide",
        points: guide.axis === "x"
          ? [guide.position, 0, guide.position, next.canvas.height]
          : [0, guide.position, next.canvas.width, guide.position],
        stroke: "#1677ff",
        strokeWidth: 1.5,
        dash: [8, 6],
        opacity: 0.8,
        listening: false,
      }));
    }
    for (const object of next.objects) {
      const node = await designNodeToKonva(object, loadAsset, artworkGroup);
      if (renderVersion !== renderVersionRef.current) {
        node.destroy();
        discardPendingRender();
        return;
      }
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
    if (renderVersion !== renderVersionRef.current) {
      transformer.destroy();
      discardPendingRender();
      return;
    }
    pendingLayer.add(transformer);
    stage.size({ width: dimensions.width, height: dimensions.height });
    layer.destroyChildren();
    layer.scale({ x: dimensions.scale, y: dimensions.scale });
    artworkBackdropRef.current = backdrop;
    artworkCardRef.current = card;
    artworkGroupRef.current = artworkGroup;
    artworkFrameRef.current = artworkFrame;
    transformerRef.current = transformer;
    for (const child of [...pendingLayer.getChildren()]) child.moveTo(layer);
    pendingLayer.destroy();
    applyArtworkPresentationToStage(next.canvas, next.canvas.presentation);
    layer.draw();
    const requested = Array.isArray(selectAfter) ? selectAfter : selectAfter ? [selectAfter] : [];
    const selection = requested.filter((id) => next.objects.some((object) => object.id === id));
    selectByIds(selection, selection.includes(selectedId ?? "") ? selectedId : selection.at(-1) ?? null);
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
      void renderProject(next, selectedIdsRef.current);
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
    if (!canvas.snapping.enabled) return;
    const xGuides = canvas.snapping.canvas ? [0, canvas.width / 2, canvas.width] : [];
    const yGuides = canvas.snapping.canvas ? [0, canvas.height / 2, canvas.height] : [];
    if (canvas.snapping.guides) {
      for (const guide of canvas.guides) (guide.axis === "x" ? xGuides : yGuides).push(guide.position);
    }
    if (canvas.snapping.objects) {
      for (const other of layer.find(`.${DESIGN_OBJECT_NAME}`)) {
        if (other === node || selectedIdsRef.current.includes(String(other.getAttr("designId"))) || !other.visible()) continue;
        const rect = other.getClientRect({ relativeTo: artworkGroup, skipShadow: true, skipStroke: true });
        xGuides.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
        yGuides.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
      }
    }
    const rect = node.getClientRect({ relativeTo: artworkGroup, skipShadow: true, skipStroke: true });
    const ownX = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
    const ownY = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
    const artworkScale = artworkLayout(canvas, liveArtworkPresentationRef.current).scale;
    const activeScale = displayDimensions(projectRef.current).scale * artworkScale;
    const threshold = canvas.snapping.threshold / activeScale;
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
      const additive = Boolean((event.evt as PointerEvent).shiftKey || (event.evt as PointerEvent).metaKey || (event.evt as PointerEvent).ctrlKey);
      if (designNode) {
        selectById(String((designNode as Konva.Node).getAttr("designId")), additive);
        return;
      }
      if (!additive) selectByIds([]);
      const group = artworkGroupRef.current;
      const pointer = stage.getPointerPosition();
      if (!group || !pointer) return;
      const point = group.getAbsoluteTransform().copy().invert().point(pointer);
      marqueeStartRef.current = { ...point, additive };
      const marquee = new Konva.Rect({
        name: "selection-marquee",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        fill: "rgba(22,119,255,.09)",
        stroke: "#1677ff",
        strokeWidth: 1.5,
        dash: [7, 5],
        listening: false,
      });
      marqueeRectRef.current = marquee;
      group.add(marquee);
      transformerRef.current?.moveToTop();
      layer.batchDraw();
    });
    stage.on("pointermove", () => {
      const start = marqueeStartRef.current;
      const marquee = marqueeRectRef.current;
      const group = artworkGroupRef.current;
      const pointer = stage.getPointerPosition();
      if (!start || !marquee || !group || !pointer) return;
      const point = group.getAbsoluteTransform().copy().invert().point(pointer);
      marquee.setAttrs({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y),
      });
      layer.batchDraw();
    });
    stage.on("pointerup", () => {
      const start = marqueeStartRef.current;
      const marquee = marqueeRectRef.current;
      if (!start || !marquee) return;
      const rectangle = marquee.getClientRect();
      const matches = layer.find(`.${DESIGN_OBJECT_NAME}`)
        .filter((node) => node.visible() && Konva.Util.haveIntersection(rectangle, node.getClientRect()))
        .map((node) => String(node.getAttr("designId")));
      marquee.destroy();
      marqueeRectRef.current = null;
      marqueeStartRef.current = null;
      const next = start.additive ? [...selectedIdsRef.current, ...matches] : matches;
      selectByIds(next);
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
    stage.on("dragstart", (event) => {
      const target = event.target as Konva.Node;
      if (!target.hasName(DESIGN_OBJECT_NAME) || selectedIdsRef.current.length < 2) return;
      const anchorId = String(target.getAttr("designId"));
      if (!selectedIdsRef.current.includes(anchorId)) return;
      multiDragRef.current = {
        anchorId,
        anchorX: target.x(),
        anchorY: target.y(),
        positions: new Map(selectedIdsRef.current.flatMap((id) => {
          const node = findDesignNode(layer, id);
          return node ? [[id, { x: node.x(), y: node.y() }] as const] : [];
        })),
      };
    });
    stage.on("dragmove", (event) => {
      const target = event.target as Konva.Node;
      if (!target.hasName(DESIGN_OBJECT_NAME)) return;
      snapDraggedNode(target);
      const drag = multiDragRef.current;
      if (!drag || drag.anchorId !== String(target.getAttr("designId"))) return;
      const deltaX = target.x() - drag.anchorX;
      const deltaY = target.y() - drag.anchorY;
      for (const [id, position] of drag.positions) {
        if (id === drag.anchorId) continue;
        findDesignNode(layer, id)?.position({ x: position.x + deltaX, y: position.y + deltaY });
      }
      transformerRef.current?.forceUpdate();
      layer.batchDraw();
    });
    stage.on("dragend", (event) => {
      clearSnapGuides();
      multiDragRef.current = null;
      if (event.target.hasName(DESIGN_OBJECT_NAME)) commitCanvas(selectedIdsRef.current.length > 1 ? "Selection moved" : "Object moved");
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
    void refreshProjectGallery().then(() => undefined);

    return () => {
      cancelled = true;
      if (cloudSyncTimerRef.current !== null) window.clearTimeout(cloudSyncTimerRef.current);
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
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedIdsRef.current.length) {
        event.preventDefault();
        deleteSelected();
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && selectedIdsRef.current.length) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        for (const id of selectedIdsRef.current) {
          const node = layerRef.current && findDesignNode(layerRef.current, id);
          if (!node || node.getAttr("designLocked")) continue;
          if (event.key === "ArrowLeft") node.x(node.x() - amount);
          if (event.key === "ArrowRight") node.x(node.x() + amount);
          if (event.key === "ArrowUp") node.y(node.y() - amount);
          if (event.key === "ArrowDown") node.y(node.y() + amount);
        }
        layerRef.current?.batchDraw();
        transformerRef.current?.forceUpdate();
        commitCanvas(selectedIdsRef.current.length > 1 ? "Selection nudged" : "Object nudged");
      } else if (event.key === "Escape" && selectedIdsRef.current.length) {
        selectByIds([]);
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
        mask: { ...DEFAULT_IMAGE_MASK, strokes: [] },
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

  async function addShape(shape: ShapeKind, source: "shape" | "annotation" = "shape") {
    const annotation = source === "annotation"
      ? ANNOTATION_OPTIONS.find((option) => option.kind === shape)
      : undefined;
    const isLinear = shape === "line" || shape === "arrow" || shape === "curved-arrow";
    const isRedaction = shape === "blur" || shape === "redact";
    const isWide = isLinear || isRedaction || shape === "speech-bubble";
    let width = projectRef.current.canvas.width * (isWide ? 0.42 : 0.28);
    let height = projectRef.current.canvas.height * (isLinear ? 0.16 : isRedaction ? 0.12 : shape === "speech-bubble" ? 0.2 : 0.28);
    let x = (projectRef.current.canvas.width - width) / 2;
    let y = (projectRef.current.canvas.height - height) / 2;
    const selectedTarget = isRedaction
      ? projectRef.current.objects.find((object) => object.id === selectedId && object.visible && !(object.kind === "shape" && (object.shape === "blur" || object.shape === "redact")))
      : undefined;
    if (selectedTarget) {
      const targetWidth = Math.abs(selectedTarget.width * selectedTarget.scaleX);
      const targetHeight = Math.abs(selectedTarget.height * selectedTarget.scaleY);
      width = Math.max(80, Math.min(width, targetWidth * 0.72));
      height = Math.max(52, Math.min(projectRef.current.canvas.height * 0.18, targetHeight * 0.46));
      x = selectedTarget.x + (targetWidth - width) / 2;
      y = selectedTarget.y + (targetHeight - height) / 2;
    }
    const label = annotation?.label ?? SHAPE_OPTIONS.find((option) => option.kind === shape)?.label ?? "Shape";
    const design: DesignNode = {
      id: newId(),
      kind: "shape",
      name: label,
      shape,
      x,
      y,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: annotation && (shape === "rect" || shape === "ellipse") ? 0.2 : 1,
      visible: true,
      locked: false,
      fill: shape === "redact" ? "#111111" : annotation ? "#ff5d42" : "#d9d9d9",
      cornerRadius: shape === "rounded-rect" ? 28 : isRedaction ? 10 : 0,
    };
    artworkGroupRef.current?.add(await designNodeToKonva(design, loadAsset, artworkGroupRef.current ?? undefined));
    transformerRef.current?.moveToTop();
    selectById(design.id);
    commitCanvas(annotation ? `${label} annotation added` : "Shape added");
    setActiveTool("Shapes");
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

  function setBlendMode(mode: (typeof BLEND_MODES)[number]) {
    const selected = new Set(selectedIdsRef.current);
    const objects = projectRef.current.objects.map((object) => selected.has(object.id) && !object.locked
      ? { ...object, blendMode: mode }
      : object);
    if (!objects.some((object, index) => object !== projectRef.current.objects[index])) return;
    const next = commitSnapshot(projectRef.current, "Layer blend mode changed", {
      canvas: projectRef.current.canvas,
      objects,
    });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
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
      object.id === selectedId && object.kind === "shape"
        ? { ...object, shape, fill: shape === "redact" ? "#111111" : object.fill }
        : object,
    );
    const next = commitSnapshot(projectRef.current, "Shape changed", {
      canvas: projectRef.current.canvas,
      objects: nextObjects,
    });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
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
    void renderProject(next, selectedIdsRef.current);
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

  function applyPreciseCrop(crop: NormalizedCrop) {
    const current = liveImageState();
    if (!current) return;
    applyImageEdits(current.node, crop, current.adjustments);
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    commitCanvas("Image crop adjusted");
    setCropEditorOpen(false);
  }

  function transformSelectedImage(mutator: (node: Konva.Image) => void, summary: string) {
    const current = liveImageState();
    const group = artworkGroupRef.current;
    if (!current || !group || current.node.getAttr("designLocked")) return;
    const before = current.node.getClientRect({ relativeTo: group, skipShadow: true });
    mutator(current.node);
    const after = current.node.getClientRect({ relativeTo: group, skipShadow: true });
    current.node.position({
      x: current.node.x() + before.x + before.width / 2 - after.x - after.width / 2,
      y: current.node.y() + before.y + before.height / 2 - after.y - after.height / 2,
    });
    transformerRef.current?.forceUpdate();
    layerRef.current?.batchDraw();
    commitCanvas(summary);
  }

  function rotateSelectedImage(direction: -1 | 1) {
    transformSelectedImage((node) => node.rotation((node.rotation() + direction * 90 + 360) % 360), direction > 0 ? "Image rotated clockwise" : "Image rotated counterclockwise");
  }

  function flipSelectedImage(axis: "horizontal" | "vertical") {
    transformSelectedImage((node) => {
      if (axis === "horizontal") node.scaleX(node.scaleX() * -1);
      else node.scaleY(node.scaleY() * -1);
    }, `Image flipped ${axis}`);
  }

  function applyImageMask(mask: ImageMask) {
    if (!selectedId) return;
    const objects = projectRef.current.objects.map((object) => object.id === selectedId && object.kind === "image"
      ? { ...object, mask: cloneImageMask(mask) }
      : object);
    const next = commitSnapshot(projectRef.current, "Image mask adjusted", {
      canvas: projectRef.current.canvas,
      objects,
    });
    setCurrentProject(next);
    setMaskEditorOpen(false);
    void renderProject(next, selectedId);
    void persist(next);
  }

  async function runRegionEdit({ mask, prompt, output, signal, onStatus }: RegionEditRequest) {
    const current = projectRef.current;
    const targetId = selectedIdsRef.current.length === 1 ? selectedIdsRef.current[0] : null;
    const image = current.objects.find((object): object is ImageDesignNode => object.id === targetId && object.kind === "image");
    if (!image) throw new Error("Select an image layer before editing a region.");
    const asset = await loadAsset(image.assetId);
    if (!asset) throw new Error("The selected image asset is unavailable.");
    const connection = accountConnectionsRef.current.snapshot.connections.find((item) => item.status === "connected");
    if (!accountConnectionsRef.current.snapshot.account || !connection) throw new Error("Sign in and connect an AI provider before editing image regions.");
    onStatus("Rendering the selected crop and preservation mask…");
    const prepared = await renderRegionEditSource(asset, image);
    const maskDataUrl = renderRegionEditMask(mask, prepared.maskWidth, prepared.maskHeight);
    if (signal.aborted) throw new DOMException("Region edit cancelled.", "AbortError");
    onStatus("AI is editing only the selected pixels…");
    const job = await accountConnectionsRef.current.requestImageEdit(
      connection.id,
      prepared.sourceDataUrl,
      maskDataUrl,
      prompt,
      DEFAULT_AI_MODEL,
      DEFAULT_AI_REASONING_EFFORT,
      undefined,
      signal,
      (next) => onStatus(next.status === "queued" ? "Region edit queued…" : next.status === "running" ? "AI is reconstructing the selected region…" : "Applying the edited raster…"),
    );
    if (!job.imageEdit) throw new Error("The AI provider returned no edited raster.");
    onStatus("Adding the edited raster to the artboard…");
    const blob = await dataUrlToBlob(job.imageEdit.imageDataUrl);
    const file = new File([blob], `${asset.name.replace(/\.[^.]+$/, "")} region edit.png`, { type: blob.type || "image/png" });
    const editedAsset = await createStoredAsset(current.id, file, {
      provider: "glassware-ai-edit",
      connectionKind: job.imageEdit.provider,
      model: job.imageEdit.model,
      parentAssetId: asset.id,
      createdAt: new Date().toISOString(),
    });
    await saveAsset(editedAsset);
    const resetRasterEdits = {
      crop: { ...FULL_IMAGE_CROP },
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      mask: cloneImageMask(DEFAULT_IMAGE_MASK),
    };
    let selectedId = image.id;
    const objects = current.objects.map((object) => object.id === image.id && output === "replace"
      ? { ...object, assetId: editedAsset.id, ...resetRasterEdits }
      : object);
    if (output === "new-layer") {
      selectedId = newId();
      const editedLayer: ImageDesignNode = {
        ...image,
        ...resetRasterEdits,
        id: selectedId,
        name: `${image.name} · AI region edit`,
        assetId: editedAsset.id,
        locked: false,
      };
      objects.push(editedLayer);
    }
    const next = commitSnapshot(current, output === "replace" ? "AI region replaced image" : "AI region added as layer", {
      canvas: current.canvas,
      objects,
    });
    setCurrentProject(next);
    await renderProject(next, [selectedId]);
    void persist(next);
    setMessage(output === "replace" ? "Selected image replaced with the region edit." : "Region edit added as a new editable layer.");
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

  function beginCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as HTMLElement;
    const overArtboard = Boolean(target.closest(".design-canvas"));
    const interactive = Boolean(target.closest("button, input, textarea, select, a, .toast"));
    const shouldPan = event.button === 1 || spacePanRef.current || (panMode && !interactive) || (!overArtboard && !interactive);
    if (!shouldPan) return;
    canvasPanRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanningCanvas(true);
    event.preventDefault();
    event.stopPropagation();
  }

  function moveCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    const pan = canvasPanRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX);
    event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  function endCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    if (canvasPanRef.current?.pointerId !== event.pointerId) return;
    canvasPanRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsPanningCanvas(false);
    event.preventDefault();
    event.stopPropagation();
  }

  function toggleVisibility(designId: string) {
    const node = layerRef.current && findDesignNode(layerRef.current, designId);
    if (!node) return;
    node.visible(!node.visible());
    if (!node.visible() && selectedIdsRef.current.includes(designId)) {
      const nextSelection = selectedIdsRef.current.filter((id) => id !== designId);
      selectByIds(nextSelection);
    }
    commitCanvas(node.visible() ? "Layer shown" : "Layer hidden");
  }

  function toggleLock(designId: string) {
    const node = layerRef.current && findDesignNode(layerRef.current, designId);
    if (!node) return;
    const locked = !Boolean(node.getAttr("designLocked"));
    applyLockedState(node, locked);
    if (selectedIdsRef.current.includes(designId)) selectByIds(selectedIdsRef.current, selectedId);
    commitCanvas(locked ? "Layer locked" : "Layer unlocked");
  }

  function setAllLayerVisibility(visible: boolean) {
    const current = projectRef.current;
    if (!current.objects.length || current.objects.every((object) => object.visible === visible)) return;
    const next = commitSnapshot(current, visible ? "All layers shown" : "All layers hidden", {
      canvas: current.canvas,
      objects: current.objects.map((object) => ({ ...object, visible })),
    });
    setCurrentProject(next);
    if (!visible) {
      selectedIdsRef.current = [];
      setSelectedIds([]);
      setSelectedId(null);
    }
    void renderProject(next, visible ? selectedIdsRef.current : null);
    void persist(next);
  }

  function setAllLayerLock(locked: boolean) {
    const current = projectRef.current;
    if (!current.objects.length || current.objects.every((object) => object.locked === locked)) return;
    const next = commitSnapshot(current, locked ? "All layers locked" : "All layers unlocked", {
      canvas: current.canvas,
      objects: current.objects.map((object) => ({ ...object, locked })),
    });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function commitLayoutObjects(objects: DesignNode[], summary: string, selection = selectedIdsRef.current) {
    const current = projectRef.current;
    const next = commitSnapshot(current, summary, { canvas: current.canvas, objects });
    setCurrentProject(next);
    void renderProject(next, selection);
    void persist(next);
  }

  function alignSelection(alignment: Alignment) {
    if (!selectedIdsRef.current.length) return;
    const objects = alignObjects(
      projectRef.current.objects,
      selectedIdsRef.current,
      projectRef.current.canvas,
      alignment,
      alignmentReference,
    );
    commitLayoutObjects(objects, `Selection aligned ${alignment}`);
  }

  function distributeSelection(axis: DistributionAxis) {
    if (selectedIdsRef.current.length < 3) return;
    commitLayoutObjects(
      distributeObjects(projectRef.current.objects, selectedIdsRef.current, axis),
      `${axis === "horizontal" ? "Horizontal" : "Vertical"} spacing distributed`,
    );
  }

  function groupSelection() {
    if (selectedIdsRef.current.length < 2) return;
    commitLayoutObjects(
      groupObjects(projectRef.current.objects, selectedIdsRef.current, newId()),
      "Layers grouped",
    );
  }

  function ungroupSelection() {
    if (!selectedObjects.some((object) => object.groupId)) return;
    commitLayoutObjects(
      ungroupObjects(projectRef.current.objects, selectedIdsRef.current),
      "Layers ungrouped",
    );
  }

  function updateCanvasWorkspace(patch: Partial<Pick<CanvasSettings, "showRulers" | "snapping">>, summary: string) {
    const current = projectRef.current;
    const canvas = {
      ...current.canvas,
      ...patch,
      snapping: patch.snapping ? { ...current.canvas.snapping, ...patch.snapping } : current.canvas.snapping,
    };
    const next = commitSnapshot(current, summary, { canvas, objects: current.objects });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function addCanvasGuide(axis: "x" | "y", position?: number) {
    const current = projectRef.current;
    const maximum = axis === "x" ? current.canvas.width : current.canvas.height;
    const nextPosition = Math.max(0, Math.min(maximum, position ?? maximum / 2));
    const canvas = {
      ...current.canvas,
      guides: [...current.canvas.guides, { id: newId(), axis, position: nextPosition }],
      showRulers: true,
    };
    const next = commitSnapshot(current, `${axis === "x" ? "Vertical" : "Horizontal"} guide added`, { canvas, objects: current.objects });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function updateCanvasGuide(guideId: string, position: number) {
    const current = projectRef.current;
    const canvas = {
      ...current.canvas,
      guides: current.canvas.guides.map((guide) => {
        if (guide.id !== guideId) return guide;
        const maximum = guide.axis === "x" ? current.canvas.width : current.canvas.height;
        return { ...guide, position: Math.max(0, Math.min(maximum, position)) };
      }),
    };
    const next = commitSnapshot(current, "Guide moved", { canvas, objects: current.objects });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function removeCanvasGuide(guideId: string) {
    const current = projectRef.current;
    const canvas = { ...current.canvas, guides: current.canvas.guides.filter((guide) => guide.id !== guideId) };
    const next = commitSnapshot(current, "Guide removed", { canvas, objects: current.objects });
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
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
    const sourceIds = selectedIdsRef.current;
    if (!sourceIds.length) return;
    const groupIds = new Map<string, string>();
    const copies = projectRef.current.objects.filter((object) => sourceIds.includes(object.id)).map((source) => {
      const groupId = source.groupId
        ? groupIds.get(source.groupId) ?? (() => { const id = newId(); groupIds.set(source.groupId!, id); return id; })()
        : undefined;
      return {
        ...source,
        id: newId(),
        name: `${source.name} copy`,
        x: source.x + 28,
        y: source.y + 28,
        ...(groupId ? { groupId } : {}),
      } as DesignNode;
    });
    if (!copies.length) return;
    const next = commitSnapshot(projectRef.current, copies.length > 1 ? "Layers duplicated" : "Layer duplicated", {
      canvas: projectRef.current.canvas,
      objects: [...projectRef.current.objects, ...copies],
    });
    setCurrentProject(next);
    selectedNodeRef.current = null;
    transformerRef.current?.nodes([]);
    selectedIdsRef.current = copies.map((copy) => copy.id);
    setSelectedIds(selectedIdsRef.current);
    setSelectedId(copies.at(-1)!.id);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function deleteSelected() {
    const ids = new Set(projectRef.current.objects.filter((object) => selectedIdsRef.current.includes(object.id) && !object.locked).map((object) => object.id));
    if (!ids.size) return;
    const next = commitSnapshot(projectRef.current, ids.size > 1 ? "Layers deleted" : "Layer deleted", {
      canvas: projectRef.current.canvas,
      objects: projectRef.current.objects.filter((object) => !ids.has(object.id)),
    });
    setCurrentProject(next);
    selectedIdsRef.current = [];
    setSelectedIds([]);
    setSelectedId(null);
    void renderProject(next);
    void persist(next);
  }

  function undo() {
    if (!canUndo(projectRef.current)) return;
    const next = undoProject(projectRef.current);
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function redo() {
    const aiTarget = findLatestRedoableAiRevision(projectRef.current);
    if (aiTarget?.index === currentRevisionIndex(projectRef.current) + 1) {
      redoAiEdits();
      return;
    }
    if (!canRedo(projectRef.current)) {
      redoAiEdits();
      return;
    }
    const next = redoProject(projectRef.current);
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  function captureAiArtboard(pass: number): AiAttachment {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage) throw new Error("The artboard is not ready for visual inspection.");
    const transformerWasVisible = transformer?.visible() ?? false;
    transformer?.hide();
    layerRef.current?.batchDraw();
    const dataUrl = stage.toDataURL({ mimeType: "image/jpeg", quality: 0.88, pixelRatio: 1 });
    if (transformerWasVisible) transformer?.show();
    layerRef.current?.batchDraw();
    return {
      id: crypto.randomUUID(),
      name: `glassware-artboard-pass-${pass}.jpg`,
      mimeType: "image/jpeg",
      dataUrl,
    };
  }

  async function applyAiDecisionToDraft(
    draft: GlassWareProject,
    plan: AiEditPlan,
    attachments: AiAttachment[],
    regionContext?: Pick<AiAgentRequest, "connectionId" | "model" | "reasoningEffort"> & { agentSessionId?: string; signal: AbortSignal },
  ) {
    const { applyAiEditPlan } = await import("./lib/ai-plan");
    const mediaActions = new Set(["generate_image", "add_attachment_image", "search_open_image", "edit_image_region"]);
    const mediaOperations = plan.operations.filter((operation) => mediaActions.has(operation.action));
    const editablePlan = { ...plan, operations: plan.operations.filter((operation) => !mediaActions.has(operation.action)) };
    const application = applyAiEditPlan(draft, editablePlan, { components, brandKits, exportAssets });
    let objects = [...application.snapshot.objects];
    let generatedImageCount = 0;
    let importedImageCount = 0;
    let sourcedImageCount = 0;
    for (const operation of mediaOperations) {
      const targetIndex = operation.targetId
        ? objects.findIndex((object) => object.id === operation.targetId && object.kind === "image")
        : -1;
      const target = targetIndex >= 0 ? objects[targetIndex] as ImageDesignNode : null;
      if (target?.locked) {
        application.skippedOperations.push(operation.label);
        continue;
      }
      if (operation.action === "edit_image_region") {
        const points = operation.maskPoints?.filter((point) => Number.isFinite(point)).slice(0, 2048) ?? [];
        const imagePrompt = operation.imagePrompt?.trim();
        const sourceAsset = target ? await loadAsset(target.assetId) : null;
        if (!regionContext || !target || !sourceAsset || !imagePrompt || points.length < 4 || points.length % 2 !== 0) {
          application.skippedOperations.push(operation.label);
          continue;
        }
        const selectionMask: ImageMask = {
          enabled: true,
          inverted: false,
          feather: Math.max(0, Math.min(operation.maskFeather ?? 0, 40)),
          strokes: [{
            id: newId(),
            mode: "hide",
            size: Math.max(0.01, Math.min((operation.maskSize ?? 0.08) > 1 ? (operation.maskSize ?? 80) / 1000 : operation.maskSize ?? 0.08, 0.4)),
            points: points.map((point) => Math.max(0, Math.min(point, 1))),
          }],
        };
        const prepared = await renderRegionEditSource(sourceAsset, target);
        const maskDataUrl = renderRegionEditMask(selectionMask, prepared.maskWidth, prepared.maskHeight);
        const regionJob = await accountConnectionsRef.current.requestImageEdit(
          regionContext.connectionId,
          prepared.sourceDataUrl,
          maskDataUrl,
          imagePrompt,
          regionContext.model,
          regionContext.reasoningEffort,
          regionContext.agentSessionId,
          regionContext.signal,
        );
        if (!regionJob.imageEdit) {
          application.skippedOperations.push(operation.label);
          continue;
        }
        const editedBlob = await dataUrlToBlob(regionJob.imageEdit.imageDataUrl);
        const editedFile = new File([editedBlob], `${sourceAsset.name.replace(/\.[^.]+$/, "")} region edit.png`, { type: editedBlob.type || "image/png" });
        const editedAsset = await createStoredAsset(draft.id, editedFile, {
          provider: "glassware-ai-edit",
          connectionKind: regionJob.imageEdit.provider,
          model: regionJob.imageEdit.model,
          parentAssetId: sourceAsset.id,
          createdAt: new Date().toISOString(),
        });
        await saveAsset(editedAsset);
        const editedLayer: ImageDesignNode = {
          ...target,
          id: operation.regionOutput === "new-layer" ? newId() : target.id,
          name: operation.name?.trim().slice(0, 120) || (operation.regionOutput === "new-layer" ? `${target.name} · AI region edit` : target.name),
          assetId: editedAsset.id,
          crop: { ...FULL_IMAGE_CROP },
          adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
          mask: cloneImageMask(DEFAULT_IMAGE_MASK),
          locked: false,
        };
        if (operation.regionOutput === "new-layer") {
          objects.splice(targetIndex + 1, 0, editedLayer);
          application.addedObjectIds.push(editedLayer.id);
        } else {
          objects[targetIndex] = editedLayer;
        }
        application.appliedOperations.push(operation.label);
        generatedImageCount += 1;
        continue;
      }
      const attachment = operation.action === "add_attachment_image"
        ? attachments.find((candidate) => candidate.mimeType.startsWith("image/") && (
          candidate.name.toLocaleLowerCase() === operation.attachmentName?.toLocaleLowerCase() ||
          normalizedAiAttachmentName(candidate.name) === normalizedAiAttachmentName(operation.attachmentName ?? "")
        ))
        : null;
      let file: File | null = null;
      let source: AssetSource | undefined;
      if (operation.action === "search_open_image") {
        const query = operation.imageSearchQuery?.trim();
        const openImage = query ? (await searchOpenverseImages(query))[0] : null;
        if (openImage) {
          file = await downloadOpenverseImage(openImage);
          source = openverseAssetSource(openImage);
        }
      } else {
        const dataUrl = operation.action === "generate_image" ? operation.imageDataUrl : attachment?.dataUrl;
        if (dataUrl) {
          const blob = await dataUrlToBlob(dataUrl);
          file = new File([blob], operation.action === "generate_image" ? "AI generated image.png" : attachment?.name ?? "AI attachment.png", { type: blob.type || attachment?.mimeType || "image/png" });
        }
      }
      if (!file) {
        application.skippedOperations.push(operation.label);
        continue;
      }
      const asset = await createStoredAsset(draft.id, file, source);
      await saveAsset(asset);
      if (target) {
        const width = Math.max(8, Math.min(operation.width ?? target.width, application.snapshot.canvas.width));
        const height = Math.max(8, Math.min(operation.height ?? target.height, application.snapshot.canvas.height));
        objects = objects.map((object, index) => index === targetIndex ? {
          ...target,
          assetId: asset.id,
          name: operation.name?.trim().slice(0, 120) || target.name,
          x: Math.max(0, Math.min(operation.x ?? target.x, application.snapshot.canvas.width - width)),
          y: Math.max(0, Math.min(operation.y ?? target.y, application.snapshot.canvas.height - height)),
          width,
          height,
        } : object);
        application.appliedOperations.push(operation.label);
        if (operation.action === "generate_image") generatedImageCount += 1;
        else if (operation.action === "search_open_image") sourcedImageCount += 1;
        else importedImageCount += 1;
        continue;
      }
      const maxWidth = application.snapshot.canvas.width * 0.72;
      const maxHeight = application.snapshot.canvas.height * 0.72;
      const scale = Math.min(1, maxWidth / asset.width, maxHeight / asset.height);
      const width = Math.max(8, Math.min(operation.width ?? asset.width * scale, application.snapshot.canvas.width));
      const height = Math.max(8, Math.min(operation.height ?? asset.height * scale, application.snapshot.canvas.height));
      const image: ImageDesignNode = {
        id: newId(),
        kind: "image",
        name: operation.name?.trim().slice(0, 120) || asset.name || operation.label.slice(0, 120),
        assetId: asset.id,
        crop: { ...FULL_IMAGE_CROP },
        adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
        presentation: cloneImagePresentation(),
        mask: { ...DEFAULT_IMAGE_MASK, strokes: [] },
        x: Math.max(0, Math.min(operation.x ?? (application.snapshot.canvas.width - width) / 2, application.snapshot.canvas.width - width)),
        y: Math.max(0, Math.min(operation.y ?? (application.snapshot.canvas.height - height) / 2, application.snapshot.canvas.height - height)),
        width,
        height,
        rotation: Math.max(-360, Math.min(operation.rotation ?? 0, 360)),
        scaleX: 1,
        scaleY: 1,
        opacity: Math.max(0, Math.min(operation.opacity ?? 1, 1)),
        visible: operation.visible ?? true,
        locked: operation.locked ?? false,
      };
      objects.push(image);
      application.addedObjectIds.push(image.id);
      application.appliedOperations.push(operation.label);
      if (operation.action === "generate_image") generatedImageCount += 1;
      else if (operation.action === "search_open_image") sourcedImageCount += 1;
      else importedImageCount += 1;
    }
    const project = {
      ...application.project,
      objects,
      pages: application.project.pages.map((page) => page.id === application.project.activePageId
        ? { ...page, canvas: application.snapshot.canvas, objects }
        : page),
      updatedAt: new Date().toISOString(),
    };
    return {
      ...application,
      project,
      snapshot: { ...application.snapshot, objects },
      changed: application.changed || generatedImageCount + importedImageCount + sourcedImageCount > 0,
      generatedImageCount,
      importedImageCount,
      sourcedImageCount,
    };
  }

  async function runAiAgent(request: AiAgentRequest, onProgress: (progress: AiAgentProgress) => void, signal: AbortSignal): Promise<AiAgentReceipt> {
    const original = projectRef.current;
    const baseRevisionId = original.currentRevisionId;
    const runId = newId();
    let draft = original;
    let appliedCount = 0;
    let skippedCount = 0;
    let passCount = 0;
    let latestSummary = "The artboard already matches your request.";
    let latestAssessment = "No changes were needed.";
    let generatedImageCount = 0;
    let importedImageCount = 0;
    let sourcedImageCount = 0;
    let changedCount = 0;
    const usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
    let agentSessionId = request.agentSessionId;
    const completedSteps: string[] = [];
    const receipts: StoredAiPassReceipt[] = [];
    const { createAiProjectContext } = await import("./lib/ai-plan");
    const aiAssets = new Map((await listAssets(original.id)).map((asset) => [asset.id, { width: asset.width, height: asset.height }]));
    let qualityReport = assessAiQuality(draft, { assets: aiAssets, originalProject: original, prompt: request.prompt, completedSteps, generatedImageCount });
    let runRecord: StoredAiRun = {
      id: runId,
      projectId: original.id,
      baseRevisionId,
      status: "running",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentPass: 0,
      prompt: request.prompt,
      connectionId: request.connectionId,
      model: request.model,
      reasoningEffort: request.reasoningEffort,
      completedSteps: [],
      receipts: [],
      originalProject: original,
      draftProject: draft,
    };
    let runWriteQueue = Promise.resolve();
    const updateRun = (patch: Partial<StoredAiRun>) => {
      runRecord = { ...runRecord, ...patch, updatedAt: new Date().toISOString() };
      const snapshot = { ...runRecord, completedSteps: [...runRecord.completedSteps], receipts: [...runRecord.receipts] };
      runWriteQueue = runWriteQueue.then(() => saveAiRun(snapshot));
      return runWriteQueue;
    };
    const assertCurrentBase = () => {
      if (projectRef.current.id !== original.id || projectRef.current.currentRevisionId !== baseRevisionId) {
        const error = new Error("The artwork changed while AI was working, so the unfinished AI draft was not applied.");
        error.name = "StaleAiRunError";
        throw error;
      }
    };
    setAiRunActive(true);
    await updateRun({});
    try {
      for (let pass = 1; pass <= MAX_AI_VISUAL_PASSES; pass += 1) {
        if (signal.aborted) throw new DOMException("AI run cancelled.", "AbortError");
        assertCurrentBase();
        passCount = pass;
        const passStartedAt = new Date().toISOString();
        let activeJobId: string | undefined;
        await updateRun({ currentPass: pass, draftProject: draft, agentSessionId, completedSteps: [...completedSteps], receipts: [...receipts] });
        onProgress({ pass, maxPasses: MAX_AI_VISUAL_PASSES, phase: "thinking", message: pass === 1 ? "Inspecting the artboard and choosing the first focused edit…" : "Reviewing the rendered result and choosing the next focused edit…" });
        const preview = captureAiArtboard(pass);
        const job = await accountConnections.requestAiTurn(
          request.connectionId,
          request.prompt,
          createAiProjectContext(draft, { components, brandKits, exportAssets: aiAssets, qualityFindings: aiQualityFeedback(qualityReport) }),
          request.model,
          request.reasoningEffort,
          [...request.attachments, preview],
          {
            pass,
            maxPasses: MAX_AI_VISUAL_PASSES,
            baseRevisionId,
            runId,
            sessionId: agentSessionId,
            completedSteps,
            qualityFindings: aiQualityFeedback(qualityReport),
            conversationHistory: request.conversationHistory,
          },
          signal,
          (currentJob) => {
            activeJobId = currentJob.id;
            void updateRun({ activeJobId: currentJob.id, agentSessionId: currentJob.agentSessionId ?? agentSessionId });
          },
        );
        if (signal.aborted) throw new DOMException("AI run cancelled.", "AbortError");
        assertCurrentBase();
        agentSessionId = job.agentSessionId ?? agentSessionId;
        if (job.usage) {
          usage.inputTokens += job.usage.inputTokens;
          usage.cachedInputTokens += job.usage.cachedInputTokens;
          usage.outputTokens += job.usage.outputTokens;
        }
        const plan = job.plan!;
        latestSummary = plan.summary;
        latestAssessment = plan.assessment;
        let passAppliedOperations: string[] = [];
        let passSkippedOperations: string[] = [];
        if (plan.operations.length > 0) {
          onProgress({ pass, maxPasses: MAX_AI_VISUAL_PASSES, phase: "applying", message: `${plan.summary} Applying this focused step…` });
          const application = await applyAiDecisionToDraft(draft, plan, request.attachments, {
            connectionId: request.connectionId,
            model: request.model,
            reasoningEffort: request.reasoningEffort,
            agentSessionId,
            signal,
          });
          passAppliedOperations = [...application.appliedOperations, ...application.receipts];
          passSkippedOperations = [...application.skippedOperations];
          appliedCount += application.appliedOperations.length;
          skippedCount += application.skippedOperations.length;
          generatedImageCount += application.generatedImageCount;
          importedImageCount += application.importedImageCount;
          sourcedImageCount += application.sourcedImageCount;
          completedSteps.push(...application.appliedOperations);
          completedSteps.push(...application.receipts);
          if (application.changed) {
            changedCount += 1;
            draft = application.project;
            setCurrentProject(draft);
            const selectedAfter = application.addedObjectIds.at(-1) ?? null;
            await renderProject(draft, selectedAfter);
            onProgress({ pass, maxPasses: MAX_AI_VISUAL_PASSES, phase: "inspecting", message: "That step is on the artboard. Rendering it for Luna to review before continuing…" });
            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          }
        }
        qualityReport = assessAiQuality(draft, {
          assets: aiAssets,
          originalProject: original,
          prompt: request.prompt,
          completedSteps,
          generatedImageCount,
        });
        const qualityFeedback = aiQualityFeedback(qualityReport);
        const passReceipt: StoredAiPassReceipt = {
          pass,
          ...(activeJobId ? { jobId: activeJobId } : {}),
          status: plan.done && plan.operations.length === 0 ? "completed" : "applied",
          startedAt: passStartedAt,
          finishedAt: new Date().toISOString(),
          summary: plan.summary,
          assessment: plan.assessment,
          appliedOperations: passAppliedOperations,
          skippedOperations: passSkippedOperations,
          qualityFindings: qualityFeedback,
          ...(job.usage ? { usage: job.usage } : {}),
        };
        receipts.push(passReceipt);
        await updateRun({
          activeJobId: undefined,
          agentSessionId,
          draftProject: draft,
          completedSteps: [...completedSteps],
          receipts: [...receipts],
        });
        const qualityBlocksCompletion = qualityReport.blockingFailures.length > 0 || qualityReport.findings.some((finding) => finding.severity === "error");
        if (plan.done && plan.operations.length === 0 && !qualityBlocksCompletion) break;
        if (plan.operations.length === 0 && !qualityBlocksCompletion) break;
        if (qualityBlocksCompletion) completedSteps.push(...qualityFeedback.filter((finding) => /failed|ERROR/.test(finding)).slice(0, 8));
      }

      if (changedCount === 0) {
        if (projectRef.current !== original) {
          setCurrentProject(original);
          await renderProject(original, selectedIdsRef.current);
        }
        await updateRun({ status: "completed", finishedAt: new Date().toISOString(), activeJobId: undefined, receipts: [...receipts], completedSteps: [...completedSteps] });
        return { summary: latestSummary, assessment: latestAssessment, passCount, appliedCount, skippedCount, generatedImageCount, importedImageCount, sourcedImageCount, revisionNumber: null, agentSessionId, qualitySummary: qualityReport.summary, receipts, usage };
      }

      assertCurrentBase();
      const next = commitAiProjectSession(original, draft, latestSummary);
      setCurrentProject(next);
      await renderProject(next, selectedIdsRef.current.filter((id) => next.objects.some((object) => object.id === id)));
      await persist(next);
      const revisionNumber = next.revisions[currentRevisionIndex(next)]?.number ?? next.revisions.length;
      const mediaReceipt = generatedImageCount
        ? ` ${generatedImageCount} generated image${generatedImageCount === 1 ? " was" : "s were"} added.`
        : importedImageCount
          ? ` ${importedImageCount} attached image${importedImageCount === 1 ? " was" : "s were"} added.`
          : sourcedImageCount
            ? ` ${sourcedImageCount} reusable open image${sourcedImageCount === 1 ? " was" : "s were"} added with its source receipt.`
          : "";
      setMessage(`${appliedCount} AI edit${appliedCount === 1 ? "" : "s"} completed after ${passCount} visual pass${passCount === 1 ? "" : "es"}.${mediaReceipt} Use Undo AI edits to revert the session.`);
      await updateRun({ status: "completed", finishedAt: new Date().toISOString(), activeJobId: undefined, draftProject: next, receipts: [...receipts], completedSteps: [...completedSteps] });
      return { summary: latestSummary, assessment: latestAssessment, passCount, appliedCount, skippedCount, generatedImageCount, importedImageCount, sourcedImageCount, revisionNumber, agentSessionId, qualitySummary: qualityReport.summary, receipts, usage };
    } catch (error) {
      const status: StoredAiRun["status"] = error instanceof Error && error.name === "AbortError"
        ? "cancelled"
        : error instanceof Error && error.name === "StaleAiRunError"
          ? "stale"
          : "failed";
      receipts.push({
        pass: Math.max(1, passCount),
        status,
        startedAt: runRecord.updatedAt,
        finishedAt: new Date().toISOString(),
        summary: error instanceof Error ? error.message : "AI run failed.",
        assessment: "No partial AI draft was committed.",
        appliedOperations: [],
        skippedOperations: [],
        qualityFindings: aiQualityFeedback(qualityReport),
      });
      await updateRun({ status, finishedAt: new Date().toISOString(), activeJobId: undefined, receipts: [...receipts], completedSteps: [...completedSteps] });
      if (projectRef.current.id === original.id && projectRef.current.currentRevisionId === baseRevisionId) {
        setCurrentProject(original);
        await renderProject(original, selectedIdsRef.current);
      }
      throw error;
    } finally {
      await runWriteQueue;
      setAiRunActive(false);
    }
  }

  function undoAiEdits() {
    const result = undoLatestAiSession(projectRef.current);
    if (!result) return;
    setCurrentProject(result.project);
    const nextSelection = selectedId && result.project.objects.some((object) => object.id === selectedId) ? selectedId : null;
    setSelectedId(nextSelection);
    void renderProject(result.project, nextSelection);
    void persist(result.project);
    setMessage(result.conflictCount
      ? `The latest AI session was undone. ${result.conflictCount} later manual change${result.conflictCount === 1 ? " was" : "s were"} kept.`
      : "The latest AI session was undone.");
  }

  function redoAiEdits() {
    const result = redoLatestAiSession(projectRef.current);
    if (!result) return;
    setCurrentProject(result.project);
    const nextSelection = selectedId && result.project.objects.some((object) => object.id === selectedId) ? selectedId : null;
    setSelectedId(nextSelection);
    void renderProject(result.project, nextSelection);
    void persist(result.project);
    setMessage(result.conflictCount
      ? `The latest undone AI session was restored. ${result.conflictCount} later manual change${result.conflictCount === 1 ? " was" : "s were"} kept.`
      : "The latest undone AI session was restored.");
  }

  function changePreset(preset: Exclude<CanvasPreset, "custom">) {
    const next = setCanvasPreset(projectRef.current, preset);
    setCurrentProject(next);
    void renderProject(next, selectedIdsRef.current);
    void persist(next);
  }

  async function openExport(format: ExportFormat = "png") {
    const details = new Map<string, ExportAssetDetail>();
    await Promise.all(projectRef.current.objects.flatMap((object) => object.kind === "image"
      ? [loadAsset(object.assetId).then((asset) => { if (asset) details.set(asset.id, { width: asset.width, height: asset.height }); })]
      : []));
    setExportAssets(details);
    setExportFormat(format);
    setExportOpen(true);
  }

  function captureExportDataUrl(settings: ExportSettings, mimeType: "image/png" | "image/jpeg" | "image/webp"): string {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) throw new Error("The artboard is not ready to export.");
    const selected = [...selectedIdsRef.current];
    const primary = selectedId;
    const hidden: Array<{ node: Konva.Node; visible: boolean }> = [];
    const hide = (node: Konva.Node | null | undefined) => {
      if (!node) return;
      hidden.push({ node, visible: node.visible() });
      node.hide();
    };
    transformerRef.current?.nodes([]);
    layer.find(".canvas-guide").forEach(hide);
    layer.find(".snap-guide").forEach(hide);
    if (settings.transparent && ["image/png", "image/webp"].includes(mimeType)) {
      hide(artworkBackdropRef.current);
      hide(artworkCardRef.current);
      hide(artworkGroupRef.current?.findOne("#background"));
    }
    layer.draw();
    try {
      return stage.toDataURL({
        pixelRatio: settings.width / stage.width(),
        mimeType,
        quality: settings.quality,
      });
    } finally {
      for (const item of hidden) item.node.visible(item.visible);
      selectByIds(selected, primary);
      layer.draw();
    }
  }

  async function performExport(settings: ExportSettings) {
    const filename = safeFilename(projectRef.current.name);
    const anchor = document.createElement("a");
    if (["png", "jpeg", "webp"].includes(settings.format)) {
      const mimeType = `image/${settings.format}` as "image/png" | "image/jpeg" | "image/webp";
      anchor.download = `${filename}.${settings.format === "jpeg" ? "jpg" : settings.format}`;
      anchor.href = captureExportDataUrl(settings, mimeType);
      anchor.click();
    } else if (settings.format === "svg") {
      const dataUrl = captureExportDataUrl(settings, "image/png");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}"><title>${projectRef.current.name.replace(/[<>&]/g, "")}</title><image href="${dataUrl}" width="${settings.width}" height="${settings.height}"/></svg>`;
      anchor.download = `${filename}.svg`;
      anchor.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
    } else {
      const original = projectRef.current;
      const originalSelection = [...selectedIdsRef.current];
      const sourcePages = original.pages.map((page) => page.id === original.activePageId
        ? { ...page, canvas: original.canvas, objects: original.objects }
        : page);
      const pages = settings.allPages ? sourcePages : sourcePages.filter((page) => page.id === original.activePageId);
      const scale = settings.width / original.canvas.width;
      const pdfPages: PdfImagePage[] = [];
      try {
        for (const sourcePage of pages) {
          const pageProject: GlassWareProject = {
            ...original,
            canvas: sourcePage.canvas,
            objects: sourcePage.objects,
            activePageId: sourcePage.id,
            currentRevisionId: sourcePage.currentRevisionId,
          };
          await renderProject(pageProject, null);
          const pagePixelWidth = Math.max(1, Math.round(sourcePage.canvas.width * scale));
          const pagePixelHeight = Math.max(1, Math.round(sourcePage.canvas.height * scale));
          const dataUrl = captureExportDataUrl({ ...settings, width: pagePixelWidth, height: pagePixelHeight, transparent: false, quality: Math.max(0.92, settings.quality) }, "image/jpeg");
          const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
          const pageWidth = pagePixelWidth / settings.dpi * 72;
          const pageHeight = pagePixelHeight / settings.dpi * 72;
          pdfPages.push({ jpeg: bytes, pixelWidth: pagePixelWidth, pixelHeight: pagePixelHeight, widthPoints: pageWidth, heightPoints: pageHeight });
        }
      } finally {
        await renderProject(original, originalSelection);
      }
      const savedPdf = buildImagePdf(pdfPages, original.name);
      const blob = new Blob([Uint8Array.from(savedPdf).buffer], { type: "application/pdf" });
      anchor.download = `${filename}.pdf`;
      anchor.href = URL.createObjectURL(blob);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
    }
    setMessage(settings.format === "pdf" && settings.allPages
      ? `Exported ${projectRef.current.pages.length} pages to PDF.`
      : `Exported ${settings.width} × ${settings.height} ${settings.format.toUpperCase()}.`);
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
      for (const component of imported.components) await saveComponent(component);
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

  function applyPageChange(next: GlassWareProject, selection: string[] = []) {
    setCurrentProject(next);
    selectedIdsRef.current = selection;
    setSelectedIds(selection);
    setSelectedId(selection.at(-1) ?? null);
    void renderProject(next, selection);
    void persist(next);
  }

  function switchPage(pageId: string) {
    applyPageChange(activatePage(projectRef.current, pageId));
  }

  function createPage(duplicate: boolean) {
    const next = addProjectPage(projectRef.current, duplicate);
    applyPageChange(next, duplicate ? next.objects.map((object) => object.id) : []);
  }

  function removePage(pageId: string) {
    const page = projectRef.current.pages.find((item) => item.id === pageId);
    if (!page || projectRef.current.pages.length <= 1 || !window.confirm(`Delete “${page.name}” and its layers from this project?`)) return;
    applyPageChange(deleteProjectPage(projectRef.current, pageId));
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const next = reorderProjectPage(projectRef.current, pageId, direction);
    setCurrentProject(next);
    void persist(next);
  }

  function renamePage(pageId: string, name: string) {
    const next = renameProjectPage(projectRef.current, pageId, name);
    setCurrentProject(next);
    void persist(next);
  }

  function useTemplate(templateId: string) {
    const template = GLASSWARE_TEMPLATES.find((item) => item.id === templateId);
    if (!template || (projectRef.current.objects.length && !window.confirm(`Apply “${template.name}” to this page? The current page remains available through Undo.`))) return;
    const next = applyTemplate(projectRef.current, templateId);
    applyPageChange(next);
  }

  async function createBrandKit() {
    const colors = [...new Set([
      projectRef.current.canvas.background,
      ...projectRef.current.objects.flatMap((object) => object.kind === "image" ? [] : [object.fill]),
    ])].slice(0, 12);
    const fontFamilies = [...new Set(projectRef.current.objects.flatMap((object) => object.kind === "text" ? [object.fontFamily] : []))];
    const createdAt = new Date().toISOString();
    const kit: StoredBrandKit = { id: newId(), name: `Brand kit ${brandKits.length + 1}`, colors: colors.length ? colors : ["#111111", "#ffffff"], fontFamilies, createdAt, updatedAt: createdAt };
    await saveBrandKit(kit);
    setBrandKits((current) => [kit, ...current]);
  }

  async function updateBrandKit(kit: StoredBrandKit, patch: Partial<Pick<StoredBrandKit, "name" | "colors" | "fontFamilies">>) {
    const next = { ...kit, ...patch, updatedAt: new Date().toISOString() };
    await saveBrandKit(next);
    setBrandKits((current) => current.map((item) => item.id === kit.id ? next : item));
  }

  async function removeBrandKit(kitId: string) {
    await deleteBrandKit(kitId);
    setBrandKits((current) => current.filter((kit) => kit.id !== kitId));
  }

  function applyBrandColor(color: string) {
    const layer = layerRef.current;
    if (!layer) return;
    const ids = new Set(selectedIdsRef.current);
    if (!ids.size) {
      setBackground(color);
      return;
    }
    for (const id of ids) {
      const object = projectRef.current.objects.find((item) => item.id === id);
      const node = findDesignNode(layer, id);
      if (!object || object.kind === "image" || !node || object.locked) continue;
      applyDesignFill(node, color);
    }
    layer.batchDraw();
    commitCanvas("Brand color applied");
  }

  function applyBrandFont(fontFamily: string) {
    const layer = layerRef.current;
    if (!layer) return;
    for (const id of selectedIdsRef.current) {
      const node = findDesignNode(layer, id);
      if (node instanceof Konva.Text && !node.getAttr("designLocked")) node.fontFamily(fontFamily);
    }
    layer.batchDraw();
    commitCanvas("Brand typeface applied");
  }

  async function saveSelectionAsComponent() {
    const layer = layerRef.current;
    if (!layer || !selectedIdsRef.current.length) return;
    const selected = serializeLayer(layer).filter((object) => selectedIdsRef.current.includes(object.id));
    const component: StoredComponent = {
      id: newId(), projectId: projectRef.current.id,
      name: selected.length === 1 ? selected[0].name : `Component ${components.length + 1}`,
      objects: selected, createdAt: new Date().toISOString(),
    };
    await saveComponent(component);
    setComponents((current) => [component, ...current]);
    setMessage("Reusable component saved for this project.");
  }

  function insertComponent(component: StoredComponent) {
    const inserted = cloneComponentObjects(component.objects, 32);
    const next = commitSnapshot(projectRef.current, `Component inserted: ${component.name}`, {
      canvas: projectRef.current.canvas,
      objects: [...projectRef.current.objects, ...inserted],
    });
    applyPageChange(next, inserted.map((object) => object.id));
  }

  async function removeComponent(componentId: string) {
    await deleteComponent(componentId);
    setComponents((current) => current.filter((component) => component.id !== componentId));
  }

  async function refreshProjectGallery() {
    const projects = await listProjects();
    const sizes = new Map<string, number>();
    await Promise.all(projects.map(async (item) => {
      const assets = await listAssets(item.id);
      sizes.set(item.id, assets.reduce((total, asset) => total + asset.size, 0));
    }));
    setRecentProjects(projects);
    setProjectStorageBytes(sizes);
  }

  async function duplicateLocalProject(projectId: string) {
    const source = projectId === projectRef.current.id ? projectRef.current : await loadProject(projectId);
    if (!source) return;
    try {
      const duplicate = await readProjectBundle(JSON.stringify(await buildProjectBundle(source)));
      for (const asset of duplicate.assets) await saveAsset(asset);
      for (const font of duplicate.fonts) await saveFontAsset(font);
      for (const component of duplicate.components) await saveComponent(component);
      await saveProject(duplicate.project);
      await refreshProjectGallery();
      replaceProject(duplicate.project);
    } catch (error) {
      console.error(error);
      setMessage("The project could not be duplicated.");
    }
  }

  async function removeLocalProject(projectId: string) {
    const target = recentProjects.find((item) => item.id === projectId);
    if (!target || !window.confirm(`Delete “${target.name}” from this device? Its local images and AI conversations will also be removed. A cloud copy is not deleted.`)) return;
    await deleteProject(projectId);
    const remaining = (await listProjects()).filter((item) => item.id !== projectId);
    const next = remaining[0] ?? createProject("Untitled stitch", false);
    if (!remaining[0]) await saveProject(next);
    await refreshProjectGallery();
    if (projectId === projectRef.current.id) replaceProject(next);
    else setMessage("Local project removed. Any cloud copy remains available.");
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
                  className={`layer-row ${selectedIds.includes(object.id) ? "selected" : ""} ${draggedLayerId === object.id ? "dragging" : ""} ${dropClass}`}
                  draggable
                  key={object.id}
                  onDragStart={(event) => layerDragStart(event, object.id)}
                  onDragEnd={finishLayerDrag}
                  onDragOver={(event) => layerDragOver(event, object.id)}
                  onDrop={(event) => layerDrop(event, object.id)}
                >
                  <button className="layer-drag-handle" title={`Drag ${object.name} to reorder`} aria-label={`Drag ${object.name} to reorder`}><GripVertical size={15} /></button>
                  <button className="layer-icon-button" title={object.visible ? "Hide layer" : "Show layer"} aria-label={object.visible ? "Hide layer" : "Show layer"} onClick={() => toggleVisibility(object.id)}>{object.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button className="layer-main" title={`Select ${object.name}. Hold Shift to add to the selection.`} onClick={(event) => selectById(object.id, event.shiftKey || event.metaKey || event.ctrlKey)}>
                    <span className={`layer-thumbnail kind-${object.kind}`}>{object.kind === "text" ? <Type size={18} /> : object.kind === "image" ? <ImagePlus size={17} /> : <Shapes size={17} />}</span>
                    <span><strong>{object.name}</strong><small>{object.kind}{object.groupId ? " · grouped" : ""}</small></span>
                  </button>
                  <button className="layer-icon-button" title={object.locked ? "Unlock layer" : "Lock layer"} aria-label={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => toggleLock(object.id)}>{object.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                </div>
              );
            })}
          </div>
          {!project.objects.length && <p className="empty-note">This artboard is empty. Add text, a shape, or an image to begin.</p>}
          <div className="layer-toolbar" aria-label="Layer actions">
            <div className="layer-toolbar-row">
              <button title="Add text layer" aria-label="Add text layer" onClick={() => void addText("body")}><Plus size={16} /></button>
              <button title="Duplicate selected layers" aria-label="Duplicate selected layers" disabled={!selectedIds.length} onClick={duplicateSelected}><Copy size={15} /></button>
              <button title="Raise selected layer" aria-label="Raise selected layer" disabled={selectedIds.length !== 1 || !selectedObject} onClick={() => selectedObject && reorder(selectedObject.id, "up")}><ChevronUp size={16} /></button>
              <button title="Lower selected layer" aria-label="Lower selected layer" disabled={selectedIds.length !== 1 || !selectedObject} onClick={() => selectedObject && reorder(selectedObject.id, "down")}><ChevronDown size={16} /></button>
              <span />
              <button className="danger" title="Delete selected layers" aria-label="Delete selected layers" disabled={!selectedIds.length} onClick={deleteSelected}><Trash2 size={16} /></button>
            </div>
            <div className="layer-toolbar-row layer-toolbar-layout" aria-label="Selection grouping and alignment">
              <button title="Group selected layers" aria-label="Group selected layers" disabled={selectedIds.length < 2} onClick={groupSelection}><Group size={15} /></button>
              <button title="Ungroup selected layers" aria-label="Ungroup selected layers" disabled={!selectedObjects.some((object) => object.groupId)} onClick={ungroupSelection}><Ungroup size={15} /></button>
              <button title="Align left" aria-label="Align left" disabled={!selectedIds.length} onClick={() => alignSelection("left")}><AlignHorizontalJustifyStart size={15} /></button>
              <button title="Align horizontal center" aria-label="Align horizontal center" disabled={!selectedIds.length} onClick={() => alignSelection("center")}><AlignCenterHorizontal size={15} /></button>
              <button title="Align right" aria-label="Align right" disabled={!selectedIds.length} onClick={() => alignSelection("right")}><AlignHorizontalJustifyEnd size={15} /></button>
              <button title="Align top" aria-label="Align top" disabled={!selectedIds.length} onClick={() => alignSelection("top")}><AlignVerticalJustifyStart size={15} /></button>
              <button title="Align vertical center" aria-label="Align vertical center" disabled={!selectedIds.length} onClick={() => alignSelection("middle")}><AlignCenterVertical size={15} /></button>
              <button title="Align bottom" aria-label="Align bottom" disabled={!selectedIds.length} onClick={() => alignSelection("bottom")}><AlignVerticalJustifyEnd size={15} /></button>
              <button title="Distribute horizontally" aria-label="Distribute horizontally" disabled={selectedIds.length < 3} onClick={() => distributeSelection("horizontal")}><AlignHorizontalSpaceBetween size={15} /></button>
              <button title="Distribute vertically" aria-label="Distribute vertically" disabled={selectedIds.length < 3} onClick={() => distributeSelection("vertical")}><AlignVerticalSpaceBetween size={15} /></button>
            </div>
            <label className="layer-align-reference"><span>Align to</span><select value={alignmentReference} onChange={(event) => setAlignmentReference(event.target.value as AlignmentReference)}><option value="selection">Selection</option><option value="canvas">Artboard</option></select></label>
            <div className="layer-toolbar-row layer-toolbar-global" aria-label="All layer controls">
              <button type="button" title="Hide all layers" aria-label="Hide all layers" disabled={!project.objects.some((object) => object.visible)} onClick={() => setAllLayerVisibility(false)}><EyeOff size={15} /></button>
              <button type="button" title="Show all layers" aria-label="Show all layers" disabled={!project.objects.some((object) => !object.visible)} onClick={() => setAllLayerVisibility(true)}><Eye size={15} /></button>
              <button type="button" title="Lock all layers against canvas and AI edits" aria-label="Lock all layers" disabled={!project.objects.some((object) => !object.locked)} onClick={() => setAllLayerLock(true)}><Lock size={14} /></button>
              <button type="button" title="Unlock all layers" aria-label="Unlock all layers" disabled={!project.objects.some((object) => object.locked)} onClick={() => setAllLayerLock(false)}><Unlock size={14} /></button>
            </div>
          </div>
        </div>
      );
    }
    if (activeTool === "Library") {
      return (
        <>
          <div className="panel-heading"><p>REUSABLE DESIGN SYSTEM</p><h1>Library</h1></div>
          <div className="library-tabs" role="tablist" aria-label="Design library sections">
            <button role="tab" aria-selected={libraryTab === "templates"} className={libraryTab === "templates" ? "active" : ""} onClick={() => setLibraryTab("templates")}>Templates</button>
            <button role="tab" aria-selected={libraryTab === "brand"} className={libraryTab === "brand" ? "active" : ""} onClick={() => setLibraryTab("brand")}>Brand</button>
            <button role="tab" aria-selected={libraryTab === "components"} className={libraryTab === "components" ? "active" : ""} onClick={() => setLibraryTab("components")}>Components</button>
          </div>
          {libraryTab === "templates" && (
            <div className="template-library">
              {GLASSWARE_TEMPLATES.map((template) => (
                <article key={template.id}>
                  <button className="template-preview" onClick={() => useTemplate(template.id)} title={`Apply ${template.name} to this page`} style={{ background: `linear-gradient(135deg, ${template.colors[0]} 0 48%, ${template.colors[1]} 48% 72%, ${template.colors[2]} 72%)` }}><span>Use template</span></button>
                  <strong>{template.name}</strong><small>{template.category} · {template.canvas.width} × {template.canvas.height}</small><p>{template.description}</p>
                </article>
              ))}
              <p className="library-note">Bundled GlassWare templates contain only editable text and vector shapes. No stock artwork or restrictive template license is involved.</p>
            </div>
          )}
          {libraryTab === "brand" && (
            <div className="brand-library">
              <button className="library-primary" onClick={() => void createBrandKit()}><Plus size={15} /> New kit from this page</button>
              {brandKits.map((kit) => (
                <article className="brand-kit-card" key={kit.id}>
                  <header><input aria-label="Brand kit name" value={kit.name} onChange={(event) => void updateBrandKit(kit, { name: event.target.value.slice(0, 80) })} /><button title={`Delete ${kit.name}`} aria-label={`Delete ${kit.name}`} onClick={() => void removeBrandKit(kit.id)}><Trash2 size={14} /></button></header>
                  <div className="brand-colors" aria-label={`${kit.name} colors`}>
                    {kit.colors.map((color, index) => <button key={`${color}-${index}`} style={{ background: color }} title={`Apply ${color}. Right-click to remove.`} aria-label={`Apply brand color ${color}`} onClick={() => applyBrandColor(color)} onContextMenu={(event) => { event.preventDefault(); void updateBrandKit(kit, { colors: kit.colors.filter((_, itemIndex) => itemIndex !== index) }); }} />)}
                    {kit.colors.length < 12 && <label title="Add brand color"><Plus size={13} /><input aria-label="Add brand color" type="color" onChange={(event) => void updateBrandKit(kit, { colors: [...new Set([...kit.colors, event.target.value])].slice(0, 12) })} /></label>}
                  </div>
                  <div className="brand-fonts">
                    {kit.fontFamilies.map((family) => <button key={family} onClick={() => applyBrandFont(family)} title={`Apply ${family} to selected text`}><strong style={{ fontFamily: family }}>{family}</strong><span onClick={(event) => { event.stopPropagation(); void updateBrandKit(kit, { fontFamilies: kit.fontFamilies.filter((item) => item !== family) }); }}>×</span></button>)}
                    <select aria-label={`Add typeface to ${kit.name}`} value="" onChange={(event) => event.target.value && void updateBrandKit(kit, { fontFamilies: [...new Set([...kit.fontFamilies, event.target.value])] })}><option value="">+ Add typeface</option>{[...new Set([...SYSTEM_FONTS, ...fontAssets.map((font) => font.family)])].map((family) => <option value={family} key={family}>{family}</option>)}</select>
                  </div>
                  <p>Choose a color to apply it to selected text or shapes—or to the artboard when nothing is selected. Right-click a swatch to remove it.</p>
                </article>
              ))}
              {!brandKits.length && <p className="empty-note">Create a kit from the colors and typefaces already used on this page.</p>}
            </div>
          )}
          {libraryTab === "components" && (
            <div className="component-library">
              <button className="library-primary" disabled={!selectedIds.length} onClick={() => void saveSelectionAsComponent()}><Save size={15} /> Save selected layers</button>
              {components.map((component) => (
                <article key={component.id}><button className="component-insert" onClick={() => insertComponent(component)}><Group size={18} /><span><strong>{component.name}</strong><small>{component.objects.length} editable layer{component.objects.length === 1 ? "" : "s"}</small></span></button><button title={`Delete ${component.name}`} aria-label={`Delete ${component.name}`} onClick={() => void removeComponent(component.id)}><Trash2 size={14} /></button></article>
              ))}
              {!components.length && <p className="empty-note">Select one or more layers, then save them as a reusable project component.</p>}
              <p className="library-note">Components stay linked to this project. They are included in portable copies and project cloud sync with their referenced image assets.</p>
            </div>
          )}
        </>
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
          <section className="project-pages" aria-label="Project pages">
            <header><span>Pages</span><div><button title="Add blank page" aria-label="Add blank page" onClick={() => createPage(false)}><Plus size={14} /></button><button title="Duplicate active page" aria-label="Duplicate active page" onClick={() => createPage(true)}><Copy size={14} /></button></div></header>
            {project.pages.map((page, index) => (
              <div className={`project-page-row ${page.id === project.activePageId ? "active" : ""}`} key={page.id}>
                <button className="project-page-open" onClick={() => switchPage(page.id)} title={`Open ${page.name}`}><span>{String(index + 1).padStart(2, "0")}</span></button>
                <input aria-label={`Name page ${index + 1}`} value={page.name} onChange={(event) => renamePage(page.id, event.target.value)} />
                <button title="Move page up" aria-label={`Move ${page.name} up`} disabled={index === 0} onClick={() => movePage(page.id, -1)}><ChevronUp size={14} /></button>
                <button title="Move page down" aria-label={`Move ${page.name} down`} disabled={index === project.pages.length - 1} onClick={() => movePage(page.id, 1)}><ChevronDown size={14} /></button>
                <button className="danger" title="Delete page" aria-label={`Delete ${page.name}`} disabled={project.pages.length === 1} onClick={() => removePage(page.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </section>
          {accountConnections.snapshot.account?.mode === "authenticated" && accountConnections.snapshot.billing.cloudAccess !== "none" && (
            <section className="cloud-projects" aria-label="Cloud projects">
              <header><span><Cloud size={15} /> Cloud projects</span><small>{cloudProjects.length} synced</small></header>
              {accountConnections.snapshot.billing.cloudAccess === "download_only"
                ? <p>Cloud projects are download-only until billing is restored.</p>
                : !accountConnections.snapshot.syncEnabled && <p>Turn on Project sync in Account to upload local changes. Existing cloud projects remain available.</p>}
              {cloudProjects.map((item) => {
                const local = item.id === project.id ? project : recentProjects.find((entry) => entry.id === item.id);
                const cloudNewer = !local || item.updatedAt > local.updatedAt;
                return (
                  <div className="cloud-project-row" key={item.id}>
                    <button className="cloud-project-open" onClick={() => void restoreCloudProject(item.id)} title={`Open ${item.name} from cloud`}>
                      {item.thumbnailDataUrl
                        ? <img src={item.thumbnailDataUrl} alt="" />
                        : <span className="cloud-project-placeholder"><Cloud size={18} /></span>}
                      <span><strong>{item.name}</strong><small>{cloudNewer ? "Cloud copy available" : "Up to date"} · {Math.max(1, Math.round(item.size / 1024))} KB</small></span>
                    </button>
                    <button className="cloud-project-delete" onClick={() => void removeCloudProject(item.id)} title={`Remove cloud copy of ${item.name}`} aria-label={`Remove cloud copy of ${item.name}`}><Trash2 size={14} /></button>
                  </div>
                );
              })}
              {!cloudProjects.length && <p>No cloud projects yet. Enable Project sync, then press Save.</p>}
            </section>
          )}
          {recentProjects.length > 0 && (
            <section className="local-projects" aria-label="Projects on this device">
              <header><span>On this device</span><small>{formatBytes([...projectStorageBytes.values()].reduce((total, size) => total + size, 0))} in original images</small></header>
              {recentProjects.map((item) => (
                <div className={`local-project-row ${item.id === project.id ? "active" : ""}`} key={item.id}>
                  <button className="local-project-open" onClick={() => void switchProject(item.id)} title={`Open ${item.name}`}>
                    <span><strong>{item.name}</strong><small>{item.canvas.width} × {item.canvas.height} · {item.objects.length} layers · {formatBytes(projectStorageBytes.get(item.id) ?? 0)}</small></span>
                  </button>
                  <button title={`Duplicate ${item.name}`} aria-label={`Duplicate ${item.name}`} onClick={() => void duplicateLocalProject(item.id)}><Copy size={14} /></button>
                  <button className="danger" title={`Delete ${item.name} from this device`} aria-label={`Delete ${item.name} from this device`} disabled={recentProjects.length === 1} onClick={() => void removeLocalProject(item.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </section>
          )}
        </>
      );
    }
    if (activeTool === "Account") {
      return <AccountPanel model={accountConnections} cloudProjectCount={cloudProjects.length} openSignIn={() => setSignInOpen(true)} />;
    }
    if (activeTool === "Images") {
      return <ImagePanel upload={() => fileInput.current?.click()} addOpenImage={addOpenverseImage} />;
    }
    if (activeTool === "Studio") {
      return (
        <Suspense fallback={<div className="panel-section hint-card"><strong>Opening Studio…</strong><p>Loading presentation controls.</p></div>}>
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
        </Suspense>
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
          <div className="panel-heading"><p>ELEMENT LIBRARY</p><h1>Shapes &amp; markup</h1></div>
          <div className="section-label"><span>Markup &amp; privacy</span><small>Above the content</small></div>
          <div className="annotation-library">
            {ANNOTATION_OPTIONS.map((option) => (
              <button key={option.kind} onClick={() => void addShape(option.kind, "annotation")} aria-label={`Add ${option.label}`}>
                <ShapeIcon shape={option.kind} />
                <span><strong>{option.label}</strong><small>{option.note}</small></span>
              </button>
            ))}
          </div>
          <div className="panel-section">
            <div className="section-label"><span>Basic shapes</span><small>Fully editable</small></div>
          <div className="shape-library">
            {SHAPE_OPTIONS.map((option) => (
              <button key={option.kind} onClick={() => void addShape(option.kind)} aria-label={`Add ${option.label}`}>
                <ShapeIcon shape={option.kind} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          </div>
          <div className="panel-section hint-card"><strong>Blur versus redact</strong><p>Select a layer first and Blur region or Secure redact will land over it. Blur samples every visible layer underneath. Secure redact is deliberately opaque black so covered pixels cannot be recovered from the exported image.</p></div>
        </>
      );
    }
    return (
      <>
        <div className="panel-heading"><p>SELECT &amp; LAYOUT</p><h1>Canvas</h1></div>
        <div className="selection-summary">
          <BoxSelect size={18} />
          <span><strong>{selectedIds.length ? `${selectedIds.length} layer${selectedIds.length === 1 ? "" : "s"} selected` : "Marquee selection"}</strong><small>Drag empty canvas to select. Hold Shift to add layers.</small></span>
        </div>
        <div className="panel-section">
          <div className="section-label"><span>Canvas size</span><small>{project.canvas.width} × {project.canvas.height}</small></div>
          <div className="preset-grid">
            {(["square", "portrait", "story", "landscape"] as const).map((preset) => (
              <button className={project.canvas.preset === preset ? "active" : ""} key={preset} onClick={() => changePreset(preset)}>{preset}</button>
            ))}
          </div>
        </div>
        <div className="panel-section"><ColorPicker label="Artboard color" value={project.canvas.background} onPreview={previewBackground} onCommit={setBackground} /></div>
        <div className="panel-section guide-settings">
          <div className="section-label"><span><Ruler size={14} /> Guides &amp; snapping</span><small>{project.canvas.guides.length} guides</small></div>
          <div className="guide-toggle-row">
            <label className="switch-row"><input type="checkbox" checked={project.canvas.showRulers} onChange={(event) => updateCanvasWorkspace({ showRulers: event.target.checked }, event.target.checked ? "Rulers shown" : "Rulers hidden")} /><span>Show rulers</span></label>
            <label className="switch-row"><input type="checkbox" checked={project.canvas.snapping.enabled} onChange={(event) => updateCanvasWorkspace({ snapping: { ...project.canvas.snapping, enabled: event.target.checked } }, event.target.checked ? "Snapping enabled" : "Snapping disabled")} /><span>Snap while moving</span></label>
          </div>
          <div className="guide-add-row">
            <button onClick={() => addCanvasGuide("x")} title="Add a vertical guide at the artboard center">+ Vertical</button>
            <button onClick={() => addCanvasGuide("y")} title="Add a horizontal guide at the artboard center">+ Horizontal</button>
          </div>
          {project.canvas.guides.map((guide) => (
            <label className="guide-row" key={guide.id}>
              <span>{guide.axis === "x" ? "V" : "H"}</span>
              <input type="number" defaultValue={Math.round(guide.position)} min="0" max={guide.axis === "x" ? project.canvas.width : project.canvas.height} onBlur={(event) => updateCanvasGuide(guide.id, Number(event.target.value))} aria-label={`${guide.axis === "x" ? "Vertical" : "Horizontal"} guide position`} />
              <small>px</small>
              <button onClick={() => removeCanvasGuide(guide.id)} title="Remove guide" aria-label="Remove guide"><Trash2 size={13} /></button>
            </label>
          ))}
        </div>
        <div className="panel-section hint-card"><strong>Keyboard friendly</strong><p>Paste images, nudge with arrow keys, duplicate with ⌘/Ctrl+D, and undo with ⌘/Ctrl+Z.</p></div>
      </>
    );
  }

  return (
    <main className={`workbench ${aiRunActive ? "ai-run-active" : ""}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setActiveTool("Files")} aria-label="Open GlassWare files">
          <img src="./glassware-mark.svg" alt="" /><span>GlassWare</span><small>CREATIVE WORKBENCH</small>
        </button>
        <label className="project-name">
          <span>Project</span>
          <input value={project.name} onChange={(event) => renameProject(event.target.value)} onBlur={() => { if (!projectRef.current.name.trim()) renameProject("Untitled stitch"); void persist(); }} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} />
        </label>
        <div className="top-actions">
          <button className="icon-button" aria-label="Undo" title="Undo (Ctrl/⌘+Z)" disabled={!canUndo(project)} onClick={undo}><Undo2 size={18} /></button>
          <button className="icon-button" aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)" disabled={!canRedo(project) && !findLatestRedoableAiRevision(project)} onClick={redo}><Redo2 size={18} /></button>
          <button className="save-button" title={accountConnections.snapshot.syncEnabled && accountConnections.snapshot.billing.cloudAccess === "read_write" ? "Save to cloud" : "Save on this device"} onClick={() => void persist(projectRef.current, true)} disabled={saveState === "saving" || cloudSaveState === "syncing"}><Save size={16} /> Save</button>
          <button className="ai-button" title="Ask GlassWare AI" onClick={() => setAiWidgetOpen(true)}><Sparkles size={17} /> Ask AI</button>
          <button className="account-button" title="Open account" onClick={() => accountConnections.snapshot.account ? setActiveTool("Account") : setSignInOpen(true)}><UserRound size={17} /> {accountConnections.snapshot.account?.displayName ?? "Sign in"}</button>
          <button className="export-button" onClick={() => void openExport("png")}><Download size={17} /> Export</button>
        </div>
      </header>

      <aside className="toolrail" aria-label="Creative tools">
        <Tool icon={<MousePointer2 />} label="Select" active={activeTool === "Select"} onClick={() => setActiveTool("Select")} />
        <Tool icon={<ImagePlus />} label="Images" active={activeTool === "Images"} onClick={() => setActiveTool("Images")} />
        <Tool icon={<Frame />} label="Studio" active={activeTool === "Studio"} onClick={() => setActiveTool("Studio")} />
        <Tool icon={<Type />} label="Text" active={activeTool === "Text"} onClick={() => setActiveTool("Text")} />
        <Tool icon={<Shapes />} label="Shapes" active={activeTool === "Shapes"} onClick={() => setActiveTool("Shapes")} />
        <Tool icon={<Layers3 />} label="Layers" active={activeTool === "Layers"} onClick={() => setActiveTool("Layers")} />
        <Tool icon={<LayoutTemplate />} label="Library" active={activeTool === "Library"} onClick={() => setActiveTool("Library")} />
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
        className={`canvas-stage ${isDraggingFile ? "drop-active" : ""} ${panMode || spacePanActive ? "pan-ready" : ""} ${isPanningCanvas ? "is-panning" : ""}`}
        aria-label="Design canvas"
        title="Scroll to zoom. Drag the workspace, middle-drag, or hold Space to pan."
        onPointerDownCapture={beginCanvasPan}
        onPointerMove={moveCanvasPan}
        onPointerUp={endCanvasPan}
        onPointerCancel={endCanvasPan}
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
          <span>ARTBOARD {String(project.pages.findIndex((page) => page.id === project.activePageId) + 1).padStart(2, "0")} · {project.pages.find((page) => page.id === project.activePageId)?.name}</span>
          <div className="zoom-controls">
            <button className={panMode ? "active" : ""} aria-pressed={panMode} aria-label="Pan canvas" title="Pan canvas (or hold Space)" onClick={() => setPanMode((current) => !current)}><Hand size={13} /></button>
            <button aria-label="Zoom out" title="Zoom out" onClick={() => void changeZoom(-0.25)} disabled={zoom <= 0.5}><ZoomOut size={13} /></button>
            <button aria-label="Fit artboard" onClick={() => void changeZoom("fit")} title="Fit artboard">{Math.round(viewScale * 100)}%</button>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => void changeZoom(0.25)} disabled={zoom >= 3}><ZoomIn size={13} /></button>
          </div>
        </div>
        <div className={`paper-wrap ${project.canvas.showRulers ? "with-rulers" : ""}`}>
          {project.canvas.showRulers && (
            <>
              <span className="ruler-corner" aria-hidden="true" />
              <div className="canvas-ruler ruler-top" aria-label="Horizontal artboard ruler"><span>0</span><span>{Math.round(project.canvas.width / 2)}</span><span>{project.canvas.width}</span></div>
              <div className="canvas-ruler ruler-left" aria-label="Vertical artboard ruler"><span>0</span><span>{Math.round(project.canvas.height / 2)}</span><span>{project.canvas.height}</span></div>
            </>
          )}
          <div ref={canvasElement} className="design-canvas" />
        </div>
        <p className={`local-status status-${saveState}`}>
          <span /> {saveState === "saving"
            ? "Saving on this device…"
            : saveState === "error"
              ? "Device save failed"
              : cloudSaveState === "syncing"
                ? "Saved locally · Syncing artwork…"
                : cloudSaveState === "synced"
                  ? "Saved to cloud"
                  : cloudSaveState === "retrying"
                    ? "Saved locally · Cloud retry pending"
                    : cloudSaveState === "conflict"
                      ? "Cloud conflict preserved as a copy"
                      : "Saved on this device"} · Revision {project.revisions[currentRevisionIndex(project)]?.number ?? 1}
        </p>
        {isDraggingFile && <div className="drop-message"><ImagePlus size={30} />Drop image onto this artboard</div>}
        {message && <button className="toast" onClick={() => setMessage("")}>{message}<small>Click to dismiss</small></button>}
      </section>

      <aside className="inspector">
        <div className="panel-heading"><p>INSPECTOR</p><h2>{selectedIds.length > 1 ? `${selectedIds.length} layers` : selectedObject?.name ?? "Artboard"}</h2></div>
        {selectedIds.length > 1 ? (
          <>
            <div className="multi-selection-card"><Group size={20} /><span><strong>Multi-selection</strong><small>Move, align, distribute, group, duplicate, or delete these layers together.</small></span></div>
            <div className="multi-align-grid" aria-label="Align selected layers">
              <button title="Align left" onClick={() => alignSelection("left")}><AlignHorizontalJustifyStart size={16} /></button>
              <button title="Center horizontally" onClick={() => alignSelection("center")}><AlignCenterHorizontal size={16} /></button>
              <button title="Align right" onClick={() => alignSelection("right")}><AlignHorizontalJustifyEnd size={16} /></button>
              <button title="Align top" onClick={() => alignSelection("top")}><AlignVerticalJustifyStart size={16} /></button>
              <button title="Center vertically" onClick={() => alignSelection("middle")}><AlignCenterVertical size={16} /></button>
              <button title="Align bottom" onClick={() => alignSelection("bottom")}><AlignVerticalJustifyEnd size={16} /></button>
              <button title="Distribute horizontally" disabled={selectedIds.length < 3} onClick={() => distributeSelection("horizontal")}><AlignHorizontalSpaceBetween size={16} /></button>
              <button title="Distribute vertically" disabled={selectedIds.length < 3} onClick={() => distributeSelection("vertical")}><AlignVerticalSpaceBetween size={16} /></button>
            </div>
            <label className="inspector-field shape-select"><span>Align to</span><select value={alignmentReference} onChange={(event) => setAlignmentReference(event.target.value as AlignmentReference)}><option value="selection">Selection</option><option value="canvas">Artboard</option></select></label>
            <div className="property-grid action-grid">
              <button onClick={groupSelection}><Group size={15} /> Group</button>
              <button disabled={!selectedObjects.some((object) => object.groupId)} onClick={ungroupSelection}><Ungroup size={15} /> Ungroup</button>
              <button onClick={duplicateSelected}><Copy size={15} /> Duplicate</button>
            </div>
            <button className="delete-button" onClick={deleteSelected}><Trash2 size={15} /> Delete selected layers</button>
          </>
        ) : selectedObject ? (
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
            {selectedObject.kind !== "image" && !(selectedObject.kind === "shape" && (selectedObject.shape === "blur" || selectedObject.shape === "redact")) && (
              <ColorPicker label="Fill" value={selectedObject.fill} onPreview={previewFill} onCommit={setFill} compact />
            )}
            {selectedObject.kind === "shape" && selectedObject.shape === "blur" && (
              <div className="panel-section hint-card"><strong>Live blur region</strong><p>This editable layer resamples and softens every visible layer beneath it. Move or resize it to choose what becomes blurry.</p></div>
            )}
            {selectedObject.kind === "shape" && selectedObject.shape === "redact" && (
              <div className="panel-section hint-card"><strong>Secure opaque cover</strong><p>Redaction stays solid black by design so the covered pixels cannot be recovered from an exported image.</p></div>
            )}
            {selectedObject.kind === "shape" && (
              <label className="inspector-field shape-select"><span>Shape</span><select value={selectedObject.shape} onChange={(event) => changeShapeType(event.target.value as ShapeKind)}>{INSPECTOR_SHAPE_OPTIONS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select></label>
            )}
            {selectedObject.kind === "image" && (
              <>
                <button className="replace-image-button" onClick={() => replaceImageInput.current?.click()} title="Replace this image while keeping its layout and Studio styling"><Replace size={15} /><span><strong>Replace image</strong><small>Keep layout and presentation</small></span></button>
                <PhotoInspector
                  image={selectedObject}
                  applyPreset={applyPhotoPreset}
                  updateAdjustments={updateImageAdjustments}
                  applyCrop={applyCropAspect}
                  openCrop={() => setCropEditorOpen(true)}
                  openMask={() => setMaskEditorOpen(true)}
                  openRegionEdit={() => setRegionEditorOpen(true)}
                  rotate={rotateSelectedImage}
                  flip={flipSelectedImage}
                  reset={resetPhotoEdits}
                  source={selectedAssetSource}
                  precisionAvailable={Boolean(selectedAsset)}
                />
              </>
            )}
            <label className="inspector-field shape-select"><span>Blend mode <small>Combine with layers below</small></span><select value={selectedObject.blendMode ?? "source-over"} onChange={(event) => setBlendMode(event.target.value as (typeof BLEND_MODES)[number])}>{BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode === "source-over" ? "Normal" : mode.replaceAll("-", " ")}</option>)}</select></label>
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
              <button onClick={() => void openExport("png")}>PNG <small>lossless</small></button>
              <button onClick={() => void openExport("jpeg")}>JPG <small>compact</small></button>
              <button onClick={() => void openExport("webp")}>WebP <small>modern</small></button>
              <button onClick={() => void openExport("pdf")}>PDF <small>print</small></button>
            </div>
          </>
        )}
        <div className="privacy-stamp"><span>LOCAL BY DEFAULT</span><p>Projects and original image assets are stored in this browser's private database.</p></div>
      </aside>
      <footer className="product-footer">
        <a href={window.location.protocol === "chrome-extension:" ? "https://labs.wiplash.ai/glassware/" : "./index.html"} title="Back to the GlassWare landing page">GlassWare home</a>
        <a href="https://labs.wiplash.ai/" target="_blank" rel="noreferrer" title="Visit Wiplash Labs">Wiplash Labs</a>
        <a href="https://wiplash.ai/" target="_blank" rel="noreferrer" title="Visit Wiplash.ai">Produced by Wiplash.ai</a>
        <a href="./privacy.html" target="_blank" rel="noreferrer" title="Read the GlassWare privacy policy">Privacy</a>
      </footer>
      {aiRunActive && <div className="ai-run-editor-lock" aria-hidden="true"><span>Luna is editing · use Cancel in Ask AI to stop safely</span></div>}
      {aiWidgetOpen && (
        <Suspense fallback={null}>
          <AiConnectionsPanel
            projectId={project.id}
            projectName={project.name}
            model={accountConnections}
            openSettings={() => setAiSettingsOpen(true)}
            onRunAgent={runAiAgent}
            onUndoAi={undoAiEdits}
            onRedoAi={redoAiEdits}
            canUndoAi={Boolean(findLatestUndoableAiRevision(project))}
            canRedoAi={Boolean(findLatestRedoableAiRevision(project))}
            onClose={() => setAiWidgetOpen(false)}
          />
        </Suspense>
      )}
      <SignInModal model={accountConnections} open={signInOpen} onClose={() => setSignInOpen(false)} />
      {aiSettingsOpen && <Suspense fallback={null}><AiSettingsModal model={accountConnections} project={project} open onClose={() => setAiSettingsOpen(false)} openAccount={() => setSignInOpen(true)} /></Suspense>}
      {cropEditorOpen && selectedObject?.kind === "image" && selectedAsset && (
        <CropEditor
          asset={selectedAsset}
          crop={selectedObject.crop}
          onApply={applyPreciseCrop}
          onClose={() => setCropEditorOpen(false)}
        />
      )}
      {maskEditorOpen && selectedObject?.kind === "image" && selectedAsset && (
        <ImageMaskEditor
          asset={selectedAsset}
          crop={selectedObject.crop}
          image={selectedObject}
          onApply={applyImageMask}
          onClose={() => setMaskEditorOpen(false)}
        />
      )}
      {regionEditorOpen && selectedObject?.kind === "image" && selectedAsset && (
        <Suspense fallback={null}>
          <RegionEditModal
            asset={selectedAsset}
            crop={selectedObject.crop}
            image={selectedObject}
            connectionLabel={accountConnections.snapshot.connections.find((connection) => connection.status === "connected")?.label ?? null}
            onConnect={() => setAiSettingsOpen(true)}
            onRun={runRegionEdit}
            onClose={() => setRegionEditorOpen(false)}
          />
        </Suspense>
      )}
      {exportOpen && (
        <ExportModal
          project={project}
          assets={exportAssets}
          initialFormat={exportFormat}
          onExport={performExport}
          onClose={() => setExportOpen(false)}
        />
      )}
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

function useAssetUrl(asset: StoredAsset): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(asset.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);
  return url;
}

function ExportModal({
  project,
  assets,
  initialFormat,
  onExport,
  onClose,
}: {
  project: GlassWareProject;
  assets: ReadonlyMap<string, ExportAssetDetail>;
  initialFormat: ExportFormat;
  onExport: (settings: ExportSettings) => Promise<void>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [width, setWidth] = useState(project.canvas.width);
  const [quality, setQuality] = useState(0.92);
  const [transparent, setTransparent] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [allPages, setAllPages] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const height = Math.max(1, Math.round(width * project.canvas.height / project.canvas.width));
  const settings: ExportSettings = { format, width, height, quality, transparent, dpi, allPages: format === "pdf" && allPages };
  const warnings = assessExport(project, settings, assets);
  const supportsTransparency = ["png", "webp", "svg"].includes(format);

  async function submit() {
    setExporting(true);
    setError("");
    try {
      await onExport(settings);
      onClose();
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : "The export could not be created.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="modal-backdrop precision-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !exporting && onClose()}>
      <section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <header><span><Download size={18} /> Export artwork</span><button disabled={exporting} title="Close export settings" aria-label="Close export settings" onClick={onClose}>×</button></header>
        <div className="export-modal-copy"><p>OUTPUT SETTINGS</p><h2 id="export-title">Ready for screen or print</h2><span>GlassWare checks dimensions, clipping, image detail, and format limits before downloading.</span></div>
        <div className="export-format-tabs" role="tablist" aria-label="Export format">
          {(["png", "jpeg", "webp", "svg", "pdf"] as ExportFormat[]).map((value) => (
            <button role="tab" aria-selected={format === value} className={format === value ? "active" : ""} key={value} onClick={() => setFormat(value)}>{value === "jpeg" ? "JPG" : value.toUpperCase()}</button>
          ))}
        </div>
        <div className="export-modal-body">
          <section className="export-settings-card">
            <h3>Dimensions</h3>
            <div className="export-size-row">
              <label><span>Width</span><input aria-label="Export width" type="number" min="64" max="16384" value={width} onChange={(event) => setWidth(Math.min(16384, Math.max(64, Number(event.target.value) || 64)))} /><small>px</small></label>
              <span>×</span>
              <label><span>Height</span><input aria-label="Export height" value={height} readOnly /><small>px</small></label>
            </div>
            <div className="export-scale-buttons" aria-label="Export size presets">
              {[0.5, 1, 2, 4].map((scale) => <button className={width === Math.round(project.canvas.width * scale) ? "active" : ""} key={scale} onClick={() => setWidth(Math.round(project.canvas.width * scale))}>{scale}×</button>)}
            </div>
            {format === "pdf" && (
              <><label className="export-select"><span>Print density</span><select value={dpi} onChange={(event) => setDpi(Number(event.target.value))}><option value="72">72 DPI · screen</option><option value="150">150 DPI · proof</option><option value="300">300 DPI · print</option></select><small>{(width / dpi).toFixed(2)} × {(height / dpi).toFixed(2)} inches</small></label>{project.pages.length > 1 && <label className="export-checkbox"><input type="checkbox" checked={allPages} onChange={(event) => setAllPages(event.target.checked)} /><span><strong>Export every page</strong><small>Create one PDF with {project.pages.length} pages in project order</small></span></label>}</>
            )}
            {format !== "pdf" && format !== "svg" && (
              <label className="export-quality"><span>Quality <small>{Math.round(quality * 100)}%</small></span><input type="range" min="0.4" max="1" step="0.01" value={quality} onChange={(event) => setQuality(Number(event.target.value))} disabled={format === "png"} /></label>
            )}
            <label className="export-checkbox"><input type="checkbox" checked={transparent} disabled={!supportsTransparency} onChange={(event) => setTransparent(event.target.checked)} /><span><strong>Transparent background</strong><small>{supportsTransparency ? "Hide the artboard and Studio backdrop" : "Not available in this format"}</small></span></label>
          </section>
          <section className="export-qa-card" aria-live="polite">
            <header><span>Preflight</span><strong className={warnings.length ? "warning" : "ready"}>{warnings.length ? `${warnings.length} notice${warnings.length === 1 ? "" : "s"}` : "Ready"}</strong></header>
            {!warnings.length && <div className="export-ready"><span>✓</span><p><strong>No export issues found</strong><small>The output dimensions and visible layers passed the current checks.</small></p></div>}
            {warnings.map((warning, index) => <div className="export-warning" key={`${warning.code}-${index}`}><span>!</span><p><strong>{warning.code.replaceAll("-", " ")}</strong><small>{warning.message}</small></p></div>)}
          </section>
        </div>
        {error && <button className="export-error" onClick={() => setError("")}>{error}</button>}
        <footer><span>{format === "pdf" ? `${allPages ? project.pages.length : 1}-page PDF` : `${width.toLocaleString()} × ${height.toLocaleString()} px`} · {project.name}</span><button className="secondary" disabled={exporting} onClick={onClose}>Cancel</button><button disabled={exporting} onClick={() => void submit()}>{exporting ? <><LoaderCircle className="spin" size={14} /> Exporting…</> : <><Download size={14} /> Download {format === "jpeg" ? "JPG" : format.toUpperCase()}</>}</button></footer>
      </section>
    </div>
  );
}

function CropEditor({
  asset,
  crop,
  onApply,
  onClose,
}: {
  asset: StoredAsset;
  crop: NormalizedCrop;
  onApply: (crop: NormalizedCrop) => void;
  onClose: () => void;
}) {
  const imageUrl = useAssetUrl(asset);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    mode: "move" | "resize";
    handle?: CropHandle;
    startX: number;
    startY: number;
    origin: NormalizedCrop;
  } | null>(null);
  const [draft, setDraft] = useState({ ...crop });

  function beginDrag(event: ReactPointerEvent<HTMLElement>, mode: "move" | "resize", handle?: CropHandle) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, mode, handle, startX: event.clientX, startY: event.clientY, origin: draft };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return;
    const deltaX = (event.clientX - drag.startX) / bounds.width;
    const deltaY = (event.clientY - drag.startY) / bounds.height;
    setDraft(drag.mode === "move"
      ? moveCrop(drag.origin, deltaX, deltaY)
      : resizeCrop(drag.origin, drag.handle ?? "se", deltaX, deltaY));
  }

  return (
    <div className="modal-backdrop precision-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="precision-editor-modal" role="dialog" aria-modal="true" aria-labelledby="crop-editor-title">
        <header><span><Crop size={18} /> Precision crop</span><button title="Close crop editor" aria-label="Close crop editor" onClick={onClose}>×</button></header>
        <div className="precision-editor-copy"><h2 id="crop-editor-title">Choose exactly what stays visible</h2><p>Drag the crop or its corner handles. The original image remains untouched.</p></div>
        <div
          className="crop-editor-surface"
          ref={surfaceRef}
          style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
          onPointerMove={moveDrag}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
        >
          {imageUrl && <img src={imageUrl} alt="Crop preview" draggable={false} />}
          <div
            className="crop-selection"
            style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.width * 100}%`, height: `${draft.height * 100}%` }}
            onPointerDown={(event) => beginDrag(event, "move")}
          >
            {(["nw", "ne", "sw", "se"] as CropHandle[]).map((handle) => (
              <button key={handle} className={`crop-handle crop-handle-${handle}`} aria-label={`Resize crop from ${handle}`} onPointerDown={(event) => beginDrag(event, "resize", handle)} />
            ))}
          </div>
        </div>
        <footer><span>{Math.round(draft.width * asset.width)} × {Math.round(draft.height * asset.height)} source pixels</span><button className="secondary" onClick={onClose}>Cancel</button><button onClick={() => onApply(draft)}>Apply crop</button></footer>
      </section>
    </div>
  );
}

function ImageMaskEditor({
  asset,
  crop,
  image,
  onApply,
  onClose,
}: {
  asset: StoredAsset;
  crop: NormalizedCrop;
  image: ImageDesignNode;
  onApply: (mask: ImageMask) => void;
  onClose: () => void;
}) {
  const imageUrl = useAssetUrl(asset);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<{ pointerId: number; id: string } | null>(null);
  const [mode, setMode] = useState<"hide" | "reveal">("hide");
  const [size, setSize] = useState(0.08);
  const [draft, setDraft] = useState(() => cloneImageMask(image.mask));

  function point(event: ReactPointerEvent<HTMLDivElement>): [number, number] | null {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    ];
  }

  function beginStroke(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const nextPoint = point(event);
    if (!nextPoint) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = newId();
    strokeRef.current = { pointerId: event.pointerId, id };
    setDraft((current) => ({
      ...current,
      enabled: true,
      strokes: [...current.strokes, { id, mode, size, points: [...nextPoint, ...nextPoint] }],
    }));
  }

  function continueStroke(event: ReactPointerEvent<HTMLDivElement>) {
    const active = strokeRef.current;
    const nextPoint = point(event);
    if (!active || active.pointerId !== event.pointerId || !nextPoint) return;
    setDraft((current) => ({
      ...current,
      strokes: current.strokes.map((stroke) => stroke.id === active.id
        ? { ...stroke, points: [...stroke.points, ...nextPoint].slice(-4000) }
        : stroke),
    }));
  }

  const imageStyle = {
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${-crop.x / crop.width * 100}%`,
    top: `${-crop.y / crop.height * 100}%`,
  };

  return (
    <div className="modal-backdrop precision-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="precision-editor-modal mask-editor-modal" role="dialog" aria-modal="true" aria-labelledby="mask-editor-title">
        <header><span><Paintbrush size={18} /> Image mask</span><button title="Close mask editor" aria-label="Close mask editor" onClick={onClose}>×</button></header>
        <div className="precision-editor-copy"><h2 id="mask-editor-title">Hide distractions. Restore details.</h2><p>Brush edits are non-destructive and can be changed or cleared later.</p></div>
        <div className="mask-editor-toolbar">
          <div role="group" aria-label="Mask brush mode">
            <button className={mode === "hide" ? "active" : ""} aria-pressed={mode === "hide"} onClick={() => setMode("hide")} title="Hide pixels"><Eraser size={15} /> Hide</button>
            <button className={mode === "reveal" ? "active" : ""} aria-pressed={mode === "reveal"} onClick={() => setMode("reveal")} title="Restore hidden pixels"><Paintbrush size={15} /> Restore</button>
          </div>
          <label><span>Brush <small>{Math.round(size * 100)}%</small></span><input aria-label="Mask brush size" type="range" min="0.01" max="0.3" step="0.01" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
          <label><span>Feather <small>{Math.round(draft.feather)} px</small></span><input aria-label="Mask feather" type="range" min="0" max="100" step="1" value={draft.feather} onChange={(event) => setDraft((current) => ({ ...current, feather: Number(event.target.value) }))} /></label>
          <button className={draft.inverted ? "active" : ""} aria-pressed={draft.inverted} onClick={() => setDraft((current) => ({ ...current, inverted: !current.inverted }))} title="Invert which parts of the mask are visible">Invert</button>
        </div>
        <div
          className="mask-editor-surface"
          ref={surfaceRef}
          style={{ aspectRatio: `${Math.abs(image.width * image.scaleX)} / ${Math.abs(image.height * image.scaleY)}` }}
          onPointerDown={beginStroke}
          onPointerMove={continueStroke}
          onPointerUp={() => { strokeRef.current = null; }}
          onPointerCancel={() => { strokeRef.current = null; }}
        >
          {imageUrl && <img src={imageUrl} alt="Mask preview" draggable={false} style={imageStyle} />}
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            {draft.strokes.map((stroke) => {
              const points = stroke.points;
              const path = points.reduce((value, coordinate, index) => index % 2 === 0
                ? `${value}${index === 0 ? "M" : " L"}${coordinate * 1000}`
                : `${value} ${coordinate * 1000}`, "");
              return <path key={stroke.id} d={path} className={`mask-stroke ${stroke.mode}`} strokeWidth={stroke.size * 1000} />;
            })}
          </svg>
          {!draft.strokes.length && <span className="mask-empty-hint">Drag over the image to begin masking</span>}
        </div>
        <footer>
          <button className="secondary" disabled={!draft.strokes.length} onClick={() => setDraft((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}>Undo stroke</button>
          <button className="secondary" disabled={!draft.strokes.length} onClick={() => setDraft({ ...DEFAULT_IMAGE_MASK, strokes: [] })}>Clear mask</button>
          <span />
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button onClick={() => onApply({ ...draft, enabled: draft.strokes.length > 0 })}>Apply mask</button>
        </footer>
      </section>
    </div>
  );
}

function PhotoInspector({
  image,
  applyPreset,
  updateAdjustments,
  applyCrop,
  openCrop,
  openMask,
  openRegionEdit,
  rotate,
  flip,
  reset,
  source,
  precisionAvailable,
}: {
  image: ImageDesignNode;
  applyPreset: (preset: PhotoPreset) => void;
  updateAdjustments: (patch: Partial<ImageAdjustments>, summary: string, commit?: boolean) => void;
  applyCrop: (aspect: number | null, label: string) => void;
  openCrop: () => void;
  openMask: () => void;
  openRegionEdit: () => void;
  rotate: (direction: -1 | 1) => void;
  flip: (axis: "horizontal" | "vertical") => void;
  reset: () => void;
  source: AssetSource | null;
  precisionAvailable: boolean;
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
      <AdjustmentSlider label="Temperature" value={image.adjustments.temperature} min={-1} max={1} step={0.05} display={Math.round(image.adjustments.temperature * 100)} onChange={(value, commit) => updateAdjustments({ temperature: value }, "Temperature changed", commit)} />
      <AdjustmentSlider label="Tint" value={image.adjustments.tint} min={-1} max={1} step={0.05} display={Math.round(image.adjustments.tint * 100)} onChange={(value, commit) => updateAdjustments({ tint: value }, "Tint changed", commit)} />
      <AdjustmentSlider label="Sharpen" value={image.adjustments.sharpen} min={0} max={1} step={0.05} display={Math.round(image.adjustments.sharpen * 100)} onChange={(value, commit) => updateAdjustments({ sharpen: value }, "Sharpen changed", commit)} />
      <AdjustmentSlider label="Vignette" value={image.adjustments.vignette} min={0} max={1} step={0.05} display={Math.round(image.adjustments.vignette * 100)} onChange={(value, commit) => updateAdjustments({ vignette: value }, "Vignette changed", commit)} />
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
      <button className="precision-edit-button" disabled={!precisionAvailable} onClick={openCrop} title="Move and resize the crop area precisely"><Crop size={15} /> Edit crop</button>
      <div className="inspector-section-title"><span>Transform</span><small>Keep visual center</small></div>
      <div className="image-transform-buttons">
        <button title="Rotate 90 degrees counterclockwise" aria-label="Rotate image counterclockwise" onClick={() => rotate(-1)}><RotateCcw size={15} /></button>
        <button title="Rotate 90 degrees clockwise" aria-label="Rotate image clockwise" onClick={() => rotate(1)}><RotateCw size={15} /></button>
        <button title="Flip image horizontally" aria-label="Flip image horizontally" onClick={() => flip("horizontal")}><FlipHorizontal2 size={16} /></button>
        <button title="Flip image vertically" aria-label="Flip image vertically" onClick={() => flip("vertical")}><FlipVertical2 size={16} /></button>
      </div>
      <div className="inspector-section-title"><span>Mask</span><small>{image.mask.strokes.length ? `${image.mask.strokes.length} strokes` : "Non-destructive"}</small></div>
      <button className="precision-edit-button" disabled={!precisionAvailable} onClick={openMask} title="Hide or restore parts of this image with brushes"><Paintbrush size={15} /> Edit image mask</button>
      <div className="inspector-section-title"><span>Generative edit</span><small>Region-aware</small></div>
      <button className="precision-edit-button ai-region-button" disabled={!precisionAvailable} onClick={openRegionEdit} title="Paint a region and ask your connected AI to edit only those pixels"><Sparkles size={15} /> AI region edit</button>
      <button className="reset-edits" onClick={reset}><RotateCcw size={14} /> Reset photo edits</button>
      {source?.provider === "openverse" && (
        <div className="asset-source-receipt">
          <span>IMAGE SOURCE · {source.license}</span>
          <p>{source.attribution}</p>
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">Verify source <ExternalLink size={11} /></a>
        </div>
      )}
      {source?.provider === "glassware-ai-edit" && (
        <div className="asset-source-receipt ai-edit-receipt">
          <span>AI REGION EDIT · {source.model}</span>
          <p>Derived from asset {source.parentAssetId.slice(0, 8)} with {source.connectionKind === "openai_api" ? "OpenAI API" : "ChatGPT / Codex"}. The edit prompt is not stored in the asset receipt.</p>
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
