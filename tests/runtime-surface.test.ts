import { describe, expect, it } from "vitest";
import { isExtensionSurface } from "../src/lib/runtime-surface";

describe("runtime surface", () => {
  it("recognizes Chromium and Firefox extension pages", () => {
    expect(isExtensionSurface("chrome-extension:")).toBe(true);
    expect(isExtensionSurface("moz-extension:")).toBe(true);
    expect(isExtensionSurface("https:")).toBe(false);
  });
});
