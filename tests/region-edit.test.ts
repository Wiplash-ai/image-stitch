import { describe, expect, it } from "vitest";
import { hasEditableRegion, regionEditRasterSize } from "../src/lib/region-edit";
import { DEFAULT_IMAGE_ADJUSTMENTS, DEFAULT_IMAGE_MASK, DEFAULT_IMAGE_PRESENTATION, FULL_IMAGE_CROP, type ImageDesignNode } from "../src/lib/model";

const image: ImageDesignNode = {
  id: "image-1",
  kind: "image",
  name: "Photo",
  assetId: "asset-1",
  crop: { ...FULL_IMAGE_CROP },
  adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
  presentation: { ...DEFAULT_IMAGE_PRESENTATION, frame: { ...DEFAULT_IMAGE_PRESENTATION.frame }, shadow: { ...DEFAULT_IMAGE_PRESENTATION.shadow } },
  mask: { ...DEFAULT_IMAGE_MASK, strokes: [] },
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  visible: true,
  locked: false,
};

describe("region-aware raster editing", () => {
  it("bounds provider rasters while preserving the selected image aspect", () => {
    expect(regionEditRasterSize({ width: 4000, height: 3000 }, image)).toEqual({ width: 1536, height: 1152 });
    expect(regionEditRasterSize({ width: 1200, height: 1800 }, { ...image, width: 400, height: 500, crop: { x: 0, y: 0.2, width: 1, height: 0.5 } })).toEqual({ width: 720, height: 900 });
  });

  it("requires a positive selection stroke and ignores deselection-only masks", () => {
    expect(hasEditableRegion({ ...DEFAULT_IMAGE_MASK, strokes: [] })).toBe(false);
    expect(hasEditableRegion({ ...DEFAULT_IMAGE_MASK, strokes: [{ id: "restore", mode: "reveal", size: 0.08, points: [0.1, 0.1, 0.2, 0.2] }] })).toBe(false);
    expect(hasEditableRegion({ ...DEFAULT_IMAGE_MASK, strokes: [{ id: "select", mode: "hide", size: 0.08, points: [0.1, 0.1, 0.2, 0.2] }] })).toBe(true);
  });
});
