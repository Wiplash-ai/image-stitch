import Konva from "konva";
import { designNodeToKonva } from "./canvas";
import {
  DEFAULT_IMAGE_MASK,
  DEFAULT_IMAGE_PRESENTATION,
  type ImageDesignNode,
  type ImageMask,
} from "./model";
import type { StoredAsset } from "./storage";

const MAX_REGION_EDIT_DIMENSION = 1536;

export type RegionEditOutput = "replace" | "new-layer";

export function regionEditRasterSize(asset: Pick<StoredAsset, "width" | "height">, image: Pick<ImageDesignNode, "crop" | "width" | "height" | "scaleX" | "scaleY">) {
  const croppedWidth = Math.max(1, asset.width * image.crop.width);
  const croppedHeight = Math.max(1, asset.height * image.crop.height);
  const displayAspect = Math.max(0.01, Math.abs(image.width * image.scaleX) / Math.max(1, Math.abs(image.height * image.scaleY)));
  let width = croppedWidth;
  let height = croppedHeight;
  const cropAspect = croppedWidth / croppedHeight;
  if (Math.abs(cropAspect - displayAspect) > 0.001) {
    if (cropAspect > displayAspect) width = height * displayAspect;
    else height = width / displayAspect;
  }
  const scale = Math.min(1, MAX_REGION_EDIT_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(64, Math.round(width * scale)),
    height: Math.max(64, Math.round(height * scale)),
  };
}

export function hasEditableRegion(mask: ImageMask): boolean {
  return mask.strokes.some((stroke) => stroke.mode === "hide" && stroke.points.length >= 4);
}

function strokePath(context: CanvasRenderingContext2D, points: number[], width: number, height: number) {
  context.beginPath();
  for (let index = 0; index < points.length; index += 2) {
    const x = points[index] * width;
    const y = points[index + 1] * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  if (points.length === 2) context.lineTo(points[0] * width + 0.01, points[1] * height);
  context.stroke();
}

export function renderRegionEditMask(mask: ImageMask, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare an image-edit mask.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  for (const stroke of mask.strokes) {
    context.save();
    context.globalCompositeOperation = stroke.mode === "hide" ? "destination-out" : "source-over";
    context.strokeStyle = "#ffffff";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(1, stroke.size * Math.min(width, height));
    if (mask.feather > 0) context.filter = `blur(${Math.min(40, mask.feather)}px)`;
    strokePath(context, stroke.points, width, height);
    context.restore();
  }
  return canvas.toDataURL("image/png");
}

export async function renderRegionEditSource(asset: StoredAsset, image: ImageDesignNode): Promise<{ sourceDataUrl: string; maskWidth: number; maskHeight: number }> {
  const { width, height } = regionEditRasterSize(asset, image);
  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width, height });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);
  try {
    const flattened: ImageDesignNode = {
      ...image,
      x: 0,
      y: 0,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      blendMode: "source-over",
      mask: { ...DEFAULT_IMAGE_MASK, strokes: [] },
      presentation: {
        ...DEFAULT_IMAGE_PRESENTATION,
        frame: { ...DEFAULT_IMAGE_PRESENTATION.frame },
        shadow: { ...DEFAULT_IMAGE_PRESENTATION.shadow },
      },
    };
    const node = await designNodeToKonva(flattened, async () => asset);
    layer.add(node);
    layer.draw();
    return {
      sourceDataUrl: stage.toDataURL({ x: 0, y: 0, width, height, pixelRatio: 1, mimeType: "image/png" }),
      maskWidth: width,
      maskHeight: height,
    };
  } finally {
    stage.destroy();
  }
}
