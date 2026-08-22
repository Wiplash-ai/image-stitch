import { describe, expect, it } from "vitest";
import { moveCrop, resizeCrop } from "../src/lib/image-geometry";

describe("image crop geometry", () => {
  it("moves a crop without letting it leave the source image", () => {
    expect(moveCrop({ x: 0.2, y: 0.2, width: 0.5, height: 0.4 }, 0.8, -0.5)).toEqual({
      x: 0.5, y: 0, width: 0.5, height: 0.4,
    });
  });

  it("resizes each edge while preserving a usable crop", () => {
    expect(resizeCrop({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 }, "se", 0.5, 0.5)).toEqual({
      x: 0.2, y: 0.2, width: 0.8, height: 0.8,
    });
    const tiny = resizeCrop({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 }, "nw", 0.9, 0.9);
    expect(tiny.width).toBeCloseTo(0.04);
    expect(tiny.height).toBeCloseTo(0.04);
  });
});
