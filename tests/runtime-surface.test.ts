import { describe, expect, it } from "vitest";
import { hostedGlassWareUrl, isExtensionSurface } from "../src/lib/runtime-surface";

describe("runtime surface", () => {
  it("recognizes Chromium and Firefox extension pages", () => {
    expect(isExtensionSurface("chrome-extension:")).toBe(true);
    expect(isExtensionSurface("moz-extension:")).toBe(true);
    expect(isExtensionSurface("https:")).toBe(false);
  });

  it("creates a narrow hosted-app handoff", () => {
    const url = new URL(hostedGlassWareUrl("ai"));
    expect(url.origin).toBe("https://labs.wiplash.ai");
    expect(url.pathname).toBe("/glassware/app.html");
    expect(url.searchParams.get("from")).toBe("extension");
    expect(url.searchParams.get("intent")).toBe("ai");
  });
});
