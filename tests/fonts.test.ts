import { describe, expect, it, vi } from "vitest";
import { createUploadedFont, downloadGoogleFont } from "../src/lib/fonts";

describe("local font catalog", () => {
  it("turns a user font file into a locally storable family", () => {
    const font = createUploadedFont(new File(["font"], "Mom-Display.ttf", { type: "font/ttf" }));
    expect(font).toMatchObject({ family: "Mom Display", source: "upload", name: "Mom-Display.ttf" });
    expect(font.faces[0]).toMatchObject({ size: 4, style: "normal", weight: "100 900" });
  });

  it("downloads CSS-described Google Font files for offline registration", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://fonts.googleapis.com/")) {
        return new Response(`@font-face {
          font-family: 'DM Sans';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url(https://fonts.gstatic.com/s/dmsans/v1/fixture.woff2) format('woff2');
          unicode-range: U+0000-00FF;
        }`, { status: 200, headers: { "content-type": "text/css" } });
      }
      return new Response(new Uint8Array([0, 1, 2]), { status: 200, headers: { "content-type": "font/woff2" } });
    }) as unknown as typeof fetch;

    const font = await downloadGoogleFont("DM Sans", fetcher);
    expect(font).toMatchObject({ family: "DM Sans", source: "google", license: "Open source via Google Fonts" });
    expect(font.faces).toHaveLength(1);
    expect(font.faces[0]).toMatchObject({ size: 3, style: "normal", weight: "400", unicodeRange: "U+0000-00FF" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
