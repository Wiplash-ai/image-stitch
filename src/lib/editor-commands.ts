import type { CanvasSettings, DesignNode } from "./model";

export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributionAxis = "horizontal" | "vertical";
export type AlignmentReference = "selection" | "canvas";

function size(node: DesignNode) {
  return { width: Math.abs(node.width * node.scaleX), height: Math.abs(node.height * node.scaleY) };
}

function bounds(nodes: DesignNode[]) {
  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  const right = Math.max(...nodes.map((node) => node.x + size(node).width));
  const bottom = Math.max(...nodes.map((node) => node.y + size(node).height));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function selectionForObject(objects: DesignNode[], objectId: string): string[] {
  const selected = objects.find((object) => object.id === objectId);
  if (!selected?.groupId) return selected ? [selected.id] : [];
  return objects.filter((object) => object.groupId === selected.groupId).map((object) => object.id);
}

export function alignObjects(
  objects: DesignNode[],
  selectedIds: string[],
  canvas: CanvasSettings,
  alignment: Alignment,
  reference: AlignmentReference = "selection",
): DesignNode[] {
  const ids = new Set(selectedIds);
  const selected = objects.filter((object) => ids.has(object.id) && !object.locked);
  if (!selected.length) return objects;
  const box = bounds(selected);
  const target = reference === "canvas"
    ? { left: 0, top: 0, right: canvas.width, bottom: canvas.height, width: canvas.width, height: canvas.height }
    : box;
  return objects.map((object) => {
    if (!ids.has(object.id) || object.locked) return object;
    const objectSize = size(object);
    if (alignment === "left") return { ...object, x: target.left };
    if (alignment === "center") return { ...object, x: target.left + (target.width - objectSize.width) / 2 };
    if (alignment === "right") return { ...object, x: target.right - objectSize.width };
    if (alignment === "top") return { ...object, y: target.top };
    if (alignment === "middle") return { ...object, y: target.top + (target.height - objectSize.height) / 2 };
    return { ...object, y: target.bottom - objectSize.height };
  });
}

export function distributeObjects(objects: DesignNode[], selectedIds: string[], axis: DistributionAxis): DesignNode[] {
  const ids = new Set(selectedIds);
  const selected = objects.filter((object) => ids.has(object.id) && !object.locked);
  if (selected.length < 3) return objects;
  const sorted = [...selected].sort((left, right) => axis === "horizontal" ? left.x - right.x : left.y - right.y);
  const first = sorted[0];
  const last = sorted.at(-1)!;
  const totalSize = sorted.reduce((total, object) => total + (axis === "horizontal" ? size(object).width : size(object).height), 0);
  const start = axis === "horizontal" ? first.x : first.y;
  const end = axis === "horizontal" ? last.x + size(last).width : last.y + size(last).height;
  const gap = (end - start - totalSize) / (sorted.length - 1);
  const positions = new Map<string, number>();
  let cursor = start;
  for (const object of sorted) {
    positions.set(object.id, cursor);
    cursor += (axis === "horizontal" ? size(object).width : size(object).height) + gap;
  }
  return objects.map((object) => {
    const position = positions.get(object.id);
    if (position === undefined) return object;
    return axis === "horizontal" ? { ...object, x: position } : { ...object, y: position };
  });
}

export function groupObjects(objects: DesignNode[], selectedIds: string[], groupId: string): DesignNode[] {
  const ids = new Set(selectedIds);
  if (ids.size < 2) return objects;
  return objects.map((object) => ids.has(object.id) && !object.locked ? { ...object, groupId } : object);
}

export function ungroupObjects(objects: DesignNode[], selectedIds: string[]): DesignNode[] {
  const selectedGroups = new Set(objects.filter((object) => selectedIds.includes(object.id) && object.groupId).map((object) => object.groupId));
  if (!selectedGroups.size) return objects;
  return objects.map((object) => object.groupId && selectedGroups.has(object.groupId) ? { ...object, groupId: undefined } : object);
}
