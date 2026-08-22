import type { NormalizedCrop } from "./model";

export type CropHandle = "nw" | "ne" | "sw" | "se";

const MIN_CROP_SIZE = 0.04;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function moveCrop(crop: NormalizedCrop, deltaX: number, deltaY: number): NormalizedCrop {
  return {
    ...crop,
    x: clamp(crop.x + deltaX, 0, 1 - crop.width),
    y: clamp(crop.y + deltaY, 0, 1 - crop.height),
  };
}

export function resizeCrop(
  crop: NormalizedCrop,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
): NormalizedCrop {
  let left = crop.x;
  let top = crop.y;
  let right = crop.x + crop.width;
  let bottom = crop.y + crop.height;

  if (handle.includes("w")) left = clamp(left + deltaX, 0, right - MIN_CROP_SIZE);
  if (handle.includes("e")) right = clamp(right + deltaX, left + MIN_CROP_SIZE, 1);
  if (handle.includes("n")) top = clamp(top + deltaY, 0, bottom - MIN_CROP_SIZE);
  if (handle.includes("s")) bottom = clamp(bottom + deltaY, top + MIN_CROP_SIZE, 1);

  return { x: left, y: top, width: right - left, height: bottom - top };
}
