import { describe, expect, it, vi } from "vitest";
import { openverseAssetSource, searchOpenverseImages } from "../src/lib/openverse";

describe("Openverse image search", () => {
  it("requests a small reusable-license result set and normalizes source metadata", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      results: [{
        id: "11111111-1111-4111-8111-111111111111",
        title: "Garden flower",
        creator: "A Photographer",
        creator_url: "https://example.com/person",
        license: "by",
        license_url: "https://creativecommons.org/licenses/by/4.0/",
        attribution: "Garden flower by A Photographer, CC BY 4.0.",
        thumbnail: "https://api.openverse.org/thumb.jpg",
        foreign_landing_url: "https://example.com/flower",
        width: 1200,
        height: 800,
      }],
    }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

    const [image] = await searchOpenverseImages("garden flowers", fetcher);
    const requestUrl = String(vi.mocked(fetcher).mock.calls[0][0]);
    expect(requestUrl).toContain("q=garden+flowers");
    expect(requestUrl).toContain("license=cc0%2Cpdm%2Cby");
    expect(requestUrl).toContain("mature=false");
    expect(image).toMatchObject({ title: "Garden flower", creator: "A Photographer", license: "BY" });
    expect(openverseAssetSource(image)).toEqual({
      provider: "openverse",
      sourceUrl: "https://example.com/flower",
      creator: "A Photographer",
      creatorUrl: "https://example.com/person",
      license: "BY",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Garden flower by A Photographer, CC BY 4.0.",
    });
  });

  it("turns rate limiting into a useful editor message", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 429 })) as unknown as typeof fetch;
    await expect(searchOpenverseImages("flowers", fetcher)).rejects.toThrow("busy");
  });
});
