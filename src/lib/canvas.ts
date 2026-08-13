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
  type ShapeKind,
  type TextDesignNode,
} from "./model";
import type { StoredAsset } from "./storage";

export const DESIGN_OBJECT_NAME = "design-object";

type AssetResolver = (assetId: string) => Promise<StoredAsset | null>;

function regularPolygonPoints(width: number, height: number, sides: number, innerRatio?: number): number[] {
  const points: number[] = [];
  const count = innerRatio ? sides * 2 : sides;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const radius = innerRatio && index % 2 ? innerRatio : 1;
    points.push(
      width / 2 + Math.cos(angle) * width * 0.48 * radius,
      height / 2 + Math.sin(angle) * height * 0.48 * radius,
    );
  }
  return points;
}

function drawPoints(context: Konva.Context, points: number[]): void {
  context.moveTo(points[0], points[1]);
  for (let index = 2; index < points.length; index += 2) context.lineTo(points[index], points[index + 1]);
  context.closePath();
}

function createPathShape(node: ShapeDesignNode): Konva.Shape {
  return new Konva.Shape({
    ...commonAttributes(node),
    fill: node.fill,
    designFill: node.fill,
    designShape: node.shape,
    sceneFunc(context, shape) {
      const width = shape.width();
      const height = shape.height();
      context.beginPath();
      if (node.shape === "heart") {
        context.moveTo(width / 2, height * 0.92);
        context.bezierCurveTo(width * 0.42, height * 0.78, width * 0.08, height * 0.56, width * 0.08, height * 0.3);
        context.bezierCurveTo(width * 0.08, height * 0.08, width * 0.36, height * 0.02, width / 2, height * 0.24);
        context.bezierCurveTo(width * 0.64, height * 0.02, width * 0.92, height * 0.08, width * 0.92, height * 0.3);
        context.bezierCurveTo(width * 0.92, height * 0.56, width * 0.58, height * 0.78, width / 2, height * 0.92);
        context.closePath();
      } else if (node.shape === "speech-bubble") {
        const radius = Math.min(width, height) * 0.12;
        const bodyBottom = height * 0.76;
        context.moveTo(radius, 0);
        context.lineTo(width - radius, 0);
        context.quadraticCurveTo(width, 0, width, radius);
        context.lineTo(width, bodyBottom - radius);
        context.quadraticCurveTo(width, bodyBottom, width - radius, bodyBottom);
        context.lineTo(width * 0.38, bodyBottom);
        context.lineTo(width * 0.2, height);
        context.lineTo(width * 0.23, bodyBottom);
        context.lineTo(radius, bodyBottom);
        context.quadraticCurveTo(0, bodyBottom, 0, bodyBottom - radius);
        context.lineTo(0, radius);
        context.quadraticCurveTo(0, 0, radius, 0);
        context.closePath();
      } else {
        const points = node.shape === "triangle"
          ? regularPolygonPoints(width, height, 3)
          : node.shape === "diamond"
            ? [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2]
            : node.shape === "pentagon"
              ? regularPolygonPoints(width, height, 5)
              : node.shape === "hexagon"
                ? regularPolygonPoints(width, height, 6)
                : regularPolygonPoints(width, height, 5, 0.44);
        drawPoints(context, points);
      }
      context.fillStrokeShape(shape);
    },
  });
}

function createShapeNode(node: ShapeDesignNode): Konva.Shape {
  const shared = {
    ...commonAttributes(node),
    designFill: node.fill,
    designShape: node.shape,
  };
  if (node.shape === "rect" || node.shape === "rounded-rect") {
    return new Konva.Rect({
      ...shared,
      fill: node.fill,
      cornerRadius: node.shape === "rounded-rect" ? Math.max(node.cornerRadius, 24) : 0,
    });
  }
  if (node.shape === "ellipse") {
    return new Konva.Ellipse({
      ...shared,
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
      radiusX: node.width / 2,
      radiusY: node.height / 2,
      fill: node.fill,
    });
  }
  if (node.shape === "line") {
    return new Konva.Line({
      ...shared,
      points: [0, node.height / 2, node.width, node.height / 2],
      stroke: node.fill,
      strokeWidth: Math.max(8, node.height * 0.16),
      lineCap: "round",
    });
  }
  if (node.shape === "arrow") {
    return new Konva.Arrow({
      ...shared,
      points: [0, node.height / 2, node.width, node.height / 2],
      fill: node.fill,
      stroke: node.fill,
      strokeWidth: Math.max(8, node.height * 0.12),
      pointerLength: Math.min(node.width * 0.22, node.height * 0.7),
      pointerWidth: Math.min(node.width * 0.24, node.height * 0.8),
      lineCap: "round",
      lineJoin: "round",
    });
  }
  return createPathShape(node);
}

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
    return createShapeNode(node);
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
    const shapeKind = (node.getAttr("designShape") || (isEllipse ? "ellipse" : "rect")) as ShapeKind;
    return {
      ...common,
      x: isEllipse ? node.x() - node.width() / 2 : common.x,
      y: isEllipse ? node.y() - node.height() / 2 : common.y,
      kind,
      shape: shapeKind,
      fill: String(node.getAttr("designFill") || shape.fill() || shape.stroke() || "#111111"),
      cornerRadius: shapeKind === "rounded-rect" && node instanceof Konva.Rect ? Number(node.cornerRadius()) : 0,
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

export function applyDesignFill(node: Konva.Node, color: string): void {
  node.setAttr("designFill", color);
  if (!(node instanceof Konva.Shape)) return;
  if (node instanceof Konva.Line || node instanceof Konva.Arrow) node.stroke(color);
  node.fill(color);
}
