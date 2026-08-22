import { describe, expect, it } from "vitest";
import { assessExport, type ExportSettings } from "../src/lib/export-qa";
import { DEFAULT_IMAGE_ADJUSTMENTS, cloneImageMask, cloneImagePresentation, createProject } from "../src/lib/model";

const settings: ExportSettings = { format: "png", width: 1080, height: 1080, quality: 0.92, transparent: false, dpi: 300, allPages: false };

describe("export QA", () => {
  it("warns about clipped layers and enlarged image detail", () => {
    const project = createProject("Export QA", false);
    const assetId = crypto.randomUUID();
    project.objects = [{
      id: crypto.randomUUID(), kind: "image", name: "Tiny portrait", assetId,
      x: -20, y: 20, width: 900, height: 900, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
      crop: { x: 0, y: 0, width: 0.5, height: 0.5 },
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      presentation: cloneImagePresentation(), mask: cloneImageMask(),
    }];
    const warnings = assessExport(project, settings, new Map([[assetId, { width: 500, height: 500 }]]));
    expect(warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["clipped-layer", "low-resolution"]));
  });

  it("discloses format-specific transparency, PDF color, and raster SVG behavior", () => {
    const project = createProject("Formats", false);
    expect(assessExport(project, { ...settings, format: "pdf", transparent: true }).map((warning) => warning.code))
      .toEqual(expect.arrayContaining(["transparent-format", "print-color"]));
    expect(assessExport(project, { ...settings, format: "svg" }).some((warning) => warning.code === "raster-svg")).toBe(true);
  });
});
