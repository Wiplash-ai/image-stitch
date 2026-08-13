import Konva from "konva";
import type { DesignNode, ImageDesignNode, ShapeDesignNode, TextDesignNode } from "./model";
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
      fill: "#eaded1",
      stroke: "#bd4c38",
      dash: [12, 8],
      assetId: node.assetId,
      missingAsset: true,
    });
  }
  return new Konva.Image({
    ...commonAttributes(node),
    image: await loadImage(asset.blob),
    assetId: node.assetId,
  });
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
      fill: String(text.fill() || "#19352e"),
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
      fill: String(shape.fill() || "#db5d3f"),
      cornerRadius: node instanceof Konva.Rect ? Number(node.cornerRadius()) : 0,
    } satisfies ShapeDesignNode;
  }
  return {
    ...readCommon(node),
    kind: "image",
    assetId: String(node.getAttr("assetId")),
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
