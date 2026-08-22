import { newId, normalizeProject, type DesignNode, type GlassWareProject } from "./model";
import {
  dataUrlToBlob,
  listAssets,
  listComponents,
  listFontAssets,
  type StoredAsset,
  type StoredFontAsset,
  type StoredFontFace,
  type StoredComponent,
} from "./storage";

const BUNDLE_SCHEMA = "glassware.bundle.v1" as const;
const LEGACY_BUNDLE_SCHEMA = "imagestitch.bundle.v1";

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
  project: GlassWareProject;
  assets: PortableAsset[];
  fonts?: PortableFont[];
  components?: StoredComponent[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to encode project asset"));
    reader.readAsDataURL(blob);
  });
}

export async function buildProjectBundle(project: GlassWareProject): Promise<ProjectBundle> {
  const assets = await listAssets(project.id);
  const usedFamilies = new Set(project.pages.flatMap((page) => page.objects.filter((object) => object.kind === "text").map((object) => object.fontFamily)));
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
    components: await listComponents(project.id),
  };
}

function remapNode(node: DesignNode, assetIds: Map<string, string>): DesignNode {
  return node.kind === "image" ? { ...node, assetId: assetIds.get(node.assetId) ?? node.assetId } : { ...node };
}

export async function readProjectBundle(text: string): Promise<{
  project: GlassWareProject;
  assets: StoredAsset[];
  fonts: StoredFontAsset[];
  components: StoredComponent[];
}> {
  const parsed = JSON.parse(text) as Partial<ProjectBundle>;
  if (![BUNDLE_SCHEMA, LEGACY_BUNDLE_SCHEMA].includes(String(parsed.schemaVersion)) || !parsed.project || !Array.isArray(parsed.assets)) {
    throw new Error("This is not a valid GlassWare project bundle.");
  }
  const source = normalizeProject(parsed.project);
  if (!source) throw new Error("The project inside this bundle is invalid.");

  const projectId = newId();
  const assetIds = new Map(parsed.assets.map((asset) => [asset.id, newId()]));
  const historicalPageIds = source.revisions.flatMap((revision) => revision.aiProjectTransaction
    ? [...revision.aiProjectTransaction.before.pages, ...revision.aiProjectTransaction.after.pages].map((page) => page.id)
    : []);
  const pageIds = new Map([...new Set([...source.pages.map((page) => page.id), ...historicalPageIds])].map((pageId) => [pageId, newId()]));
  const revisionIds = new Map(source.revisions.map((revision) => [revision.id, newId()]));
  const aiSessionIds = new Map(source.revisions.flatMap((revision) => [revision.aiProjectTransaction?.id, revision.aiSessionId].filter((id): id is string => Boolean(id))).map((id) => [id, newId()]));
  const objects = source.objects.map((node) => remapNode(node, assetIds));
  const remapDocumentState = (state: NonNullable<GlassWareProject["revisions"][number]["aiProjectTransaction"]>["before"]) => ({
    activePageId: pageIds.get(state.activePageId) ?? state.activePageId,
    pages: state.pages.map((page) => ({
      ...page,
      id: pageIds.get(page.id) ?? page.id,
      objects: page.objects.map((node) => remapNode(node, assetIds)),
      currentRevisionId: revisionIds.get(page.currentRevisionId) ?? page.currentRevisionId,
    })),
  });
  const revisions = source.revisions.map((revision) => ({
    ...revision,
    id: revisionIds.get(revision.id)!,
    pageId: pageIds.get(revision.pageId) ?? revision.pageId,
    snapshot: {
      canvas: { ...revision.snapshot.canvas },
      objects: revision.snapshot.objects.map((node) => remapNode(node, assetIds)),
    },
    ...(revision.aiProjectTransaction ? {
      aiProjectTransaction: {
        id: aiSessionIds.get(revision.aiProjectTransaction.id) ?? newId(),
        before: remapDocumentState(revision.aiProjectTransaction.before),
        after: remapDocumentState(revision.aiProjectTransaction.after),
      },
    } : {}),
    ...(revision.aiSessionId ? { aiSessionId: aiSessionIds.get(revision.aiSessionId) ?? revision.aiSessionId } : {}),
  }));
  const pages = source.pages.map((page) => ({
    ...page,
    id: pageIds.get(page.id)!,
    objects: page.objects.map((node) => remapNode(node, assetIds)),
    currentRevisionId: revisionIds.get(page.currentRevisionId) ?? page.currentRevisionId,
  }));
  const importedAt = new Date().toISOString();
  const project: GlassWareProject = {
    ...source,
    id: projectId,
    name: `${source.name} copy`,
    createdAt: importedAt,
    updatedAt: importedAt,
    objects,
    pages,
    activePageId: pageIds.get(source.activePageId) ?? pages[0].id,
    revisions,
    currentRevisionId: revisionIds.get(source.currentRevisionId) ?? pages.find((page) => page.id === (pageIds.get(source.activePageId) ?? pages[0].id))?.currentRevisionId ?? revisions.at(-1)!.id,
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
  const components = (parsed.components ?? []).map((component) => ({
    ...component,
    id: newId(),
    projectId,
    objects: component.objects.map((node) => remapNode(node, assetIds)),
  }));
  return { project, assets, fonts, components };
}

export async function restoreCloudProjectBundle(bundle: ProjectBundle): Promise<{
  project: GlassWareProject;
  assets: StoredAsset[];
  fonts: StoredFontAsset[];
  components: StoredComponent[];
}> {
  if (bundle.schemaVersion !== BUNDLE_SCHEMA || !bundle.project || !Array.isArray(bundle.assets)) {
    throw new Error("This is not a valid GlassWare cloud project.");
  }
  const project = normalizeProject(bundle.project);
  if (!project) throw new Error("The cloud project manifest is invalid.");
  const assets = await Promise.all(bundle.assets.map(async (asset) => {
    if (!asset.dataUrl || asset.projectId !== project.id) throw new Error("A cloud project asset is incomplete.");
    const { dataUrl, ...metadata } = asset;
    const blob = await dataUrlToBlob(dataUrl);
    return {
      ...metadata,
      mimeType: blob.type || metadata.mimeType,
      size: blob.size,
      blob,
    };
  }));
  const fonts = await Promise.all((bundle.fonts ?? []).map(async (font) => ({
    ...font,
    faces: await Promise.all(font.faces.map(async (face) => {
      const { dataUrl, ...metadata } = face;
      const blob = await dataUrlToBlob(dataUrl);
      return { ...metadata, mimeType: blob.type || metadata.mimeType, size: blob.size, blob };
    })),
  })));
  const components = (bundle.components ?? []).filter((component) => component.projectId === project.id);
  return { project, assets, fonts, components };
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
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "glassware";
}
