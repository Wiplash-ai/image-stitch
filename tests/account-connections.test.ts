import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PREVIEW_STORAGE_KEY,
  createAccountServiceClient,
  createLocalPreviewAccountClient,
  parseAccountSnapshot,
  validateAuthorizationUrl,
  validateServiceBaseUrl,
  type StorageLike,
} from "../src/lib/account-connections";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const authenticatedSnapshot = {
  account: {
    id: "account-1",
    email: "mom@example.com",
    displayName: "Mom",
    expiresAt: "2026-09-01T00:00:00.000Z",
    mode: "authenticated",
  },
  connections: [],
  syncEnabled: false,
  csrfToken: "csrf-only",
} as const;

describe("account and AI connection clients", () => {
  it("dogfoods account and connection states locally without pretending to authenticate", async () => {
    const storage = new MemoryStorage();
    const client = createLocalPreviewAccountClient(storage);
    const receipt = await client.requestMagicLink(" Mom.Example@example.com ", "http://localhost:4173");
    expect(receipt.status).toBe("preview-signed-in");
    expect(receipt.snapshot?.account).toMatchObject({ email: "mom.example@example.com", mode: "preview" });

    const plugin = await client.startConnection("chatgpt_codex_plugin", "http://localhost:4173", "project-1");
    expect(plugin.snapshot?.connections[0]).toMatchObject({ kind: "chatgpt_codex_plugin", status: "preview" });
    await client.startConnection("openai_api", "http://localhost:4173", "project-1");
    await client.setSyncEnabled(true);

    const restored = await createLocalPreviewAccountClient(storage).getSnapshot();
    expect(restored.connections.map((connection) => connection.kind)).toEqual(["chatgpt_codex_plugin", "openai_api"]);
    expect(restored.syncEnabled).toBe(true);
    const stored = storage.getItem(ACCOUNT_PREVIEW_STORAGE_KEY) ?? "";
    expect(stored).not.toMatch(/apiKey|accessToken|refreshToken|password|secret|authJson/i);

    await client.disconnectConnection(restored.connections[0].id);
    expect((await client.getSnapshot()).connections).toHaveLength(1);
    await client.signOut();
    expect(await client.getSnapshot()).toEqual({ account: null, connections: [], syncEnabled: false });
    expect(storage.getItem(ACCOUNT_PREVIEW_STORAGE_KEY)).toBeNull();
  });

  it("uses secure cookies, CSRF-bound mutations, and redirect receipts with the service client", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      return Response.json({ status: "redirect", authorizationUrl: "https://auth.imagestitch.dev/connect/request-1" });
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.imagestitch.dev/", fetch: fetcher });
    await client.getSnapshot();
    const authorization = await client.startConnection("chatgpt_codex_plugin", "https://app.imagestitch.dev", "project-1");

    expect(authorization).toEqual({ status: "redirect", authorizationUrl: "https://auth.imagestitch.dev/connect/request-1" });
    expect(requests[0].init?.credentials).toBe("include");
    expect(requests[1].url).toBe("https://account.imagestitch.dev/v1/connections/chatgpt_codex_plugin/authorizations");
    expect(new Headers(requests[1].init?.headers).get("x-imagestitch-csrf")).toBe("csrf-only");
    expect(requests[1].init?.body).toBe(JSON.stringify({ returnUrl: "https://app.imagestitch.dev", projectId: "project-1" }));
  });

  it("rejects unsafe service and authorization URLs", () => {
    expect(() => validateServiceBaseUrl("http://account.imagestitch.dev")).toThrow("HTTPS");
    expect(validateServiceBaseUrl("http://127.0.0.1:8789/")).toBe("http://127.0.0.1:8789");
    expect(() => validateAuthorizationUrl("javascript:alert(1)")).toThrow("unsafe");
  });

  it("fails closed if an account response contains provider credentials", () => {
    expect(() => parseAccountSnapshot({ ...authenticatedSnapshot, connections: [{
      id: "connection-1",
      kind: "openai_api",
      status: "connected",
      label: "Personal API",
      createdAt: "2026-08-12T00:00:00.000Z",
      apiKey: "sk-do-not-return",
    }] })).toThrow("opaque connection identifiers");
  });
});
