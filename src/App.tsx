import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Bot,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FolderOpen,
  ImagePlus,
  Layers3,
  Lock,
  MousePointer2,
  Redo2,
  Save,
  SendToBack,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import {
  CANVAS_PRESETS,
  canRedo,
  canUndo,
  commitSnapshot,
  createProject,
  currentRevisionIndex,
  newId,
  redoProject,
  setCanvasPreset,
  undoProject,
  type CanvasPreset,
  type DesignNode,
  type ImageStitchProject,
} from "./lib/model";
import {
  DESIGN_OBJECT_NAME,
  applyLockedState,
  designNodeToKonva,
  findDesignNode,
  serializeLayer,
} from "./lib/canvas";
import {
  bootstrapProject,
  consumeExtensionCapture,
  createStoredAsset,
  dataUrlToBlob,
  listProjects,
  loadAsset,
  loadProject,
  saveAsset,
  saveProject,
} from "./lib/storage";
import { buildProjectBundle, downloadTextFile, readProjectBundle, safeFilename } from "./lib/bundle";

const SWATCHES = ["#19352e", "#db5d3f", "#e8af45", "#6d8f77", "#5273a8", "#f8f0df"];
const MAX_STAGE_SIZE = 640;

type SaveState = "saving" | "saved" | "error";
type ToolName = "Select" | "Images" | "Text" | "Shapes" | "Layers" | "Files" | "AI";

function App() {
  const [project, setProject] = useState<ImageStitchProject | null>(null);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void bootstrapProject()
      .then((loaded) => !cancelled && setProject(loaded))
      .catch((error: unknown) => !cancelled && setBootError(error instanceof Error ? error.message : "Unable to open ImageStitch"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootError) {
    return <div className="boot-screen"><img src="./image-stitch-mark.svg" alt="" /><h1>ImageStitch could not open.</h1><p>{bootError}</p></div>;
  }
  if (!project) {
    return <div className="boot-screen"><img src="./image-stitch-mark.svg" alt="" /><h1>Opening your local workbench…</h1><p>Loading projects and image assets from this device.</p></div>;
  }
  return <Editor key={project.id} initialProject={project} replaceProject={setProject} />;
}

function Editor({
  initialProject,
  replaceProject,
}: {
  initialProject: ImageStitchProject;
  replaceProject: (project: ImageStitchProject) => void;
}) {
  const canvasElement = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNodeRef = useRef<Konva.Node | null>(null);
  const projectRef = useRef(initialProject);
  const renderVersionRef = useRef(0);
  const saveVersionRef = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(initialProject.objects[0]?.id ?? null);
  const [activeTool, setActiveTool] = useState<ToolName>("Select");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [recentProjects, setRecentProjects] = useState<ImageStitchProject[]>([]);
  const selectedObject = project.objects.find((object) => object.id === selectedId) ?? null;
  const viewScale = Math.min(MAX_STAGE_SIZE / project.canvas.width, MAX_STAGE_SIZE / project.canvas.height);
  const stageWidth = Math.round(project.canvas.width * viewScale);
  const stageHeight = Math.round(project.canvas.height * viewScale);

  function setCurrentProject(next: ImageStitchProject) {
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

  function displayDimensions(next: ImageStitchProject) {
    const scale = Math.min(MAX_STAGE_SIZE / next.canvas.width, MAX_STAGE_SIZE / next.canvas.height);
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

  async function renderProject(next: ImageStitchProject, selectAfter: string | null = null) {
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer) return;
    const renderVersion = ++renderVersionRef.current;
    const dimensions = displayDimensions(next);
    stage.size({ width: dimensions.width, height: dimensions.height });
    layer.destroyChildren();
    layer.scale({ x: dimensions.scale, y: dimensions.scale });
    layer.add(
      new Konva.Rect({
        id: "background",
        width: next.canvas.width,
        height: next.canvas.height,
        fill: next.canvas.background,
        listening: false,
      }),
    );
    for (const object of next.objects) {
      const node = await designNodeToKonva(object, loadAsset);
      if (renderVersion !== renderVersionRef.current) return;
      layer.add(node);
    }
    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      borderStroke: "#db5d3f",
      borderStrokeWidth: 2 / dimensions.scale,
      anchorFill: "#fffdf8",
      anchorStroke: "#19352e",
      anchorStrokeWidth: 2 / dimensions.scale,
      anchorSize: 12 / dimensions.scale,
      padding: 4 / dimensions.scale,
    });
    transformerRef.current = transformer;
    layer.add(transformer);
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
    void persist(next);
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
    stage.on("dragend transformend", (event) => {
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
      stage.destroy();
      stageRef.current = null;
      layerRef.current = null;
      transformerRef.current = null;
    };
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

  async function addImageBlob(file: Blob & { name?: string }) {
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file to add to the canvas.");
      return;
    }
    try {
      const asset = await createStoredAsset(projectRef.current.id, file);
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
      const node = await designNodeToKonva(design, loadAsset);
      layerRef.current?.add(node);
      transformerRef.current?.moveToTop();
      selectById(design.id);
      commitCanvas("Image added");
      setActiveTool("Images");
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("That image could not be added. Try PNG, JPEG, or WebP.");
    }
  }

  function handleUpload(file?: File) {
    if (file) void addImageBlob(file);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function addText() {
    const design: DesignNode = {
      id: newId(),
      kind: "text",
      name: "Text",
      text: "Type something wonderful",
      x: projectRef.current.canvas.width * 0.16,
      y: projectRef.current.canvas.height * 0.72,
      width: projectRef.current.canvas.width * 0.68,
      height: 140,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#19352e",
      fontFamily: "Georgia",
      fontSize: 68,
      fontStyle: "bold",
      align: "left",
      lineHeight: 1.05,
    };
    layerRef.current?.add(await designNodeToKonva(design, loadAsset));
    transformerRef.current?.moveToTop();
    selectById(design.id);
    commitCanvas("Text added");
    setActiveTool("Text");
  }

  async function addShape() {
    const design: DesignNode = {
      id: newId(),
      kind: "shape",
      name: "Shape",
      shape: "rect",
      x: projectRef.current.canvas.width * 0.28,
      y: projectRef.current.canvas.height * 0.28,
      width: projectRef.current.canvas.width * 0.44,
      height: projectRef.current.canvas.height * 0.25,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#e8af45",
      cornerRadius: 28,
    };
    layerRef.current?.add(await designNodeToKonva(design, loadAsset));
    transformerRef.current?.moveToTop();
    selectById(design.id);
    commitCanvas("Shape added");
    setActiveTool("Shapes");
  }

  function updateSelectedLive(attributes: Record<string, unknown>) {
    const node = selectedNodeRef.current;
    if (!node) return;
    node.setAttrs(attributes);
    layerRef.current?.batchDraw();
  }

  function setFill(color: string) {
    if (!selectedNodeRef.current || selectedObject?.kind === "image") return;
    updateSelectedLive({ fill: color });
    commitCanvas("Color changed");
  }

  function setBackground(color: string) {
    const layer = layerRef.current;
    if (!layer) return;
    layer.findOne("#background")?.setAttr("fill", color);
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
    void renderProject(next);
    void persist(next);
  }

  function redo() {
    if (!canRedo(projectRef.current)) return;
    const next = redoProject(projectRef.current);
    setCurrentProject(next);
    void renderProject(next);
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
      downloadTextFile(JSON.stringify(bundle, null, 2), `${safeFilename(projectRef.current.name)}.imagestitch.json`);
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
        <>
          <div className="panel-heading"><p>DOCUMENT STACK</p><h1>Layers</h1></div>
          <div className="layer-list">
            {[...project.objects].reverse().map((object) => (
              <div className={`layer-row ${selectedId === object.id ? "selected" : ""}`} key={object.id}>
                <button className="layer-main" onClick={() => selectById(object.id)}>
                  <span className={`layer-kind kind-${object.kind}`}>{object.kind === "text" ? "T" : object.kind === "image" ? "IMG" : "SH"}</span>
                  <span><strong>{object.name}</strong><small>{object.kind}</small></span>
                </button>
                <button aria-label={object.visible ? "Hide layer" : "Show layer"} onClick={() => toggleVisibility(object.id)}>{object.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button aria-label={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => toggleLock(object.id)}>{object.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                <button aria-label="Move layer forward" onClick={() => reorder(object.id, "up")}><ChevronUp size={14} /></button>
                <button aria-label="Move layer backward" onClick={() => reorder(object.id, "down")}><ChevronDown size={14} /></button>
              </div>
            ))}
          </div>
          {!project.objects.length && <p className="empty-note">This artboard is empty. Add text, a shape, or an image to begin.</p>}
        </>
      );
    }
    if (activeTool === "Files") {
      return (
        <>
          <div className="panel-heading"><p>LOCAL PROJECTS</p><h1>Files</h1></div>
          <div className="file-actions">
            <button onClick={() => void createNewProject()}><FilePlus2 size={18} /><span><strong>New project</strong><small>Start with an empty artboard</small></span></button>
            <button onClick={() => projectInput.current?.click()}><FolderOpen size={18} /><span><strong>Open a project</strong><small>Import an .imagestitch.json file</small></span></button>
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
      return (
        <>
          <div className="panel-heading"><p>REVIEWABLE ASSISTANT</p><h1>Ask AI</h1></div>
          <div className="ai-placeholder">
            <Sparkles size={26} />
            <h3>Your canvas stays in charge.</h3>
            <p>The assistant connection comes next. It will use credentials you provide and return an edit plan you can inspect before anything changes.</p>
            <button disabled>Connect an AI provider</button>
          </div>
          <div className="panel-section ai-note"><Bot size={20} /><div><strong>No bundled AI surcharge</strong><p>ImageStitch will keep provider authentication separate from the local project file.</p></div></div>
        </>
      );
    }
    return (
      <>
        <div className="panel-heading"><p>START WITH</p><h1>{activeTool}</h1></div>
        <button className="upload-card" onClick={() => fileInput.current?.click()}>
          <ImagePlus size={26} /><span>Bring in an image</span><small>Upload, paste, drop, or capture a page</small>
        </button>
        <div className="panel-section">
          <div className="section-label"><span>Canvas size</span><small>{project.canvas.width} × {project.canvas.height}</small></div>
          <div className="preset-grid">
            {(["square", "portrait", "story", "landscape"] as const).map((preset) => (
              <button className={project.canvas.preset === preset ? "active" : ""} key={preset} onClick={() => changePreset(preset)}>{preset}</button>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <div className="section-label"><span>Artboard color</span><small>{project.canvas.background}</small></div>
          <div className="swatches">
            {SWATCHES.map((color) => <button key={color} aria-label={`Use ${color} for the artboard`} style={{ background: color }} onClick={() => setBackground(color)} />)}
          </div>
        </div>
        <div className="panel-section hint-card"><strong>Keyboard friendly</strong><p>Paste images, nudge with arrow keys, duplicate with ⌘/Ctrl+D, and undo with ⌘/Ctrl+Z.</p></div>
      </>
    );
  }

  return (
    <main className="workbench">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveTool("Files")} aria-label="Open ImageStitch files">
          <img src="./image-stitch-mark.svg" alt="" /><span>ImageStitch</span><small>LOCAL WORKBENCH</small>
        </button>
        <label className="project-name">
          <span>Project</span>
          <input value={project.name} onChange={(event) => renameProject(event.target.value)} onBlur={() => { if (!projectRef.current.name.trim()) renameProject("Untitled stitch"); void persist(); }} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} />
        </label>
        <div className="top-actions">
          <button className="icon-button" aria-label="Undo" title="Undo (Ctrl/⌘+Z)" disabled={!canUndo(project)} onClick={undo}><Undo2 size={18} /></button>
          <button className="icon-button" aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)" disabled={!canRedo(project)} onClick={redo}><Redo2 size={18} /></button>
          <button className="ai-button" onClick={() => setActiveTool("AI")}><Sparkles size={17} /> Ask AI</button>
          <button className="export-button" onClick={() => exportImage("image/png")}><Download size={17} /> Export PNG</button>
        </div>
      </header>

      <aside className="toolrail" aria-label="Creative tools">
        <Tool icon={<MousePointer2 />} label="Select" active={activeTool === "Select"} onClick={() => setActiveTool("Select")} />
        <Tool icon={<ImagePlus />} label="Images" active={activeTool === "Images"} onClick={() => { setActiveTool("Images"); fileInput.current?.click(); }} />
        <Tool icon={<Type />} label="Text" active={activeTool === "Text"} onClick={() => void addText()} />
        <Tool icon={<Shapes />} label="Shapes" active={activeTool === "Shapes"} onClick={() => void addShape()} />
        <Tool icon={<Layers3 />} label="Layers" active={activeTool === "Layers"} onClick={() => setActiveTool("Layers")} />
        <Tool icon={<FolderOpen />} label="Files" active={activeTool === "Files"} onClick={() => setActiveTool("Files")} />
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => handleUpload(event.target.files?.[0])} />
        <input ref={projectInput} type="file" accept=".json,.imagestitch.json,application/json" hidden onChange={(event) => void importProjectFile(event.target.files?.[0])} />
      </aside>

      <section className="sidepanel">{renderSidePanel()}</section>

      <section
        className={`canvas-stage ${isDraggingFile ? "drop-active" : ""}`}
        aria-label="Design canvas"
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
        <div className="stage-meta" style={{ width: stageWidth }}><span>ARTBOARD 01</span><span>{Math.round(viewScale * 100)}%</span></div>
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
              <label className="inspector-field"><span>Text</span><textarea key={`${selectedObject.id}-text`} defaultValue={selectedObject.text} rows={4} onBlur={(event) => updateSelectedText(event.target.value)} /></label>
            )}
            {selectedObject.kind !== "image" && (
              <label className="inspector-field color-field"><span>Fill</span><input type="color" value={selectedObject.fill} onChange={(event) => setFill(event.target.value)} /><code>{selectedObject.fill}</code></label>
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
    </main>
  );
}

function Tool({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span></button>;
}

export default App;
