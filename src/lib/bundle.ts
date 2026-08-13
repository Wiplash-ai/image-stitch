import { newId, normalizeProject, type DesignNode, type ImageStitchProject } from "./model";
import {
  dataUrlToBlob,
  listAssets,
  listFontAssets,
  type StoredAsset,
  type StoredFontAsset,
  type StoredFontFace,
} from "./storage";

const BUNDLE_SCHEMA = "imagestitch.bundle.v1" as const;

interface PortableAsset extends Omit<StoredAsset, "blob"> {
  dataUrl: string;
}

interface PortableFontFace extends Omit<StoredFontFace, "blob"> {
  dataUrl: string;
}

interface PortableFont extends Omit<StoredFontAsset, "faces"> {
  faces: PortableFontFace[];
}

export interface ProjectBundle {
  schemaVersion: typeof BUNDLE_SCHEMA;
  exportedAt: string;
  project: ImageStitchProject;
  assets: PortableAsset[];
  fonts?: PortableFont[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to encode project asset"));
    reader.readAsDataURL(blob);
  });
}

export async function buildProjectBundle(project: ImageStitchProject): Promise<ProjectBundle> {
  const assets = await listAssets(project.id);
  const usedFamilies = new Set(project.objects.filter((object) => object.kind === "text").map((object) => object.fontFamily));
  const fonts = (await listFontAssets()).filter((font) => usedFamilies.has(font.family));
  return {
    schemaVersion: BUNDLE_SCHEMA,
    exportedAt: new Date().toISOString(),
    project,
    assets: await Promise.all(
      assets.map(async ({ blob, ...asset }) => ({ ...asset, dataUrl: await blobToDataUrl(blob) })),
    ),
    fonts: await Promise.all(fonts.map(async (font) => ({
      ...font,
      faces: await Promise.all(font.faces.map(async ({ blob, ...face }) => ({ ...face, dataUrl: await blobToDataUrl(blob) }))),
    }))),
  };
}

function remapNode(node: DesignNode, assetIds: Map<string, string>): DesignNode {
  return node.kind === "image" ? { ...node, assetId: assetIds.get(node.assetId) ?? node.assetId } : { ...node };
}

export async function readProjectBundle(text: string): Promise<{
  project: ImageStitchProject;
  assets: StoredAsset[];
  fonts: StoredFontAsset[];
}> {
  const parsed = JSON.parse(text) as Partial<ProjectBundle>;
  if (parsed.schemaVersion !== BUNDLE_SCHEMA || !parsed.project || !Array.isArray(parsed.assets)) {
    throw new Error("This is not a valid ImageStitch project bundle.");
  }
  const source = normalizeProject(parsed.project);
  if (!source) throw new Error("The project inside this bundle is invalid.");

  const projectId = newId();
  const assetIds = new Map(parsed.assets.map((asset) => [asset.id, newId()]));
  const objects = source.objects.map((node) => remapNode(node, assetIds));
  const revisions = source.revisions.map((revision) => ({
    ...revision,
    id: newId(),
    snapshot: {
      canvas: { ...revision.snapshot.canvas },
      objects: revision.snapshot.objects.map((node) => remapNode(node, assetIds)),
    },
  }));
  const currentRevisionIndex = source.revisions.findIndex((revision) => revision.id === source.currentRevisionId);
  const importedAt = new Date().toISOString();
  const project: ImageStitchProject = {
    ...source,
    id: projectId,
    name: `${source.name} copy`,
    createdAt: importedAt,
    updatedAt: importedAt,
    objects,
    revisions,
    currentRevisionId: revisions[Math.max(0, currentRevisionIndex)]?.id ?? revisions.at(-1)!.id,
  };
  const assets = await Promise.all(
    parsed.assets.map(async (asset) => {
      if (!asset.dataUrl || !assetIds.has(asset.id)) throw new Error("A project asset is incomplete.");
      const { dataUrl, ...metadata } = asset;
      const blob = await dataUrlToBlob(dataUrl);
      return {
        ...metadata,
        id: assetIds.get(asset.id)!,
        projectId,
        mimeType: blob.type || metadata.mimeType,
        size: blob.size,
        blob,
      };
    }),
  );
  const fonts = await Promise.all((parsed.fonts ?? []).map(async (font) => ({
    ...font,
    faces: await Promise.all(font.faces.map(async (face) => {
      const { dataUrl, ...metadata } = face;
      const blob = await dataUrlToBlob(dataUrl);
      return { ...metadata, mimeType: blob.type || metadata.mimeType, size: blob.size, blob };
    })),
  })));
  return { project, assets, fonts };
}

export function downloadTextFile(contents: string, filename: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeFilename(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image-stitch";
}
