import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Bot,
  Download,
  ImagePlus,
  Layers3,
  MousePointer2,
  Redo2,
  Shapes,
  Sparkles,
  Type,
  Undo2,
} from "lucide-react";
import { CANVAS_PRESETS, createProject, setCanvasPreset, type CanvasPreset } from "./lib/model";
import { consumeExtensionCapture, loadProject, saveProject } from "./lib/storage";

const SWATCHES = ["#171712", "#ff6b4a", "#f5c451", "#5f826c", "#4f6da8", "#f4efe5"];

function App() {
  const canvasElement = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectedNode = useRef<Konva.Node | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState(() => loadProject() ?? createProject());
  const [selection, setSelection] = useState("Nothing selected");
  const [activeTool, setActiveTool] = useState("Select");

  useEffect(() => {
    if (!canvasElement.current) return;
    const stage = new Konva.Stage({
      container: canvasElement.current,
      width: 640,
      height: 640,
    });
    const layer = new Konva.Layer();
    const background = new Konva.Rect({ id: "background", width: 640, height: 640, fill: "#ffffff", listening: false });
    const headline = new Konva.Text({
      x: 72,
      y: 74,
      width: 500,
      text: "Make something\nworth keeping.",
      fontFamily: "Georgia",
      fontSize: 58,
      lineHeight: 0.95,
      fontStyle: "bold",
      fill: "#171712",
      draggable: true,
      name: "design-object",
    });
    const accent = new Konva.Rect({ x: 74, y: 310, width: 240, height: 24, fill: "#ff6b4a", rotation: -2, draggable: true, name: "design-object" });
    const note = new Konva.Text({
      x: 76,
      y: 382,
      width: 430,
      text: "Your images stay here until you choose otherwise.",
      fontFamily: "Arial",
      fontSize: 24,
      lineHeight: 1.2,
      fill: "#4a4942",
      draggable: true,
      name: "design-object",
    });
    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      keepRatio: false,
      borderStroke: "#ff6b4a",
      anchorFill: "#fffdf8",
      anchorStroke: "#171712",
      anchorSize: 9,
    });
    layer.add(background, headline, accent, note, transformer);
    stage.add(layer);
    stageRef.current = stage;
    layerRef.current = layer;
    transformerRef.current = transformer;

    const select = (node: Konva.Node | null) => {
      selectedNode.current = node;
      transformer.nodes(node ? [node] : []);
      setSelection(node ? node.getClassName().toLowerCase() : "Nothing selected");
      layer.batchDraw();
    };
    stage.on("pointerdown", (event) => {
      const node = event.target;
      select(node === stage || node === background ? null : node.findAncestor(".design-object", true));
    });
    select(headline);

    void consumeExtensionCapture().then((dataUrl) => {
      if (dataUrl) return addImage(dataUrl);
    });
    return () => {
      stage.destroy();
    };
  }, []);

  useEffect(() => saveProject(project), [project]);

  async function addImage(source: string) {
    const layer = layerRef.current;
    if (!layer) return;
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image could not be loaded"));
      image.src = source;
    });
    const maxWidth = 440;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const node = new Konva.Image({ image, x: 100, y: 100, width: image.naturalWidth * scale, height: image.naturalHeight * scale, draggable: true, name: "design-object" });
    layer.add(node);
    transformerRef.current?.moveToTop();
    transformerRef.current?.nodes([node]);
    selectedNode.current = node;
    layer.draw();
    setSelection("image");
  }

  function handleUpload(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && void addImage(reader.result);
    reader.readAsDataURL(file);
  }

  function addText() {
    const text = new Konva.Text({
      text: "Double-click to edit",
      x: 120,
      y: 180,
      width: 360,
      fontFamily: "Georgia",
      fontSize: 42,
      fill: "#171712",
      draggable: true,
      name: "design-object",
    });
    layerRef.current?.add(text);
    transformerRef.current?.moveToTop();
    transformerRef.current?.nodes([text]);
    selectedNode.current = text;
    layerRef.current?.draw();
    setActiveTool("Text");
  }

  function addShape() {
    const shape = new Konva.Rect({ x: 160, y: 160, width: 220, height: 160, cornerRadius: 24, fill: "#f5c451", draggable: true, name: "design-object" });
    layerRef.current?.add(shape);
    transformerRef.current?.moveToTop();
    transformerRef.current?.nodes([shape]);
    selectedNode.current = shape;
    layerRef.current?.draw();
    setActiveTool("Shapes");
  }

  function setFill(color: string) {
    if (!selectedNode.current) return;
    selectedNode.current.setAttr("fill", color);
    layerRef.current?.draw();
  }

  function exportPng() {
    const stage = stageRef.current;
    if (!stage) return;
    const link = document.createElement("a");
    link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "image-stitch"}.png`;
    transformerRef.current?.nodes([]);
    link.href = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    link.click();
    if (selectedNode.current) transformerRef.current?.nodes([selectedNode.current]);
  }

  function changePreset(preset: Exclude<CanvasPreset, "custom">) {
    const next = setCanvasPreset(project, preset);
    setProject(next);
    const size = CANVAS_PRESETS[preset];
    const max = 640;
    const scale = Math.min(max / size.width, max / size.height);
    const width = Math.round(size.width * scale);
    const height = Math.round(size.height * scale);
    stageRef.current?.size({ width, height });
    const background = layerRef.current?.findOne("#background");
    background?.setAttrs({ width, height });
    layerRef.current?.draw();
  }

  return (
    <main className="workbench">
      <header className="topbar">
        <a className="brand" href="./" aria-label="ImageStitch home">
          <img src="./image-stitch-mark.svg" alt="" />
          <span>ImageStitch</span>
          <small>LOCAL WORKBENCH</small>
        </a>
        <label className="project-name">
          <span>Project</span>
          <input value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} />
        </label>
        <div className="top-actions">
          <button className="icon-button" aria-label="Undo" disabled><Undo2 size={18} /></button>
          <button className="icon-button" aria-label="Redo" disabled><Redo2 size={18} /></button>
          <button className="ai-button"><Sparkles size={17} /> Ask AI</button>
          <button className="export-button" onClick={exportPng}><Download size={17} /> Export</button>
        </div>
      </header>

      <aside className="toolrail" aria-label="Creative tools">
        <Tool icon={<MousePointer2 />} label="Select" active={activeTool === "Select"} onClick={() => setActiveTool("Select")} />
        <Tool icon={<ImagePlus />} label="Images" active={activeTool === "Images"} onClick={() => fileInput.current?.click()} />
        <Tool icon={<Type />} label="Text" active={activeTool === "Text"} onClick={addText} />
        <Tool icon={<Shapes />} label="Shapes" active={activeTool === "Shapes"} onClick={addShape} />
        <Tool icon={<Layers3 />} label="Layers" active={activeTool === "Layers"} onClick={() => setActiveTool("Layers")} />
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => handleUpload(event.target.files?.[0])} />
      </aside>

      <section className="sidepanel">
        <div className="panel-heading">
          <p>START WITH</p>
          <h1>{activeTool}</h1>
        </div>
        <button className="upload-card" onClick={() => fileInput.current?.click()}>
          <ImagePlus size={26} />
          <span>Bring in an image</span>
          <small>Upload, paste, or capture a page</small>
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
          <div className="section-label"><span>Quick colors</span><small>Selected object</small></div>
          <div className="swatches">
            {SWATCHES.map((color) => <button key={color} aria-label={`Use ${color}`} style={{ background: color }} onClick={() => setFill(color)} />)}
          </div>
        </div>
        <div className="panel-section ai-note">
          <Bot size={20} />
          <div><strong>AI stays reviewable</strong><p>Every suggestion will arrive as a visible, reversible edit plan.</p></div>
        </div>
      </section>

      <section className="canvas-stage" aria-label="Design canvas">
        <div className="stage-meta"><span>ARTBOARD 01</span><span>100%</span></div>
        <div className="paper-wrap"><div ref={canvasElement} className="design-canvas" /></div>
        <p className="local-status"><span /> Saved locally · Revision {project.revisions.length}</p>
      </section>

      <aside className="inspector">
        <div className="panel-heading"><p>INSPECTOR</p><h2>{selection}</h2></div>
        <div className="property-row"><span>Opacity</span><input type="range" min="0" max="100" defaultValue="100" /></div>
        <div className="property-grid"><button>Position</button><button>Arrange</button><button>Duplicate</button><button>Lock</button></div>
        <div className="coming-next"><span>ON THE CUTTING TABLE</span><p>Layers, filters, brand kits, templates, background removal, and AI edit plans.</p></div>
      </aside>
    </main>
  );
}

function Tool({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span></button>;
}

export default App;
