import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  FULL_IMAGE_CROP,
  type ImageAdjustments,
  type NormalizedCrop,
} from "./model";

export type PhotoPreset = "original" | "warm" | "punch" | "mono" | "vintage";

export const PHOTO_PRESETS: Record<PhotoPreset, ImageAdjustments> = {
  original: { ...DEFAULT_IMAGE_ADJUSTMENTS },
  warm: { ...DEFAULT_IMAGE_ADJUSTMENTS, brightness: 0.06, contrast: 8, saturation: 0.2, temperature: 0.32 },
  punch: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 22, saturation: 0.35, sharpen: 0.18 },
  mono: { ...DEFAULT_IMAGE_ADJUSTMENTS, contrast: 12, grayscale: true },
  vintage: { ...DEFAULT_IMAGE_ADJUSTMENTS, brightness: 0.03, contrast: -8, saturation: -0.25, temperature: 0.18, sepia: true, vignette: 0.24 },
};

export function centerCropForAspect(sourceWidth: number, sourceHeight: number, targetAspect: number): NormalizedCrop {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetAspect <= 0) return { ...FULL_IMAGE_CROP };
  const sourceAspect = sourceWidth / sourceHeight;
  if (Math.abs(sourceAspect - targetAspect) < 0.0001) return { ...FULL_IMAGE_CROP };
  if (sourceAspect > targetAspect) {
    const width = targetAspect / sourceAspect;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  const height = sourceAspect / targetAspect;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
}

export function fitDisplayBoxToAspect(
  box: { x: number; y: number; width: number; height: number },
  targetAspect: number,
): { x: number; y: number; width: number; height: number } {
  if (targetAspect <= 0 || box.width <= 0 || box.height <= 0) return { ...box };
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const currentAspect = box.width / box.height;
  const width = currentAspect > targetAspect ? box.height * targetAspect : box.width;
  const height = currentAspect > targetAspect ? box.height : box.width / targetAspect;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}
