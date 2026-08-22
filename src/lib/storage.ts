import { createProject, normalizeProject, type DesignNode, type GlassWareProject } from "./model";

// Keep the original database name so an in-place upgrade retains local projects and assets.
const DATABASE_NAME = "imagestitch";
const DATABASE_VERSION = 5;
const PROJECT_STORE = "projects";
const ASSET_STORE = "assets";
const FONT_STORE = "fonts";
const SETTING_STORE = "settings";
const AI_CONVERSATION_STORE = "aiConversations";
const BRAND_KIT_STORE = "brandKits";
const COMPONENT_STORE = "components";
const AI_RUN_STORE = "aiRuns";
const ACTIVE_PROJECT_KEY = "activeProjectId";
const LEGACY_PROJECT_KEYS = ["glassware.project.v1", "imagestitch.project.v1"] as const;
const CAPTURE_KEY = "glassware.pendingCapture.v1";
const LEGACY_CAPTURE_KEY = "imagestitch.pendingCapture.v1";

export interface OpenverseAssetSource {
  provider: "openverse";
  sourceUrl: string;
  creator?: string;
  creatorUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
}

export interface AiEditedAssetSource {
  provider: "glassware-ai-edit";
  connectionKind: "chatgpt_codex_plugin" | "openai_api";
  model: string;
  parentAssetId: string;
  createdAt: string;
}

export type AssetSource = OpenverseAssetSource | AiEditedAssetSource;

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

export interface StoredAiConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "sent" | "running" | "completed" | "failed";
  detail?: string;
  createdAt: string;
}

export interface StoredAiConversation {
  id: string;
  projectId: string;
  projectName?: string;
  accountId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredAiConversationMessage[];
  agentSessionId?: string;
  connectionId?: string;
  model?: string;
  reasoningEffort?: string;
}

export interface StoredAiPassReceipt {
  pass: number;
  jobId?: string;
  status: "applied" | "completed" | "cancelled" | "failed" | "stale";
  startedAt: string;
  finishedAt: string;
  summary: string;
  assessment: string;
  appliedOperations: string[];
  skippedOperations: string[];
  qualityFindings: string[];
  usage?: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  };
}

export interface StoredAiRun {
  id: string;
  projectId: string;
  baseRevisionId: string;
  status: "running" | "completed" | "cancelled" | "failed" | "stale";
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  currentPass: number;
  activeJobId?: string;
  prompt: string;
  connectionId: string;
  model: string;
  reasoningEffort: string;
  agentSessionId?: string;
  completedSteps: string[];
  receipts: StoredAiPassReceipt[];
  originalProject: GlassWareProject;
  draftProject: GlassWareProject;
}

export interface StoredBrandKit {
  id: string;
  name: string;
  colors: string[];
  fontFamilies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredComponent {
  id: string;
  projectId: string;
  name: string;
  objects: DesignNode[];
  createdAt: string;
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
      if (!database.objectStoreNames.contains(AI_CONVERSATION_STORE)) {
        const conversations = database.createObjectStore(AI_CONVERSATION_STORE, { keyPath: "id" });
        conversations.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(BRAND_KIT_STORE)) {
        database.createObjectStore(BRAND_KIT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(COMPONENT_STORE)) {
        const components = database.createObjectStore(COMPONENT_STORE, { keyPath: "id" });
        components.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(AI_RUN_STORE)) {
        const runs = database.createObjectStore(AI_RUN_STORE, { keyPath: "id" });
        runs.createIndex("projectId", "projectId", { unique: false });
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
  const transaction = database.transaction([PROJECT_STORE, ASSET_STORE, AI_CONVERSATION_STORE, COMPONENT_STORE, AI_RUN_STORE], "readwrite");
  transaction.objectStore(PROJECT_STORE).delete(projectId);
  const index = transaction.objectStore(ASSET_STORE).index("projectId");
  const keys = await requestResult(index.getAllKeys(projectId));
  for (const key of keys) transaction.objectStore(ASSET_STORE).delete(key);
  const conversationIndex = transaction.objectStore(AI_CONVERSATION_STORE).index("projectId");
  const conversationKeys = await requestResult(conversationIndex.getAllKeys(projectId));
  for (const key of conversationKeys) transaction.objectStore(AI_CONVERSATION_STORE).delete(key);
  const componentIndex = transaction.objectStore(COMPONENT_STORE).index("projectId");
  const componentKeys = await requestResult(componentIndex.getAllKeys(projectId));
  for (const key of componentKeys) transaction.objectStore(COMPONENT_STORE).delete(key);
  const runIndex = transaction.objectStore(AI_RUN_STORE).index("projectId");
  const runKeys = await requestResult(runIndex.getAllKeys(projectId));
  for (const key of runKeys) transaction.objectStore(AI_RUN_STORE).delete(key);
  await transactionComplete(transaction);
}

export async function saveAiRun(run: StoredAiRun): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_RUN_STORE, "readwrite");
  transaction.objectStore(AI_RUN_STORE).put(run);
  await transactionComplete(transaction);
}

export async function loadAiRun(runId: string): Promise<StoredAiRun | null> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_RUN_STORE, "readonly");
  const run = await requestResult(transaction.objectStore(AI_RUN_STORE).get(runId));
  return (run as StoredAiRun | undefined) ?? null;
}

export async function listAiRuns(projectId: string): Promise<StoredAiRun[]> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_RUN_STORE, "readonly");
  const runs = await requestResult(transaction.objectStore(AI_RUN_STORE).index("projectId").getAll(projectId));
  return (runs as StoredAiRun[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteAiRun(runId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_RUN_STORE, "readwrite");
  transaction.objectStore(AI_RUN_STORE).delete(runId);
  await transactionComplete(transaction);
}

export async function saveAiConversation(conversation: StoredAiConversation): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_CONVERSATION_STORE, "readwrite");
  transaction.objectStore(AI_CONVERSATION_STORE).put(conversation);
  await transactionComplete(transaction);
}

export async function listAiConversations(projectId: string): Promise<StoredAiConversation[]> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_CONVERSATION_STORE, "readonly");
  const conversations = await requestResult(
    transaction.objectStore(AI_CONVERSATION_STORE).index("projectId").getAll(projectId),
  );
  return (conversations as StoredAiConversation[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listAllAiConversations(): Promise<StoredAiConversation[]> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_CONVERSATION_STORE, "readonly");
  const conversations = await requestResult(transaction.objectStore(AI_CONVERSATION_STORE).getAll());
  return (conversations as StoredAiConversation[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteAiConversation(conversationId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(AI_CONVERSATION_STORE, "readwrite");
  transaction.objectStore(AI_CONVERSATION_STORE).delete(conversationId);
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

export async function listBrandKits(): Promise<StoredBrandKit[]> {
  const database = await openDatabase();
  const transaction = database.transaction(BRAND_KIT_STORE, "readonly");
  const kits = await requestResult(transaction.objectStore(BRAND_KIT_STORE).getAll());
  return (kits as StoredBrandKit[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveBrandKit(kit: StoredBrandKit): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(BRAND_KIT_STORE, "readwrite");
  transaction.objectStore(BRAND_KIT_STORE).put(kit);
  await transactionComplete(transaction);
}

export async function deleteBrandKit(kitId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(BRAND_KIT_STORE, "readwrite");
  transaction.objectStore(BRAND_KIT_STORE).delete(kitId);
  await transactionComplete(transaction);
}

export async function listComponents(projectId: string): Promise<StoredComponent[]> {
  const database = await openDatabase();
  const transaction = database.transaction(COMPONENT_STORE, "readonly");
  const components = await requestResult(transaction.objectStore(COMPONENT_STORE).index("projectId").getAll(projectId));
  return (components as StoredComponent[]).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function saveComponent(component: StoredComponent): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(COMPONENT_STORE, "readwrite");
  transaction.objectStore(COMPONENT_STORE).put(component);
  await transactionComplete(transaction);
}

export async function deleteComponent(componentId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(COMPONENT_STORE, "readwrite");
  transaction.objectStore(COMPONENT_STORE).delete(componentId);
  await transactionComplete(transaction);
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
