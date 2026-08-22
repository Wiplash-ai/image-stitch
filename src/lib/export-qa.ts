import type { GlassWareProject, ImageDesignNode } from "./model";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg" | "pdf";

export interface ExportSettings {
  format: ExportFormat;
  width: number;
  height: number;
  quality: number;
  transparent: boolean;
  dpi: number;
  allPages: boolean;
}

export interface ExportAssetDetail {
  width: number;
  height: number;
}

export interface ExportWarning {
  code: "clipped-layer" | "low-resolution" | "transparent-format" | "print-color" | "raster-svg";
  message: string;
}

function rotatedBounds(object: GlassWareProject["objects"][number]) {
  const width = object.width * Math.abs(object.scaleX);
  const height = object.height * Math.abs(object.scaleY);
  const radians = object.rotation * Math.PI / 180;
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => ({
    x: object.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: object.y + x * Math.sin(radians) + y * Math.cos(radians),
  }));
  return {
    left: Math.min(...corners.map((point) => point.x)),
    top: Math.min(...corners.map((point) => point.y)),
    right: Math.max(...corners.map((point) => point.x)),
    bottom: Math.max(...corners.map((point) => point.y)),
  };
}

function lowResolutionWarning(
  image: ImageDesignNode,
  asset: ExportAssetDetail,
  project: GlassWareProject,
  settings: ExportSettings,
): ExportWarning | null {
  const targetWidth = image.width * Math.abs(image.scaleX) * settings.width / project.canvas.width;
  const targetHeight = image.height * Math.abs(image.scaleY) * settings.height / project.canvas.height;
  const availableWidth = asset.width * image.crop.width;
  const availableHeight = asset.height * image.crop.height;
  if (targetWidth <= availableWidth * 1.2 && targetHeight <= availableHeight * 1.2) return null;
  return {
    code: "low-resolution",
    message: `${image.name} will be enlarged beyond its cropped source detail and may look soft.`,
  };
}

export function assessExport(
  project: GlassWareProject,
  settings: ExportSettings,
  assets: ReadonlyMap<string, ExportAssetDetail> = new Map(),
): ExportWarning[] {
  const warnings: ExportWarning[] = [];
  for (const object of project.objects.filter((item) => item.visible)) {
    const bounds = rotatedBounds(object);
    if (bounds.left < -0.5 || bounds.top < -0.5 || bounds.right > project.canvas.width + 0.5 || bounds.bottom > project.canvas.height + 0.5) {
      warnings.push({ code: "clipped-layer", message: `${object.name} extends beyond the artboard and will be clipped.` });
    }
    if (object.kind === "image") {
      const asset = assets.get(object.assetId);
      const warning = asset && lowResolutionWarning(object, asset, project, settings);
      if (warning) warnings.push(warning);
    }
  }
  if (settings.transparent && !["png", "webp", "svg"].includes(settings.format)) {
    warnings.push({ code: "transparent-format", message: "Transparency is not supported by this format; the artboard background will be included." });
  }
  if (settings.format === "pdf") {
    warnings.push({ code: "print-color", message: "The PDF uses browser-rendered sRGB color. Ask your printer whether they require a CMYK conversion or bleed." });
  }
  if (settings.format === "svg") {
    warnings.push({ code: "raster-svg", message: "This SVG preserves exact appearance and dimensions, but its artwork is embedded as a raster image." });
  }
  return warnings;
}
