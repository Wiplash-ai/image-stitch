import Konva from "konva";
import type { Filter } from "konva/lib/Node";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  FULL_IMAGE_CROP,
  type DesignNode,
  type ImageAdjustments,
  type ImageDesignNode,
  type NormalizedCrop,
  type ShapeDesignNode,
  type TextDesignNode,
} from "./model";
import type { StoredAsset } from "./storage";

export const DESIGN_OBJECT_NAME = "design-object";

type AssetResolver = (assetId: string) => Promise<StoredAsset | null>;

function commonAttributes(node: DesignNode) {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    opacity: node.opacity,
    visible: node.visible,
    draggable: !node.locked,
    listening: !node.locked,
    name: DESIGN_OBJECT_NAME,
    designId: node.id,
    designName: node.name,
    nodeKind: node.kind,
    designLocked: node.locked,
  };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to decode image asset"));
    };
    image.src = url;
  });
}

export function applyImagePresentation(
  imageNode: Konva.Image,
  crop: NormalizedCrop,
  adjustments: ImageAdjustments,
): void {
  const source = imageNode.image();
  const sourceWidth = source && "width" in source ? Number(source.width) : imageNode.width();
  const sourceHeight = source && "height" in source ? Number(source.height) : imageNode.height();
  imageNode.crop({
    x: crop.x * sourceWidth,
    y: crop.y * sourceHeight,
    width: crop.width * sourceWidth,
    height: crop.height * sourceHeight,
  });
  imageNode.setAttr("normalizedCrop", { ...crop });
  imageNode.setAttr("imageAdjustments", { ...adjustments });
  imageNode.brightness(adjustments.brightness);
  imageNode.contrast(adjustments.contrast);
  imageNode.saturation(adjustments.saturation);
  imageNode.blurRadius(adjustments.blur);

  const filters: Filter[] = [];
  if (adjustments.brightness !== 0) filters.push(Konva.Filters.Brighten);
  if (adjustments.contrast !== 0) filters.push(Konva.Filters.Contrast);
  if (adjustments.saturation !== 0) filters.push(Konva.Filters.HSL);
  if (adjustments.blur > 0) filters.push(Konva.Filters.Blur);
  if (adjustments.grayscale) filters.push(Konva.Filters.Grayscale);
  if (adjustments.sepia) filters.push(Konva.Filters.Sepia);
  imageNode.clearCache();
  if (filters.length) {
    imageNode.cache({ pixelRatio: 1 });
    imageNode.filters(filters);
  } else {
    imageNode.filters([]);
  }
}

export async function designNodeToKonva(node: DesignNode, resolveAsset: AssetResolver): Promise<Konva.Shape> {
  if (node.kind === "text") {
    return new Konva.Text({
      ...commonAttributes(node),
      text: node.text,
      fill: node.fill,
      fontFamily: node.fontFamily,
      fontSize: node.fontSize,
      fontStyle: node.fontStyle,
      align: node.align,
      lineHeight: node.lineHeight,
    });
  }
  if (node.kind === "shape") {
    if (node.shape === "ellipse") {
      return new Konva.Ellipse({
        ...commonAttributes(node),
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
        radiusX: node.width / 2,
        radiusY: node.height / 2,
        width: node.width,
        height: node.height,
        fill: node.fill,
      });
    }
    return new Konva.Rect({
      ...commonAttributes(node),
      fill: node.fill,
      cornerRadius: node.cornerRadius,
    });
  }

  const asset = await resolveAsset(node.assetId);
  if (!asset) {
    return new Konva.Rect({
      ...commonAttributes(node),
      fill: "#f2f2f2",
      stroke: "#b42318",
      dash: [12, 8],
      assetId: node.assetId,
      normalizedCrop: { ...node.crop },
      imageAdjustments: { ...node.adjustments },
      missingAsset: true,
    });
  }
  const imageNode = new Konva.Image({
    ...commonAttributes(node),
    image: await loadImage(asset.blob),
    assetId: node.assetId,
  });
  applyImagePresentation(imageNode, node.crop, node.adjustments);
  return imageNode;
}

function readCommon(node: Konva.Node) {
  return {
    id: String(node.getAttr("designId")),
    name: String(node.getAttr("designName") || "Layer"),
    x: node.x(),
    y: node.y(),
    width: node.width(),
    height: node.height(),
    rotation: node.rotation(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
    opacity: node.opacity(),
    visible: node.visible(),
    locked: Boolean(node.getAttr("designLocked")),
  };
}

export function konvaNodeToDesign(node: Konva.Node): DesignNode {
  const kind = node.getAttr("nodeKind") as DesignNode["kind"];
  if (kind === "text") {
    const text = node as Konva.Text;
    return {
      ...readCommon(node),
      kind,
      text: text.text(),
      fill: String(text.fill() || "#111111"),
      fontFamily: text.fontFamily(),
      fontSize: text.fontSize(),
      fontStyle: text.fontStyle(),
      align: text.align() as TextDesignNode["align"],
      lineHeight: text.lineHeight(),
    } satisfies TextDesignNode;
  }
  if (kind === "shape") {
    const shape = node as Konva.Shape;
    const isEllipse = node instanceof Konva.Ellipse;
    const common = readCommon(node);
    return {
      ...common,
      x: isEllipse ? node.x() - node.width() / 2 : common.x,
      y: isEllipse ? node.y() - node.height() / 2 : common.y,
      kind,
      shape: isEllipse ? "ellipse" : "rect",
      fill: String(shape.fill() || "#111111"),
      cornerRadius: node instanceof Konva.Rect ? Number(node.cornerRadius()) : 0,
    } satisfies ShapeDesignNode;
  }
  return {
    ...readCommon(node),
    kind: "image",
    assetId: String(node.getAttr("assetId")),
    crop: { ...(node.getAttr("normalizedCrop") ?? FULL_IMAGE_CROP) },
    adjustments: { ...(node.getAttr("imageAdjustments") ?? DEFAULT_IMAGE_ADJUSTMENTS) },
  } satisfies ImageDesignNode;
}

export function serializeLayer(layer: Konva.Layer): DesignNode[] {
  return layer
    .find(`.${DESIGN_OBJECT_NAME}`)
    .map((node) => konvaNodeToDesign(node));
}

export function findDesignNode(layer: Konva.Layer, designId: string): Konva.Shape | null {
  return (layer.find(`.${DESIGN_OBJECT_NAME}`).find((node) => node.getAttr("designId") === designId) as Konva.Shape | undefined) ?? null;
}

export function applyLockedState(node: Konva.Node, locked: boolean): void {
  node.setAttr("designLocked", locked);
  node.draggable(!locked);
  node.listening(!locked);
}
