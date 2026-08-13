import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DEVICE_STORAGE_KEY,
  createAccountServiceClient,
  createDeviceAccountClient,
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
  it("stores a device profile without claiming cloud authentication or AI access", async () => {
    const storage = new MemoryStorage();
    const client = createDeviceAccountClient(storage);
    const receipt = await client.requestMagicLink(" Mom.Example@example.com ", "http://localhost:4173");
    expect(receipt.status).toBe("device-session");
    expect(receipt.snapshot?.account).toMatchObject({ email: "mom.example@example.com", mode: "device" });

    await expect(client.startConnection("chatgpt_codex_plugin", "http://localhost:4173", "project-1")).rejects.toThrow("account service");
    await expect(client.setSyncEnabled(true)).rejects.toThrow("account service");

    const restored = await createDeviceAccountClient(storage).getSnapshot();
    expect(restored.connections).toEqual([]);
    expect(restored.syncEnabled).toBe(false);
    const stored = storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY) ?? "";
    expect(stored).not.toMatch(/apiKey|accessToken|refreshToken|password|secret|authJson/i);

    await client.signOut();
    expect(await client.getSnapshot()).toEqual({ account: null, connections: [], syncEnabled: false });
    expect(storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY)).toBeNull();
  });

  it("uses secure cookies, CSRF-bound mutations, and redirect receipts with the service client", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      if (String(input).endsWith("/v1/auth/magic-links")) return Response.json({
        status: "email-sent",
        email: "mom@example.com",
        expiresAt: "2026-08-14T00:00:00.000Z",
      });
      return Response.json({ status: "redirect", authorizationUrl: "https://auth.imagestitch.dev/connect/request-1" });
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.imagestitch.dev/", fetch: fetcher });
    await client.getSnapshot();
    const signIn = await client.requestMagicLink("Mom@example.com", "https://app.imagestitch.dev");
    const authorization = await client.startConnection("chatgpt_codex_plugin", "https://app.imagestitch.dev", "project-1");

    expect(signIn).toMatchObject({ status: "email-sent", email: "mom@example.com" });
    expect(authorization).toEqual({ status: "redirect", authorizationUrl: "https://auth.imagestitch.dev/connect/request-1" });
    expect(requests[0].init?.credentials).toBe("include");
    expect(requests[1].url).toBe("https://account.imagestitch.dev/v1/auth/magic-links");
    expect(requests[1].init?.body).toBe(JSON.stringify({ email: "mom@example.com", returnUrl: "https://app.imagestitch.dev" }));
    expect(requests[2].url).toBe("https://account.imagestitch.dev/v1/connections/chatgpt_codex_plugin/authorizations");
    expect(new Headers(requests[2].init?.headers).get("x-imagestitch-csrf")).toBe("csrf-only");
    expect(requests[2].init?.body).toBe(JSON.stringify({ returnUrl: "https://app.imagestitch.dev", projectId: "project-1" }));
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
