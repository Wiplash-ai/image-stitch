import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Layers3, LoaderCircle, Paintbrush, Replace, Sparkles, Undo2, X } from "lucide-react";
import {
  DEFAULT_IMAGE_MASK,
  cloneImageMask,
  newId,
  type ImageDesignNode,
  type ImageMask,
  type NormalizedCrop,
} from "../lib/model";
import { hasEditableRegion, type RegionEditOutput } from "../lib/region-edit";
import type { StoredAsset } from "../lib/storage";

export interface RegionEditRequest {
  mask: ImageMask;
  prompt: string;
  output: RegionEditOutput;
  signal: AbortSignal;
  onStatus: (message: string) => void;
}

export function RegionEditModal({
  asset,
  crop,
  image,
  connectionLabel,
  onConnect,
  onRun,
  onClose,
}: {
  asset: StoredAsset;
  crop: NormalizedCrop;
  image: ImageDesignNode;
  connectionLabel: string | null;
  onConnect: () => void;
  onRun: (request: RegionEditRequest) => Promise<void>;
  onClose: () => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activeStroke = useRef<{ pointerId: number; id: string } | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"hide" | "reveal">("hide");
  const [size, setSize] = useState(0.08);
  const [draft, setDraft] = useState<ImageMask>(() => ({ ...cloneImageMask(DEFAULT_IMAGE_MASK), enabled: true }));
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<RegionEditOutput>("new-layer");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [asset]);

  useEffect(() => () => abortController.current?.abort(), []);

  function point(event: ReactPointerEvent<HTMLDivElement>): [number, number] | null {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    ];
  }

  function beginStroke(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || running) return;
    const nextPoint = point(event);
    if (!nextPoint) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = newId();
    activeStroke.current = { pointerId: event.pointerId, id };
    setDraft((current) => ({
      ...current,
      strokes: [...current.strokes, { id, mode, size, points: [...nextPoint, ...nextPoint] }],
    }));
  }

  function continueStroke(event: ReactPointerEvent<HTMLDivElement>) {
    const active = activeStroke.current;
    const nextPoint = point(event);
    if (!active || active.pointerId !== event.pointerId || !nextPoint || running) return;
    setDraft((current) => ({
      ...current,
      strokes: current.strokes.map((stroke) => stroke.id === active.id
        ? { ...stroke, points: [...stroke.points, ...nextPoint].slice(-4000) }
        : stroke),
    }));
  }

  async function submit() {
    if (!connectionLabel) {
      onConnect();
      return;
    }
    if (!hasEditableRegion(draft) || !prompt.trim() || running) return;
    const controller = new AbortController();
    abortController.current = controller;
    setRunning(true);
    setError("");
    setStatus("Preparing selected pixels…");
    try {
      await onRun({ mask: draft, prompt: prompt.trim(), output, signal: controller.signal, onStatus: setStatus });
      onClose();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") setStatus("Region edit cancelled.");
      else setError(cause instanceof Error ? cause.message : "The region edit could not be completed.");
    } finally {
      abortController.current = null;
      setRunning(false);
    }
  }

  const imageStyle = {
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${-crop.x / crop.width * 100}%`,
    top: `${-crop.y / crop.height * 100}%`,
  };

  return (
    <div className="modal-backdrop precision-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !running && onClose()}>
      <section className="precision-editor-modal region-edit-modal" role="dialog" aria-modal="true" aria-labelledby="region-edit-title">
        <header>
          <span><Sparkles size={18} /> AI region edit</span>
          <button title="Close region editor" aria-label="Close region editor" onClick={() => { abortController.current?.abort(); onClose(); }}><X size={18} /></button>
        </header>
        <div className="precision-editor-copy">
          <h2 id="region-edit-title">Paint what may change.</h2>
          <p>GlassWare sends only this cropped image and selection mask. Pixels outside the painted region are marked for preservation.</p>
        </div>
        <div className="region-edit-layout">
          <div className="region-edit-canvas-column">
            <div className="mask-editor-toolbar region-edit-toolbar">
              <div role="group" aria-label="Region brush mode">
                <button className={mode === "hide" ? "active" : ""} aria-pressed={mode === "hide"} onClick={() => setMode("hide")} disabled={running} title="Add pixels to the editable region"><Paintbrush size={15} /> Select</button>
                <button className={mode === "reveal" ? "active" : ""} aria-pressed={mode === "reveal"} onClick={() => setMode("reveal")} disabled={running} title="Remove pixels from the editable region"><Eraser size={15} /> Deselect</button>
              </div>
              <label><span>Brush <small>{Math.round(size * 100)}%</small></span><input aria-label="Region brush size" type="range" min="0.01" max="0.3" step="0.01" value={size} disabled={running} onChange={(event) => setSize(Number(event.target.value))} /></label>
              <label><span>Soft edge <small>{Math.round(draft.feather)} px</small></span><input aria-label="Region feather" type="range" min="0" max="40" step="1" value={draft.feather} disabled={running} onChange={(event) => setDraft((current) => ({ ...current, feather: Number(event.target.value) }))} /></label>
            </div>
            <div
              className="mask-editor-surface region-edit-surface"
              ref={surfaceRef}
              style={{ aspectRatio: `${Math.abs(image.width * image.scaleX)} / ${Math.abs(image.height * image.scaleY)}` }}
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={() => { activeStroke.current = null; }}
              onPointerCancel={() => { activeStroke.current = null; }}
            >
              {imageUrl && <img src={imageUrl} alt="Region edit source" draggable={false} style={imageStyle} />}
              <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                {draft.strokes.map((stroke) => {
                  const path = stroke.points.reduce((value, coordinate, index) => index % 2 === 0
                    ? `${value}${index === 0 ? "M" : " L"}${coordinate * 1000}`
                    : `${value} ${coordinate * 1000}`, "");
                  return <path key={stroke.id} d={path} className={`region-selection-stroke ${stroke.mode}`} strokeWidth={stroke.size * 1000} />;
                })}
              </svg>
              {!draft.strokes.length && <span className="mask-empty-hint">Paint over the pixels GlassWare may change</span>}
            </div>
            <button className="region-undo-stroke" disabled={!draft.strokes.length || running} onClick={() => setDraft((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}><Undo2 size={14} /> Undo stroke</button>
          </div>
          <div className="region-edit-controls">
            <label><span>Describe the change</span><textarea aria-label="Region edit prompt" rows={6} maxLength={4000} value={prompt} disabled={running} onChange={(event) => setPrompt(event.target.value)} placeholder="Remove the lamp and reconstruct the wall behind it" /></label>
            <fieldset disabled={running}>
              <legend>Result</legend>
              <label className={output === "new-layer" ? "selected" : ""}><input type="radio" name="region-output" value="new-layer" checked={output === "new-layer"} onChange={() => setOutput("new-layer")} /><Layers3 size={16} /><span><strong>New layer</strong><small>Keep the original underneath</small></span></label>
              <label className={output === "replace" ? "selected" : ""}><input type="radio" name="region-output" value="replace" checked={output === "replace"} onChange={() => setOutput("replace")} /><Replace size={16} /><span><strong>Replace image</strong><small>Keep layout and Studio styling</small></span></label>
            </fieldset>
            <div className="region-edit-connection"><span>AI connection</span><strong>{connectionLabel ?? "Not connected"}</strong>{!connectionLabel && <button onClick={onConnect}>Connect your AI</button>}</div>
            {(status || error) && <p className={error ? "region-edit-error" : "region-edit-status"} role="status">{error || status}</p>}
          </div>
        </div>
        <footer>
          <button className="secondary" disabled={running && !abortController.current} onClick={() => running ? abortController.current?.abort() : onClose()}>{running ? "Cancel edit" : "Cancel"}</button>
          <span />
          <button className="region-edit-submit" disabled={running || !hasEditableRegion(draft) || !prompt.trim()} onClick={() => void submit()}>{running ? <><LoaderCircle className="spin" size={15} /> Editing selected pixels…</> : <><Sparkles size={15} /> Edit selected region</>}</button>
        </footer>
      </section>
    </div>
  );
}
