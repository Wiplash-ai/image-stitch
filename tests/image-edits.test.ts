import { describe, expect, it } from "vitest";
import { centerCropForAspect, fitDisplayBoxToAspect, PHOTO_PRESETS } from "../src/lib/image-edits";

describe("non-destructive image edits", () => {
  it("creates a centered square crop for a landscape source", () => {
    const crop = centerCropForAspect(1600, 900, 1);
    expect(crop).toMatchObject({ y: 0, height: 1 });
    expect(crop.x).toBeCloseTo(0.21875);
    expect(crop.width).toBeCloseTo(0.5625);
  });

  it("creates a centered widescreen crop for a portrait source", () => {
    const crop = centerCropForAspect(900, 1600, 16 / 9);
    expect(crop).toMatchObject({ x: 0, width: 1 });
    expect(crop.y).toBeGreaterThan(0.3);
    expect(crop.y + crop.height).toBeLessThan(0.7);
  });

  it("preserves the display center while fitting a new aspect", () => {
    const fitted = fitDisplayBoxToAspect({ x: 100, y: 200, width: 600, height: 400 }, 1);
    expect(fitted).toEqual({ x: 200, y: 200, width: 400, height: 400 });
  });

  it("keeps named presets within model limits", () => {
    for (const preset of Object.values(PHOTO_PRESETS)) {
      expect(preset.brightness).toBeGreaterThanOrEqual(-1);
      expect(preset.brightness).toBeLessThanOrEqual(1);
      expect(preset.contrast).toBeGreaterThanOrEqual(-100);
      expect(preset.contrast).toBeLessThanOrEqual(100);
      expect(preset.blur).toBeGreaterThanOrEqual(0);
    }
  });
});
