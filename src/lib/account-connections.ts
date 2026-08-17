export const ACCOUNT_DEVICE_STORAGE_KEY = "glassware.device-account.v1";
const LEGACY_ACCOUNT_STORAGE_KEYS = ["imagestitch.device-account.v1", "imagestitch.account-preview.v1", "glassware.account-preview.v1"] as const;

export type AccountClientMode = "service" | "device";
export type SignInProvider = "wiplash";
export type AiConnectionKind = "chatgpt_codex_plugin" | "openai_api";
export type AiConnectionStatus = "connected" | "attention";
export type AiAuthorizationStatus = "starting" | "waiting" | "connected" | "failed" | "expired";
export type AiJobStatus = "queued" | "running" | "completed" | "failed";
export type AiModelId = "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
export type AiReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

export const DEFAULT_AI_MODEL: AiModelId = "gpt-5.6-luna";
export const DEFAULT_AI_REASONING_EFFORT: AiReasoningEffort = "medium";
export const AI_MODEL_CATALOG: ReadonlyArray<{ id: AiModelId; name: string; detail: string }> = [
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", detail: "Latest Luna · efficient creative work" },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", detail: "Balanced intelligence and cost" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", detail: "Frontier quality" },
] as const;
export const AI_REASONING_EFFORTS: ReadonlyArray<{ id: AiReasoningEffort; name: string }> = [
  { id: "none", name: "None" },
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
  action: "set_canvas_background" | "add_text" | "add_shape" | "update_object";
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
}

export interface AiEditPlan {
  summary: string;
  rationale: string;
  operations: AiPlanOperation[];
}

export interface AiJob {
  id: string;
  status: AiJobStatus;
  connectionId: string;
  model: AiModelId;
  reasoningEffort: AiReasoningEffort;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  plan?: AiEditPlan;
  error?: string;
}

export interface SignInAuthorization {
  status: "redirect";
  authorizationUrl: string;
}

export interface AccountConnectionsClient {
  readonly mode: AccountClientMode;
  getSnapshot(): Promise<AccountSnapshot>;
  startSignIn(provider: SignInProvider, returnUrl: string): Promise<SignInAuthorization>;
  signOut(): Promise<AccountSnapshot>;
  connectApiKey(apiKey: string, projectId?: string): Promise<AccountSnapshot>;
  startChatGptConnection(projectId?: string): Promise<ConnectionAuthorization>;
  getChatGptConnection(authorizationId: string): Promise<ConnectionAuthorization>;
  disconnectConnection(connectionId: string): Promise<AccountSnapshot>;
  createAiJob(connectionId: string, prompt: string, project: unknown, model: AiModelId, reasoningEffort: AiReasoningEffort): Promise<AiJob>;
  getAiJob(jobId: string): Promise<AiJob>;
  setSyncEnabled(enabled: boolean): Promise<AccountSnapshot>;
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
    description: "Let an authenticated ChatGPT or Codex client inspect the current project and propose reviewable edits through GlassWare tools.",
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

const EMPTY_SNAPSHOT: AccountSnapshot = {
  account: null,
  connections: [],
  syncEnabled: false,
  aiRuntime: { available: false, message: "AI workspace is unavailable" },
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
  const actions = new Set(["set_canvas_background", "add_text", "add_shape", "update_object"]);
  return {
    summary: requireString(value.summary, "plan summary"),
    rationale: requireString(value.rationale, "plan rationale"),
    operations: value.operations.map((operation) => {
      if (!isRecord(operation) || !actions.has(String(operation.action))) throw new Error("Account service returned an unknown AI edit operation.");
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
      };
    }),
  };
}

function parseAiJob(value: unknown): AiJob {
  if (!isRecord(value)) throw new Error("Account service returned an invalid AI job.");
  const status = value.status;
  if (!new Set(["queued", "running", "completed", "failed"]).has(String(status))) throw new Error("Account service returned an invalid AI job status.");
  const model = String(value.model || "");
  const reasoningEffort = String(value.reasoningEffort || "");
  if (!AI_MODEL_CATALOG.some((entry) => entry.id === model)) throw new Error("Account service returned an unsupported AI model.");
  if (!AI_REASONING_EFFORTS.some((entry) => entry.id === reasoningEffort)) throw new Error("Account service returned an unsupported reasoning effort.");
  return {
    id: requireString(value.id, "AI job id"),
    status: status as AiJobStatus,
    connectionId: requireString(value.connectionId, "AI connection id"),
    model: model as AiModelId,
    reasoningEffort: reasoningEffort as AiReasoningEffort,
    createdAt: requireString(value.createdAt, "AI job creation time"),
    startedAt: optionalString(value.startedAt, "AI job start time"),
    finishedAt: optionalString(value.finishedAt, "AI job finish time"),
    plan: value.plan === undefined ? undefined : parsePlan(value.plan),
    error: optionalString(value.error, "AI job error"),
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
  if (!isRecord(value) || typeof value.message !== "string" || !value.message.trim()) return fallback;
  return value.message;
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
    async createAiJob(connectionId, prompt, project, model, reasoningEffort) {
      const payload = await request("/v1/ai/jobs", {
        method: "POST",
        body: JSON.stringify({ connectionId, prompt, project, model, reasoningEffort }),
      });
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid AI job receipt.");
      return parseAiJob(payload.job);
    },
    async getAiJob(jobId) {
      const payload = await request(`/v1/ai/jobs/${encodeURIComponent(jobId)}`);
      if (!isRecord(payload) || payload.job === undefined) throw new Error("Account service returned an invalid AI job.");
      return parseAiJob(payload.job);
    },
    async setSyncEnabled(enabled) {
      return rememberSnapshot(await request("/v1/account/preferences", {
        method: "PATCH",
        body: JSON.stringify({ syncEnabled: enabled }),
      }));
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
    async getAiJob() {
      requireAccount();
      throw new Error("AI jobs require the GlassWare account service.");
    },
    async setSyncEnabled(enabled) {
      requireAccount();
      if (enabled) throw new Error("Project sync requires the GlassWare account service. This build is not connected to it yet.");
      return persist({ ...snapshot, syncEnabled: enabled });
    },
  };
}
