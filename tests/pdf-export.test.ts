import { describe, expect, it } from "vitest";
import { buildImagePdf } from "../src/lib/pdf-export";

describe("image PDF export", () => {
  it("writes a bounded multipage PDF with JPEG image objects and metadata", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildImagePdf([
      { jpeg, pixelWidth: 1080, pixelHeight: 1080, widthPoints: 259.2, heightPoints: 259.2 },
      { jpeg, pixelWidth: 1080, pixelHeight: 1920, widthPoints: 259.2, heightPoints: 460.8 },
    ], "Mom's (proof) \\ final");
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(2);
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/Title (Mom's \\(proof\\) \\\\ final)");
    expect(text).toContain("startxref");
    expect(text.endsWith("%%EOF\n")).toBe(true);
  });

  it("rejects empty or invalid page sets", () => {
    expect(() => buildImagePdf([], "Empty")).toThrow(/at least one/);
    expect(() => buildImagePdf([{ jpeg: new Uint8Array(), pixelWidth: 1, pixelHeight: 1, widthPoints: 72, heightPoints: 72 }], "Bad")).toThrow(/invalid/);
  });
});
