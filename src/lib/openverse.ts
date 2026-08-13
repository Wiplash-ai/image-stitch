import type { AssetSource } from "./storage";

const OPENVERSE_IMAGES_API = "https://api.openverse.org/v1/images/";
const REUSABLE_LICENSES = "cc0,pdm,by";

export interface OpenverseImage {
  id: string;
  title: string;
  creator: string;
  creatorUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
  thumbnailUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

interface OpenverseSearchResponse {
  results?: Array<Record<string, unknown>>;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeResult(value: Record<string, unknown>): OpenverseImage | null {
  const id = text(value.id);
  const thumbnailUrl = text(value.thumbnail);
  const sourceUrl = text(value.foreign_landing_url);
  const license = text(value.license).toUpperCase();
  if (!id || !thumbnailUrl || !sourceUrl || !license) return null;
  return {
    id,
    title: text(value.title, "Untitled image"),
    creator: text(value.creator, "Unknown creator"),
    creatorUrl: text(value.creator_url) || undefined,
    license,
    licenseUrl: text(value.license_url) || undefined,
    attribution: text(value.attribution, `License: ${license}`),
    thumbnailUrl,
    sourceUrl,
    width: typeof value.width === "number" ? value.width : undefined,
    height: typeof value.height === "number" ? value.height : undefined,
  };
}

export async function searchOpenverseImages(
  query: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<OpenverseImage[]> {
  const normalizedQuery = query.trim().slice(0, 200);
  if (!normalizedQuery) return [];
  const parameters = new URLSearchParams({
    q: normalizedQuery,
    license: REUSABLE_LICENSES,
    mature: "false",
    page_size: "12",
  });
  const response = await fetcher(`${OPENVERSE_IMAGES_API}?${parameters}`, { signal });
  if (response.status === 429) throw new Error("Open image search is busy. Please wait a minute and try again.");
  if (!response.ok) throw new Error("Open image search is unavailable right now.");
  const payload = await response.json() as OpenverseSearchResponse;
  return (payload.results ?? []).map(normalizeResult).filter((result): result is OpenverseImage => Boolean(result));
}

export async function downloadOpenverseImage(
  image: OpenverseImage,
  fetcher: typeof fetch = fetch,
): Promise<File> {
  const response = await fetcher(`${OPENVERSE_IMAGES_API}${encodeURIComponent(image.id)}/thumb/?full_size=true`);
  if (!response.ok) throw new Error("That image could not be downloaded from its source.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The image source returned an unsupported file.");
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const filename = `${image.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "open-image"}.${extension}`;
  return new File([blob], filename, { type: blob.type });
}

export function openverseAssetSource(image: OpenverseImage): AssetSource {
  return {
    provider: "openverse",
    sourceUrl: image.sourceUrl,
    creator: image.creator,
    creatorUrl: image.creatorUrl,
    license: image.license,
    licenseUrl: image.licenseUrl,
    attribution: image.attribution,
  };
}
