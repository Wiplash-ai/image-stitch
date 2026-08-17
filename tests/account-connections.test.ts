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
  it("preserves a legacy device profile without offering new email sign-in", async () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_DEVICE_STORAGE_KEY, JSON.stringify({
      account: {
        id: "device-legacy",
        email: "mom.example@example.com",
        displayName: "Mom Example",
        expiresAt: "2026-09-01T00:00:00.000Z",
        mode: "device",
      },
      connections: [],
      syncEnabled: false,
    }));
    const client = createDeviceAccountClient(storage);
    expect((await client.getSnapshot()).account).toMatchObject({ email: "mom.example@example.com", mode: "device" });

    await expect(client.startChatGptConnection("project-1")).rejects.toThrow("account service");
    await expect(client.connectApiKey("sk-example-1234567890", "project-1")).rejects.toThrow("account service");
    await expect(client.startSignIn("wiplash", "http://localhost:4173")).rejects.toThrow("account service");
    await expect(client.setSyncEnabled(true)).rejects.toThrow("account service");

    const restored = await createDeviceAccountClient(storage).getSnapshot();
    expect(restored.connections).toEqual([]);
    expect(restored.syncEnabled).toBe(false);
    const stored = storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY) ?? "";
    expect(stored).not.toMatch(/apiKey|accessToken|refreshToken|password|secret|authJson/i);

    await client.signOut();
    expect(await client.getSnapshot()).toEqual({
      account: null,
      connections: [],
      syncEnabled: false,
      aiRuntime: { available: false, message: "AI workspace is unavailable" },
    });
    expect(storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY)).toBeNull();
  });

  it("uses secure cookies, CSRF-bound mutations, and redirect receipts with the service client", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      if (String(input).endsWith("/v1/auth/authorizations")) {
        return Response.json({ status: "redirect", authorizationUrl: "https://auth.glassware.dev/sign-in/request-1" });
      }
      if (String(input).endsWith("/v1/connections/chatgpt_codex_plugin/authorizations")) {
        return Response.json({ status: "device", authorization: {
          id: "authorization-1",
          status: "waiting",
          createdAt: "2026-08-14T00:00:00.000Z",
          expiresAt: "2026-08-14T00:15:00.000Z",
          verificationUrl: "https://auth.openai.com/activate",
          userCode: "ABCD-EFGH",
        } });
      }
      if (String(input).endsWith("/v1/connections/openai_api")) {
        return Response.json({ status: "connected", snapshot: {
          ...authenticatedSnapshot,
          connections: [{ id: "connection-1", kind: "openai_api", status: "connected", label: "OpenAI API ••••7890", createdAt: "2026-08-14T00:00:00.000Z" }],
        } });
      }
      if (String(input).endsWith("/v1/ai/jobs")) {
        return Response.json({ job: {
          id: "job-1",
          status: "queued",
          connectionId: "connection-1",
          model: "gpt-5.6-luna",
          reasoningEffort: "medium",
          createdAt: "2026-08-14T00:00:00.000Z",
        } });
      }
      throw new Error(`Unexpected request: ${input}`);
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.glassware.dev/", fetch: fetcher });
    await client.getSnapshot();
    const providerSignIn = await client.startSignIn("wiplash", "https://app.glassware.dev");
    const authorization = await client.startChatGptConnection("project-1");
    const apiSnapshot = await client.connectApiKey("sk-example-1234567890", "project-1");
    const job = await client.createAiJob("connection-1", "Make it joyful", { id: "project-1" }, "gpt-5.6-luna", "medium");

    expect(providerSignIn).toEqual({ status: "redirect", authorizationUrl: "https://auth.glassware.dev/sign-in/request-1" });
    expect(authorization).toMatchObject({ status: "device", authorization: { userCode: "ABCD-EFGH" } });
    expect(apiSnapshot.connections[0]).toMatchObject({ kind: "openai_api", label: "OpenAI API ••••7890" });
    expect(job).toMatchObject({ model: "gpt-5.6-luna", reasoningEffort: "medium" });
    expect(requests[0].init?.credentials).toBe("include");
    expect(requests[1].url).toBe("https://account.glassware.dev/v1/auth/authorizations");
    expect(requests[1].init?.body).toBe(JSON.stringify({ provider: "wiplash", returnUrl: "https://app.glassware.dev" }));
    expect(requests[2].url).toBe("https://account.glassware.dev/v1/connections/chatgpt_codex_plugin/authorizations");
    expect(new Headers(requests[2].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
    expect(requests[2].init?.body).toBe(JSON.stringify({ projectId: "project-1" }));
    expect(requests[3].url).toBe("https://account.glassware.dev/v1/connections/openai_api");
    expect(requests[3].init?.body).toBe(JSON.stringify({ apiKey: "sk-example-1234567890", projectId: "project-1" }));
    expect(requests[4].url).toBe("https://account.glassware.dev/v1/ai/jobs");
    expect(requests[4].init?.body).toBe(JSON.stringify({ connectionId: "connection-1", prompt: "Make it joyful", project: { id: "project-1" }, model: "gpt-5.6-luna", reasoningEffort: "medium" }));
  });

  it("rejects unsafe service and authorization URLs", () => {
    expect(() => validateServiceBaseUrl("http://account.glassware.dev")).toThrow("HTTPS");
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
