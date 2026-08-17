import Konva from "konva";
import type { Filter } from "konva/lib/Node";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  DEFAULT_IMAGE_PRESENTATION,
  FULL_IMAGE_CROP,
  cloneImagePresentation,
  type DesignNode,
  type ImageAdjustments,
  type ImageDesignNode,
  type ImageFrame,
  type ImagePresentation,
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
  if (node.shape === "rect" || node.shape === "rounded-rect" || node.shape === "redact") {
    return new Konva.Rect({
      ...shared,
      fill: node.shape === "redact" ? "#111111" : node.fill,
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
  if (node.shape === "curved-arrow") {
    return new Konva.Arrow({
      ...shared,
      points: [0, node.height * 0.72, node.width * 0.34, node.height * 0.08, node.width, node.height * 0.45],
      tension: 0.48,
      fill: node.fill,
      stroke: node.fill,
      strokeWidth: Math.max(8, node.height * 0.1),
      pointerLength: Math.min(node.width * 0.16, node.height * 0.48),
      pointerWidth: Math.min(node.width * 0.18, node.height * 0.52),
      lineCap: "round",
      lineJoin: "round",
    });
  }
  if (node.shape === "blur") {
    return new Konva.Rect({
      ...shared,
      fill: "rgba(255,255,255,.72)",
      stroke: "rgba(17,17,17,.16)",
      dash: [10, 7],
      cornerRadius: Math.max(node.cornerRadius, 8),
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

export function applyImageEdits(
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

export function applyImagePresentation(
  imageNode: Konva.Image,
  presentation: ImagePresentation,
): void {
  imageNode.setAttr("imagePresentation", cloneImagePresentation(presentation));
  imageNode.cornerRadius(presentation.cornerRadius);
  imageNode.strokeEnabled(false);
  imageNode.shadowEnabled(presentation.shadow.enabled && presentation.frame.type === "none");
  imageNode.shadowColor(presentation.shadow.color);
  imageNode.shadowBlur(presentation.shadow.blur);
  imageNode.shadowOffsetX(presentation.shadow.offsetX);
  imageNode.shadowOffsetY(presentation.shadow.offsetY);
  imageNode.shadowOpacity(presentation.shadow.opacity);
  const shell = imageNode.getParent()?.findOne(`#frame-shell-${imageNode.getAttr("designId")}`);
  if (shell instanceof Konva.Group) {
    updatePresentationFrameShell(shell, imageNode.width(), imageNode.height(), presentation);
    syncImageFrameShell(imageNode, shell);
  }
}

function frameIsDark(type: ImageFrame["type"]): boolean {
  return type.endsWith("-dark") || type === "arc-dark" || type === "border-dark";
}

function frameHasChrome(type: ImageFrame["type"]): boolean {
  return type.startsWith("arc-") || type.startsWith("macos-") || type.startsWith("windows-");
}

export function updatePresentationFrameShell(
  shell: Konva.Group,
  width: number,
  height: number,
  presentation: ImagePresentation,
): void {
  shell.destroyChildren();
  const frame = presentation.frame;
  const enabled = frame.type !== "none";
  shell.visible(enabled);
  shell.setAttrs({ width, height, framePresentation: { ...frame } });
  if (!enabled) return;

  const dark = frameIsDark(frame.type);
  const chrome = frameHasChrome(frame.type);
  const titleHeight = chrome ? Math.max(30, frame.padding || 30) : 0;
  const padding = chrome ? Math.max(1, frame.width) : Math.max(frame.padding, frame.width);
  const shellX = -padding;
  const shellY = -padding - titleHeight;
  const shellWidth = width + padding * 2;
  const shellHeight = height + padding * 2 + titleHeight;
  const bodyColor = frame.type === "photograph"
    ? "#ffffff"
    : frame.type.startsWith("glass-")
      ? dark ? "rgba(12,18,28,.72)" : "rgba(255,255,255,.72)"
      : frame.color;
  const strokeColor = frame.type === "outline-light" || frame.type === "border-light"
    ? "#ffffff"
    : frame.type === "border-dark"
      ? "#111111"
      : dark ? "#242424" : "#d8d8d8";
  shell.add(new Konva.Rect({
    x: shellX,
    y: shellY,
    width: shellWidth,
    height: shellHeight,
    fill: bodyColor,
    opacity: frame.opacity,
    stroke: strokeColor,
    strokeWidth: Math.max(frame.width, frame.type.startsWith("glass-") ? 2 : 1),
    cornerRadius: Math.max(4, presentation.cornerRadius + (chrome ? 8 : padding)),
    shadowEnabled: presentation.shadow.enabled,
    shadowColor: presentation.shadow.color,
    shadowBlur: presentation.shadow.blur,
    shadowOffsetX: presentation.shadow.offsetX,
    shadowOffsetY: presentation.shadow.offsetY,
    shadowOpacity: presentation.shadow.opacity,
    listening: false,
  }));

  if (!chrome) return;
  const textColor = dark ? "#f5f5f5" : "#242424";
  shell.add(new Konva.Text({
    x: shellX + 78,
    y: shellY + Math.max(8, titleHeight * 0.28),
    width: Math.max(40, shellWidth - 156),
    text: frame.title || (frame.type.startsWith("arc-") ? "glassware.app" : "GlassWare"),
    align: "center",
    fill: textColor,
    opacity: 0.82,
    fontFamily: "Arial",
    fontSize: Math.max(10, titleHeight * 0.32),
    listening: false,
  }));
  if (frame.type.startsWith("windows-")) {
    ["−", "□", "×"].forEach((symbol, index) => shell.add(new Konva.Text({
      x: shellX + shellWidth - 66 + index * 21,
      y: shellY + 7,
      width: 18,
      text: symbol,
      align: "center",
      fill: textColor,
      fontFamily: "Arial",
      fontSize: Math.max(11, titleHeight * 0.38),
      listening: false,
    })));
  } else {
    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, index) => shell.add(new Konva.Circle({
      x: shellX + 18 + index * 19,
      y: shellY + titleHeight / 2,
      radius: Math.max(4, titleHeight * 0.14),
      fill: color,
      listening: false,
    })));
  }
}

export function syncImageFrameShell(imageNode: Konva.Image, shell: Konva.Group): void {
  shell.setAttrs({
    x: imageNode.x(),
    y: imageNode.y(),
    rotation: imageNode.rotation(),
    scaleX: imageNode.scaleX(),
    scaleY: imageNode.scaleY(),
    opacity: imageNode.opacity(),
    visible: imageNode.visible() && imageNode.getAttr("imagePresentation")?.frame?.type !== "none",
  });
}

export function createImageFrameShell(
  imageNode: Konva.Image,
  presentation: ImagePresentation,
): Konva.Group {
  const shell = new Konva.Group({
    id: `frame-shell-${imageNode.getAttr("designId")}`,
    listening: false,
  });
  updatePresentationFrameShell(shell, imageNode.width(), imageNode.height(), presentation);
  syncImageFrameShell(imageNode, shell);
  imageNode.on("xChange.frameShell yChange.frameShell widthChange.frameShell heightChange.frameShell rotationChange.frameShell scaleXChange.frameShell scaleYChange.frameShell opacityChange.frameShell visibleChange.frameShell", () => {
    updatePresentationFrameShell(
      shell,
      imageNode.width(),
      imageNode.height(),
      imageNode.getAttr("imagePresentation") ?? presentation,
    );
    syncImageFrameShell(imageNode, shell);
  });
  return shell;
}

async function createBlurRegionNode(
  node: ShapeDesignNode,
  source?: Konva.Container,
): Promise<Konva.Shape> {
  if (!source) return createShapeNode(node);
  source.draw();
  const snapshot = source.toCanvas({
    x: node.x,
    y: node.y,
    width: Math.max(1, node.width),
    height: Math.max(1, node.height),
    pixelRatio: 1,
  });
  const blur = new Konva.Image({
    ...commonAttributes(node),
    image: snapshot,
    designFill: node.fill,
    designShape: node.shape,
  });
  blur.cache({ pixelRatio: 1 });
  blur.blurRadius(18);
  blur.filters([Konva.Filters.Blur]);
  return blur;
}

export async function designNodeToKonva(
  node: DesignNode,
  resolveAsset: AssetResolver,
  blurSource?: Konva.Container,
): Promise<Konva.Shape> {
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
    if (node.shape === "blur") return createBlurRegionNode(node, blurSource);
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
      imagePresentation: cloneImagePresentation(node.presentation),
      missingAsset: true,
    });
  }
  const imageNode = new Konva.Image({
    ...commonAttributes(node),
    image: await loadImage(asset.blob),
    assetId: node.assetId,
  });
  applyImageEdits(imageNode, node.crop, node.adjustments);
  applyImagePresentation(imageNode, node.presentation);
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
    presentation: cloneImagePresentation(node.getAttr("imagePresentation") ?? DEFAULT_IMAGE_PRESENTATION),
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
