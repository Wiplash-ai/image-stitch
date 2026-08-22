import { Frame, Image as ImageIcon, ImageUp, Layers3, Sparkles } from "lucide-react";
import type { ArtworkBackdrop, ArtworkPresentation, ImageDesignNode, ImagePresentation } from "../lib/model";
import {
  BACKDROP_PRESETS,
  FRAME_PRESETS,
  PRESENTATION_PRESETS,
  SHADOW_PRESETS,
  type ScreenshotStudioPresentationOperation,
} from "../lib/screenshot-studio";

export type StudioTarget = "image" | "artwork";

export type ImagePresentationPatch = {
  cornerRadius?: number;
  frame?: Partial<ImagePresentation["frame"]>;
  shadow?: Partial<ImagePresentation["shadow"]>;
};

export type ArtworkPresentationPatch = ImagePresentationPatch & {
  enabled?: boolean;
  padding?: number;
  background?: string;
  backdrop?: Partial<ArtworkBackdrop>;
};

export function StudioPanel({
  target,
  setTarget,
  image,
  artwork,
  maxArtworkPadding,
  uploadBackdrop,
  applyOperations,
  updatePresentation,
}: {
  target: StudioTarget;
  setTarget: (target: StudioTarget) => void;
  image: ImageDesignNode | null;
  artwork: ArtworkPresentation;
  maxArtworkPadding: number;
  uploadBackdrop: () => void;
  applyOperations: (operations: ScreenshotStudioPresentationOperation[], summary: string) => void;
  updatePresentation: (patch: ArtworkPresentationPatch, summary: string, commit?: boolean) => void;
}) {
  const presentation = target === "artwork" ? artwork : image?.presentation;

  return (
    <>
      <div className="panel-heading"><p>PRESENTATION STUDIO</p><h1>Studio</h1></div>
      <div className="studio-target-switch" aria-label="Studio target">
        <button
          type="button"
          className={target === "image" ? "active" : ""}
          aria-pressed={target === "image"}
          disabled={!image}
          title={image ? "Style the selected image layer" : "Select an image layer first"}
          onClick={() => setTarget("image")}
        >
          <ImageIcon size={15} />
          <span>Selected image</span>
        </button>
        <button
          type="button"
          className={target === "artwork" ? "active" : ""}
          aria-pressed={target === "artwork"}
          title="Style the complete artwork"
          onClick={() => setTarget("artwork")}
        >
          <Layers3 size={15} />
          <span>Whole artwork</span>
        </button>
      </div>
      <p className="studio-target-note">
        {target === "artwork"
          ? "Present the complete editable design inside the same export size."
          : "Style this image layer without changing the rest of the artwork."}
      </p>

      {!presentation ? (
        <div className="studio-empty">
          <span><ImageIcon size={22} /></span>
          <strong>Select an image</strong>
          <p>Choose an image on the canvas, or switch to Whole artwork to style the complete design.</p>
          <button type="button" onClick={() => setTarget("artwork")}>Style whole artwork</button>
        </div>
      ) : (
        <div className="studio-controls">
          {target === "artwork" && (
            <section className="studio-section studio-artwork-setup">
              <label className="studio-enable-row">
                <span>
                  <strong>Artwork presentation</strong>
                  <small>Add space and depth around the complete design.</small>
                </span>
                <input
                  type="checkbox"
                  checked={artwork.enabled}
                  aria-label="Enable whole artwork presentation"
                  onChange={(event) => updatePresentation(
                    { enabled: event.target.checked },
                    event.target.checked ? "Whole artwork presentation enabled" : "Whole artwork presentation disabled",
                  )}
                />
              </label>
              <StudioSlider
                label="Outer spacing"
                value={artwork.padding}
                min={0}
                max={maxArtworkPadding}
                display={`${Math.round(artwork.padding)} px`}
                onChange={(value, commit) => updatePresentation({ padding: value }, "Artwork spacing changed", commit)}
              />
              <div className="studio-backdrop-controls">
                <div className="section-label"><span>Backdrop</span><small>SCREENSHOT STUDIO</small></div>
                <div className="backdrop-type-switch" aria-label="Artwork backdrop type">
                  {(["solid", "gradient", "image"] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={artwork.backdrop.type === type ? "active" : ""}
                      aria-pressed={artwork.backdrop.type === type}
                      onClick={() => type === "image"
                        ? artwork.backdrop.assetId ? updatePresentation({ backdrop: { type } }, "Artwork backdrop type changed") : uploadBackdrop()
                        : updatePresentation({
                            backdrop: {
                              type,
                              value: type === "solid" ? artwork.background : BACKDROP_PRESETS[0].value,
                            },
                          }, "Artwork backdrop type changed")}
                    >{type}</button>
                  ))}
                </div>
                {artwork.backdrop.type === "solid" && (
                  <label className="studio-color-row">
                    <span>Color</span>
                    <span>
                      <input
                        type="color"
                        title="Choose the whole artwork backdrop"
                        aria-label="Artwork backdrop color"
                        value={artwork.backdrop.value.startsWith("#") ? artwork.backdrop.value : artwork.background}
                        onChange={(event) => updatePresentation({ background: event.target.value, backdrop: { value: event.target.value } }, "Artwork backdrop changed")}
                      />
                      <code>{artwork.backdrop.value.toUpperCase()}</code>
                    </span>
                  </label>
                )}
                {artwork.backdrop.type === "gradient" && (
                  <div className="backdrop-preset-grid">
                    {BACKDROP_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        className={artwork.backdrop.value === preset.value ? "active" : ""}
                        aria-label={`${preset.label} gradient`}
                        title={`${preset.label} gradient`}
                        onClick={() => updatePresentation({ backdrop: { type: "gradient", value: preset.value } }, `${preset.label} backdrop`)}
                      >
                        <i style={{ background: `linear-gradient(135deg, ${preset.colors.join(", ")})` }} />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {artwork.backdrop.type === "image" && (
                  <button type="button" className="backdrop-upload-button" onClick={uploadBackdrop}>
                    <ImageUp size={17} />
                    <span><strong>{artwork.backdrop.assetId ? "Replace backdrop image" : "Upload backdrop image"}</strong><small>{artwork.backdrop.value || "PNG, JPEG, WebP, or GIF"}</small></span>
                  </button>
                )}
                <StudioSlider
                  label="Backdrop opacity"
                  value={artwork.backdrop.opacity * 100}
                  min={10}
                  max={100}
                  display={`${Math.round(artwork.backdrop.opacity * 100)}%`}
                  onChange={(value, commit) => updatePresentation({ backdrop: { opacity: value / 100 } }, "Backdrop opacity changed", commit)}
                />
                {artwork.backdrop.type === "image" && (
                  <StudioSlider
                    label="Backdrop blur"
                    value={artwork.backdrop.blur}
                    min={0}
                    max={60}
                    display={`${Math.round(artwork.backdrop.blur)} px`}
                    onChange={(value, commit) => updatePresentation({ backdrop: { blur: value } }, "Backdrop blur changed", commit)}
                  />
                )}
                <StudioSlider
                  label="Texture"
                  value={artwork.backdrop.noise}
                  min={0}
                  max={60}
                  display={`${Math.round(artwork.backdrop.noise)}%`}
                  onChange={(value, commit) => updatePresentation({ backdrop: { noise: value } }, "Backdrop texture changed", commit)}
                />
              </div>
            </section>
          )}

          <section className="studio-section studio-looks">
            <div className="section-label"><span>Looks</span><small>ONE CLICK</small></div>
            <div className="studio-look-grid">
              {PRESENTATION_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  data-look={preset.id}
                  title={preset.description}
                  onClick={() => applyOperations(preset.operations, `Presentation preset: ${preset.label}`)}
                >
                  <i><Sparkles size={13} /></i>
                  <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className="studio-section">
            <div className="section-label"><span>Corners</span><small>{Math.round(presentation.cornerRadius)} PX</small></div>
            <div className="corner-presets">
              {[
                { label: "Sharp", value: 0 },
                { label: "Curved", value: 12 },
                { label: "Round", value: 24 },
              ].map((preset) => (
                <button
                  type="button"
                  className={presentation.cornerRadius === preset.value ? "active" : ""}
                  key={preset.label}
                  title={`${preset.label} corners`}
                  onClick={() => updatePresentation({ cornerRadius: preset.value }, `${preset.label} corners`)}
                >
                  <i style={{ borderRadius: Math.min(12, preset.value / 2) }} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            <StudioSlider
              label="Radius"
              value={presentation.cornerRadius}
              min={0}
              max={120}
              display={`${Math.round(presentation.cornerRadius)} px`}
              onChange={(value, commit) => updatePresentation({ cornerRadius: value }, "Corner radius changed", commit)}
            />
          </section>

          <section className="studio-section">
            <div className="section-label"><span>Frame</span><small>SCREENSHOT STUDIO</small></div>
            <div className="frame-presets">
              {FRAME_PRESETS.map((frame) => (
                <button
                  type="button"
                  className={presentation.frame.type === frame.type ? "active" : ""}
                  key={frame.type}
                  title={`${frame.label} frame`}
                  onClick={() => updatePresentation({
                    frame: { type: frame.type, width: frame.width, color: frame.color, opacity: 1, padding: frame.padding, title: frame.title },
                  }, `${frame.label} frame`)}
                >
                  <i data-frame={frame.type}><Frame size={20} /></i>
                  <span>{frame.label}</span>
                </button>
              ))}
            </div>
            {presentation.frame.type !== "none" && (
              <>
                <StudioSlider
                  label="Frame size"
                  value={presentation.frame.width}
                  min={1}
                  max={32}
                  display={`${Math.round(presentation.frame.width)} px`}
                  onChange={(value, commit) => updatePresentation({ frame: { width: value } }, "Frame size changed", commit)}
                />
                <StudioSlider
                  label="Frame padding"
                  value={presentation.frame.padding}
                  min={0}
                  max={64}
                  display={`${Math.round(presentation.frame.padding)} px`}
                  onChange={(value, commit) => updatePresentation({ frame: { padding: value } }, "Frame padding changed", commit)}
                />
                {(presentation.frame.type.startsWith("macos-") || presentation.frame.type.startsWith("windows-") || presentation.frame.type.startsWith("arc-")) && (
                  <label className="studio-text-row"><span>Window title</span><input key={`${presentation.frame.type}-${presentation.frame.title}`} defaultValue={presentation.frame.title} maxLength={80} onChange={(event) => updatePresentation({ frame: { title: event.target.value } }, "Frame title changed", false)} onBlur={(event) => updatePresentation({ frame: { title: event.target.value } }, "Frame title changed")} /></label>
                )}
                <label className="studio-color-row">
                  <span>Frame color</span>
                  <span>
                    <input
                      type="color"
                      title="Choose frame color"
                      aria-label="Frame color"
                      value={presentation.frame.color}
                      onChange={(event) => updatePresentation({ frame: { color: event.target.value } }, "Frame color changed")}
                    />
                    <code>{presentation.frame.color.toUpperCase()}</code>
                  </span>
                </label>
              </>
            )}
          </section>

          <section className="studio-section">
            <div className="section-label"><span>Shadow</span><small>DEPTH</small></div>
            <div className="shadow-presets">
              {SHADOW_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  title={`${preset.label} shadow`}
                  onClick={() => applyOperations([{ op: "set_shadow", shadow: preset.shadow }], `${preset.label} shadow`)}
                >
                  <i data-shadow={preset.id} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            {presentation.shadow.enabled && (
              <>
                <StudioSlider
                  label="Blur"
                  value={presentation.shadow.blur}
                  min={0}
                  max={100}
                  display={`${Math.round(presentation.shadow.blur)} px`}
                  onChange={(value, commit) => updatePresentation({ shadow: { blur: value } }, "Shadow blur changed", commit)}
                />
                <StudioSlider
                  label="Vertical offset"
                  value={presentation.shadow.offsetY}
                  min={-30}
                  max={60}
                  display={`${Math.round(presentation.shadow.offsetY)} px`}
                  onChange={(value, commit) => updatePresentation({ shadow: { offsetY: value } }, "Shadow offset changed", commit)}
                />
                <StudioSlider
                  label="Horizontal offset"
                  value={presentation.shadow.offsetX}
                  min={-60}
                  max={60}
                  display={`${Math.round(presentation.shadow.offsetX)} px`}
                  onChange={(value, commit) => updatePresentation({ shadow: { offsetX: value } }, "Shadow horizontal offset changed", commit)}
                />
                <label className="studio-color-row">
                  <span>Shadow color</span>
                  <span><input type="color" title="Choose shadow color" aria-label="Shadow color" value={presentation.shadow.color.startsWith("#") ? presentation.shadow.color : "#111111"} onChange={(event) => updatePresentation({ shadow: { color: event.target.value } }, "Shadow color changed")} /><code>{presentation.shadow.color.toUpperCase()}</code></span>
                </label>
                <StudioSlider
                  label="Opacity"
                  value={presentation.shadow.opacity * 100}
                  min={0}
                  max={100}
                  display={`${Math.round(presentation.shadow.opacity * 100)}%`}
                  onChange={(value, commit) => updatePresentation({ shadow: { opacity: value / 100 } }, "Shadow opacity changed", commit)}
                />
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function StudioSlider({
  label,
  value,
  min,
  max,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  onChange: (value: number, commit: boolean) => void;
}) {
  return (
    <label className="studio-slider">
      <span>{label}<small>{display}</small></span>
      <input
        key={`${label}-${value}`}
        type="range"
        aria-label={label}
        title={label}
        min={min}
        max={max}
        step="1"
        defaultValue={value}
        onChange={(event) => onChange(Number(event.target.value), false)}
        onPointerUp={(event) => onChange(Number(event.currentTarget.value), true)}
        onKeyUp={(event) => onChange(Number(event.currentTarget.value), true)}
      />
    </label>
  );
}
