import { createProject, normalizeProject, type GlassWareProject } from "./model";

// Keep the original database name so an in-place upgrade retains local projects and assets.
const DATABASE_NAME = "imagestitch";
const DATABASE_VERSION = 2;
const PROJECT_STORE = "projects";
const ASSET_STORE = "assets";
const FONT_STORE = "fonts";
const SETTING_STORE = "settings";
const ACTIVE_PROJECT_KEY = "activeProjectId";
const LEGACY_PROJECT_KEYS = ["glassware.project.v1", "imagestitch.project.v1"] as const;
const CAPTURE_KEY = "glassware.pendingCapture.v1";
const LEGACY_CAPTURE_KEY = "imagestitch.pendingCapture.v1";

export interface AssetSource {
  provider: "openverse";
  sourceUrl: string;
  creator?: string;
  creatorUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
}

export interface StoredAsset {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
  source?: AssetSource;
  blob: Blob;
}

export interface StoredFontFace {
  mimeType: string;
  size: number;
  style: string;
  weight: string;
  unicodeRange?: string;
  blob: Blob;
}

export interface StoredFontAsset {
  id: string;
  family: string;
  name: string;
  source: "upload" | "google";
  sourceUrl?: string;
  license: string;
  createdAt: string;
  faces: StoredFontFace[];
}

interface StoredSetting {
  key: string;
  value: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        database.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const assets = database.createObjectStore(ASSET_STORE, { keyPath: "id" });
        assets.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(FONT_STORE)) {
        database.createObjectStore(FONT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SETTING_STORE)) {
        database.createObjectStore(SETTING_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("Unable to open the GlassWare database"));
    };
  });
  return databasePromise;
}

export async function saveProject(project: GlassWareProject): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([PROJECT_STORE, SETTING_STORE], "readwrite");
  transaction.objectStore(PROJECT_STORE).put(project);
  transaction.objectStore(SETTING_STORE).put({ key: ACTIVE_PROJECT_KEY, value: project.id } satisfies StoredSetting);
  await transactionComplete(transaction);
}

export async function loadProject(projectId: string): Promise<GlassWareProject | null> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECT_STORE, "readonly");
  const value = await requestResult(transaction.objectStore(PROJECT_STORE).get(projectId));
  return normalizeProject(value);
}

export async function listProjects(): Promise<GlassWareProject[]> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECT_STORE, "readonly");
  const values = await requestResult(transaction.objectStore(PROJECT_STORE).getAll());
  return values
    .map(normalizeProject)
    .filter((project): project is GlassWareProject => Boolean(project))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function loadActiveProjectId(): Promise<string | null> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTING_STORE, "readonly");
  const setting = (await requestResult(
    transaction.objectStore(SETTING_STORE).get(ACTIVE_PROJECT_KEY),
  )) as StoredSetting | undefined;
  return setting?.value ?? null;
}

function loadLegacyProject(): GlassWareProject | null {
  try {
    for (const key of LEGACY_PROJECT_KEYS) {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw) return normalizeProject(JSON.parse(raw));
    }
    return null;
  } catch {
    return null;
  }
}

export async function bootstrapProject(): Promise<GlassWareProject> {
  const activeProjectId = await loadActiveProjectId();
  if (activeProjectId) {
    const activeProject = await loadProject(activeProjectId);
    if (activeProject) return activeProject;
  }

  const projects = await listProjects();
  if (projects[0]) {
    await saveProject(projects[0]);
    return projects[0];
  }

  const project = loadLegacyProject() ?? createProject();
  await saveProject(project);
  try {
    LEGACY_PROJECT_KEYS.forEach((key) => globalThis.localStorage?.removeItem(key));
  } catch {
    // Private browsing can expose localStorage while still rejecting writes.
  }
  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([PROJECT_STORE, ASSET_STORE], "readwrite");
  transaction.objectStore(PROJECT_STORE).delete(projectId);
  const index = transaction.objectStore(ASSET_STORE).index("projectId");
  const keys = await requestResult(index.getAllKeys(projectId));
  for (const key of keys) transaction.objectStore(ASSET_STORE).delete(key);
  await transactionComplete(transaction);
}

export async function saveAsset(asset: StoredAsset): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readwrite");
  transaction.objectStore(ASSET_STORE).put(asset);
  await transactionComplete(transaction);
}

export async function loadAsset(assetId: string): Promise<StoredAsset | null> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readonly");
  const asset = await requestResult(transaction.objectStore(ASSET_STORE).get(assetId));
  return (asset as StoredAsset | undefined) ?? null;
}

export async function listAssets(projectId: string): Promise<StoredAsset[]> {
  const database = await openDatabase();
  const transaction = database.transaction(ASSET_STORE, "readonly");
  const assets = await requestResult(transaction.objectStore(ASSET_STORE).index("projectId").getAll(projectId));
  return assets as StoredAsset[];
}

export async function saveFontAsset(font: StoredFontAsset): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(FONT_STORE, "readwrite");
  transaction.objectStore(FONT_STORE).put(font);
  await transactionComplete(transaction);
}

export async function listFontAssets(): Promise<StoredFontAsset[]> {
  const database = await openDatabase();
  const transaction = database.transaction(FONT_STORE, "readonly");
  const fonts = await requestResult(transaction.objectStore(FONT_STORE).getAll());
  return (fonts as StoredFontAsset[]).sort((a, b) => a.family.localeCompare(b.family));
}

export async function createStoredAsset(
  projectId: string,
  file: Blob & { name?: string },
  source?: AssetSource,
): Promise<StoredAsset> {
  const dimensions = await getImageDimensions(file);
  return {
    id: crypto.randomUUID(),
    projectId,
    name: file.name ?? "Pasted image",
    mimeType: file.type || "image/png",
    size: file.size,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: new Date().toISOString(),
    source,
    blob: file,
  };
}

export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function consumeExtensionCapture(): Promise<string | null> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
  const result = await chrome.storage.local.get([CAPTURE_KEY, LEGACY_CAPTURE_KEY]);
  const capture = (result[CAPTURE_KEY] ?? result[LEGACY_CAPTURE_KEY]) as { dataUrl?: string } | undefined;
  if (!capture?.dataUrl) return null;
  await chrome.storage.local.remove([CAPTURE_KEY, LEGACY_CAPTURE_KEY]);
  return capture.dataUrl;
}

export async function resetStorageForTests(): Promise<void> {
  const database = await databasePromise?.catch(() => null);
  database?.close();
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Unable to reset database"));
    request.onblocked = () => reject(new Error("Database reset was blocked"));
  });
}
