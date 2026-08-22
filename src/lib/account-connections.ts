import type { ProjectBundle } from "./bundle";

export const ACCOUNT_DEVICE_STORAGE_KEY = "glassware.device-account.v1";
export const ACCOUNT_EXTENSION_STORAGE_KEY = "glassware.extension-account.v1";
const LEGACY_ACCOUNT_STORAGE_KEYS = ["imagestitch.device-account.v1", "imagestitch.account-preview.v1", "glassware.account-preview.v1"] as const;

export type AccountClientMode = "service" | "extension" | "device";
export type SignInProvider = "wiplash";
export type AiConnectionKind = "chatgpt_codex_plugin" | "openai_api";
export type AiConnectionStatus = "connected" | "attention";
export type AiAuthorizationStatus = "starting" | "waiting" | "connected" | "failed" | "expired";
export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AiModelId = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
export type AiReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";
export type BillingPlan = "creator" | "designer" | "director";
export type BillingInterval = "monthly" | "annual";
export type CloudAccess = "none" | "download_only" | "read_write";

export const DEFAULT_AI_MODEL: AiModelId = "gpt-5.6-luna";
export const DEFAULT_AI_REASONING_EFFORT: AiReasoningEffort = "low";
export const AI_MODEL_CATALOG: ReadonlyArray<{ id: AiModelId; name: string; detail: string }> = [
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", detail: "Latest Luna · efficient creative work" },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", detail: "Balanced intelligence and cost" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", detail: "Frontier quality" },
] as const;
export const AI_REASONING_EFFORTS: ReadonlyArray<{ id: AiReasoningEffort; name: string }> = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
  { id: "xhigh", name: "Extra high" },
  { id: "max", name: "Maximum" },
] as const;

export interface AccountSession {
  id: string;
  email: string;
  displayName: string;
  expiresAt: string;
  mode: "authenticated" | "device";
}

export interface AiConnection {
  id: string;
  kind: AiConnectionKind;
  status: AiConnectionStatus;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AccountSnapshot {
  account: AccountSession | null;
  connections: AiConnection[];
  syncEnabled: boolean;
  csrfToken?: string;
  aiRuntime: {
    available: boolean;
    message: string;
  };
  billing: BillingSnapshot;
}

export interface BillingSnapshot {
  plan: BillingPlan;
  planName: "Creator" | "Designer" | "Director";
  status: string;
  cloudAccess: CloudAccess;
  storageLimitBytes: number | null;
  storageUsedBytes: number;
  checkoutAvailable: boolean;
  portalAvailable: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  downloadUntil: string | null;
  paymentFailureCount: number;
  billingConfigured: boolean;
}

export interface BillingRedirect {
  status: "redirect";
  url: string;
}

export interface ConnectionAuthorization {
  status: "device" | "connected";
  authorization?: AiDeviceAuthorization;
  snapshot?: AccountSnapshot;
}

export interface AiDeviceAuthorization {
  id: string;
  status: AiAuthorizationStatus;
  createdAt: string;
  expiresAt: string;
  verificationUrl?: string;
  userCode?: string;
  error?: string;
}

export interface AiPlanOperation {
  action:
    | "set_canvas_size"
    | "set_canvas_background"
    | "set_canvas_guides"
    | "set_canvas_snapping"
    | "set_artwork_presentation"
    | "add_text"
    | "add_shape"
    | "add_attachment_image"
    | "search_open_image"
    | "generate_image"
    | "edit_image_region"
    | "update_object"
    | "delete_object"
    | "duplicate_object"
    | "reorder_object"
    | "set_layer_states"
    | "group_objects"
    | "ungroup_objects"
    | "align_objects"
    | "distribute_objects"
    | "set_object_transform"
    | "set_image_adjustments"
    | "set_image_crop"
    | "set_image_mask"
    | "set_image_presentation"
    | "set_object_shadow"
    | "apply_template"
    | "insert_component"
    | "apply_brand_kit"
    | "add_page"
    | "duplicate_page"
    | "activate_page"
    | "rename_page"
    | "delete_page"
    | "reorder_page"
    | "inspect_export";
  label: string;
  targetId: string | null;
  text: string | null;
  color: string | null;
  shape: string | null;
  align: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  fontSize: number | null;
  imagePrompt: string | null;
  targetIds?: string[] | null;
  pageId?: string | null;
  templateId?: string | null;
  componentId?: string | null;
  brandKitId?: string | null;
  blendMode?: string | null;
  layerScope?: string | null;
  alignment?: string | null;
  alignmentReference?: string | null;
  distributionAxis?: string | null;
  guideAction?: string | null;
  guideAxis?: string | null;
  maskAction?: string | null;
  maskMode?: string | null;
  regionOutput?: string | null;
  pageDirection?: string | null;
  exportFormat?: string | null;
  imageSearchQuery?: string | null;
  name?: string | null;
  attachmentName?: string | null;
  rotation?: number | null;
  opacity?: number | null;
  visible?: boolean | null;
  locked?: boolean | null;
  zIndex?: number | null;
  fontFamily?: string | null;
  fontStyle?: string | null;
  lineHeight?: number | null;
  brightness?: number | null;
  contrast?: number | null;
  saturation?: number | null;
  blur?: number | null;
  temperature?: number | null;
  tint?: number | null;
  sharpen?: number | null;
  vignette?: number | null;
  grayscale?: boolean | null;
  sepia?: boolean | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cornerRadius?: number | null;
  frameType?: string | null;
  frameWidth?: number | null;
  frameColor?: string | null;
  frameOpacity?: number | null;
  framePadding?: number | null;
  frameTitle?: string | null;
  shadowEnabled?: boolean | null;
  shadowColor?: string | null;
  shadowBlur?: number | null;
  shadowOffsetX?: number | null;
  shadowOffsetY?: number | null;
  shadowOpacity?: number | null;
  presentationEnabled?: boolean | null;
  presentationPadding?: number | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropOpacity?: number | null;
  backdropBlur?: number | null;
  backdropNoise?: number | null;
  guidePosition?: number | null;
  snapThreshold?: number | null;
  maskFeather?: number | null;
  maskSize?: number | null;
  maskPoints?: number[] | null;
  exportWidth?: number | null;
  exportHeight?: number | null;
  exportQuality?: number | null;
  exportDpi?: number | null;
  flipHorizontal?: boolean | null;
  flipVertical?: boolean | null;
  snapEnabled?: boolean | null;
  snapCanvas?: boolean | null;
  snapObjects?: boolean | null;
  snapGuides?: boolean | null;
  maskEnabled?: boolean | null;
  maskInverted?: boolean | null;
  exportTransparent?: boolean | null;
  exportAllPages?: boolean | null;
  imageDataUrl?: string;
}

export interface AiEditPlan {
  summary: string;
  rationale: string;
  assessment: string;
  done: boolean;
  operations: AiPlanOperation[];
}

export interface AiAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface AiAgentContext {
  pass: number;
  maxPasses: number;
  baseRevisionId: string;
  runId: string;
  sessionId?: string;
  completedSteps?: string[];
  qualityFindings?: string[];
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AiJob {
  id: string;
  status: AiJobStatus;
  connectionId: string;
  model: AiModelId;
  reasoningEffort: AiReasoningEffort;
  createdAt: string;
  baseRevisionId?: string;
  startedAt?: string;
  finishedAt?: string;
  agentSessionId?: string;
  plan?: AiEditPlan;
  imageEdit?: {
    imageDataUrl: string;
    provider: AiConnectionKind;
    model: string;
  };
  error?: string;
  usage?: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  };
}

export interface CloudAiConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "sent" | "completed" | "failed";
  detail?: string;
  createdAt: string;
}

export interface CloudAiConversation {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: CloudAiConversationMessage[];
  connectionId?: string;
  model?: string;
  reasoningEffort?: string;
}

export interface CloudAiConversationReceipt {
  status: "created" | "updated" | "kept_remote";
  conversation: CloudAiConversation;
}

export interface CloudProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentRevisionId: string;
  size: number;
  thumbnailDataUrl?: string;
}

export interface CloudProjectArchive extends Omit<CloudProjectMetadata, "size"> {
  bundle: ProjectBundle;
}

export interface CloudProjectReceipt {
  status: "created" | "updated" | "kept_remote";
  project: CloudProjectMetadata;
  archive?: CloudProjectArchive;
}

export interface SignInAuthorization {
  status: "redirect";
  authorizationUrl: string;
}

export interface AccountConnectionsClient {
  readonly mode: AccountClientMode;
  getSnapshot(): Promise<AccountSnapshot>;
  startSignIn(provider: SignInProvider, returnUrl: string): Promise<SignInAuthorization>;
  startExtensionSignIn?(): Promise<AccountSnapshot>;
  signOut(): Promise<AccountSnapshot>;
  connectApiKey(apiKey: string, projectId?: string): Promise<AccountSnapshot>;
  startChatGptConnection(projectId?: string): Promise<ConnectionAuthorization>;
  getChatGptConnection(authorizationId: string): Promise<ConnectionAuthorization>;
  disconnectConnection(connectionId: string): Promise<AccountSnapshot>;
  createAiJob(connectionId: string, prompt: string, project: unknown, model: AiModelId, reasoningEffort: AiReasoningEffort, attachments?: AiAttachment[], agentContext?: AiAgentContext): Promise<AiJob>;
  createImageEditJob(connectionId: string, sourceDataUrl: string, maskDataUrl: string, prompt: string, model: AiModelId, reasoningEffort: AiReasoningEffort, agentSessionId?: string): Promise<AiJob>;
  getAiJob(jobId: string): Promise<AiJob>;
  cancelAiJob(jobId: string): Promise<AiJob>;
  listAiConversations(projectId?: string): Promise<CloudAiConversation[]>;
  upsertAiConversation(conversation: CloudAiConversation): Promise<CloudAiConversationReceipt>;
  deleteAiConversation(conversationId: string): Promise<void>;
  listProjects(): Promise<CloudProjectMetadata[]>;
  getProject(projectId: string): Promise<CloudProjectArchive>;
  upsertProject(project: CloudProjectArchive): Promise<CloudProjectReceipt>;
  deleteProject(projectId: string): Promise<void>;
  setSyncEnabled(enabled: boolean): Promise<AccountSnapshot>;
  getBilling(): Promise<BillingSnapshot>;
  createBillingCheckout(plan: Exclude<BillingPlan, "creator">, interval: BillingInterval, idempotencyKey: string): Promise<BillingRedirect>;
  createBillingPortal(idempotencyKey: string): Promise<BillingRedirect>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ServiceClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface ExtensionChromeLike {
  identity: {
    getRedirectURL(path?: string): string;
    launchWebAuthFlow(details: { url: string; interactive: boolean }): Promise<string>;
  };
  permissions: {
    contains(permissions: { origins: string[] }): Promise<boolean>;
    request(permissions: { origins: string[] }): Promise<boolean>;
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
    };
  };
}

export interface ExtensionClientOptions extends ServiceClientOptions {
  chrome?: ExtensionChromeLike;
}

export const AI_CONNECTION_CATALOG: ReadonlyArray<{
  kind: AiConnectionKind;
  eyebrow: string;
  name: string;
  description: string;
  detail: string;
}> = [
  {
    kind: "chatgpt_codex_plugin",
    eyebrow: "SUBSCRIPTION CONNECTION",
    name: "ChatGPT / Codex",
    description: "Let an authenticated ChatGPT or Codex client inspect, edit, render, and refine the current project through GlassWare tools.",
    detail: "Codex CLI device authorization · ChatGPT subscription access",
  },
  {
    kind: "openai_api",
    eyebrow: "USAGE-BASED CONNECTION",
    name: "OpenAI API key",
    description: "Use separately billed OpenAI API access. Your key crosses this form once over HTTPS, is encrypted server-side, and is never returned to the editor.",
    detail: "Encrypted vault · separate API billing",
  },
] as const;

export const DEFAULT_BILLING_SNAPSHOT: BillingSnapshot = {
  plan: "creator",
  planName: "Creator",
  status: "active",
  cloudAccess: "none",
  storageLimitBytes: 0,
  storageUsedBytes: 0,
  checkoutAvailable: false,
  portalAvailable: false,
  currentPeriodEnd: null,
  cancelAt: null,
  downloadUntil: null,
  paymentFailureCount: 0,
  billingConfigured: false,
};

const EMPTY_SNAPSHOT: AccountSnapshot = {
  account: null,
  connections: [],
  syncEnabled: false,
  aiRuntime: { available: false, message: "AI workspace is unavailable" },
  billing: DEFAULT_BILLING_SNAPSHOT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectSecretFields(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectSecretFields);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(apiKey|openaiApiKey|accessToken|refreshToken|password|secret|clientSecret|authJson)$/i.test(key)) {
      throw new Error("Account service must return opaque connection identifiers, not provider credentials.");
    }
    rejectSecretFields(nested);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Account service returned an invalid ${field}.`);
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, field);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requireString(value, field);
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Account service returned an invalid ${field}.`);
  return value;
}

function optionalNullableString(value: unknown, field: string): string | null {
  return value === undefined ? null : nullableString(value, field);
}

function optionalNullableText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`Account service returned an invalid ${field}.`);
  return value;
}

function optionalNullableNumber(value: unknown, field: string): number | null {
  return value === undefined ? null : nullableNumber(value, field);
}

function optionalNullableBoolean(value: unknown, field: string): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new Error(`Account service returned an invalid ${field}.`);
  return value;
}

function optionalNullableStringArray(value: unknown, field: string): string[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error(`Account service returned an invalid ${field}.`);
  return [...new Set(value)];
}

function optionalNullableNumberArray(value: unknown, field: string): number[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number" || !Number.isFinite(item))) throw new Error(`Account service returned an invalid ${field}.`);
  return value;
}

function parseAccount(value: unknown): AccountSession | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error("Account service returned an invalid account.");
  const mode = value.mode;
  if (mode !== "authenticated" && mode !== "device") throw new Error("Account service returned an invalid account mode.");
  return {
    id: requireString(value.id, "account id"),
    email: requireString(value.email, "account email"),
    displayName: requireString(value.displayName, "display name"),
    expiresAt: requireString(value.expiresAt, "session expiry"),
    mode,
  };
}

function parseConnection(value: unknown): AiConnection {
  if (!isRecord(value)) throw new Error("Account service returned an invalid AI connection.");
  const kind = value.kind;
  const status = value.status;
  if (kind !== "chatgpt_codex_plugin" && kind !== "openai_api") throw new Error("Account service returned an unknown AI connection kind.");
  if (status !== "connected" && status !== "attention") throw new Error("Account service returned an invalid AI connection status.");
  return {
    id: requireString(value.id, "connection id"),
    kind,
    status,
    label: requireString(value.label, "connection label"),
    createdAt: requireString(value.createdAt, "connection creation time"),
    lastUsedAt: optionalString(value.lastUsedAt, "connection last-used time"),
  };
}

export function parseBillingSnapshot(value: unknown): BillingSnapshot {
  if (value === undefined) return { ...DEFAULT_BILLING_SNAPSHOT };
  if (!isRecord(value)) throw new Error("Account service returned an invalid billing status.");
  const plan = value.plan;
  const cloudAccess = value.cloudAccess;
  const planNames = { creator: "Creator", designer: "Designer", director: "Director" } as const;
  if (plan !== "creator" && plan !== "designer" && plan !== "director") throw new Error("Account service returned an invalid billing plan.");
  if (cloudAccess !== "none" && cloudAccess !== "download_only" && cloudAccess !== "read_write") {
    throw new Error("Account service returned an invalid cloud entitlement.");
  }
  const storageLimitBytes = value.storageLimitBytes === null ? null : Number(value.storageLimitBytes);
  const storageUsedBytes = Number(value.storageUsedBytes);
  const paymentFailureCount = Number(value.paymentFailureCount);
  if ((storageLimitBytes !== null && (!Number.isFinite(storageLimitBytes) || storageLimitBytes < 0))
    || !Number.isFinite(storageUsedBytes) || storageUsedBytes < 0
    || !Number.isInteger(paymentFailureCount) || paymentFailureCount < 0 || paymentFailureCount > 3
    || typeof value.checkoutAvailable !== "boolean" || typeof value.portalAvailable !== "boolean"
    || typeof value.billingConfigured !== "boolean") {
    throw new Error("Account service returned invalid billing limits.");
  }
  const status = requireString(value.status, "billing status");
  return {
    plan,
    planName: planNames[plan],
    status,
    cloudAccess,
    storageLimitBytes,
    storageUsedBytes,
    checkoutAvailable: value.checkoutAvailable,
    portalAvailable: value.portalAvailable,
    currentPeriodEnd: optionalNullableString(value.currentPeriodEnd, "billing period end"),
    cancelAt: optionalNullableString(value.cancelAt, "billing cancellation time"),
    downloadUntil: optionalNullableString(value.downloadUntil, "cloud download deadline"),
    paymentFailureCount,
    billingConfigured: value.billingConfigured,
  };
}

function parseCloudAiConversation(value: unknown): CloudAiConversation {
  rejectSecretFields(value);
  if (!isRecord(value) || !Array.isArray(value.messages)) throw new Error("Account service returned an invalid AI conversation.");
  const messages = value.messages.map((message): CloudAiConversationMessage => {
    if (!isRecord(message) || (message.role !== "user" && message.role !== "assistant")) {
      throw new Error("Account service returned an invalid AI conversation message.");
    }
    if (message.status !== "sent" && message.status !== "completed" && message.status !== "failed") {
      throw new Error("Account service returned an invalid AI conversation message status.");
    }
    return {
      id: requireString(message.id, "conversation message id"),
      role: message.role,
      content: requireString(message.content, "conversation message content"),
      status: message.status,
      createdAt: requireString(message.createdAt, "conversation message creation time"),
      ...(message.detail ? { detail: requireString(message.detail, "conversation message detail") } : {}),
    };
  });
  return {
    id: requireString(value.id, "conversation id"),
    projectId: requireString(value.projectId, "conversation project id"),
    projectName: requireString(value.projectName, "conversation project name"),
    title: requireString(value.title, "conversation title"),
    createdAt: requireString(value.createdAt, "conversation creation time"),
    updatedAt: requireString(value.updatedAt, "conversation update time"),
    messages,
    ...(value.connectionId ? { connectionId: requireString(value.connectionId, "conversation connection id") } : {}),
    ...(value.model ? { model: requireString(value.model, "conversation model") } : {}),
    ...(value.reasoningEffort ? { reasoningEffort: requireString(value.reasoningEffort, "conversation reasoning effort") } : {}),
  };
}

function parseCloudProjectMetadata(value: unknown): CloudProjectMetadata {
  rejectSecretFields(value);
  if (!isRecord(value) || typeof value.size !== "number" || !Number.isFinite(value.size) || value.size < 0) {
    throw new Error("Account service returned invalid cloud project metadata.");
  }
  const thumbnailDataUrl = optionalString(value.thumbnailDataUrl, "cloud project thumbnail");
  if (thumbnailDataUrl && !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(thumbnailDataUrl)) {
    throw new Error("Account service returned an invalid cloud project thumbnail.");
  }
  return {
    id: requireString(value.id, "cloud project id"),
    name: requireString(value.name, "cloud project name"),
    createdAt: requireString(value.createdAt, "cloud project creation time"),
    updatedAt: requireString(value.updatedAt, "cloud project update time"),
    currentRevisionId: requireString(value.currentRevisionId, "cloud project revision id"),
    size: value.size,
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
  };
}

function parseCloudProjectArchive(value: unknown): CloudProjectArchive {
  rejectSecretFields(value);
  if (!isRecord(value) || !isRecord(value.bundle) || value.bundle.schemaVersion !== "glassware.bundle.v1") {
    throw new Error("Account service returned an invalid cloud project archive.");
  }
  const thumbnailDataUrl = optionalString(value.thumbnailDataUrl, "cloud project thumbnail");
  if (thumbnailDataUrl && !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(thumbnailDataUrl)) {
    throw new Error("Account service returned an invalid cloud project thumbnail.");
  }
  return {
    id: requireString(value.id, "cloud project id"),
    name: requireString(value.name, "cloud project name"),
    createdAt: requireString(value.createdAt, "cloud project creation time"),
    updatedAt: requireString(value.updatedAt, "cloud project update time"),
    currentRevisionId: requireString(value.currentRevisionId, "cloud project revision id"),
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    bundle: value.bundle as unknown as ProjectBundle,
  };
}

export function parseAccountSnapshot(value: unknown): AccountSnapshot {
  rejectSecretFields(value);
  if (!isRecord(value) || !Array.isArray(value.connections) || typeof value.syncEnabled !== "boolean") {
    throw new Error("Account service returned an invalid account snapshot.");
  }
  return {
    account: parseAccount(value.account),
    connections: value.connections.map(parseConnection),
    syncEnabled: value.syncEnabled,
    csrfToken: optionalString(value.csrfToken, "CSRF token"),
    aiRuntime: isRecord(value.aiRuntime) && typeof value.aiRuntime.available === "boolean" && typeof value.aiRuntime.message === "string"
      ? { available: value.aiRuntime.available, message: value.aiRuntime.message }
      : { available: false, message: "AI workspace is unavailable" },
    billing: parseBillingSnapshot(value.billing),
  };
}

function parseDeviceAuthorization(value: unknown): AiDeviceAuthorization {
  if (!isRecord(value)) throw new Error("Account service returned an invalid ChatGPT authorization.");
  const status = value.status;
  if (!new Set(["starting", "waiting", "connected", "failed", "expired"]).has(String(status))) {
    throw new Error("Account service returned an invalid ChatGPT authorization status.");
  }
  const verificationUrl = optionalString(value.verificationUrl, "verification URL");
  const userCode = optionalString(value.userCode, "device code");
  return {
    id: requireString(value.id, "authorization id"),
    status: status as AiAuthorizationStatus,
    createdAt: requireString(value.createdAt, "authorization creation time"),
    expiresAt: requireString(value.expiresAt, "authorization expiry"),
    ...(verificationUrl ? { verificationUrl: validateAuthorizationUrl(verificationUrl) } : {}),
    ...(userCode ? { userCode } : {}),
    ...(value.error ? { error: requireString(value.error, "authorization error") } : {}),
  };
}

function parsePlan(value: unknown): AiEditPlan {
  if (!isRecord(value) || !Array.isArray(value.operations)) throw new Error("Account service returned an invalid AI edit plan.");
  const actions = new Set([
    "set_canvas_size", "set_canvas_background", "set_canvas_guides", "set_canvas_snapping", "set_artwork_presentation", "add_text", "add_shape",
    "add_attachment_image", "search_open_image", "generate_image", "edit_image_region", "update_object", "delete_object", "duplicate_object",
    "reorder_object", "set_layer_states", "group_objects", "ungroup_objects", "align_objects", "distribute_objects", "set_object_transform",
    "set_image_adjustments", "set_image_crop", "set_image_mask", "set_image_presentation", "set_object_shadow",
    "apply_template", "insert_component", "apply_brand_kit", "add_page", "duplicate_page", "activate_page", "rename_page", "delete_page", "reorder_page", "inspect_export",
  ]);
  const operations = value.operations.map((operation) => {
    if (!isRecord(operation) || !actions.has(String(operation.action))) throw new Error("Account service returned an unknown AI edit operation.");
    const imageDataUrl = typeof operation.imageDataUrl === "string" ? operation.imageDataUrl : undefined;
    if (imageDataUrl && (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl) || imageDataUrl.length > 12_000_000)) {
      throw new Error("Account service returned an invalid generated image.");
    }
    return {
      action: operation.action as AiPlanOperation["action"],
      label: requireString(operation.label, "operation label"),
      targetId: nullableString(operation.targetId, "operation target"),
      text: nullableString(operation.text, "operation text"),
      color: nullableString(operation.color, "operation color"),
      shape: nullableString(operation.shape, "operation shape"),
      align: nullableString(operation.align, "operation alignment"),
      x: nullableNumber(operation.x, "operation x coordinate"),
      y: nullableNumber(operation.y, "operation y coordinate"),
      width: nullableNumber(operation.width, "operation width"),
      height: nullableNumber(operation.height, "operation height"),
      fontSize: nullableNumber(operation.fontSize, "operation font size"),
      imagePrompt: nullableString(operation.imagePrompt, "image generation prompt"),
      targetIds: optionalNullableStringArray(operation.targetIds, "operation targets"),
      pageId: optionalNullableString(operation.pageId, "page id"),
      templateId: optionalNullableString(operation.templateId, "template id"),
      componentId: optionalNullableString(operation.componentId, "component id"),
      brandKitId: optionalNullableString(operation.brandKitId, "brand kit id"),
      blendMode: optionalNullableString(operation.blendMode, "blend mode"),
      layerScope: optionalNullableString(operation.layerScope, "layer scope"),
      alignment: optionalNullableString(operation.alignment, "layout alignment"),
      alignmentReference: optionalNullableString(operation.alignmentReference, "alignment reference"),
      distributionAxis: optionalNullableString(operation.distributionAxis, "distribution axis"),
      guideAction: optionalNullableString(operation.guideAction, "guide action"),
      guideAxis: optionalNullableString(operation.guideAxis, "guide axis"),
      maskAction: optionalNullableString(operation.maskAction, "mask action"),
      maskMode: optionalNullableString(operation.maskMode, "mask mode"),
      regionOutput: optionalNullableString(operation.regionOutput, "region output"),
      pageDirection: optionalNullableString(operation.pageDirection, "page direction"),
      exportFormat: optionalNullableString(operation.exportFormat, "export format"),
      imageSearchQuery: optionalNullableString(operation.imageSearchQuery, "open image search query"),
      name: optionalNullableString(operation.name, "operation name"),
      attachmentName: optionalNullableString(operation.attachmentName, "attachment name"),
      rotation: optionalNullableNumber(operation.rotation, "operation rotation"),
      opacity: optionalNullableNumber(operation.opacity, "operation opacity"),
      visible: optionalNullableBoolean(operation.visible, "operation visibility"),
      locked: optionalNullableBoolean(operation.locked, "operation lock state"),
      zIndex: optionalNullableNumber(operation.zIndex, "operation layer index"),
      fontFamily: optionalNullableString(operation.fontFamily, "operation font family"),
      fontStyle: optionalNullableString(operation.fontStyle, "operation font style"),
      lineHeight: optionalNullableNumber(operation.lineHeight, "operation line height"),
      brightness: optionalNullableNumber(operation.brightness, "image brightness"),
      contrast: optionalNullableNumber(operation.contrast, "image contrast"),
      saturation: optionalNullableNumber(operation.saturation, "image saturation"),
      blur: optionalNullableNumber(operation.blur, "image blur"),
      temperature: optionalNullableNumber(operation.temperature, "image temperature"),
      tint: optionalNullableNumber(operation.tint, "image tint"),
      sharpen: optionalNullableNumber(operation.sharpen, "image sharpen"),
      vignette: optionalNullableNumber(operation.vignette, "image vignette"),
      grayscale: optionalNullableBoolean(operation.grayscale, "image grayscale state"),
      sepia: optionalNullableBoolean(operation.sepia, "image sepia state"),
      cropX: optionalNullableNumber(operation.cropX, "image crop x"),
      cropY: optionalNullableNumber(operation.cropY, "image crop y"),
      cropWidth: optionalNullableNumber(operation.cropWidth, "image crop width"),
      cropHeight: optionalNullableNumber(operation.cropHeight, "image crop height"),
      cornerRadius: optionalNullableNumber(operation.cornerRadius, "presentation corner radius"),
      frameType: optionalNullableString(operation.frameType, "presentation frame type"),
      frameWidth: optionalNullableNumber(operation.frameWidth, "presentation frame width"),
      frameColor: optionalNullableString(operation.frameColor, "presentation frame color"),
      frameOpacity: optionalNullableNumber(operation.frameOpacity, "presentation frame opacity"),
      framePadding: optionalNullableNumber(operation.framePadding, "presentation frame padding"),
      frameTitle: optionalNullableText(operation.frameTitle, "presentation frame title"),
      shadowEnabled: optionalNullableBoolean(operation.shadowEnabled, "presentation shadow state"),
      shadowColor: optionalNullableString(operation.shadowColor, "presentation shadow color"),
      shadowBlur: optionalNullableNumber(operation.shadowBlur, "presentation shadow blur"),
      shadowOffsetX: optionalNullableNumber(operation.shadowOffsetX, "presentation shadow x offset"),
      shadowOffsetY: optionalNullableNumber(operation.shadowOffsetY, "presentation shadow y offset"),
      shadowOpacity: optionalNullableNumber(operation.shadowOpacity, "presentation shadow opacity"),
      presentationEnabled: optionalNullableBoolean(operation.presentationEnabled, "artwork presentation state"),
      presentationPadding: optionalNullableNumber(operation.presentationPadding, "artwork presentation padding"),
      backdropType: optionalNullableString(operation.backdropType, "artwork backdrop type"),
      backdropValue: optionalNullableString(operation.backdropValue, "artwork backdrop value"),
      backdropOpacity: optionalNullableNumber(operation.backdropOpacity, "artwork backdrop opacity"),
      backdropBlur: optionalNullableNumber(operation.backdropBlur, "artwork backdrop blur"),
      backdropNoise: optionalNullableNumber(operation.backdropNoise, "artwork backdrop noise"),
      guidePosition: optionalNullableNumber(operation.guidePosition, "guide position"),
      snapThreshold: optionalNullableNumber(operation.snapThreshold, "snapping threshold"),
      maskFeather: optionalNullableNumber(operation.maskFeather, "mask feather"),
      maskSize: optionalNullableNumber(operation.maskSize, "mask brush size"),
      maskPoints: optionalNullableNumberArray(operation.maskPoints, "mask points"),
      exportWidth: optionalNullableNumber(operation.exportWidth, "export width"),
      exportHeight: optionalNullableNumber(operation.exportHeight, "export height"),
      exportQuality: optionalNullableNumber(operation.exportQuality, "export quality"),
      exportDpi: optionalNullableNumber(operation.exportDpi, "export DPI"),
      flipHorizontal: optionalNullableBoolean(operation.flipHorizontal, "horizontal flip state"),
      flipVertical: optionalNullableBoolean(operation.flipVertical, "vertical flip state"),
      snapEnabled: optionalNullableBoolean(operation.snapEnabled, "snapping state"),
      snapCanvas: optionalNullableBoolean(operation.snapCanvas, "canvas snapping state"),
      snapObjects: optionalNullableBoolean(operation.snapObjects, "object snapping state"),
      snapGuides: optionalNullableBoolean(operation.snapGuides, "guide snapping state"),
      maskEnabled: optionalNullableBoolean(operation.maskEnabled, "mask state"),
      maskInverted: optionalNullableBoolean(operation.maskInverted, "mask inversion state"),
      exportTransparent: optionalNullableBoolean(operation.exportTransparent, "export transparency state"),
      exportAllPages: optionalNullableBoolean(operation.exportAllPages, "all-pages export state"),
      ...(imageDataUrl ? { imageDataUrl } : {}),
    };
  });
  return {
    summary: requireString(value.summary, "plan summary"),
    rationale: requireString(value.rationale, "plan rationale"),
    assessment: requireString(value.assessment, "plan assessment"),
    done: typeof value.done === "boolean" ? value.done : false,
    operations,
  };
}

function parseAiJob(value: unknown): AiJob {
  if (!isRecord(value)) throw new Error("Account service returned an invalid AI job.");
  const status = value.status;
  if (!new Set(["queued", "running", "completed", "failed", "cancelled"]).has(String(status))) throw new Error("Account service returned an invalid AI job status.");
  const model = String(value.model || "");
  const reasoningEffort = String(value.reasoningEffort || "");
  if (!AI_MODEL_CATALOG.some((entry) => entry.id === model)) throw new Error("Account service returned an unsupported AI model.");
  if (reasoningEffort !== "none" && !AI_REASONING_EFFORTS.some((entry) => entry.id === reasoningEffort)) throw new Error("Account service returned an unsupported reasoning effort.");
  const usage = isRecord(value.usage)
    && [value.usage.inputTokens, value.usage.cachedInputTokens, value.usage.outputTokens].every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0)
    ? { inputTokens: value.usage.inputTokens as number, cachedInputTokens: value.usage.cachedInputTokens as number, outputTokens: value.usage.outputTokens as number }
    : undefined;
  const imageEdit = isRecord(value.imageEdit) ? (() => {
    const imageDataUrl = requireString(value.imageEdit.imageDataUrl, "region-edit image");
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl) || imageDataUrl.length > 12_000_000) {
      throw new Error("Account service returned an invalid region-edit image.");
    }
    const provider = value.imageEdit.provider;
    if (provider !== "chatgpt_codex_plugin" && provider !== "openai_api") throw new Error("Account service returned an invalid region-edit provider.");
    return { imageDataUrl, provider: provider as AiConnectionKind, model: requireString(value.imageEdit.model, "region-edit model") };
  })() : undefined;
  return {
    id: requireString(value.id, "AI job id"),
    status: status as AiJobStatus,
    connectionId: requireString(value.connectionId, "AI connection id"),
    model: model as AiModelId,
    reasoningEffort: reasoningEffort as AiReasoningEffort,
    createdAt: requireString(value.createdAt, "AI job creation time"),
    baseRevisionId: optionalString(value.baseRevisionId, "AI job base revision id"),
    startedAt: optionalString(value.startedAt, "AI job start time"),
    finishedAt: optionalString(value.finishedAt, "AI job finish time"),
    agentSessionId: optionalString(value.agentSessionId, "AI agent session id"),
    plan: value.plan === undefined ? undefined : parsePlan(value.plan),
    ...(imageEdit ? { imageEdit } : {}),
    error: optionalString(value.error, "AI job error"),
    ...(usage ? { usage } : {}),
  };
}

export function validateServiceBaseUrl(value: string): string {
  const url = new URL(value);
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("The account service must use HTTPS, except on localhost.");
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function validateAuthorizationUrl(value: string): string {
  const url = new URL(value);
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("The account service returned an unsafe authorization URL.");
  }
  return url.toString();
}

function parseErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;
  if (typeof value.message === "string" && value.message.trim()) return value.message;
  if (isRecord(value.error) && typeof value.error.message === "string" && value.error.message.trim()) return value.error.message;
  return fallback;
}

function parseBillingRedirect(value: unknown, expectedHost: "checkout.stripe.com" | "billing.stripe.com"): BillingRedirect {
  if (!isRecord(value) || value.status !== "redirect") throw new Error("Account service returned an invalid billing redirect.");
  const url = new URL(requireString(value.url, "billing redirect URL"));
  if (url.protocol !== "https:" || url.hostname !== expectedHost || url.username || url.password) {
    throw new Error("Account service returned an unsafe billing redirect.");
  }
  return { status: "redirect", url: url.toString() };
}

export function createAccountServiceClient(options: ServiceClientOptions): AccountConnectionsClient {
  const baseUrl = validateServiceBaseUrl(options.baseUrl);
  const fetcher = options.fetch ?? globalThis.fetch;
  let csrfToken = "";

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (init.method && init.method !== "GET" && csrfToken) headers.set("x-glassware-csrf", csrfToken);
    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers, credentials: "include" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(parseErrorMessage(payload, `Account service request failed (${response.status}).`));
    return payload;
  }

  function rememberSnapshot(value: unknown): AccountSnapshot {
    const snapshot = parseAccountSnapshot(value);
    csrfToken = snapshot.csrfToken ?? csrfToken;
    return snapshot;
  }

  return {
    mode: "service",
    async getSnapshot() {
      return rememberSnapshot(await request("/v1/account"));
    },
    async startSignIn(provider, returnUrl) {
      const payload = await request("/v1/auth/authorizations", {
        method: "POST",
        body: JSON.stringify({ provider, returnUrl }),
      });
      if (!isRecord(payload) || payload.status !== "redirect") {
        throw new Error("Account service returned an invalid sign-in authorization.");
      }
      return {
        status: "redirect",
        authorizationUrl: validateAuthorizationUrl(requireString(payload.authorizationUrl, "authorization URL")),
      };
    },
    async signOut() {
      const snapshot = rememberSnapshot(await request("/v1/auth/logout", { method: "POST" }));
      csrfToken = snapshot.csrfToken ?? "";
      return snapshot;
    },
    async connectApiKey(apiKey, projectId) {
      const payload = await request("/v1/connections/openai_api", {
        method: "POST",
        body: JSON.stringify({ apiKey, ...(projectId ? { projectId } : {}) }),
      });
      if (!isRecord(payload) || payload.status !== "connected" || payload.snapshot === undefined) throw new Error("Account service returned an invalid API connection receipt.");
      return rememberSnapshot(payload.snapshot);
    },
    async startChatGptConnection(projectId) {
      const payload = await request("/v1/connections/chatgpt_codex_plugin/authorizations", {
        method: "POST",
        body: JSON.stringify({ ...(projectId ? { projectId } : {}) }),
      });
      if (!isRecord(payload) || payload.status !== "device" || payload.authorization === undefined) throw new Error("Account service returned an invalid ChatGPT authorization.");
      return { status: "device", authorization: parseDeviceAuthorization(payload.authorization) };
    },
    async getChatGptConnection(authorizationId) {
      const payload = await request(`/v1/connections/chatgpt_codex_plugin/authorizations/${encodeURIComponent(authorizationId)}`);
      if (!isRecord(payload) || (payload.status !== "device" && payload.status !== "connected") || payload.authorization === undefined) {
        throw new Error("Account service returned an invalid ChatGPT authorization.");
      }
      const authorization = parseDeviceAuthorization(payload.authorization);
      if (payload.status === "connected") {
        if (payload.snapshot === undefined) throw new Error("Account service omitted the connected account snapshot.");
        return { status: "connected", authorization, snapshot: rememberSnapshot(payload.snapshot) };
      }
      return { status: "device", authorization };
    },
    async disconnectConnection(connectionId) {
      return rememberSnapshot(await request(`/v1/connections/${encodeURIComponent(connectionId)}`, { method: "DELETE" }));
    },
    async createAiJob(connectionId, prompt, project, model, reasoningEffort, attachments = [], agentContext) {
      if (!agentContext) throw new Error("GlassWare omitted the AI run context.");
      const payload = await request("/v1/ai/jobs", {
        method: "POST",
        body: JSON.stringify({ connectionId, prompt, project, model, reasoningEffort, attachments, agentContext }),
      });
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid AI job receipt.");
      return parseAiJob(payload.job);
    },
    async createImageEditJob(connectionId, sourceDataUrl, maskDataUrl, prompt, model, reasoningEffort, agentSessionId) {
      const payload = await request("/v1/ai/image-edits", {
        method: "POST",
        body: JSON.stringify({ connectionId, sourceDataUrl, maskDataUrl, prompt, model, reasoningEffort, ...(agentSessionId ? { agentSessionId } : {}) }),
      });
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid region-edit job receipt.");
      return parseAiJob(payload.job);
    },
    async getAiJob(jobId) {
      const payload = await request(`/v1/ai/jobs/${encodeURIComponent(jobId)}`);
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid AI job.");
      return parseAiJob(payload.job);
    },
    async cancelAiJob(jobId) {
      const payload = await request(`/v1/ai/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" });
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid cancelled AI job.");
      return parseAiJob(payload.job);
    },
    async listAiConversations(projectId) {
      const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      const payload = await request(`/v1/ai/conversations${query}`);
      if (!isRecord(payload) || !Array.isArray(payload.conversations)) throw new Error("Account service returned invalid AI conversation history.");
      return payload.conversations.map(parseCloudAiConversation);
    },
    async upsertAiConversation(conversation) {
      const payload = await request(`/v1/ai/conversations/${encodeURIComponent(conversation.id)}`, {
        method: "PUT",
        body: JSON.stringify(conversation),
      });
      if (!isRecord(payload) || !new Set(["created", "updated", "kept_remote"]).has(String(payload.status))) {
        throw new Error("Account service returned an invalid AI conversation receipt.");
      }
      return {
        status: payload.status as CloudAiConversationReceipt["status"],
        conversation: parseCloudAiConversation(payload.conversation),
      };
    },
    async deleteAiConversation(conversationId) {
      await request(`/v1/ai/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" });
    },
    async listProjects() {
      const payload = await request("/v1/projects");
      if (!isRecord(payload) || !Array.isArray(payload.projects)) throw new Error("Account service returned an invalid cloud project list.");
      return payload.projects.map(parseCloudProjectMetadata);
    },
    async getProject(projectId) {
      const payload = await request(`/v1/projects/${encodeURIComponent(projectId)}`);
      if (!isRecord(payload) || payload.project === undefined) throw new Error("Account service returned an invalid cloud project.");
      return parseCloudProjectArchive(payload.project);
    },
    async upsertProject(project) {
      const payload = await request(`/v1/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        body: JSON.stringify(project),
      });
      if (!isRecord(payload) || !new Set(["created", "updated", "kept_remote"]).has(String(payload.status))) {
        throw new Error("Account service returned an invalid cloud project receipt.");
      }
      return {
        status: payload.status as CloudProjectReceipt["status"],
        project: parseCloudProjectMetadata(payload.project),
        ...(payload.archive ? { archive: parseCloudProjectArchive(payload.archive) } : {}),
      };
    },
    async deleteProject(projectId) {
      await request(`/v1/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
    },
    async setSyncEnabled(enabled) {
      return rememberSnapshot(await request("/v1/account/preferences", {
        method: "PATCH",
        body: JSON.stringify({ syncEnabled: enabled }),
      }));
    },
    async getBilling() {
      return parseBillingSnapshot(await request("/v1/billing"));
    },
    async createBillingCheckout(plan, interval, idempotencyKey) {
      return parseBillingRedirect(await request("/v1/billing/checkout", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({ plan, interval }),
      }), "checkout.stripe.com");
    },
    async createBillingPortal(idempotencyKey) {
      return parseBillingRedirect(await request("/v1/billing/portal", {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({}),
      }), "billing.stripe.com");
    },
  };
}

interface ExtensionCredential {
  type: "glassware_session";
  accessToken: string;
  expiresAt: string;
}

function emptyAccountSnapshot(): AccountSnapshot {
  return { ...EMPTY_SNAPSHOT, connections: [], aiRuntime: { ...EMPTY_SNAPSHOT.aiRuntime }, billing: { ...EMPTY_SNAPSHOT.billing } };
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let binary = "";
  new Uint8Array(digest).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseExtensionCredential(value: unknown): ExtensionCredential {
  if (!isRecord(value) || value.type !== "glassware_session") {
    throw new Error("Account service returned an invalid GlassWare extension session.");
  }
  const accessToken = requireString(value.accessToken, "extension session token");
  const expiresAt = requireString(value.expiresAt, "extension session expiry");
  if (!/^gw_account_[A-Za-z0-9_-]{43}$/.test(accessToken) || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
    throw new Error("Account service returned an invalid GlassWare extension session.");
  }
  return { type: "glassware_session", accessToken, expiresAt };
}

function availableExtensionChrome(): ExtensionChromeLike | undefined {
  const candidate = globalThis.chrome as unknown as ExtensionChromeLike | undefined;
  return candidate?.identity && candidate.permissions && candidate.storage?.local ? candidate : undefined;
}

export function createExtensionAccountServiceClient(options: ExtensionClientOptions): AccountConnectionsClient {
  const baseUrl = validateServiceBaseUrl(options.baseUrl);
  const serviceUrl = new URL(baseUrl);
  const fetcher = options.fetch ?? globalThis.fetch;
  const selectedBrowser = options.chrome ?? availableExtensionChrome();
  if (!selectedBrowser) throw new Error("This browser does not provide secure extension sign-in.");
  const browser: ExtensionChromeLike = selectedBrowser;
  const permissionOrigin = `${serviceUrl.origin}/*`;

  async function clearCredential(): Promise<void> {
    await browser.storage.local.remove(ACCOUNT_EXTENSION_STORAGE_KEY);
  }

  async function loadCredential(): Promise<ExtensionCredential | null> {
    const stored = (await browser.storage.local.get(ACCOUNT_EXTENSION_STORAGE_KEY))[ACCOUNT_EXTENSION_STORAGE_KEY];
    try {
      const credential = parseExtensionCredential(stored);
      return credential;
    } catch {
      if (stored !== undefined) await clearCredential();
      return null;
    }
  }

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const credential = await loadCredential();
    const headers = new Headers(init.headers);
    if (credential) headers.set("authorization", `Bearer ${credential.accessToken}`);
    const response = await fetcher(input, { ...init, headers, credentials: "omit" });
    if (response.status === 401 && credential) await clearCredential();
    return response;
  }

  const service = createAccountServiceClient({ baseUrl, fetch: authorizedFetch });

  async function requestJson(path: string, init: RequestInit): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    headers.set("content-type", "application/json");
    const response = await fetcher(`${baseUrl}${path}`, { ...init, headers, credentials: "omit" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(parseErrorMessage(payload, `Account service request failed (${response.status}).`));
    return payload;
  }

  return {
    ...service,
    mode: "extension",
    async getSnapshot() {
      if (!await loadCredential()) return emptyAccountSnapshot();
      try {
        return await service.getSnapshot();
      } catch (cause) {
        if (!await loadCredential()) return emptyAccountSnapshot();
        throw cause;
      }
    },
    async startSignIn() {
      throw new Error("GlassWare extension sign-in must use the browser-owned Wiplash authorization window.");
    },
    async startExtensionSignIn() {
      const hasPermission = await browser.permissions.contains({ origins: [permissionOrigin] });
      if (!hasPermission && !await browser.permissions.request({ origins: [permissionOrigin] })) {
        throw new Error("Allow access to auth.wiplash.ai so GlassWare can securely sign you in.");
      }
      const redirectUri = browser.identity.getRedirectURL();
      const redirect = new URL(redirectUri);
      if (redirect.protocol !== "https:" || !redirect.hostname.endsWith(".chromiumapp.org") || redirect.pathname !== "/") {
        throw new Error("This browser returned an unsafe GlassWare sign-in callback.");
      }
      const state = randomBase64Url(32);
      const codeVerifier = randomBase64Url(64);
      const codeChallenge = await sha256Base64Url(codeVerifier);
      const started = await requestJson("/v1/auth/extension-authorizations", {
        method: "POST",
        body: JSON.stringify({ redirectUri, state, codeChallenge }),
      });
      if (!isRecord(started) || started.status !== "waiting") throw new Error("Account service returned an invalid extension authorization.");
      const authorizationId = requireString(started.authorizationId, "extension authorization id");
      if (!/^[0-9a-f-]{36}$/.test(authorizationId)) throw new Error("Account service returned an invalid extension authorization.");
      const authorizationUrl = new URL(validateAuthorizationUrl(requireString(started.authorizationUrl, "extension authorization URL")));
      const expectedAuthorizationPath = `${serviceUrl.pathname.replace(/\/$/, "")}/extension/${authorizationId}`;
      if (authorizationUrl.origin !== serviceUrl.origin || authorizationUrl.pathname !== expectedAuthorizationPath || authorizationUrl.searchParams.get("state") !== state) {
        throw new Error("Account service returned an unsafe extension authorization URL.");
      }
      const callbackValue = await browser.identity.launchWebAuthFlow({ url: authorizationUrl.toString(), interactive: true });
      const callback = new URL(callbackValue);
      if (callback.origin !== redirect.origin || callback.pathname !== redirect.pathname || callback.username || callback.password || callback.hash
        || callback.searchParams.size !== 2 || callback.searchParams.get("state") !== state) {
        throw new Error("GlassWare could not verify the browser sign-in response.");
      }
      const code = callback.searchParams.get("code") ?? "";
      if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error("GlassWare received an invalid browser sign-in code.");
      const exchanged = await requestJson(`/v1/auth/extension-authorizations/${encodeURIComponent(authorizationId)}/exchange`, {
        method: "POST",
        body: JSON.stringify({ code, codeVerifier, redirectUri }),
      });
      if (!isRecord(exchanged) || exchanged.status !== "connected" || exchanged.snapshot === undefined) {
        throw new Error("Account service returned an invalid extension sign-in receipt.");
      }
      const credential = parseExtensionCredential(exchanged.credential);
      const snapshot = parseAccountSnapshot(exchanged.snapshot);
      if (!snapshot.account || snapshot.account.mode !== "authenticated") throw new Error("Account service did not return a signed-in GlassWare account.");
      await browser.storage.local.set({ [ACCOUNT_EXTENSION_STORAGE_KEY]: credential });
      return snapshot;
    },
    async signOut() {
      try {
        if (await loadCredential()) await service.signOut();
      } finally {
        await clearCredential();
      }
      return emptyAccountSnapshot();
    },
  };
}

function loadDeviceSnapshot(storage: StorageLike | undefined): AccountSnapshot {
  if (!storage) return { ...EMPTY_SNAPSHOT };
  try {
    const current = storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY);
    if (current) return parseAccountSnapshot(JSON.parse(current));
    for (const key of LEGACY_ACCOUNT_STORAGE_KEYS) {
      const legacy = storage.getItem(key);
      if (!legacy) continue;
      const snapshot = parseAccountSnapshot(JSON.parse(legacy));
      storage.setItem(ACCOUNT_DEVICE_STORAGE_KEY, JSON.stringify(snapshot));
      return snapshot;
    }
    return { ...EMPTY_SNAPSHOT };
  } catch {
    try {
      storage.removeItem(ACCOUNT_DEVICE_STORAGE_KEY);
    } catch {
      // Device-profile persistence is best effort and never blocks the editor.
    }
    return { ...EMPTY_SNAPSHOT };
  }
}

function availableLocalStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createDeviceAccountClient(storage: StorageLike | undefined = availableLocalStorage()): AccountConnectionsClient {
  let snapshot = loadDeviceSnapshot(storage);
  try {
    LEGACY_ACCOUNT_STORAGE_KEYS.forEach((key) => storage?.removeItem(key));
  } catch {
    // Old prototype account state is safe to leave behind if storage is denied.
  }

  function persist(next: AccountSnapshot): AccountSnapshot {
    snapshot = next;
    try {
      storage?.setItem(ACCOUNT_DEVICE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The device profile can continue in memory if storage is denied.
    }
    return next;
  }

  function requireAccount(): AccountSession {
    if (!snapshot.account) throw new Error("Sign in before connecting an AI provider.");
    return snapshot.account;
  }

  return {
    mode: "device",
    async getSnapshot() {
      return snapshot;
    },
    async startSignIn() {
      throw new Error("Cloud sign-in requires the GlassWare account service.");
    },
    async signOut() {
      try {
        storage?.removeItem(ACCOUNT_DEVICE_STORAGE_KEY);
      } catch {
        // The current in-memory device session still ends immediately.
      }
      snapshot = { ...EMPTY_SNAPSHOT };
      return snapshot;
    },
    async connectApiKey() {
      requireAccount();
      throw new Error("AI connections require the GlassWare account service. This build is not connected to it yet.");
    },
    async startChatGptConnection() {
      requireAccount();
      throw new Error("AI connections require the GlassWare account service. This build is not connected to it yet.");
    },
    async getChatGptConnection() {
      requireAccount();
      throw new Error("AI connections require the GlassWare account service. This build is not connected to it yet.");
    },
    async disconnectConnection(connectionId) {
      requireAccount();
      return persist({ ...snapshot, connections: snapshot.connections.filter((connection) => connection.id !== connectionId) });
    },
    async createAiJob() {
      requireAccount();
      throw new Error("AI jobs require the GlassWare account service.");
    },
    async createImageEditJob() {
      requireAccount();
      throw new Error("Region editing requires the GlassWare account service.");
    },
    async getAiJob() {
      requireAccount();
      throw new Error("AI jobs require the GlassWare account service.");
    },
    async cancelAiJob() {
      requireAccount();
      throw new Error("AI jobs require the GlassWare account service.");
    },
    async listAiConversations() {
      requireAccount();
      throw new Error("Cloud conversation history requires the GlassWare account service.");
    },
    async upsertAiConversation() {
      requireAccount();
      throw new Error("Cloud conversation history requires the GlassWare account service.");
    },
    async deleteAiConversation() {
      requireAccount();
      throw new Error("Cloud conversation history requires the GlassWare account service.");
    },
    async listProjects() {
      requireAccount();
      throw new Error("Cloud projects require the GlassWare account service.");
    },
    async getProject() {
      requireAccount();
      throw new Error("Cloud projects require the GlassWare account service.");
    },
    async upsertProject() {
      requireAccount();
      throw new Error("Cloud projects require the GlassWare account service.");
    },
    async deleteProject() {
      requireAccount();
      throw new Error("Cloud projects require the GlassWare account service.");
    },
    async setSyncEnabled(enabled) {
      requireAccount();
      if (enabled) throw new Error("Project sync requires the GlassWare account service. This build is not connected to it yet.");
      return persist({ ...snapshot, syncEnabled: enabled });
    },
    async getBilling() {
      return snapshot.billing;
    },
    async createBillingCheckout() {
      throw new Error("Subscriptions require the GlassWare account service.");
    },
    async createBillingPortal() {
      throw new Error("Billing settings require the GlassWare account service.");
    },
  };
}
