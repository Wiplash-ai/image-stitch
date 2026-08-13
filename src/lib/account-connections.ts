export const ACCOUNT_PREVIEW_STORAGE_KEY = "imagestitch.account-preview.v1";

export type AccountClientMode = "service" | "local-preview";
export type AiConnectionKind = "chatgpt_codex_plugin" | "openai_api";
export type AiConnectionStatus = "connected" | "attention" | "preview";

export interface AccountSession {
  id: string;
  email: string;
  displayName: string;
  expiresAt: string;
  mode: "authenticated" | "preview";
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
}

export interface MagicLinkReceipt {
  status: "email-sent" | "preview-signed-in";
  email: string;
  expiresAt: string;
  snapshot?: AccountSnapshot;
}

export interface ConnectionAuthorization {
  status: "redirect" | "connected";
  authorizationUrl?: string;
  snapshot?: AccountSnapshot;
}

export interface AccountConnectionsClient {
  readonly mode: AccountClientMode;
  getSnapshot(): Promise<AccountSnapshot>;
  requestMagicLink(email: string, returnUrl: string): Promise<MagicLinkReceipt>;
  signOut(): Promise<AccountSnapshot>;
  startConnection(kind: AiConnectionKind, returnUrl: string, projectId?: string): Promise<ConnectionAuthorization>;
  disconnectConnection(connectionId: string): Promise<AccountSnapshot>;
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
    description: "Let an authenticated ChatGPT or Codex client inspect the current project and propose reviewable edits through ImageStitch tools.",
    detail: "MCP plugin + project-scoped ImageStitch OAuth",
  },
  {
    kind: "openai_api",
    eyebrow: "USAGE-BASED CONNECTION",
    name: "OpenAI API key",
    description: "Use separately billed OpenAI API access through an encrypted vault or future local companion. The editor receives only an opaque connection ID.",
    detail: "Separate API billing · key never enters this browser UI",
  },
] as const;

const EMPTY_SNAPSHOT: AccountSnapshot = { account: null, connections: [], syncEnabled: false };

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

function parseAccount(value: unknown): AccountSession | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error("Account service returned an invalid account.");
  const mode = value.mode;
  if (mode !== "authenticated" && mode !== "preview") throw new Error("Account service returned an invalid account mode.");
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
  if (status !== "connected" && status !== "attention" && status !== "preview") throw new Error("Account service returned an invalid AI connection status.");
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
  };
}

export function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email address.");
  return normalized;
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
    if (init.method && init.method !== "GET" && csrfToken) headers.set("x-imagestitch-csrf", csrfToken);
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
    async requestMagicLink(email, returnUrl) {
      const payload = await request("/v1/auth/magic-links", {
        method: "POST",
        body: JSON.stringify({ email: validateEmail(email), returnUrl }),
      });
      if (!isRecord(payload)) throw new Error("Account service returned an invalid sign-in receipt.");
      return {
        status: "email-sent",
        email: requireString(payload.email, "sign-in email"),
        expiresAt: requireString(payload.expiresAt, "sign-in expiry"),
      };
    },
    async signOut() {
      const snapshot = rememberSnapshot(await request("/v1/auth/logout", { method: "POST" }));
      csrfToken = snapshot.csrfToken ?? "";
      return snapshot;
    },
    async startConnection(kind, returnUrl, projectId) {
      const payload = await request(`/v1/connections/${kind}/authorizations`, {
        method: "POST",
        body: JSON.stringify({ returnUrl, ...(projectId ? { projectId } : {}) }),
      });
      if (!isRecord(payload) || (payload.status !== "redirect" && payload.status !== "connected")) {
        throw new Error("Account service returned an invalid connection authorization.");
      }
      if (payload.status === "redirect") {
        return { status: "redirect", authorizationUrl: validateAuthorizationUrl(requireString(payload.authorizationUrl, "authorization URL")) };
      }
      if (payload.snapshot === undefined) throw new Error("Account service omitted the connected account snapshot.");
      return { status: "connected", snapshot: rememberSnapshot(payload.snapshot) };
    },
    async disconnectConnection(connectionId) {
      return rememberSnapshot(await request(`/v1/connections/${encodeURIComponent(connectionId)}`, { method: "DELETE" }));
    },
    async setSyncEnabled(enabled) {
      return rememberSnapshot(await request("/v1/account/preferences", {
        method: "PATCH",
        body: JSON.stringify({ syncEnabled: enabled }),
      }));
    },
  };
}

function loadPreviewSnapshot(storage: StorageLike | undefined): AccountSnapshot {
  if (!storage) return { ...EMPTY_SNAPSHOT };
  try {
    const raw = storage.getItem(ACCOUNT_PREVIEW_STORAGE_KEY);
    return raw ? parseAccountSnapshot(JSON.parse(raw)) : { ...EMPTY_SNAPSHOT };
  } catch {
    try {
      storage.removeItem(ACCOUNT_PREVIEW_STORAGE_KEY);
    } catch {
      // Preview persistence is best effort and never blocks the editor.
    }
    return { ...EMPTY_SNAPSHOT };
  }
}

function previewDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? "Creator";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ") || "Creator";
}

function availableLocalStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createLocalPreviewAccountClient(storage: StorageLike | undefined = availableLocalStorage()): AccountConnectionsClient {
  let snapshot = loadPreviewSnapshot(storage);

  function persist(next: AccountSnapshot): AccountSnapshot {
    snapshot = next;
    try {
      storage?.setItem(ACCOUNT_PREVIEW_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The visibly local preview can continue in memory if storage is denied.
    }
    return next;
  }

  function requireAccount(): AccountSession {
    if (!snapshot.account) throw new Error("Sign in before connecting an AI provider.");
    return snapshot.account;
  }

  return {
    mode: "local-preview",
    async getSnapshot() {
      return snapshot;
    },
    async requestMagicLink(email) {
      const normalized = validateEmail(email);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const next = persist({
        account: {
          id: `preview-${crypto.randomUUID()}`,
          email: normalized,
          displayName: previewDisplayName(normalized),
          expiresAt,
          mode: "preview",
        },
        connections: [],
        syncEnabled: false,
      });
      return { status: "preview-signed-in", email: normalized, expiresAt, snapshot: next };
    },
    async signOut() {
      try {
        storage?.removeItem(ACCOUNT_PREVIEW_STORAGE_KEY);
      } catch {
        // The current in-memory preview session still ends immediately.
      }
      snapshot = { ...EMPTY_SNAPSHOT };
      return snapshot;
    },
    async startConnection(kind) {
      requireAccount();
      const existing = snapshot.connections.find((connection) => connection.kind === kind);
      if (existing) return { status: "connected", snapshot };
      const definition = AI_CONNECTION_CATALOG.find((item) => item.kind === kind);
      const next = persist({
        ...snapshot,
        connections: [
          ...snapshot.connections,
          {
            id: `preview-connection-${crypto.randomUUID()}`,
            kind,
            status: "preview",
            label: `${definition?.name ?? "AI"} preview`,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      return { status: "connected", snapshot: next };
    },
    async disconnectConnection(connectionId) {
      requireAccount();
      return persist({ ...snapshot, connections: snapshot.connections.filter((connection) => connection.id !== connectionId) });
    },
    async setSyncEnabled(enabled) {
      requireAccount();
      return persist({ ...snapshot, syncEnabled: enabled });
    },
  };
}
