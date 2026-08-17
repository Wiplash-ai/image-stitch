import { describe, expect, it } from "vitest";
import { cloneImagePresentation } from "../src/lib/model";
import {
  BACKDROP_PRESETS,
  FRAME_PRESETS,
  PRESENTATION_PRESETS,
  applyScreenshotStudioOperations,
  findBackdropPreset,
} from "../src/lib/screenshot-studio";

describe("Screenshot Studio presentation operations", () => {
  it("applies the supported static API operations without mutating the source", () => {
    const source = cloneImagePresentation();
    const result = applyScreenshotStudioOperations(source, [
      { op: "set_border_radius", radius: 20 },
      { op: "set_frame", frame: { type: "border-dark", width: 2, color: "#111111" } },
      { op: "set_shadow", shadow: { enabled: true, blur: 48, offsetY: 12, opacity: 0.28 } },
    ]);

    expect(source).toEqual(cloneImagePresentation());
    expect(result).toMatchObject({
      cornerRadius: 20,
      frame: { type: "border-dark", width: 2, color: "#111111" },
      shadow: { enabled: true, blur: 48, offsetY: 12, opacity: 0.28 },
    });
  });

  it("keeps every one-click look inside the GlassWare presentation limits", () => {
    for (const preset of PRESENTATION_PRESETS) {
      const result = applyScreenshotStudioOperations(cloneImagePresentation(), preset.operations);
      expect(result.cornerRadius).toBeGreaterThanOrEqual(0);
      expect(result.frame.width).toBeGreaterThanOrEqual(0);
      expect(result.shadow.blur).toBeGreaterThanOrEqual(0);
      expect(result.shadow.opacity).toBeGreaterThanOrEqual(0);
      expect(result.shadow.opacity).toBeLessThanOrEqual(1);
    }
  });

  it("offers browser-compatible frames with complete local presentation metadata", () => {
    expect(FRAME_PRESETS.map((preset) => preset.type)).toEqual(expect.arrayContaining([
      "none",
      "macos-light",
      "macos-dark",
      "windows-light",
      "arc-dark",
      "glass-light",
      "border-dark",
      "photograph",
    ]));
    for (const preset of FRAME_PRESETS) {
      expect(preset.padding).toBeGreaterThanOrEqual(0);
      expect(typeof preset.title).toBe("string");
    }
  });

  it("resolves every rich backdrop preset by its portable id", () => {
    for (const preset of BACKDROP_PRESETS) {
      expect(findBackdropPreset(preset.id)).toEqual(preset);
    }
  });
});
